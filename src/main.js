import { joinRoom, selfId } from '../vendor/trystero.js';

const $ = (id) => document.getElementById(id);
const peers = new Map();
let room = null;
let chat = null;
let profile = null;
let typing = null;
let myName = '';
let currentChannel = '';
let generation = 0;
let connectionTimer;
let toastTimer;
let typingTimer;
let lastTypingAt = 0;
let sending = false;
let lastSendAt = 0;
const receiveRates = new Map();
const seen = new Set();
const MAX_MESSAGES = 300;

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500);
}

function notice(message = '') {
  $('connection-notice').textContent = message;
  $('connection-notice').hidden = !message;
}

function normalizeChannel(value) {
  return value.toLowerCase();
}

function validChannel(value) {
  return /^[A-Za-z0-9]{1,32}$/.test(value);
}

function cleanName(value) {
  return typeof value === 'string' ? value.replace(/[\p{Cc}\p{Cf}]/gu, '').trim().slice(0, 20) : '';
}

function alias(id) { return `익명-${id.slice(0, 4).toUpperCase()}`; }

function updateComposer() {
  $('send-button').disabled = !room || peers.size === 0 || !$('message-input').value.trim() || sending || !navigator.onLine;
  $('character-count').textContent = `${$('message-input').value.length.toLocaleString('en-US')} / 2,000`;
}

function updateParticipants() {
  const list = $('participants');
  list.replaceChildren();
  if (!room) list.append(element('li', 'no-participants', '없음'));
  else {
    for (const [id, name] of [[selfId, myName], ...Array.from(peers, ([id, p]) => [id, p.name])]) {
      const li = element('li');
      li.append(element('span', '', name));
      if (id === selfId) li.append(element('span', 'you-tag', '나'));
      list.append(li);
    }
  }
  $('participant-count').textContent = String(room ? peers.size + 1 : 0);
  $('connection-status').textContent = !room ? '입장 전' : !navigator.onLine ? '인터넷 연결 끊김' : peers.size ? `${peers.size + 1}명 연결됨` : '친구 연결 대기 중';
  $('room-tag').textContent = !room ? '입장 전' : !navigator.onLine ? '오프라인' : peers.size ? `${peers.size + 1}명` : '연결 대기';
  updateComposer();
}

function appendMessage(content) {
  const area = $('message-area');
  const atBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 100;
  $('empty-state').hidden = true;
  $('messages').append(content);
  while ($('messages').children.length > MAX_MESSAGES) $('messages').firstElementChild.remove();
  if (atBottom || content.classList.contains('own')) area.scrollTop = area.scrollHeight;
}

function system(message) { appendMessage(element('div', 'system-message', message)); }

function renderMessage(message, name, own = false) {
  const row = element('article', `message${own ? ' own' : ''}`);
  const body = element('div');
  const meta = element('div', 'message-meta');
  const time = element('time', '', new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }));
  meta.append(element('strong', 'message-name', name + (own ? ' · 나' : '')), time);
  body.append(meta, element('p', 'message-text', message.text));
  const status = element('div', 'message-delivery', own ? '전송 중…' : '');
  if (own) body.append(status);
  row.append(body);
  appendMessage(row);
  return status;
}

function updateTyping() {
  const names = [...peers.values()].filter(p => p.typingUntil > Date.now()).map(p => p.name);
  $('typing-status').textContent = names.length ? `${names.slice(0, 2).join(', ')} 입력 중…` : '';
}

