import { joinRoom, selfId } from '../vendor/trystero.js';
import { resolveIpRoom, validChannel } from './rooms.js';
import { createDirectMessages } from './dm.js';
import { createArena } from './arena.js';

const $ = (id) => document.getElementById(id);
const peers = new Map();
let room = null;
let chat = null;
let profile = null;
let typing = null;
let directMessages = null;
let arena = null;
let myName = '';
let currentChannel = '';
let mode = 'custom';
let lookupController = null;
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

function renderMode() {
  const isIp = mode === 'ip';
  const busy = Boolean(room || lookupController);
  $('custom-mode').setAttribute('aria-pressed', String(!isIp));
  $('ip-mode').setAttribute('aria-pressed', String(isIp));
  $('channel-field').hidden = isIp;
  $('random-button').hidden = isIp;
  $('share-button').hidden = isIp;
  $('minigame-entry').hidden = !room || !isIp;
  $('team-game-note').hidden = !room || isIp;
  $('mode-description').textContent = isIp
    ? '현재 접속 IP를 기준으로 입장합니다. 같은 공인 IP를 쓰는 사람끼리 연결됩니다.'
    : '채널 ID를 정해서 입장하세요. 같은 ID를 입력한 사람끼리 연결됩니다.';
  $('join-button').textContent = room ? '참여 중' : lookupController ? 'IP 확인 중…' : isIp ? 'IP방 입장' : '입장 / 만들기';
  $('channel-input').disabled = $('nickname-input').disabled = $('join-button').disabled = $('random-button').disabled = busy;
  $('leave-button').disabled = !busy;
  if (!room) {
    $('empty-title').textContent = isIp ? 'IP방 입장을 누르세요.' : '채널 ID를 입력하세요.';
    $('empty-description').textContent = isIp ? '채널 ID는 필요하지 않습니다.' : '영문·숫자 1~32자를 사용할 수 있습니다.';
  }
}

function setMode(next, { updateUrl = true } = {}) {
  if (next !== mode) {
    leave({ resetUrl: false, announce: false });
    mode = next;
  }
  $('form-error').textContent = '';
  renderMode();
  if (updateUrl) history.replaceState(null, '', location.pathname + location.search + (mode === 'ip' ? '#mode=ip' : ''));
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
      if (id === selfId) li.append(element('span', '', name), element('span', 'you-tag', '나'));
      else {
        const button = element('button', 'participant-button');
        button.type = 'button';
        button.setAttribute('aria-label', `${name}에게 DM`);
        button.append(element('span', '', name), element('small', 'dm-badge', directMessages?.badge(id) || 'DM'));
        button.addEventListener('click', () => directMessages?.open(id));
        li.append(button);
      }
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
  lookupController?.abort();
  lookupController = null;
  const oldRoom = room;
  directMessages?.destroy(); arena?.destroy();
  directMessages = arena = null;
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
  $('room-title').textContent = '대기실';
  $('share-button').disabled = $('leave-button').disabled = true;
  document.body.classList.remove('in-room');
  myName = currentChannel = '';
  sending = false;
  lastSendAt = lastTypingAt = 0;
  notice(); updateParticipants(); renderMode();
  if (resetUrl) history.replaceState(null, '', location.pathname + location.search + (mode === 'ip' ? '#mode=ip' : ''));
  try { Promise.resolve(oldRoom?.leave()).catch(() => {}); } catch { /* Local data is already cleared. */ }
  if (oldRoom && announce) toast('퇴장했습니다.');
}

function enter(value) {
  if (mode !== 'custom' || room || lookupController) return;
  $('form-error').textContent = '';
  if (!validChannel(value)) {
    $('form-error').textContent = '채널 ID는 영문·숫자만 1~32자 입력하세요.';
    return;
  }
  const channel = normalizeChannel(value);
  connect(channel);
}

