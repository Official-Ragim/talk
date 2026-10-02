// DM packets use a single, explicit WebRTC recipient. History lives only in memory.
export function createDirectMessages({ room, selfId, getName, hasPeer, onChange }) {
  const $ = id => document.getElementById(id);
  const action = room.makeAction('dm');
  const sessions = new Map();
  const controller = new AbortController();
  let selected = null;
  let disposed = false;
  const listen = (id, event, fn) => $(id).addEventListener(event, fn, { signal: controller.signal });
  function session(id) {
    if (!sessions.has(id)) sessions.set(id, { local: false, remote: false, unread: 0, messages: [], seen: new Set(), lastSend: 0, since: 0, count: 0 });
    return sessions.get(id);
  }
  function send(id, packet) { return action.send(packet, { target: id }); }
  function update() {
    const s = sessions.get(selected);
    if (!s) return;
    $('dm-title').textContent = `${getName(selected)} · DM`;
    $('dm-status').textContent = !hasPeer(selected) ? '상대방이 채팅방을 나갔습니다.' : s.remote ? '상대방이 DM에 있습니다.' : '상대방의 DM 입장을 기다리는 중입니다.';
    $('dm-send').disabled = !hasPeer(selected) || !$('dm-input').value.trim();
    $('dm-input').disabled = !hasPeer(selected);
    const list = $('dm-messages');
    list.replaceChildren();
    for (const message of s.messages) {
      const row = document.createElement('article');
      row.className = `dm-message${message.own ? ' own' : ''}`;
      const name = document.createElement('strong');
      name.textContent = message.own ? '나' : getName(selected);
      const text = document.createElement('p');
      text.textContent = message.text;
      row.append(name, text);
      if (message.status) {
        const status = document.createElement('small');
        status.textContent = message.status;
        row.append(status);
      }
      list.append(row);
    }
    list.scrollTop = list.scrollHeight;
  }
  function collect(id, s) {
    if (!s.local && !s.remote) sessions.delete(id);
    onChange();
  }
  function close() {
    if (!selected) return;
    const id = selected;
    const s = sessions.get(id);
    selected = null;
    if (s) {
      s.local = false;
      s.unread = 0;
      if (hasPeer(id)) send(id, { type: 'close' }).catch(() => {});
      collect(id, s);
    }
    $('dm-messages').replaceChildren();
    $('dm-input').value = '';
    $('dm-dialog').close();
  }
  function open(id) {
    if (disposed || id === selfId || !hasPeer(id)) return;
    if (selected === id) return;
    close();
    selected = id;
    const s = session(id);
    s.local = true; s.unread = 0;
    send(id, { type: 'open' }).catch(() => {
      if (selected === id) $('dm-status').textContent = 'DM 연결을 확인하지 못했습니다. 다시 시도하세요.';
    });
    update(); onChange();
    $('dm-dialog').showModal();
    $('dm-input').focus();
  }
  action.onMessage = (packet, { peerId }) => {
    if (disposed || !hasPeer(peerId) || !packet || !['open', 'close', 'text'].includes(packet.type)) return;
    if (packet.type === 'close' && !sessions.has(peerId)) return;
    const s = session(peerId);
    if (packet.type === 'open') s.remote = true;
    if (packet.type === 'close') { s.remote = false; collect(peerId, s); }
    if (packet.type === 'text') {
      if (!s.remote || typeof packet.text !== 'string' || !packet.text.trim() || packet.text.length > 2000 || typeof packet.id !== 'string' || packet.id.length > 64 || s.seen.has(packet.id)) return;
      const now = Date.now();
      if (now - s.since > 10000) { s.since = now; s.count = 0; }
      if (++s.count > 30) return;
      s.seen.add(packet.id);
      if (s.seen.size > 600) s.seen.delete(s.seen.values().next().value);
      s.messages.push({ text: packet.text, own: false });
      if (s.messages.length > 300) s.messages.shift();
      if (selected !== peerId) s.unread++;
    }
    if (selected === peerId) update();
    onChange();
  };
  listen('dm-leave', 'click', close);
  listen('dm-dialog', 'cancel', event => { event.preventDefault(); close(); });
  listen('dm-input', 'input', () => { $('dm-send').disabled = !hasPeer(selected) || !$('dm-input').value.trim(); });
  listen('dm-input', 'keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault(); $('dm-form').requestSubmit();
    }
  });
  listen('dm-form', 'submit', async event => {
    event.preventDefault();
    const id = selected;
    const s = sessions.get(id);
    const text = $('dm-input').value.trim();
    if (!s?.local || !hasPeer(id) || !text || text.length > 2000 || Date.now() - s.lastSend < 400) return;
    s.lastSend = Date.now();
    const message = { own: true, text, status: '전송 중…' };
    s.messages.push(message);
    if (s.messages.length > 300) s.messages.shift();
    $('dm-input').value = '';
    update();
    let timer;
    try {
      await Promise.race([send(id, { type: 'text', id: crypto.randomUUID(), text }), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 10000); })]);
      message.status = '전송됨';
    } catch { message.status = '전송 확인 불가'; }
    finally { clearTimeout(timer); }
    if (!disposed && selected === id) update();
  });
  return {
    open,
    badge(id) { const s = sessions.get(id); return s?.unread ? `DM ${s.unread}` : s?.remote ? 'DM 대기' : 'DM'; },
    refresh: update,
    peerLeft(id) {
      const s = sessions.get(id);
      if (s) { s.remote = false; collect(id, s); }
      if (selected === id) update();
    },
    destroy() {
      disposed = true; controller.abort(); selected = null; sessions.clear();
      $('dm-dialog').close(); $('dm-messages').replaceChildren(); $('dm-input').value = ''; $('dm-status').textContent = '';
    },
  };
}
