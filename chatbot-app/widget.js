(function () {
  const script = document.currentScript;
  const clientId = script.getAttribute('data-id') || 'demo';
  const color = script.getAttribute('data-color') || '#1D9E75';
  const BASE = script.src.replace('/widget.js', '');

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #cbp-btn { position:fixed; bottom:24px; right:24px; width:56px; height:56px; border-radius:50%; background:${color}; border:none; cursor:pointer; box-shadow:0 4px 16px rgba(0,0,0,0.18); display:flex; align-items:center; justify-content:center; z-index:99998; transition:transform 0.2s; }
    #cbp-btn:hover { transform:scale(1.08); }
    #cbp-btn svg { width:26px; height:26px; fill:#fff; }
    #cbp-box { position:fixed; bottom:92px; right:24px; width:360px; max-width:calc(100vw - 48px); height:520px; background:#fff; border-radius:16px; box-shadow:0 8px 40px rgba(0,0,0,0.16); display:none; flex-direction:column; z-index:99999; overflow:hidden; border:1px solid #e8e8e8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    #cbp-box.open { display:flex; animation:cbp-slide 0.22s ease; }
    @keyframes cbp-slide { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    #cbp-header { background:${color}; padding:14px 16px; display:flex; align-items:center; gap:10px; }
    #cbp-avatar { width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.25); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:600; color:#fff; flex-shrink:0; }
    #cbp-hinfo { flex:1; }
    #cbp-hname { font-size:14px; font-weight:600; color:#fff; }
    #cbp-hstatus { font-size:12px; color:rgba(255,255,255,0.8); }
    #cbp-close { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.8); font-size:20px; padding:0; }
    #cbp-msgs { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; background:#f9f9f9; }
    .cbp-msg { max-width:82%; padding:9px 13px; border-radius:14px; font-size:14px; line-height:1.5; }
    .cbp-msg.bot { background:#fff; color:#1a1a1a; border-bottom-left-radius:4px; align-self:flex-start; box-shadow:0 1px 4px rgba(0,0,0,0.07); }
    .cbp-msg.user { background:${color}; color:#fff; border-bottom-right-radius:4px; align-self:flex-end; }
    .cbp-msg.typing { color:#aaa; font-style:italic; background:#fff; }
    #cbp-input-row { display:flex; gap:8px; padding:12px; border-top:1px solid #eee; background:#fff; }
    #cbp-input { flex:1; padding:9px 13px; border-radius:20px; border:1px solid #e0e0e0; font-size:14px; outline:none; }
    #cbp-input:focus { border-color:${color}; }
    #cbp-send { background:${color}; border:none; border-radius:50%; width:38px; height:38px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    #cbp-send svg { width:16px; height:16px; fill:#fff; }
    #cbp-send:disabled { opacity:0.5; cursor:not-allowed; }
    #cbp-powered { text-align:center; font-size:11px; color:#ccc; padding:4px 0 8px; background:#fff; }
  `;
  document.head.appendChild(style);

  // Build HTML
  const btn = document.createElement('button');
  btn.id = 'cbp-btn';
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;

  const box = document.createElement('div');
  box.id = 'cbp-box';
  box.innerHTML = `
    <div id="cbp-header">
      <div id="cbp-avatar">?</div>
      <div id="cbp-hinfo"><div id="cbp-hname">Assistent</div><div id="cbp-hstatus">Online</div></div>
      <button id="cbp-close">✕</button>
    </div>
    <div id="cbp-msgs"></div>
    <div id="cbp-input-row">
      <input id="cbp-input" placeholder="Nachricht eingeben..." />
      <button id="cbp-send"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg></button>
    </div>
    <div id="cbp-powered">Powered by ChatBot Pro</div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(box);

  let history = [];
  let clientConfig = null;

  // Load client config
  fetch(`${BASE}/api/admin/${clientId}`)
    .then(r => r.json())
    .then(cfg => {
      clientConfig = cfg;
      document.getElementById('cbp-hname').textContent = cfg.botName || 'Assistent';
      const initials = cfg.initials || (cfg.name || 'CB').slice(0, 2).toUpperCase();
      document.getElementById('cbp-avatar').textContent = initials;
      addMsg(cfg.welcome || 'Hallo! Wie kann ich Ihnen helfen?', 'bot');
    })
    .catch(() => {
      addMsg('Hallo! Wie kann ich Ihnen helfen?', 'bot');
    });

  function addMsg(text, type) {
    const msgs = document.getElementById('cbp-msgs');
    const div = document.createElement('div');
    div.className = 'cbp-msg ' + type;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  async function sendMsg() {
    const input = document.getElementById('cbp-input');
    const send = document.getElementById('cbp-send');
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    history.push({ role: 'user', content: text });
    input.value = '';
    send.disabled = true;
    const typing = addMsg('…', 'bot typing');
    try {
      const res = await fetch(`${BASE}/api/chat/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      const data = await res.json();
      const reply = data.reply || 'Entschuldigung, bitte erneut versuchen.';
      history.push({ role: 'assistant', content: reply });
      typing.className = 'cbp-msg bot';
      typing.textContent = reply;
    } catch (e) {
      typing.className = 'cbp-msg bot';
      typing.textContent = 'Verbindungsfehler. Bitte versuche es erneut.';
    }
    send.disabled = false;
    document.getElementById('cbp-msgs').scrollTop = 99999;
  }

  btn.addEventListener('click', () => box.classList.toggle('open'));
  document.getElementById('cbp-close').addEventListener('click', () => box.classList.remove('open'));
  document.getElementById('cbp-send').addEventListener('click', sendMsg);
  document.getElementById('cbp-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
})();