async function enterIp() {
  if (mode !== 'ip' || room || lookupController) return;
  $('form-error').textContent = '';
  if (!navigator.onLine) { $('form-error').textContent = '인터넷 연결을 확인해 주세요.'; return; }
  const token = ++generation;
  const controller = new AbortController();
  lookupController = controller;
  renderMode();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const channel = await resolveIpRoom(controller.signal);
    if (token !== generation || mode !== 'ip') return;
    lookupController = null;
    connect(channel);
  } catch {
    if (token === generation) $('form-error').textContent = 'IP를 확인하지 못했습니다. 다시 입장하거나 커스텀 방을 이용하세요.';
  } finally {
    clearTimeout(timeout);
    if (lookupController === controller) lookupController = null;
    renderMode();
  }
}

function connect(channel) {
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
    const featureOptions = { room, selfId, getName: id => id === selfId ? myName : peers.get(id)?.name || alias(id), hasPeer: id => peers.has(id) };
    directMessages = createDirectMessages({ ...featureOptions, onChange: updateParticipants });
    if (mode === 'ip') arena = createArena(featureOptions);
    room.onPeerJoin = (id) => {
      if (token !== generation) return;
      peers.set(id, { name: alias(id), typingUntil: 0 });
      arena?.peerJoined(id);
      profile.send(myName, { target: id }).catch(() => {});
      notice(); updateParticipants();
      system('참여자가 연결되었습니다.');
    };
    room.onPeerLeave = (id) => {
      if (token !== generation) return;
      const name = peers.get(id)?.name || alias(id);
      peers.delete(id); receiveRates.delete(id);
      directMessages?.peerLeft(id); arena?.peerLeft(id);
      updateParticipants(); updateTyping();
      system(`${name} 님이 연결을 종료했습니다.`);
      if (!peers.size) notice('연결된 참여자가 없습니다.');
    };
    profile.onMessage = (value, { peerId }) => {
      if (token !== generation || !peers.has(peerId)) return;
      const name = cleanName(value);
      if (name) peers.get(peerId).name = name;
      directMessages?.refresh();
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
  history.replaceState(null, '', mode === 'ip' ? '#mode=ip' : `#channel=${encodeURIComponent(channel)}`);
  if (mode === 'custom') $('channel-input').value = channel;
  $('room-title').textContent = mode === 'ip' ? 'IP방' : channel;
  $('share-button').disabled = $('leave-button').disabled = false;
  $('message-input').disabled = false;
  $('message-input').placeholder = '메시지 입력';
  $('empty-title').textContent = '연결된 참여자가 없습니다.';
  $('empty-description').textContent = mode === 'ip' ? '같은 공인 IP에서 IP방에 입장하면 연결됩니다.' : '링크를 공유하거나 같은 채널 ID로 입장하세요.';
  document.body.classList.add('in-room');
  updateParticipants(); renderMode();
  typingTimer = setInterval(updateTyping, 1000);
  connectionTimer = setTimeout(() => {
    if (token === generation && !peers.size) notice('아직 연결된 친구가 없습니다. 둘 다 입장했다면 잠시 기다리거나 다른 네트워크에서 다시 시도해 주세요.');
  }, 20000);
  $('message-input').focus();
}

$('custom-mode').addEventListener('click', () => { if (mode !== 'custom') setMode('custom'); });
$('ip-mode').addEventListener('click', () => { if (mode !== 'ip') setMode('ip'); });
$('join-form').addEventListener('submit', event => { event.preventDefault(); if (mode === 'ip') void enterIp(); else enter($('channel-input').value); });
$('channel-input').addEventListener('input', () => { $('form-error').textContent = ''; });
$('random-button').addEventListener('click', () => enter(`room${crypto.randomUUID().replaceAll('-', '').slice(0, 24)}`));
$('leave-button').addEventListener('click', () => { leave(); $(mode === 'ip' ? 'join-button' : 'channel-input').focus(); });
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
  if (room || lookupController) return;
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.get('mode') === 'ip') { setMode('ip', { updateUrl: false }); return; }
  const value = params.get('channel');
  setMode('custom', { updateUrl: false });
  if (value !== null) {
    const valid = validChannel(value);
    // Do not silently turn an invalid invitation into a different valid room.
    $('channel-input').value = valid ? normalizeChannel(value) : value.slice(0, 33);
    $('form-error').textContent = valid ? '' : '유효하지 않은 초대 링크입니다. 채널 ID는 영문·숫자만 1~32자 입력하세요.';
  }
}
window.addEventListener('hashchange', readInvite);
readInvite();
