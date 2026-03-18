const API = 'http://localhost:5000/api';

let token          = localStorage.getItem('lb_token') || null;
let currentUser    = JSON.parse(localStorage.getItem('lb_user') || 'null');
let currentSession = null;
let currentLang    = 'en';
let sessions       = [];
let isRecording    = false;
let recognition    = null;
let isDarkMode     = localStorage.getItem('lb_theme') !== 'light';
let pendingImage   = null; // { base64, mimeType, previewUrl }

const authScreen    = document.getElementById('auth-screen');
const appScreen     = document.getElementById('app-screen');
const authAlert     = document.getElementById('auth-alert');
const messagesArea  = document.getElementById('messages-area');
const welcomeScreen = document.getElementById('welcome-screen');
const msgInput      = document.getElementById('msg-input');
const sessionsList  = document.getElementById('sessions-list');
const chatTitle     = document.getElementById('chat-title');
const chatLangBadge = document.getElementById('chat-lang-badge');
const chatLangSelect= document.getElementById('chat-lang-select');

applyTheme();
if (token && currentUser) { showApp(); } else { showAuth(); }

// ── THEME ─────────────────────────────────────────────────────
function applyTheme() {
  document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = isDarkMode ? '☀️' : '🌙';
}
document.getElementById('btn-theme').addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  localStorage.setItem('lb_theme', isDarkMode ? 'dark' : 'light');
  applyTheme();
});

// ── AUTH TABS ─────────────────────────────────────────────────
const tabBtns     = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const authTabs    = document.querySelector('.auth-tabs');
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + target).classList.add('active');
    authTabs.dataset.active = target;
    clearAlert();
  });
});

