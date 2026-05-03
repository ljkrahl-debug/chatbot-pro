const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
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
    const thisMonth = today.substring(0, 7); // YYYY-MM
    const update = {
      $inc: {
        'stats.messages': 1,
        'stats.monthlyMessages': 1,
        [`stats.daily.${today}`]: messages.length === 1 ? 1 : 0,
        'stats.chats': messages.length === 1 ? 1 : 0
      }
    };
    await db.collection('clients').updateOne({ id: clientId }, update);

    // Erste Nachricht speichern + Tageszeit + unbeantwortete Fragen
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morgens' : hour < 17 ? 'mittags' : 'abends';
    const replyLower = reply.toLowerCase();
    const unanswered = replyLower.includes('tut mir leid') ||
                       replyLower.includes('kann ich nicht') ||
                       replyLower.includes('weiß ich leider') ||
                       replyLower.includes('keine information') ||
                       replyLower.includes('nicht bekannt') ||
                       replyLower.includes('dazu habe ich keine') ||
                       replyLower.includes('leider nicht') ||
                       replyLower.includes('kontaktieren sie') ||
                       replyLower.includes('leider keine') ||
                       replyLower.includes('nicht beantworten') ||
                       replyLower.includes('keine angabe') ||
                       replyLower.includes('nicht vorliegen') ||
                       replyLower.includes('wende dich') ||
                       replyLower.includes('wenden sie sich') ||
                       replyLower.includes('dazu liegen mir') ||
                       replyLower.includes('darüber habe ich') ||
                       replyLower.includes('nicht verfügbar') ||
                       replyLower.includes('keine details') ||
                       replyLower.includes('nicht sagen') ||
                       replyLower.includes('leider ist mir') ||
                       replyLower.includes('i cannot') ||
                       replyLower.includes("i don't know") ||
                       replyLower.includes('unfortunately') ||
                       replyLower.includes('hab ich keine') ||
                       replyLower.includes('habe ich keine') ||
                       replyLower.includes('keine auskunft') ||
                       replyLower.includes('nicht vorliegen') ||
                       replyLower.includes('leider fehlen') ||
                       replyLower.includes('fehlen mir') ||
                       replyLower.includes('nicht bekannt') ||
                       replyLower.includes('bedauerlicherweise') ||
                       replyLower.includes('keine kenntnis') ||
                       replyLower.includes('nicht mitteilen') ||
                       replyLower.includes('weiß ich nicht') ||
                       replyLower.includes('keine ahnung') ||
                       replyLower.includes('nicht im system') ||
                       replyLower.includes('nicht hinterlegt') ||
                       replyLower.includes('direkt anfragen') ||
                       replyLower.includes('direkt fragen') ||
                       replyLower.includes('direkt kontaktieren') ||
                       replyLower.includes('telefonisch') ||
                       replyLower.includes('per e-mail anfragen') ||
                       replyLower.includes('leider außerhalb') ||
                       replyLower.includes('nicht in meinen') ||
                       replyLower.includes('keine infos') ||
                       replyLower.includes('keine daten');

    // Immer die aktuelle Frage speichern wenn sie nicht beantwortet wurde
    // Nur erste Nachricht speichern wenn beantwortet (für Gesprächs-Statistik)
    const currentMessage = messages[messages.length - 1].content.substring(0, 200);
    if (unanswered) {
      // Speichere die AKTUELLE unbeantwortete Frage
      await db.collection('conversations').insertOne({
        clientId,
        userMessage: currentMessage,
        botReply: reply.substring(0, 200),
        date: today,
        timeOfDay,
        unanswered: true,
        createdAt: new Date()
      });
    } else if (messages.length === 1) {
      // Erste Nachricht eines neuen Gesprächs speichern (für Statistik)
      await db.collection('conversations').insertOne({
        clientId,
        userMessage: currentMessage,
        botReply: reply.substring(0, 200),
        date: today,
        timeOfDay,
        unanswered: false,
        createdAt: new Date()
      });
    }

    // Tageszeit-Stats updaten
    await db.collection('clients').updateOne(
      { id: clientId },
      { $inc: { [`stats.timeOfDay.${timeOfDay}`]: 1 } }
    );

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
app.post('/api/analyze-doc', upload.single('file'), async (req, res) => {
  try {
    console.log('analyze-doc called, file:', req.file ? req.file.originalname : 'NONE');
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

    let text = '';
    const filename = req.file.originalname.toLowerCase();
    const mimetype = req.file.mimetype;

    if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
      try {
        const pdfData = await pdfParse(req.file.buffer);
        text = pdfData.text || '';
        console.log('PDF pages:', pdfData.numpages, 'text length:', text.length);
        console.log('PDF sample:', text.substring(0, 300));
      } catch(e) {
        console.error('PDF error:', e.message);
        return res.status(400).json({ error: 'PDF konnte nicht gelesen werden. Bitte als TXT speichern.' });
      }
    } else {
      text = req.file.buffer.toString('utf-8');
    }

    text = text
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')  // remove control chars
      .replace(/[ \t]{3,}/g, ' ')                         // collapse spaces but keep newlines
      .replace(/\n{4,}/g, '\n\n')                         // max 2 blank lines
      .trim();
    console.log('Final text length:', text.length, '/ pages extracted');
    console.log('Final sample:', text.substring(0, 300));

    if (!text || text.length < 50) {
      return res.status(400).json({ error: 'Kein Text gefunden. Bitte den Text kopieren und als .txt Datei hochladen.' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: 'You are a JSON API that extracts customer FAQ from business documents. Extract ALL useful business information and create up to 25 FAQ pairs in German. Cover ALL topics found: services, prices, opening hours, contact, products, processes, team, location, payment, delivery, warranties, special offers, etc. Use ONLY real content from the document. Do NOT mention pages, dates, fonts, PDF format or metadata. Return ONLY a valid JSON array: [{"q":"Konkrete Kundenfrage auf Deutsch","a":"Detaillierte Antwort auf Deutsch"}]\n\nDocument text:\n' + text.substring(0, 20000)
        }]
      })
    });

    const data = await response.json();
    const rawText = data.content && data.content[0] ? data.content[0].text : '[]';
    console.log('AI response:', rawText.substring(0, 200));

    const match = rawText.match(/\[.*\]/s);
    if (!match) return res.json({ faqs: [], count: 0 });

    const faqs = JSON.parse(match[0]);
    res.json({ faqs, count: faqs.length });

  } catch(err) {
    console.error('Doc analyze error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── UNANSWERED QUESTIONS ─────────────────────────────────
app.get('/api/unanswered/:clientId', async (req, res) => {
  try {
    const convs = await db.collection('conversations')
      .find({ clientId: req.params.clientId, unanswered: true, dismissed: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    res.json({ questions: convs.map(c => ({ q: c.userMessage, date: c.date })) });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DISMISS QUESTION ──────────────────────────────────────
app.post('/api/dismiss-question', async (req, res) => {
  try {
    const { clientId, question } = req.body;
    // Use exact match instead of regex to avoid special character issues
    await db.collection('conversations').updateMany(
      { clientId, userMessage: question, unanswered: true },
      { $set: { dismissed: true, unanswered: false } }
    );
    // Also try partial match as fallback
    await db.collection('conversations').updateMany(
      { clientId, userMessage: { $regex: question.substring(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }, unanswered: true, dismissed: { $ne: true } },
      { $set: { dismissed: true, unanswered: false } }
    );
    res.json({ success: true });
  } catch(err) {
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

// ── SUPERADMIN ───────────────────────────────────────────
const SUPER_PASSWORD = process.env.SUPER_PASSWORD || 'chatbot24super2026';

app.post('/api/superadmin/login', (req, res) => {
  const { password } = req.body;
  if (password !== SUPER_PASSWORD) return res.status(401).json({ error: 'Falsches Passwort' });
  res.json({ success: true });
});

app.get('/api/superadmin/clients', async (req, res) => {
  const { password } = req.query;
  if (password !== SUPER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  const clients = await db.collection('clients').find({}).toArray();
  res.json(clients.map(c => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    plan: c.plan || 'start',
    password: c.password || '–',
    rechnungsnr: c.rechnungsnr || '–',
    chats: c.stats?.chats || 0,
    messages: c.stats?.messages || 0,
    monthlyMessages: c.stats?.monthlyMessages || 0,
    color: c.color,
  })));
});

app.put('/api/superadmin/client/:clientId', async (req, res) => {
  const { password } = req.query;
  if (password !== SUPER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  const { plan, resetMonthly } = req.body;
  const update = {};
  if (plan) update.plan = plan;
  if (resetMonthly) update['stats.monthlyMessages'] = 0;
  await db.collection('clients').updateOne({ id: req.params.clientId }, { $set: update });
  res.json({ success: true });
});

app.post('/api/superadmin/create-client', async (req, res) => {
  const { password } = req.query;
  if (password !== SUPER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  const { id, name, industry, clientPassword, rechnungsnr, plan, color } = req.body;
  const existing = await db.collection('clients').findOne({ id });
  if (existing) return res.status(400).json({ error: 'Client ID bereits vergeben' });
  await db.collection('clients').insertOne({
    id, name, industry, color: color || '#1D9E75',
    rechnungsnr: rechnungsnr || '',
    plan: plan || 'start',
    botName: 'Assistent',
    welcome: 'Hallo! Wie kann ich Ihnen helfen?',
    systemPrompt: 'Du bist ein freundlicher Kundenservice-Assistent. Antworte auf Deutsch.',
    email: '', hours: '',
    faqs: [],
    stats: { chats: 0, messages: 0, monthlyMessages: 0, daily: {}, timeOfDay: {} },
    password: clientPassword,
  });
  res.json({ success: true });
});

app.delete('/api/superadmin/client/:clientId', async (req, res) => {
  const { password } = req.query;
  if (password !== SUPER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await db.collection('clients').deleteOne({ id: req.params.clientId });
    await db.collection('conversations').deleteMany({ clientId: req.params.clientId });
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/superadmin', (req, res) => res.sendFile(require('path').join(__dirname, 'public', 'superadmin.html')));

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
