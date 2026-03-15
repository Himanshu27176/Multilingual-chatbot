const API = 'http://localhost:5000/api';

let token       = localStorage.getItem('lb_token') || null;
let currentUser = JSON.parse(localStorage.getItem('lb_user') || 'null');
let currentSession = null;
let currentLang    = 'en';
let sessions       = [];
let isRecording    = false;
let mediaRecorder  = null;
let recognition    = null;

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

if (token && currentUser) { showApp(); } else { showAuth(); }

// ── AUTH TABS ─────────────────────────────────────
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

// ── LIVE VALIDATION ───────────────────────────────
document.getElementById('reg-username').addEventListener('input', e => {
  const v = e.target.value;
  const hint = document.getElementById('hint-username');
  if (!v) { hint.textContent = ''; return; }
  if (!/^[a-zA-Z0-9_]{3,50}$/.test(v)) {
    hint.style.color = 'var(--danger)'; hint.textContent = '3-50 alphanumeric characters';
  } else { hint.style.color = 'var(--success)'; hint.textContent = '✓ Looks good'; }
});

document.getElementById('reg-email').addEventListener('input', e => {
  const v = e.target.value;
  const hint = document.getElementById('hint-email');
  if (!v) { hint.textContent = ''; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    hint.style.color = 'var(--danger)'; hint.textContent = 'Enter a valid email';
  } else { hint.style.color = 'var(--success)'; hint.textContent = '✓ Valid email'; }
});

document.getElementById('reg-password').addEventListener('input', e => {
  const v = e.target.value;
  const bar = document.getElementById('pw-strength');
  const levels = [v.length >= 8, /[A-Z]/.test(v), /[0-9]/.test(v), /[^A-Za-z0-9]/.test(v)];
  const score = levels.filter(Boolean).length;
  const colors = ['var(--danger)', 'var(--warn)', 'var(--warn)', 'var(--success)'];
  bar.innerHTML = [1,2,3,4].map(i =>
    '<span style="background:' + (i<=score ? colors[score-1] : 'var(--surface3)') + '"></span>'
  ).join('');
});

document.getElementById('reg-confirm').addEventListener('input', e => {
  const pw = document.getElementById('reg-password').value;
  const hint = document.getElementById('hint-confirm');
  if (!e.target.value) { hint.textContent = ''; return; }
  if (e.target.value !== pw) { hint.style.color='var(--danger)'; hint.textContent='Passwords do not match'; }
  else { hint.style.color='var(--success)'; hint.textContent='✓ Passwords match'; }
});

// ── LOGIN ─────────────────────────────────────────
document.getElementById('btn-login').addEventListener('click', async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showAlert('Please fill in all fields.', 'error');
  setLoading('btn-login', true);
  try {
    const res = await apiFetch('/auth/login', 'POST', { email, password });
    token = res.token; currentUser = res.user;
    localStorage.setItem('lb_token', token);
    localStorage.setItem('lb_user', JSON.stringify(currentUser));
    showApp();
  } catch (err) { showAlert(err.message || 'Login failed.', 'error'); }
  finally { setLoading('btn-login', false); }
});

// ── REGISTER ──────────────────────────────────────
document.getElementById('btn-register').addEventListener('click', async () => {
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;
  const preferred_lang = document.getElementById('reg-lang').value;
  if (!username || !email || !password || !confirm) return showAlert('Please fill in all fields.', 'error');
  if (password !== confirm) return showAlert('Passwords do not match.', 'error');
  if (password.length < 8) return showAlert('Password must be at least 8 characters.', 'error');
  setLoading('btn-register', true);
  try {
    const res = await apiFetch('/auth/register', 'POST', { username, email, password, preferred_lang });
    token = res.token; currentUser = res.user;
    localStorage.setItem('lb_token', token);
    localStorage.setItem('lb_user', JSON.stringify(currentUser));
    showApp();
  } catch (err) { showAlert(err.message || 'Registration failed.', 'error'); }
  finally { setLoading('btn-register', false); }
});

// ── SHOW/HIDE SCREENS ─────────────────────────────
function showAuth() {
  authScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
}

function showApp() {
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  document.getElementById('user-name-display').textContent  = currentUser.username;
  document.getElementById('user-email-display').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent        = currentUser.username[0].toUpperCase();
  currentLang = currentUser.preferred_lang || 'en';
  chatLangSelect.value = currentLang;
  updateLangBadge();
  loadSessions();
}