document.getElementById('reg-username').addEventListener('input', e => {
  const v = e.target.value; const hint = document.getElementById('hint-username');
  if (!v) { hint.textContent=''; return; }
  if (!/^[a-zA-Z0-9_]{3,50}$/.test(v)) { hint.style.color='var(--danger)'; hint.textContent='3-50 alphanumeric or underscore'; }
  else { hint.style.color='var(--success)'; hint.textContent='✓ Looks good'; }
});
document.getElementById('reg-email').addEventListener('input', e => {
  const v = e.target.value; const hint = document.getElementById('hint-email');
  if (!v) { hint.textContent=''; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { hint.style.color='var(--danger)'; hint.textContent='Enter a valid email'; }
  else { hint.style.color='var(--success)'; hint.textContent='✓ Valid email'; }
});
document.getElementById('reg-password').addEventListener('input', e => {
  const v = e.target.value; const bar = document.getElementById('pw-strength');
  const levels = [v.length>=8,/[A-Z]/.test(v),/[0-9]/.test(v),/[^A-Za-z0-9]/.test(v)];
  const score = levels.filter(Boolean).length;
  const colors = ['var(--danger)','var(--warn)','var(--warn)','var(--success)'];
  bar.innerHTML = [1,2,3,4].map(i=>`<span style="background:${i<=score?colors[score-1]:'var(--surface3)'}"></span>`).join('');
});
document.getElementById('reg-confirm').addEventListener('input', e => {
  const pw = document.getElementById('reg-password').value; const hint = document.getElementById('hint-confirm');
  if (!e.target.value) { hint.textContent=''; return; }
  if (e.target.value!==pw) { hint.style.color='var(--danger)'; hint.textContent='Passwords do not match'; }
  else { hint.style.color='var(--success)'; hint.textContent='✓ Passwords match'; }
});

document.getElementById('btn-login').addEventListener('click', async () => {
  const email=document.getElementById('login-email').value.trim();
  const password=document.getElementById('login-password').value;
  if (!email||!password) return showAlert('Please fill in all fields.','error');
  setLoading('btn-login',true);
  try {
    const res=await apiFetch('/auth/login','POST',{email,password});
    token=res.token; currentUser=res.user;
    localStorage.setItem('lb_token',token); localStorage.setItem('lb_user',JSON.stringify(currentUser));
    showApp();
  } catch(err) { showAlert(err.message||'Login failed.','error'); }
  finally { setLoading('btn-login',false); }
});
document.getElementById('btn-register').addEventListener('click', async () => {
  const username=document.getElementById('reg-username').value.trim();
  const email=document.getElementById('reg-email').value.trim();
  const password=document.getElementById('reg-password').value;
  const confirm=document.getElementById('reg-confirm').value;
  const preferred_lang=document.getElementById('reg-lang').value;
  if (!username||!email||!password||!confirm) return showAlert('Please fill in all fields.','error');
  if (password!==confirm) return showAlert('Passwords do not match.','error');
  if (password.length<8) return showAlert('Password must be at least 8 characters.','error');
  setLoading('btn-register',true);
  try {
    const res=await apiFetch('/auth/register','POST',{username,email,password,preferred_lang});
    token=res.token; currentUser=res.user;
    localStorage.setItem('lb_token',token); localStorage.setItem('lb_user',JSON.stringify(currentUser));
    showApp();
  } catch(err) { showAlert(err.message||'Registration failed.','error'); }
  finally { setLoading('btn-register',false); }
});

function showAuth() { authScreen.classList.remove('hidden'); appScreen.classList.add('hidden'); }
function showApp() {
  authScreen.classList.add('hidden'); appScreen.classList.remove('hidden');
  document.getElementById('user-name-display').textContent  = currentUser.username;
  document.getElementById('user-email-display').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent        = currentUser.username[0].toUpperCase();
  currentLang = currentUser.preferred_lang || 'en';
  chatLangSelect.value = currentLang;
  updateLangBadge(); loadSessions();
}

chatLangSelect.addEventListener('change', () => { currentLang=chatLangSelect.value; updateLangBadge(); });
function updateLangBadge() {
  const m={en:'EN',hi:'HI',mr:'MR',es:'ES',fr:'FR',de:'DE',zh:'ZH',ar:'AR',ja:'JA',pt:'PT',ru:'RU',bn:'BN',ur:'UR',ta:'TA',te:'TE',ko:'KO'};
  chatLangBadge.textContent=m[currentLang]||currentLang.toUpperCase();
}

// ── LANGUAGE DETECTION ────────────────────────────────────────
const LANG_DETECT_MAP = [
  {code:'hi',regex:/[\u0900-\u097F]/},{code:'ar',regex:/[\u0600-\u06FF]/},
  {code:'zh',regex:/[\u4E00-\u9FFF]/},{code:'ja',regex:/[\u3040-\u30FF]/},
  {code:'ko',regex:/[\uAC00-\uD7AF]/},{code:'ru',regex:/[\u0400-\u04FF]/},
  {code:'bn',regex:/[\u0980-\u09FF]/},{code:'ta',regex:/[\u0B80-\u0BFF]/},{code:'te',regex:/[\u0C00-\u0C7F]/},
];
function detectLanguage(text) {
  for (const {code,regex} of LANG_DETECT_MAP) { if (regex.test(text)) return code; }
  return null;
}
msgInput.addEventListener('input', () => {
  autoResize(msgInput);
  const text = msgInput.value;
  if (text.length > 5) {
    const detected = detectLanguage(text);
    if (detected && detected !== currentLang) { currentLang=detected; chatLangSelect.value=currentLang; updateLangBadge(); showLangToast(detected); }
  }
});
function showLangToast(lang) {
  const names={hi:'Hindi',ar:'Arabic',zh:'Chinese',ja:'Japanese',ko:'Korean',ru:'Russian',bn:'Bengali',ta:'Tamil',te:'Telugu'};
  let t=document.getElementById('lang-toast');
  if (!t) { t=document.createElement('div'); t.id='lang-toast'; t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;padding:8px 18px;border-radius:20px;font-size:13px;z-index:999;transition:opacity .3s;pointer-events:none;'; document.body.appendChild(t); }
  t.textContent='🌐 Detected: '+(names[lang]||lang); t.style.opacity='1';
  clearTimeout(t._t); t._t=setTimeout(()=>{t.style.opacity='0';},2500);
}

// ── SEARCH ────────────────────────────────────────────────────
document.getElementById('search-input').addEventListener('input', function() {
  const q = this.value.toLowerCase().trim();
  document.querySelectorAll('.session-item').forEach(item => {
    item.style.display = (!q || item.querySelector('.s-title').textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
});

// ── SESSIONS ─────────────────────────────────────────────────
async function loadSessions() {
  try { sessions=await apiFetch('/chat/sessions','GET'); renderSessions(); } catch(e) {}
}
function renderSessions() {
  if (!sessions.length) { sessionsList.innerHTML='<p class="sessions-empty">No chats yet. Start one!</p>'; return; }
  sessionsList.innerHTML = sessions.map(s =>
    `<div class="session-item ${currentSession===s.id?'active':''}" data-id="${s.id}" onclick="loadSession(${s.id})">
      <span class="s-title">${escHtml(s.title)}</span>
      <span class="s-lang">${(s.language||'en').toUpperCase()}</span>
      <button class="s-del" onclick="deleteSession(event,${s.id})" title="Delete">✕</button>
    </div>`).join('');
}
async function loadSession(id) {
  currentSession=id;
  const sess=sessions.find(s=>s.id===id);
  if (sess) { chatTitle.textContent=sess.title; currentLang=sess.language||'en'; chatLangSelect.value=currentLang; updateLangBadge(); }
  renderSessions(); welcomeScreen.style.display='none';
  Array.from(messagesArea.children).forEach(c=>{if(c!==welcomeScreen)c.remove();});
  try {
    const msgs=await apiFetch('/chat/messages/'+id,'GET');
    msgs.forEach(m=>appendMessage(m.role==='user'?'user':'bot',m.content,false));
    scrollToBottom();
  } catch(e) {}
  closeSidebar();
}
async function deleteSession(e,id) {
  e.stopPropagation();
  if (!confirm('Delete this chat?')) return;
  try { await apiFetch('/chat/sessions/'+id,'DELETE'); sessions=sessions.filter(s=>s.id!==id); if(currentSession===id){currentSession=null;resetChat();} renderSessions(); } catch(e) {}
}
document.getElementById('btn-new-chat').addEventListener('click', ()=>{currentSession=null;resetChat();closeSidebar();});
function resetChat() {
  chatTitle.textContent='New Chat';
  Array.from(messagesArea.children).forEach(c=>{if(c!==welcomeScreen)c.remove();});
  welcomeScreen.style.display='flex'; renderSessions();
  clearImagePreview();
}

// ══════════════════════════════════════════════════════════════
// ── CAMERA & IMAGE FEATURE ────────────────────────────────────
// ══════════════════════════════════════════════════════════════

// Open camera modal
document.getElementById('btn-camera').addEventListener('click', () => {
  document.getElementById('camera-modal').classList.remove('hidden');
  startCamera();
});

// Close camera modal
document.getElementById('btn-camera-close').addEventListener('click', () => {
  stopCamera();
  document.getElementById('camera-modal').classList.add('hidden');
});

// Upload image button
document.getElementById('btn-upload-img').addEventListener('click', () => {
  document.getElementById('file-input').click();
});

// File input handler
document.getElementById('file-input').addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return showToast('Please select an image file.');
  if (file.size > 5 * 1024 * 1024) return showToast('Image too large. Max 5MB.');
  const reader = new FileReader();
  reader.onload = e => {
    const base64Full = e.target.result; // data:image/jpeg;base64,....
    const base64 = base64Full.split(',')[1];
    const mimeType = file.type;
    setPendingImage(base64, mimeType, base64Full);
  };
  reader.readAsDataURL(file);
  this.value = ''; // reset
});

let cameraStream = null;

function startCamera() {
  const video = document.getElementById('camera-video');
  const snap  = document.getElementById('btn-snap');
  const retry = document.getElementById('btn-retry');
  const canvas = document.getElementById('camera-canvas');
  document.getElementById('camera-preview-wrap').classList.add('hidden');
  video.classList.remove('hidden');
  snap.classList.remove('hidden');
  retry.classList.add('hidden');
  canvas.classList.add('hidden');

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => { cameraStream = stream; video.srcObject = stream; })
    .catch(() => {
      showToast('Camera not available. Use upload instead.');
      document.getElementById('camera-modal').classList.add('hidden');
    });
}

function stopCamera() {
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
}

// Snap photo
document.getElementById('btn-snap').addEventListener('click', () => {
  const video  = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  stopCamera();
  video.classList.add('hidden');
  document.getElementById('btn-snap').classList.add('hidden');
  document.getElementById('btn-retry').classList.remove('hidden');

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const base64  = dataUrl.split(',')[1];

  // Show preview inside modal
  const prev = document.getElementById('camera-preview-img');
  prev.src = dataUrl;
  document.getElementById('camera-preview-wrap').classList.remove('hidden');

  document.getElementById('btn-use-photo').dataset.base64   = base64;
  document.getElementById('btn-use-photo').dataset.mimetype = 'image/jpeg';
  document.getElementById('btn-use-photo').dataset.preview  = dataUrl;
});

// Retry
document.getElementById('btn-retry').addEventListener('click', () => {
  document.getElementById('camera-preview-wrap').classList.add('hidden');
  startCamera();
});

// Use photo
document.getElementById('btn-use-photo').addEventListener('click', function() {
  setPendingImage(this.dataset.base64, this.dataset.mimetype, this.dataset.preview);
  stopCamera();
  document.getElementById('camera-modal').classList.add('hidden');
});

function setPendingImage(base64, mimeType, previewUrl) {
  pendingImage = { base64, mimeType, previewUrl };
  const wrap = document.getElementById('image-preview-wrap');
  const img  = document.getElementById('image-preview-thumb');
  img.src = previewUrl;
  wrap.classList.remove('hidden');
  msgInput.placeholder = 'Ask about this image… (or send as-is to analyze)';
  showToast('📷 Image ready! Type a question or send to analyze.');
}

document.getElementById('btn-remove-image').addEventListener('click', clearImagePreview);

function clearImagePreview() {
  pendingImage = null;
  document.getElementById('image-preview-wrap').classList.add('hidden');
  msgInput.placeholder = 'Type or speak your message…';
}

// ── SEND MESSAGE (with optional image) ───────────────────────
async function sendMessage() {
  const text  = msgInput.value.trim();
  const image = pendingImage;

  if (!text && !image) return;

  msgInput.value = ''; autoResize(msgInput);
  welcomeScreen.style.display = 'none';

  // Show user message with image if present
  if (image) {
    appendImageMessage('user', text, image.previewUrl);
    clearImagePreview();
  } else {
    appendMessage('user', text);
  }

  const typing = showTyping();

  try {
    let res;
    if (image) {
      // Send as image analysis request
      res = await apiFetch('/chat/image', 'POST', {
        message:    text || 'Please analyze this image. Detect any text, identify the language, translate if needed, and describe what you see.',
        language:   currentLang,
        session_id: currentSession || undefined,
        image:      image.base64,
        mime_type:  image.mimeType
      });
    } else {
      res = await apiFetch('/chat/message', 'POST', { message: text, language: currentLang, session_id: currentSession || undefined });
    }

    removeTyping(typing);
    appendMessageStream('bot', res.reply);
    if (!currentSession) { currentSession = res.session_id; chatTitle.textContent = (text || '📷 Image').slice(0, 50); await loadSessions(); }
  } catch(err) {
    removeTyping(typing);
    appendMessage('bot', '⚠️ Error: ' + (err.message || 'Server error.'));
  }
}

document.getElementById('btn-send').addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();} });