function leave({ resetUrl = true, announce = true } = {}) {
  generation++;
  const oldRoom = room;
  room = chat = profile = typing = null;
  // Clear references and DOM immediately, even if the network is unavailable.
  clearTimeout(connectionTimer);
  clearInterval(typingTimer);
  peers.clear(); receiveRates.clear(); seen.clear();
  $('messages').replaceChildren();
  $('message-input').value = '';
  $('message-input').disabled = true;
  $('message-input').placeholder = '메시지 입력';
  $('typing-status').textContent = '';
  $('empty-state').hidden = false;
  $('empty-title').textContent = '채널명을 정해서 입장하세요.';
  $('empty-description').textContent = '같은 채널명을 입력하면 연결됩니다.';
  $('room-title').textContent = '대기실';
  $('share-button').disabled = $('leave-button').disabled = true;
  $('join-button').textContent = '입장 / 만들기';
  $('channel-input').disabled = $('nickname-input').disabled = $('join-button').disabled = $('random-button').disabled = false;
  document.body.classList.remove('in-room');
  myName = currentChannel = '';
  sending = false;
  lastSendAt = lastTypingAt = 0;
  notice(); updateParticipants();
  if (resetUrl) history.replaceState(null, '', location.pathname + location.search);
  try { Promise.resolve(oldRoom?.leave()).catch(() => {}); } catch { /* Local data is already cleared. */ }
  if (oldRoom && announce) toast('퇴장했습니다.');
}

function enter(value) {
  $('form-error').textContent = '';
  if (!validChannel(value)) {
    $('form-error').textContent = '채널명은 영문·숫자만 1~32자 입력하세요.';
    return;
  }
  const channel = normalizeChannel(value);
  if (!navigator.onLine) { $('form-error').textContent = '인터넷 연결을 확인해 주세요.'; return; }
  if (room) return;
  const token = ++generation;
  myName = cleanName($('nickname-input').value) || `익명-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  currentChannel = channel;
  try {
    room = joinRoom({ appId: `talk-ephemeral-v1:${location.host}${location.pathname.replace(/index\.html$/, '')}` }, channel, {
      onJoinError: () => { if (token === generation) notice('친구와 연결하지 못했습니다. 채널명과 네트워크를 확인해 주세요.'); },
    });
    chat = room.makeAction('message');
    profile = room.makeAction('profile');
    typing = room.makeAction('typing');
    room.onPeerJoin = (id) => {
      if (token !== generation) return;
      peers.set(id, { name: alias(id), typingUntil: 0 });
      profile.send(myName, { target: id }).catch(() => {});
      notice(); updateParticipants();
      system('참여자가 연결되었습니다.');
    };
    room.onPeerLeave = (id) => {
      if (token !== generation) return;
      const name = peers.get(id)?.name || alias(id);
      peers.delete(id); receiveRates.delete(id);
      updateParticipants(); updateTyping();
      system(`${name} 님이 연결을 종료했습니다.`);
      if (!peers.size) notice('연결된 참여자가 없습니다.');
    };
    profile.onMessage = (value, { peerId }) => {
      if (token !== generation || !peers.has(peerId)) return;
      const name = cleanName(value);
      if (name) peers.get(peerId).name = name;
      updateParticipants();
    };
    chat.onMessage = (message, { peerId }) => {
      if (token !== generation || !peers.has(peerId) || !message || typeof message.text !== 'string' || !message.text.trim() || message.text.length > 2000 || typeof message.id !== 'string' || message.id.length > 64) return;
      const key = `${peerId}:${message.id}`;
      if (seen.has(key)) return;
      const now = Date.now();
      const rate = receiveRates.get(peerId) || { since: now, count: 0 };
      if (now - rate.since > 10000) { rate.since = now; rate.count = 0; }
      rate.count++;
      receiveRates.set(peerId, rate);
      if (rate.count > 30) return;
      seen.add(key);
      if (seen.size > 600) seen.delete(seen.values().next().value);
      peers.get(peerId).typingUntil = 0;
      updateTyping();
      renderMessage(message, peers.get(peerId).name);
    };
    typing.onMessage = (value, { peerId }) => {
      if (token !== generation || !peers.has(peerId) || typeof value !== 'boolean') return;
      peers.get(peerId).typingUntil = value ? Date.now() + 3000 : 0;
      updateTyping();
    };
  } catch {
    leave({ announce: false });
    $('form-error').textContent = '이 브라우저에서 연결을 시작하지 못했습니다. 최신 Chrome, Edge 또는 Safari로 열어 주세요.';
    return;
  }
  history.replaceState(null, '', `#channel=${encodeURIComponent(channel)}`);
  $('channel-input').value = channel;
  $('channel-input').disabled = $('nickname-input').disabled = $('join-button').disabled = $('random-button').disabled = true;
  $('join-button').textContent = '입장 중';
  $('room-title').textContent = channel;
  $('share-button').disabled = $('leave-button').disabled = false;
  $('message-input').disabled = false;
  $('message-input').placeholder = '메시지 입력';
  $('empty-title').textContent = '연결된 참여자가 없습니다.';
  $('empty-description').textContent = '링크를 공유하거나 같은 채널명으로 입장하세요.';
  document.body.classList.add('in-room');
  updateParticipants();
  typingTimer = setInterval(updateTyping, 1000);
  connectionTimer = setTimeout(() => {
    if (token === generation && !peers.size) notice('아직 연결된 친구가 없습니다. 둘 다 입장했다면 잠시 기다리거나 다른 네트워크에서 다시 시도해 주세요.');
  }, 20000);
  $('message-input').focus();
}