// ── LANGUAGE ──────────────────────────────────────
chatLangSelect.addEventListener('change', () => {
  currentLang = chatLangSelect.value;
  updateLangBadge();
  updateSpeechLang();
});

function updateLangBadge() {
  const langMap = { en:'EN',hi:'HI',mr:'MR',es:'ES',fr:'FR',de:'DE',zh:'ZH',ar:'AR',ja:'JA',pt:'PT',ru:'RU',bn:'BN',ur:'UR',ta:'TA',te:'TE',ko:'KO' };
  chatLangBadge.textContent = langMap[currentLang] || currentLang.toUpperCase();
}

// ── AUTO LANGUAGE DETECTION ───────────────────────
const LANG_DETECT_MAP = [
  { code: 'hi', regex: /[\u0900-\u097F]/ },
  { code: 'mr', regex: /[\u0900-\u097F][\u0900-\u097F][\u0900-\u097F]/ },
  { code: 'ar', regex: /[\u0600-\u06FF]/ },
  { code: 'zh', regex: /[\u4E00-\u9FFF]/ },
  { code: 'ja', regex: /[\u3040-\u30FF]/ },
  { code: 'ko', regex: /[\uAC00-\uD7AF]/ },
  { code: 'ru', regex: /[\u0400-\u04FF]/ },
  { code: 'bn', regex: /[\u0980-\u09FF]/ },
  { code: 'ta', regex: /[\u0B80-\u0BFF]/ },
  { code: 'te', regex: /[\u0C00-\u0C7F]/ },
  { code: 'ur', regex: /[\u0600-\u06FF]/ },
];

function detectLanguage(text) {
  for (const { code, regex } of LANG_DETECT_MAP) {
    if (regex.test(text)) return code;
  }
  return null;
}

msgInput.addEventListener('input', () => {
  autoResize(msgInput);
  const text = msgInput.value;
  if (text.length > 5) {
    const detected = detectLanguage(text);
    if (detected && detected !== currentLang) {
      currentLang = detected;
      chatLangSelect.value = currentLang;
      updateLangBadge();
      updateSpeechLang();
      showLangDetectedToast(detected);
    }
  }
});

function showLangDetectedToast(lang) {
  const names = { hi:'Hindi', mr:'Marathi', ar:'Arabic', zh:'Chinese', ja:'Japanese', ko:'Korean', ru:'Russian', bn:'Bengali', ta:'Tamil', te:'Telugu', ur:'Urdu' };
  let toast = document.getElementById('lang-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'lang-toast';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;padding:8px 18px;border-radius:20px;font-size:13px;z-index:999;transition:opacity .3s;';
    document.body.appendChild(toast);
  }
  toast.textContent = '🌐 Language detected: ' + (names[lang] || lang);
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ── SESSIONS ──────────────────────────────────────
async function loadSessions() {
  try { sessions = await apiFetch('/chat/sessions', 'GET'); renderSessions(); } catch {}
}

function renderSessions() {
  if (!sessions.length) { sessionsList.innerHTML = '<p class="sessions-empty">No chats yet. Start one!</p>'; return; }
  sessionsList.innerHTML = sessions.map(s => `
    <div class="session-item ${currentSession === s.id ? 'active' : ''}" data-id="${s.id}" onclick="loadSession(${s.id})">
      <span class="s-title">${escHtml(s.title)}</span>
      <span class="s-lang">${(s.language||'en').toUpperCase()}</span>
      <button class="s-del" onclick="deleteSession(event,${s.id})" title="Delete">✕</button>
    </div>`).join('');
}

async function loadSession(id) {
  currentSession = id;
  const sess = sessions.find(s => s.id === id);
  if (sess) { chatTitle.textContent = sess.title; currentLang = sess.language || 'en'; chatLangSelect.value = currentLang; updateLangBadge(); }
  renderSessions();
  welcomeScreen.style.display = 'none';
  Array.from(messagesArea.children).forEach(c => { if (c !== welcomeScreen) c.remove(); });
  try {
    const msgs = await apiFetch('/chat/messages/' + id, 'GET');
    msgs.forEach(m => appendMessage(m.role === 'user' ? 'user' : 'bot', m.content, false));
    scrollToBottom();
  } catch {}
  closeSidebar();
}

async function deleteSession(e, id) {
  e.stopPropagation();
  if (!confirm('Delete this chat?')) return;
  try {
    await apiFetch('/chat/sessions/' + id, 'DELETE');
    sessions = sessions.filter(s => s.id !== id);
    if (currentSession === id) { currentSession = null; resetChat(); }
    renderSessions();
  } catch {}
}

document.getElementById('btn-new-chat').addEventListener('click', () => { currentSession = null; resetChat(); closeSidebar(); });

function resetChat() {
  chatTitle.textContent = 'New Chat';
  Array.from(messagesArea.children).forEach(c => { if (c !== welcomeScreen) c.remove(); });
  welcomeScreen.style.display = 'flex';
  renderSessions();
}

// ── SEND MESSAGE ──────────────────────────────────
async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;
  msgInput.value = '';
  autoResize(msgInput);
  welcomeScreen.style.display = 'none';
  appendMessage('user', text);
  const typing = showTyping();
  try {
    const res = await apiFetch('/chat/message', 'POST', { message: text, language: currentLang, session_id: currentSession || undefined });
    removeTyping(typing);
    appendMessageStream('bot', res.reply);
    if (!currentSession) { currentSession = res.session_id; chatTitle.textContent = text.slice(0, 50); await loadSessions(); }
  } catch (err) {
    removeTyping(typing);
    appendMessage('bot', '⚠️ Error: ' + (err.message || 'Could not connect to server.'));
  }
}