// ── MESSAGE RENDERING ─────────────────────────────────────────
function appendImageMessage(role, text, imgUrl) {
  const div  = document.createElement('div');
  div.className = 'msg ' + role;
  const time = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  div.innerHTML = `
    <div class="msg-avatar">👤</div>
    <div class="msg-body">
      <div class="msg-bubble">
        <img src="${imgUrl}" class="msg-image" alt="Sent image"/>
        ${text ? `<p style="margin-top:8px">${escHtml(text)}</p>` : ''}
      </div>
      <div class="msg-actions">
        <span class="msg-meta">${time}</span>
        <div class="msg-btns">
          <button class="msg-action-btn" onclick="copyMsg(this)" title="Copy">📋</button>
          <button class="msg-action-btn react-btn" onclick="reactMsg(this,'👍')" title="Like">👍</button>
          <button class="msg-action-btn react-btn" onclick="reactMsg(this,'👎')" title="Dislike">👎</button>
        </div>
      </div>
    </div>`;
  messagesArea.appendChild(div); scrollToBottom();
}

function appendMessageStream(role, text) {
  const div = createMsgEl(role, '');
  messagesArea.appendChild(div); scrollToBottom();
  const bubble = div.querySelector('.msg-bubble');
  const words = text.split(' '); let i = 0;
  const iv = setInterval(() => {
    if (i < words.length) { bubble.innerHTML = escHtml(words.slice(0,i+1).join(' ')) + '<span class="cursor">▋</span>'; i++; scrollToBottom(); }
    else { bubble.innerHTML = escHtml(text); clearInterval(iv); }
  }, 30);
}

