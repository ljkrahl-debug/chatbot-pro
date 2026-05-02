(function () {
  const script = document.currentScript;
  const clientId = script.getAttribute('data-id') || 'demo';
  const color = script.getAttribute('data-color') || '#1D9E75';
  const BASE = script.src.replace('/widget.js', '');

  const style = document.createElement('style');
  style.textContent = `
    #cbp-btn-round { position:fixed; bottom:24px; right:24px; width:58px; height:58px; border-radius:50%; background:${color}; border:none; cursor:pointer; box-shadow:0 4px 20px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; z-index:99998; transition:transform 0.2s,box-shadow 0.2s; overflow:hidden; }
    #cbp-btn-round:hover { transform:scale(1.1); box-shadow:0 6px 28px rgba(0,0,0,0.25); }
    #cbp-btn-round svg { width:26px; height:26px; fill:#fff; }
    #cbp-btn-round img { width:38px; height:38px; border-radius:50%; object-fit:cover; }
    #cbp-btn-round .cbp-emoji { font-size:26px; line-height:1; }

    #cbp-btn-pill { position:fixed; bottom:24px; right:24px; background:${color}; border:none; cursor:pointer; box-shadow:0 4px 20px rgba(0,0,0,0.2); display:flex; align-items:center; gap:10px; padding:12px 20px; border-radius:100px; z-index:99998; transition:transform 0.2s,box-shadow 0.2s; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; animation:cbp-in 0.4s ease; }
    #cbp-btn-pill:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(0,0,0,0.25); }
    #cbp-btn-pill .cbp-pill-icon { font-size:20px; flex-shrink:0; display:flex; align-items:center; }
    #cbp-btn-pill .cbp-pill-icon svg { width:20px; height:20px; fill:#fff; }
    #cbp-btn-pill .cbp-pill-icon img { width:28px; height:28px; border-radius:50%; object-fit:cover; }
    #cbp-btn-pill .cbp-pill-text { color:#fff; font-size:14px; font-weight:500; white-space:nowrap; }
    #cbp-btn-pill .cbp-pill-dot { width:8px; height:8px; border-radius:50%; background:#4ade80; flex-shrink:0; animation:cbp-pulse 2s infinite; }

    #cbp-btn-tab { position:fixed; bottom:140px; right:0; background:${color}; border:none; cursor:pointer; box-shadow:-2px 2px 12px rgba(0,0,0,0.2); display:flex; align-items:center; gap:8px; padding:10px 14px 10px 12px; border-radius:10px 0 0 10px; z-index:99998; transition:transform 0.2s; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    #cbp-btn-tab:hover { transform:translateX(-4px); }
    #cbp-btn-tab span { color:#fff; font-size:13px; font-weight:500; }
    #cbp-btn-tab svg { width:18px; height:18px; fill:#fff; flex-shrink:0; }

    @keyframes cbp-in { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes cbp-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    #cbp-box { position:fixed; bottom:92px; right:24px; width:360px; max-width:calc(100vw - 32px); height:520px; background:#fff; border-radius:18px; box-shadow:0 8px 40px rgba(0,0,0,0.16); display:none; flex-direction:column; z-index:99999; overflow:hidden; border:1px solid #e8e8e8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    #cbp-box.open { display:flex; animation:cbp-slide 0.25s ease; }
    @keyframes cbp-slide { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    #cbp-header { background:${color}; padding:14px 16px; display:flex; align-items:center; gap:10px; }
    #cbp-avatar { width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,0.25); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:600; color:#fff; flex-shrink:0; overflow:hidden; }
    #cbp-avatar img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
    #cbp-hinfo { flex:1; }
    #cbp-hname { font-size:14px; font-weight:600; color:#fff; }
    #cbp-hstatus { font-size:11px; color:rgba(255,255,255,0.8); display:flex; align-items:center; gap:4px; }
    #cbp-hstatus::before { content:''; width:6px; height:6px; border-radius:50%; background:#4ade80; display:inline-block; }
    #cbp-close { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.8); font-size:18px; padding:0; }
    #cbp-msgs { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; background:#f9f9f9; }
    .cbp-msg { max-width:82%; padding:9px 13px; border-radius:14px; font-size:14px; line-height:1.55; word-wrap:break-word; }
    .cbp-msg.bot { background:#fff; color:#1a1a1a; border-bottom-left-radius:3px; align-self:flex-start; box-shadow:0 1px 4px rgba(0,0,0,0.07); }
    .cbp-msg.user { background:${color}; color:#fff; border-bottom-right-radius:3px; align-self:flex-end; }
    .cbp-msg.typing { color:#bbb; font-style:italic; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.07); }
    #cbp-input-row { display:flex; gap:8px; padding:10px 12px; border-top:1px solid #eee; background:#fff; }
    #cbp-input { flex:1; padding:9px 14px; border-radius:20px; border:1.5px solid #e0e0e0; font-size:14px; outline:none; font-family:inherit; }
    #cbp-input:focus { border-color:${color}; }
    #cbp-send { background:${color}; border:none; border-radius:50%; width:38px; height:38px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    #cbp-send:hover { opacity:0.85; }
    #cbp-send:disabled { opacity:0.4; cursor:not-allowed; }
    #cbp-send svg { width:16px; height:16px; fill:#fff; }
    #cbp-powered { text-align:center; font-size:10px; color:#ccc; padding:4px 0 6px; background:#fff; }

    #cbp-bubble { position:fixed; bottom:92px; right:24px; background:#fff; border-radius:14px; box-shadow:0 4px 20px rgba(0,0,0,0.15); padding:14px 36px 14px 16px; max-width:260px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; color:#1a1a1a; line-height:1.5; z-index:99997; border:1px solid #e8e8e8; animation:cbp-slide 0.3s ease; display:none; cursor:pointer; }
    #cbp-bubble-close { position:absolute; top:8px; right:10px; background:none; border:none; cursor:pointer; color:#ccc; font-size:16px; line-height:1; }

    @media(max-width:480px) {
      #cbp-box { bottom:0; right:0; left:0; width:100%; height:65vh; border-radius:20px 20px 0 0; }
      #cbp-btn-pill, #cbp-btn-round { bottom:16px; right:16px; }
    }
  `;
  document.head.appendChild(style);

  const SVG_CHAT = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  const SVG_CLOSE = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

  // Box
  const box = document.createElement('div');
  box.id = 'cbp-box';
  box.innerHTML = '<div id="cbp-header"><div id="cbp-avatar"></div><div id="cbp-hinfo"><div id="cbp-hname">Assistent</div><div id="cbp-hstatus">Online</div></div><button id="cbp-close">✕</button></div><div id="cbp-msgs"></div><div id="cbp-input-row"><input id="cbp-input" placeholder="Nachricht eingeben..." /><button id="cbp-send"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg></button></div><div id="cbp-powered">Powered by Chatbot24</div>';
  document.body.appendChild(box);

  let history = [], clientConfig = null, activeBtn = null, bubbleEl = null, currentStyle = 'round';

  function getIconContent(cfg) {
    if (!cfg) return SVG_CHAT;
    if (cfg.botLogoBase64) return '<img src="' + cfg.botLogoBase64 + '" alt="" />';
    if (cfg.botIcon && cfg.botIcon !== '__logo__') return '<span class="cbp-emoji">' + cfg.botIcon + '</span>';
    return SVG_CHAT;
  }

  function buildButton(cfg) {
    ['cbp-btn-round','cbp-btn-pill','cbp-btn-tab'].forEach(function(id){ const el=document.getElementById(id); if(el) el.remove(); });
    if (bubbleEl) { bubbleEl.remove(); bubbleEl = null; }

    currentStyle = (cfg && cfg.widgetStyle) || 'round';
    const iconContent = getIconContent(cfg);
    const btnText = (cfg && cfg.widgetButtonText) || 'Wie kann ich helfen?';

    let btn;
    if (currentStyle === 'pill') {
      btn = document.createElement('button');
      btn.id = 'cbp-btn-pill';
      btn.innerHTML = '<span class="cbp-pill-icon">' + iconContent + '</span><span class="cbp-pill-text">' + btnText + '</span><span class="cbp-pill-dot"></span>';
    } else if (currentStyle === 'tab') {
      btn = document.createElement('button');
      btn.id = 'cbp-btn-tab';
      btn.innerHTML = SVG_CHAT + '<span>' + btnText + '</span>';
    } else {
      btn = document.createElement('button');
      btn.id = 'cbp-btn-round';
      btn.innerHTML = iconContent;
    }
    document.body.appendChild(btn);
    activeBtn = btn;
    btn.addEventListener('click', toggleBox);

    // Auto popup
    if (cfg && cfg.widgetAutoPopup && cfg.welcome) {
      const delay = (cfg.widgetAutoDelay || 3) * 1000;
      setTimeout(function() {
        if (box.classList.contains('open')) return;
        bubbleEl = document.createElement('div');
        bubbleEl.id = 'cbp-bubble';
        bubbleEl.innerHTML = '<button id="cbp-bubble-close">✕</button>' + cfg.welcome;
        document.body.appendChild(bubbleEl);
        bubbleEl.style.display = 'block';
        document.getElementById('cbp-bubble-close').addEventListener('click', function(e) { e.stopPropagation(); bubbleEl.style.display='none'; });
        bubbleEl.addEventListener('click', function() { bubbleEl.style.display='none'; openBox(); });
      }, delay);
    }
  }

  function toggleBox() { box.classList.contains('open') ? closeBox() : openBox(); }

  function openBox() {
    box.classList.add('open');
    if (bubbleEl) bubbleEl.style.display = 'none';
    if (activeBtn && currentStyle === 'round') activeBtn.innerHTML = SVG_CLOSE;
    setTimeout(function(){ document.getElementById('cbp-input').focus(); }, 100);
  }

  function closeBox() {
    box.classList.remove('open');
    if (activeBtn && currentStyle === 'round' && clientConfig) activeBtn.innerHTML = getIconContent(clientConfig);
  }

  // Load config
  fetch(BASE + '/api/admin/' + clientId)
    .then(function(r){ return r.json(); })
    .then(function(cfg) {
      clientConfig = cfg;
      var avatar = document.getElementById('cbp-avatar');
      if (cfg.botLogoBase64) {
        avatar.innerHTML = '<img src="' + cfg.botLogoBase64 + '" alt="" />';
      } else {
        avatar.textContent = cfg.initials || (cfg.name || 'CB').slice(0,2).toUpperCase();
      }
      document.getElementById('cbp-hname').textContent = cfg.botName || 'Assistent';
      addMsg(cfg.welcome || 'Hallo! Wie kann ich Ihnen helfen?', 'bot');
      buildButton(cfg);
    })
    .catch(function() {
      addMsg('Hallo! Wie kann ich Ihnen helfen?', 'bot');
      buildButton(null);
    });

  function addMsg(text, type) {
    var msgs = document.getElementById('cbp-msgs');
    var div = document.createElement('div');
    div.className = 'cbp-msg ' + type;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  async function sendMsg() {
    var input = document.getElementById('cbp-input');
    var send = document.getElementById('cbp-send');
    var text = input.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    history.push({ role: 'user', content: text });
    input.value = '';
    send.disabled = true;
    var typing = addMsg('…', 'bot typing');
    try {
      var res = await fetch(BASE + '/api/chat/' + clientId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      var data = await res.json();
      var reply = data.reply || 'Entschuldigung, bitte erneut versuchen.';
      history.push({ role: 'assistant', content: reply });
      typing.className = 'cbp-msg bot';
      typing.textContent = reply;
    } catch(e) {
      typing.className = 'cbp-msg bot';
      typing.textContent = 'Verbindungsfehler.';
    }
    send.disabled = false;
    document.getElementById('cbp-msgs').scrollTop = 99999;
  }

  document.getElementById('cbp-close').addEventListener('click', closeBox);
  document.getElementById('cbp-send').addEventListener('click', sendMsg);
  document.getElementById('cbp-input').addEventListener('keydown', function(e){ if(e.key==='Enter') sendMsg(); });
})();