document.getElementById('btn-send').addEventListener('click', sendMessage);

msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

// ── TYPING ANIMATION (stream word by word) ────────
function appendMessageStream(role, text) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  const time = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  div.innerHTML = `
    <div class="msg-avatar">${role === 'user' ? '👤' : '🤖'}</div>
    <div class="msg-body">
      <div class="msg-bubble" id="stream-bubble"></div>
      <div class="msg-meta">${time}</div>
    </div>`;
  messagesArea.appendChild(div);
  scrollToBottom();

  const bubble = div.querySelector('#stream-bubble');
  bubble.removeAttribute('id');
  const words = text.split(' ');
  let i = 0;
  const interval = setInterval(() => {
    if (i < words.length) {
      bubble.innerHTML = escHtml(words.slice(0, i + 1).join(' ')) + '<span class="cursor">▋</span>';
      i++;
      scrollToBottom();
    } else {
      bubble.innerHTML = escHtml(text);
      clearInterval(interval);
    }
  }, 30);
}

// ── REGULAR MESSAGE ───────────────────────────────
function appendMessage(role, text, scroll=true) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  const time = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  div.innerHTML = `
    <div class="msg-avatar">${role === 'user' ? '👤' : '🤖'}</div>
    <div class="msg-body">
      <div class="msg-bubble">${escHtml(text)}</div>
      <div class="msg-meta">${time}</div>
    </div>`;
  messagesArea.appendChild(div);
  if (scroll) scrollToBottom();
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-body"><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`;
  messagesArea.appendChild(div);
  scrollToBottom();
  return div;
}

function removeTyping(el) { el?.remove(); }
function scrollToBottom() { messagesArea.scrollTop = messagesArea.scrollHeight; }

// ── VOICE INPUT (Speech Recognition) ─────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const LANG_CODES = { en:'en-US', hi:'hi-IN', mr:'mr-IN', es:'es-ES', fr:'fr-FR', de:'de-DE', zh:'zh-CN', ar:'ar-SA', ja:'ja-JP', pt:'pt-BR', ru:'ru-RU', bn:'bn-IN', ur:'ur-PK', ta:'ta-IN', te:'te-IN', ko:'ko-KR' };

function updateSpeechLang() {
  if (recognition) recognition.lang = LANG_CODES[currentLang] || 'en-US';
}

document.getElementById('btn-voice').addEventListener('click', () => {
  if (!SpeechRecognition) {
    alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
    return;
  }
  if (isRecording) {
    recognition.stop();
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = LANG_CODES[currentLang] || 'en-US';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isRecording = true;
    document.getElementById('btn-voice').classList.add('recording');
    document.getElementById('btn-voice').textContent = '⏹';
  };

  recognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    msgInput.value = transcript;
    autoResize(msgInput);
  };

  recognition.onend = () => {
    isRecording = false;
    document.getElementById('btn-voice').classList.remove('recording');
    document.getElementById('btn-voice').textContent = '🎤';
    if (msgInput.value.trim()) sendMessage();
  };

  recognition.onerror = (e) => {
    isRecording = false;
    document.getElementById('btn-voice').classList.remove('recording');
    document.getElementById('btn-voice').textContent = '🎤';
    console.error('Speech error:', e.error);
  };

  recognition.start();
});

// ── TEXT TO SPEECH ────────────────────────────────
function speakText(text, lang) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = LANG_CODES[lang] || 'en-US';
  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
}