function appendMessage(role, text, scroll=true) {
  const div = createMsgEl(role, text);
  messagesArea.appendChild(div);
  if (scroll) scrollToBottom();
}

function createMsgEl(role, text) {
  const div  = document.createElement('div');
  div.className = 'msg ' + role;
  const time = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const isBot = role === 'bot';
  div.innerHTML = `
    <div class="msg-avatar">${isBot?'🤖':'👤'}</div>
    <div class="msg-body">
      <div class="msg-bubble">${escHtml(text)}</div>
      <div class="msg-actions">
        <span class="msg-meta">${time}</span>
        <div class="msg-btns">
          <button class="msg-action-btn" onclick="copyMsg(this)" title="Copy">📋</button>
          ${isBot?`<button class="msg-action-btn" onclick="speakMsg(this)" title="Read aloud">🔊</button>`:''}
          <button class="msg-action-btn react-btn" onclick="reactMsg(this,'👍')" title="Like">👍</button>
          <button class="msg-action-btn react-btn" onclick="reactMsg(this,'👎')" title="Dislike">👎</button>
        </div>
      </div>
    </div>`;
  return div;
}

// ── MESSAGE ACTIONS ───────────────────────────────────────────
window.copyMsg = function(btn) {
  const bubble = btn.closest('.msg-body').querySelector('.msg-bubble');
  navigator.clipboard.writeText(bubble.innerText).then(() => { btn.textContent='✅'; setTimeout(()=>btn.textContent='📋',1500); });
};
window.speakMsg = function(btn) {
  const bubble = btn.closest('.msg-body').querySelector('.msg-bubble');
  speakText(bubble.innerText, currentLang);
  btn.textContent='🔈'; setTimeout(()=>btn.textContent='🔊',2000);
};
window.reactMsg = function(btn, emoji) {
  const siblings = btn.closest('.msg-btns').querySelectorAll('.react-btn');
  siblings.forEach(b=>b.classList.remove('reacted'));
  btn.classList.toggle('reacted');
  showToast(btn.classList.contains('reacted') ? emoji+' Reaction added' : 'Reaction removed');
};

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t=document.createElement('div'); t.id='toast'; t.style.cssText='position:fixed;bottom:90px;right:20px;background:var(--surface3);color:var(--text);border:1px solid var(--border);padding:8px 16px;border-radius:12px;font-size:13px;z-index:999;transition:opacity .3s;pointer-events:none;'; document.body.appendChild(t); }
  t.textContent=msg; t.style.opacity='1';
  clearTimeout(t._t); t._t=setTimeout(()=>{t.style.opacity='0';},2500);
}

