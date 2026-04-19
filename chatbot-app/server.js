const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = './data/clients.json';

// Ensure data directory exists
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    "demo": {
      id: "demo",
      name: "Demo GmbH",
      industry: "Online-Shop",
      color: "#1D9E75",
      botName: "Support-Assistent",
      welcome: "Hallo! Wie kann ich Ihnen helfen?",
      systemPrompt: "Du bist ein freundlicher Kundenservice-Assistent. Antworte auf Deutsch, professionell und hilfreich.",
      email: "support@demo.de",
      hours: "Mo–Fr 9–18 Uhr",
      faqs: [
        { q: "Wie lange dauert die Lieferung?", a: "Wir liefern innerhalb von 2–3 Werktagen." },
        { q: "Kann ich zurückgeben?", a: "Ja, 14 Tage Rückgaberecht." }
      ],
      stats: { chats: 0, messages: 0 },
      password: "demo123"
    }
  }, null, 2));
}

function loadClients() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function saveClients(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── CHAT API ──────────────────────────────────────────────
app.post('/api/chat/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { messages } = req.body;
  const clients = loadClients();
  const client = clients[clientId];

  if (!client) return res.status(404).json({ error: 'Client not found' });

  const faqText = client.faqs.map(f => `F: ${f.q}\nA: ${f.a}`).join('\n\n');
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages
      })
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Entschuldigung, bitte versuche es erneut.';

    // Update stats
    clients[clientId].stats.messages++;
    if (messages.length === 1) clients[clientId].stats.chats++;
    saveClients(clients);

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'API error', detail: err.message });
  }
});

// ── ADMIN API ─────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { clientId, password } = req.body;
  const clients = loadClients();
  const client = clients[clientId];
  if (!client || client.password !== password) {
    return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
  }
  res.json({ success: true, client });
});

app.get('/api/admin/:clientId', (req, res) => {
  const clients = loadClients();
  const client = clients[req.params.clientId];
  if (!client) return res.status(404).json({ error: 'Not found' });
  const { password, ...safe } = client;
  res.json(safe);
});

app.put('/api/admin/:clientId', (req, res) => {
  const clients = loadClients();
  if (!clients[req.params.clientId]) return res.status(404).json({ error: 'Not found' });
  const { password, stats, id } = clients[req.params.clientId];
  clients[req.params.clientId] = { ...req.body, id, password, stats };
  saveClients(clients);
  res.json({ success: true });
});

// ── WIDGET SCRIPT ─────────────────────────────────────────
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'widget.js'));
});

// ── PAGES ─────────────────────────────────────────────────
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));
