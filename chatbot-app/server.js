const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public', { etag: false, maxAge: 0 }));

const MONGODB_URI = process.env.MONGODB_URI;
let db;

async function connectDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db('chatbot24');
  console.log('MongoDB verbunden!');

  // Demo-Kunde anlegen falls noch nicht vorhanden
  const existing = await db.collection('clients').findOne({ id: 'demo' });
  if (!existing) {
    await db.collection('clients').insertOne({
      id: 'demo',
      name: 'Demo GmbH',
      industry: 'Online-Shop',
      color: '#1D9E75',
      botName: 'Support-Assistent',
      welcome: 'Hallo! Wie kann ich Ihnen helfen?',
      systemPrompt: 'Du bist ein freundlicher Kundenservice-Assistent. Antworte auf Deutsch, professionell und hilfreich.',
      email: 'support@demo.de',
      hours: 'Mo–Fr 9–18 Uhr',
      faqs: [
        { q: 'Wie lange dauert die Lieferung?', a: 'Wir liefern innerhalb von 2–3 Werktagen.' },
        { q: 'Kann ich zurückgeben?', a: 'Ja, 14 Tage Rückgaberecht.' }
      ],
      stats: { chats: 0, messages: 0, daily: {} },
      password: 'demo123'
    });
  }
}

// ── CHAT API ──────────────────────────────────────────────
app.post('/api/chat/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { messages } = req.body;
  const client = await db.collection('clients').findOne({ id: clientId });

  if (!client) return res.status(404).json({ error: 'Client not found' });

  const faqText = (client.faqs || []).map(f => `F: ${f.q}\nA: ${f.a}`).join('\n\n');
  const systemPrompt = `${client.systemPrompt}\n\nFirma: ${client.name} (${client.industry})\nÖffnungszeiten: ${client.hours}\nKontakt: ${client.email}\n\nHäufige Fragen:\n${faqText}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: systemPrompt,
        messages
      })
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Entschuldigung, bitte versuche es erneut.';

    // Stats updaten
    const today = new Date().toISOString().split('T')[0];
    const update = {
      $inc: {
        'stats.messages': 1,
        [`stats.daily.${today}`]: messages.length === 1 ? 1 : 0,
        'stats.chats': messages.length === 1 ? 1 : 0
      }
    };
    await db.collection('clients').updateOne({ id: clientId }, update);

    // Erste Nachricht des Gesprächs speichern für Analyse
    if (messages.length === 1) {
      await db.collection('conversations').insertOne({
        clientId,
        userMessage: messages[0].content.substring(0, 200),
        botReply: reply.substring(0, 200),
        date: today,
        createdAt: new Date()
      });
    }

    res.json({ reply });
  } catch (err) {
    console.error('API ERROR:', err.message);
    res.status(500).json({ error: 'API error', detail: err.message });
  }
});

// ── ADMIN API ─────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  const { clientId, password } = req.body;
  const client = await db.collection('clients').findOne({ id: clientId });
  if (!client || client.password !== password) {
    return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
  }
  const { password: _, ...safe } = client;
  res.json({ success: true, client: safe });
});

app.get('/api/admin/:clientId', async (req, res) => {
  const client = await db.collection('clients').findOne({ id: req.params.clientId });
  if (!client) return res.status(404).json({ error: 'Not found' });
  const { password, _id, ...safe } = client;
  res.json(safe);
});

app.put('/api/admin/:clientId', async (req, res) => {
  const { password, stats, id, _id, ...updates } = req.body;
  await db.collection('clients').updateOne(
    { id: req.params.clientId },
    { $set: updates }
  );
  res.json({ success: true });
});

// ── DOCUMENT ANALYZE ─────────────────────────────────────
app.post('/api/analyze-doc', async (req, res) => {
  const { clientId, text } = req.body;
  if(!text) return res.status(400).json({ error: 'No text provided' });
  try{
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Analysiere dieses Dokument und erstelle 5-8 typische Kundenfragen mit Antworten daraus. Antworte NUR als JSON Array: [{"q":"Frage","a":"Antwort"}]\n\nDokument:\n${text.substring(0, 5000)}`
        }]
      })
    });
    const data = await response.json();
    const rawText = data.content?.[0]?.text || '[]';
    const faqs = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    res.json({ faqs, count: faqs.length });
  } catch(err) {
    console.error('Doc analyze error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── TOPICS ANALYSIS ──────────────────────────────────────
app.get('/api/topics/:clientId', async (req, res) => {
  try {
    const convs = await db.collection('conversations')
      .find({ clientId: req.params.clientId })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    if (convs.length === 0) {
      return res.json({ topics: [], count: 0 });
    }

    const messages = convs.map(c => c.userMessage).join('\n');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Analysiere diese Kundenfragen und gruppiere sie in maximal 6 Themen. Antworte NUR als JSON Array ohne Markdown: [{"label":"Thema","count":Anzahl}]. Sortiere nach Häufigkeit.\n\nFragen:\n${messages}`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '[]';
    const topics = JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim());
    res.json({ topics, count: convs.length });
  } catch(err) {
    console.error('Topics error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DEBUG ─────────────────────────────────────────────────
app.get('/api/debug', (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  res.json({ keyExists: !!key, keyStart: key ? key.substring(0, 10) + '...' : 'MISSING', db: !!db });
});

// ── WIDGET SCRIPT ─────────────────────────────────────────
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'widget.js'));
});

// ── PAGES ─────────────────────────────────────────────────
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/rechtliches', (req, res) => res.sendFile(path.join(__dirname, 'public', 'rechtliches.html')));
app.get('/kontakt', (req, res) => res.sendFile(path.join(__dirname, 'public', 'kontakt.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));
}).catch(err => {
  console.error('DB Verbindung fehlgeschlagen:', err);
  process.exit(1);
});
