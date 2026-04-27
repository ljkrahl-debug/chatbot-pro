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