$('join-form').addEventListener('submit', event => { event.preventDefault(); enter($('channel-input').value); });
$('channel-input').addEventListener('input', () => { $('form-error').textContent = ''; });
$('random-button').addEventListener('click', () => enter(`room${crypto.randomUUID().replaceAll('-', '').slice(0, 24)}`));
$('leave-button').addEventListener('click', () => { leave(); $('channel-input').focus(); });
$('share-button').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); toast('링크를 복사했습니다.'); }
  catch { toast('링크를 복사하지 못했습니다. 주소창의 주소를 복사해 주세요.'); }
});
$('message-input').addEventListener('input', () => {
  updateComposer();
  if (typing && peers.size && Date.now() - lastTypingAt > 1000) {
    lastTypingAt = Date.now();
    typing.send(Boolean($('message-input').value.trim())).catch(() => {});
  }
});
$('message-input').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault();
    $('message-form').requestSubmit();
  }
});
$('message-form').addEventListener('submit', async event => {
  event.preventDefault();
  const text = $('message-input').value.trim();
  if (!chat || !peers.size || !text || text.length > 2000 || sending || !navigator.onLine) return;
  if (Date.now() - lastSendAt < 400) return;
  const token = generation;
  const action = chat;
  const targets = [...peers.keys()];
  const message = { id: crypto.randomUUID(), text };
  sending = true; lastSendAt = Date.now();
  $('message-input').value = '';
  updateComposer();
  typing.send(false).catch(() => {});
  const status = renderMessage(message, myName, true);
  let timeout;
  try {
    await Promise.race([
      action.send(message, { target: targets }),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 10000); }),
    ]);
    if (token === generation) status.textContent = '전송됨';
  } catch {
    if (token === generation) status.textContent = '전송 확인 불가 · 일부 친구에게 전달되었을 수 있습니다.';
  } finally {
    clearTimeout(timeout);
    if (token === generation) { sending = false; updateComposer(); $('message-input').focus(); }
  }
});
$('help-button').addEventListener('click', () => $('help-dialog').showModal());
for (const id of ['close-help', 'help-done']) $(id).addEventListener('click', () => $('help-dialog').close());
$('help-dialog').addEventListener('click', event => { if (event.target === $('help-dialog')) $('help-dialog').close(); });
window.addEventListener('offline', () => { if (room) notice('인터넷 연결이 끊겼습니다. 연결을 복구하면 다시 시도합니다.'); updateParticipants(); });
window.addEventListener('online', () => { if (room) notice('인터넷이 연결되었습니다. 친구와의 연결을 확인하고 있습니다.'); updateParticipants(); });
window.addEventListener('pagehide', () => leave({ announce: false }));
// A restored back/forward-cache page must never restore a previous conversation.
window.addEventListener('pageshow', event => { if (event.persisted) leave({ announce: false }); });
function readInvite() {
  const value = new URLSearchParams(location.hash.slice(1)).get('channel');
  if (value !== null && !room) {
    const valid = validChannel(value);
    // Do not silently turn an invalid invitation into a different valid room.
    $('channel-input').value = valid ? normalizeChannel(value) : value.slice(0, 33);
    $('form-error').textContent = valid ? '' : '유효하지 않은 초대 링크입니다. 채널명은 영문·숫자만 1~32자 입력하세요.';
  }
}
window.addEventListener('hashchange', readInvite);
readInvite();