// ── CHAT EXPORT ───────────────────────────────────
document.getElementById('btn-export').addEventListener('click', () => {
  const msgs = messagesArea.querySelectorAll('.msg');
  if (!msgs.length) return alert('No messages to export!');

  let content = 'LinguaBot Chat Export\n';
  content += 'Session: ' + chatTitle.textContent + '\n';
  content += 'Language: ' + currentLang.toUpperCase() + '\n';
  content += 'Date: ' + new Date().toLocaleString() + '\n';
  content += '─'.repeat(50) + '\n\n';

  msgs.forEach(msg => {
    const role    = msg.classList.contains('user') ? 'You' : 'LinguaBot';
    const bubble  = msg.querySelector('.msg-bubble');
    const meta    = msg.querySelector('.msg-meta');
    const text    = bubble ? bubble.innerText : '';
    const time    = meta ? meta.innerText : '';
    content += '[' + time + '] ' + role + ':\n' + text + '\n\n';
  });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'linguabot-chat-' + Date.now() + '.txt';
  a.click();
  URL.revokeObjectURL(url);
});

// Export as PDF
document.getElementById('btn-export-pdf').addEventListener('click', () => {
  const msgs = messagesArea.querySelectorAll('.msg');
  if (!msgs.length) return alert('No messages to export!');
  const printWin = window.open('', '_blank');
  let html = `<html><head><title>LinguaBot Export</title>
  <style>
    body{font-family:sans-serif;max-width:700px;margin:40px auto;color:#111}
    h2{color:#7C3AED}.meta{color:#888;font-size:12px;margin-bottom:20px}
    .msg{margin-bottom:16px;padding:12px 16px;border-radius:12px}
    .user{background:#EDE9FE;text-align:right}.bot{background:#F3F4F6}
    .role{font-size:11px;font-weight:bold;margin-bottom:4px;color:#555}
    .time{font-size:11px;color:#aaa;margin-top:4px}
  </style></head><body>
  <h2>LinguaBot Chat Export</h2>
  <p class="meta">Session: ${chatTitle.textContent} | Language: ${currentLang.toUpperCase()} | Date: ${new Date().toLocaleString()}</p>`;

  msgs.forEach(msg => {
    const role   = msg.classList.contains('user') ? 'You' : 'LinguaBot';
    const bubble = msg.querySelector('.msg-bubble');
    const meta   = msg.querySelector('.msg-meta');
    const cls    = msg.classList.contains('user') ? 'user' : 'bot';
    html += `<div class="msg ${cls}"><div class="role">${role}</div><div>${bubble ? bubble.innerText : ''}</div><div class="time">${meta ? meta.innerText : ''}</div></div>`;
  });

  html += '</body></html>';
  printWin.document.write(html);
  printWin.document.close();
  setTimeout(() => printWin.print(), 500);
});

// ── TRANSLATE PANEL ───────────────────────────────
document.getElementById('btn-translate-toggle').addEventListener('click', () => {
  document.getElementById('translate-panel').classList.toggle('hidden');
});

document.getElementById('btn-do-translate').addEventListener('click', async () => {
  const text   = document.getElementById('translate-input').value.trim();
  const target = document.getElementById('translate-target').value;
  const result = document.getElementById('translate-result');
  if (!text) return;
  result.textContent = 'Translating…';
  try {
    const res = await apiFetch('/chat/translate', 'POST', { text, target_language: target });
    result.textContent = res.translation;
  } catch (err) { result.textContent = 'Error: ' + err.message; }
});

// ── LOGOUT ────────────────────────────────────────
document.getElementById('btn-logout').addEventListener('click', () => {
  token = null; currentUser = null; currentSession = null;
  localStorage.removeItem('lb_token'); localStorage.removeItem('lb_user');
  showAuth();
});

// ── MOBILE SIDEBAR ────────────────────────────────
document.getElementById('btn-menu').addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.remove('hidden');
});
document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.add('hidden');
}

// ── HELPERS ───────────────────────────────────────
async function apiFetch(path, method='GET', body=null) {
  const opts = { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) } };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function showAlert(msg, type='error') { authAlert.textContent = msg; authAlert.className = 'alert ' + type; }
function clearAlert() { authAlert.className = 'alert hidden'; }
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait…' : (btnId === 'btn-login' ? 'Sign In' : 'Create Account');
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>');
}
function autoResize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px'; }

window.togglePw = function(id, btn) {
  const inp = document.getElementById(id);
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
};
window.loadSession   = loadSession;
window.deleteSession = deleteSession;
window.speakText     = speakText;