function showTyping() {
  const div=document.createElement('div'); div.className='msg bot';
  div.innerHTML='<div class="msg-avatar">🤖</div><div class="msg-body"><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>';
  messagesArea.appendChild(div); scrollToBottom(); return div;
}
function removeTyping(el) { el?.remove(); }
function scrollToBottom() { messagesArea.scrollTop=messagesArea.scrollHeight; }

// ── VOICE ─────────────────────────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const LANG_CODES = {en:'en-US',hi:'hi-IN',mr:'mr-IN',es:'es-ES',fr:'fr-FR',de:'de-DE',zh:'zh-CN',ar:'ar-SA',ja:'ja-JP',pt:'pt-BR',ru:'ru-RU',bn:'bn-IN',ur:'ur-PK',ta:'ta-IN',te:'te-IN',ko:'ko-KR'};

document.getElementById('btn-voice').addEventListener('click', () => {
  if (!SpeechRecognition) { alert('Voice not supported in this browser.'); return; }
  if (isRecording) { recognition.stop(); return; }
  recognition = new SpeechRecognition();
  recognition.lang = LANG_CODES[currentLang]||'en-US'; recognition.continuous=false; recognition.interimResults=true;
  recognition.onstart = ()=>{ isRecording=true; document.getElementById('btn-voice').classList.add('recording'); document.getElementById('btn-voice').textContent='⏹'; };
  recognition.onresult = e=>{ const t=Array.from(e.results).map(r=>r[0].transcript).join(''); msgInput.value=t; autoResize(msgInput); };
  recognition.onend = ()=>{ isRecording=false; document.getElementById('btn-voice').classList.remove('recording'); document.getElementById('btn-voice').textContent='🎤'; if(msgInput.value.trim()) sendMessage(); };
  recognition.onerror = ()=>{ isRecording=false; document.getElementById('btn-voice').classList.remove('recording'); document.getElementById('btn-voice').textContent='🎤'; };
  recognition.start();
});

function speakText(text, lang) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text); u.lang=LANG_CODES[lang]||'en-US'; u.rate=0.95;
  window.speechSynthesis.speak(u);
}

// ── EXPORT ────────────────────────────────────────────────────
document.getElementById('btn-export').addEventListener('click', () => {
  const msgs=messagesArea.querySelectorAll('.msg');
  if (!msgs.length) return showToast('No messages to export!');
  let content='LingoGO Chat Export\nSession: '+chatTitle.textContent+'\nDate: '+new Date().toLocaleString()+'\n'+'─'.repeat(50)+'\n\n';
  msgs.forEach(msg=>{ const role=msg.classList.contains('user')?'You':'LingoGO'; const bubble=msg.querySelector('.msg-bubble'); const meta=msg.querySelector('.msg-meta'); content+='['+(meta?meta.innerText:'')+'] '+role+':\n'+(bubble?bubble.innerText:'')+'\n\n'; });
  const blob=new Blob([content],{type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download='LingoGO-'+Date.now()+'.txt'; a.click(); URL.revokeObjectURL(url);
  showToast('📄 Chat exported!');
});
document.getElementById('btn-export-pdf').addEventListener('click', () => {
  const msgs=messagesArea.querySelectorAll('.msg');
  if (!msgs.length) return showToast('No messages!');
  const w=window.open('','_blank');
  let html='<html><head><title>LingoGO</title><style>body{font-family:sans-serif;max-width:700px;margin:40px auto;color:#111}h2{color:#7C3AED}.msg{margin-bottom:14px;padding:12px;border-radius:10px}.user{background:#EDE9FE;text-align:right}.bot{background:#F3F4F6}.role{font-size:11px;font-weight:bold;color:#666;margin-bottom:4px}.time{font-size:11px;color:#aaa;margin-top:4px}img{max-width:200px;border-radius:8px}</style></head><body><h2>🌐 LingoGO</h2><p style="color:#888">'+chatTitle.textContent+' — '+new Date().toLocaleString()+'</p>';
  msgs.forEach(msg=>{ const role=msg.classList.contains('user')?'You':'LingoGO'; const bubble=msg.querySelector('.msg-bubble'); const meta=msg.querySelector('.msg-meta'); html+='<div class="msg '+(msg.classList.contains('user')?'user':'bot')+'"><div class="role">'+role+'</div><div>'+(bubble?bubble.innerHTML:'')+'</div><div class="time">'+(meta?meta.innerText:'')+'</div></div>'; });
  html+='</body></html>'; w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
});

// ── TRANSLATE ─────────────────────────────────────────────────
document.getElementById('btn-translate-toggle').addEventListener('click', ()=>{ document.getElementById('translate-panel').classList.toggle('hidden'); });
document.getElementById('btn-do-translate').addEventListener('click', async () => {
  const text=document.getElementById('translate-input').value.trim();
  const target=document.getElementById('translate-target').value;
  const result=document.getElementById('translate-result');
  if (!text) return; result.textContent='Translating…';
  try { const res=await apiFetch('/chat/translate','POST',{text,target_language:target}); result.textContent=res.translation; }
  catch(err) { result.textContent='Error: '+err.message; }
});

// ── CLEAR CHAT ────────────────────────────────────────────────
document.getElementById('btn-clear-chat').addEventListener('click', () => {
  if (!confirm('Clear current chat view?')) return;
  Array.from(messagesArea.children).forEach(c=>{if(c!==welcomeScreen)c.remove();});
  welcomeScreen.style.display='flex'; showToast('🗑️ Chat cleared');
});

// ── LOGOUT ────────────────────────────────────────────────────
document.getElementById('btn-logout').addEventListener('click', () => {
  token=null; currentUser=null; currentSession=null;
  localStorage.removeItem('lb_token'); localStorage.removeItem('lb_user'); showAuth();
});

// ── MOBILE SIDEBAR ────────────────────────────────────────────
document.getElementById('btn-menu').addEventListener('click', ()=>{ document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').classList.remove('hidden'); });
document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.add('hidden'); }

// ── UTILS ─────────────────────────────────────────────────────
async function apiFetch(path,method='GET',body=null) {
  const opts={method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}};
  if(body) opts.body=JSON.stringify(body);
  const res=await fetch(API+path,opts); const data=await res.json();
  if(!res.ok) throw new Error(data.error||'Request failed.');
  return data;
}
function showAlert(msg,type='error'){authAlert.textContent=msg;authAlert.className='alert '+type;}
function clearAlert(){authAlert.className='alert hidden';}
function setLoading(id,loading){const b=document.getElementById(id);b.disabled=loading;b.textContent=loading?'Please wait…':(id==='btn-login'?'Sign In':'Create Account');}
function escHtml(str){return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>');}
function autoResize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,140)+'px';}
window.togglePw=function(id,btn){const inp=document.getElementById(id);if(inp.type==='password'){inp.type='text';btn.textContent='🙈';}else{inp.type='password';btn.textContent='👁';}};
window.loadSession=loadSession; window.deleteSession=deleteSession; window.speakText=speakText;