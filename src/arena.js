import { ArenaEngine, WORLD, WALLS, WEAPONS, validInput } from './arena-engine.js';

export function createArena({ room, selfId, getName, hasPeer }) {
  const $ = id => document.getElementById(id);
  const membership = room.makeAction('arenaMember');
  const control = room.makeAction('arenaInput');
  const state = room.makeAction('arenaState');
  const members = new Map();
  const inputs = new Map();
  const inputTimes = new Map();
  const events = new AbortController();
  const keys = new Set();
  const canvas = $('arena-canvas');
  const ctx = canvas.getContext('2d');
  let joined = false, playing = false, weapon = 'm4', session = '', host = null, hostKey = '', engine = null, disposed = false;
  let snapshot = null, lastSnapshotAt = 0, lastTick = performance.now(), lastSend = 0, frame = 0, lastHud = 0;
  let migrationUntil = 0;
  let pointer = { x: 600, y: 380 }, firing = false, trigger = 0, reload = false, stick = { x: 0, y: 0 };
  const listen = (target, type, fn) => target.addEventListener(type, fn, { signal: events.signal });
  const safeSend = (action, value, target) => { action.send(value, target ? { target } : undefined).catch(() => {}); };
  const localPresence = () => ({ joined, playing, weapon, session });
  function resetInput() { keys.clear(); firing = false; reload = false; stick = { x: 0, y: 0 }; }
  function announce(target) { safeSend(membership, localPresence(), target); }
  function reconcile() {
    const next = [...members.keys()].sort()[0] || null;
    const nextKey = next ? `${next}:${members.get(next).session}` : '';
    if (nextKey !== hostKey) {
      if (host && next && joined) migrationUntil = performance.now() + 4000;
      host = next; hostKey = nextKey; inputs.clear(); inputTimes.clear(); snapshot = null;
      trigger = 0;
      engine = joined && host === selfId ? new ArenaEngine() : null;
      lastSend = 0;
    }
    if (engine) {
      for (const id of engine.players.keys()) if (!members.get(id)?.playing) engine.remove(id);
      for (const [id, member] of members) {
        if (!member.playing) continue;
        if (engine.players.get(id)?.weapon !== member.weapon) engine.remove(id);
        engine.add(id, member.weapon);
      }
    }
    $('arena-count').textContent = `${members.size}명`;
    $('arena-lobby-count').textContent = `${members.size}명`;
  }
  function updatePresence() {
    if (joined) members.set(selfId, localPresence()); else members.delete(selfId);
    reconcile(); announce();
  }
  membership.onMessage = (packet, { peerId }) => {
    if (disposed || !hasPeer(peerId) || !packet || typeof packet.joined !== 'boolean' || typeof packet.playing !== 'boolean' || !Object.hasOwn(WEAPONS, packet.weapon) || typeof packet.session !== 'string' || packet.session.length > 64) return;
    const previous = members.get(peerId);
    if (packet.joined) members.set(peerId, packet); else members.delete(peerId);
    if (!packet.joined || previous?.session !== packet.session || previous?.playing !== packet.playing) {
      inputs.delete(peerId); inputTimes.delete(peerId); engine?.remove(peerId);
    }
    reconcile();
  };
  control.onMessage = (packet, { peerId }) => {
    if (disposed || host !== selfId || !engine || !members.get(peerId)?.playing || packet?.hostKey !== hostKey || packet?.session !== members.get(peerId).session || !validInput(packet.input)) return;
    if (packet.input.trigger < (inputs.get(peerId)?.trigger || 0)) return;
    inputs.set(peerId, { ...packet.input, reload: packet.input.reload || inputs.get(peerId)?.reload || false }); inputTimes.set(peerId, performance.now());
  };
  function validSnapshot(s) {
    return s && Number.isFinite(s.time) && Array.isArray(s.players) && s.players.length <= members.size && s.players.every(p => members.get(p.id)?.playing && Object.hasOwn(WEAPONS, p.weapon) && ['x', 'y', 'angle', 'hp', 'ammo', 'kills', 'deaths', 'shieldUntil', 'respawnAt', 'reloadUntil'].every(k => Number.isFinite(p[k])) && p.x >= 0 && p.x <= WORLD.width && p.y >= 0 && p.y <= WORLD.height && p.hp >= 0 && p.hp <= 100) && Array.isArray(s.traces) && s.traces.length <= 160 && s.traces.every(t => ['x', 'y', 'endX', 'endY'].every(k => Number.isFinite(t[k]))) && Array.isArray(s.feed) && s.feed.length <= 4 && s.feed.every(f => typeof f.killer === 'string' && typeof f.victim === 'string' && Object.hasOwn(WEAPONS, f.weapon)) && (s.winner === null || typeof s.winner === 'string') && Number.isFinite(s.restartAt);
  }
  state.onMessage = (packet, { peerId }) => {
    if (disposed || !joined || peerId !== host || packet?.hostKey !== hostKey || !validSnapshot(packet.snapshot)) return;
    if (snapshot && packet.snapshot.time < snapshot.time) return;
    snapshot = packet.snapshot; lastSnapshotAt = performance.now();
  };
  function input() {
    const me = snapshot?.players.find(p => p.id === selfId);
    return {
      x: Math.max(-1, Math.min(1, Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')) + stick.x)),
      y: Math.max(-1, Math.min(1, Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) + stick.y)),
      angle: me ? Math.atan2(pointer.y - me.y, pointer.x - me.x) : 0,
      fire: firing, trigger, reload,
    };
  }
  function sendInput() {
    if (!playing || !host) return;
    const value = input();
    if (host === selfId) { inputs.set(selfId, { ...value, reload: value.reload || inputs.get(selfId)?.reload || false }); inputTimes.set(selfId, performance.now()); }
    else safeSend(control, { hostKey, session, input: value }, host);
    reload = false;
  }
  const tick = setInterval(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastTick) / 1000); lastTick = now;
    if (!joined) return;
    sendInput();
    if (!engine) return;
    for (const [id, stamp] of inputTimes) if (now - stamp > 350) inputs.delete(id);
    engine.step(dt, inputs);
    for (const value of inputs.values()) value.reload = false;
    snapshot = engine.snapshot(); lastSnapshotAt = now;
    if (now - lastSend > 65) {
      lastSend = now;
      const targets = [...members.keys()].filter(id => id !== selfId);
      if (targets.length) safeSend(state, { hostKey, snapshot }, targets);
    }
  }, 1000 / 30);
  function leave() {
    if (!joined) return;
    joined = playing = false; resetInput(); updatePresence(); engine = null; snapshot = null;
    $('arena-dialog').close(); $('arena-battle').hidden = true; $('arena-lobby').hidden = false;
    $('arena-scoreboard').replaceChildren(); $('arena-banner').textContent = ''; $('arena-status').textContent = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    $('arena-enter').focus();
  }
  listen($('arena-enter'), 'click', () => {
    if (joined) return;
    joined = true; session = crypto.randomUUID(); trigger = 0;
    updatePresence(); $('arena-dialog').showModal();
  });
  listen($('arena-leave'), 'click', leave);
  listen($('arena-dialog'), 'cancel', e => { e.preventDefault(); leave(); });
  for (const button of document.querySelectorAll('[data-weapon]')) listen(button, 'click', () => {
    weapon = button.dataset.weapon;
    for (const other of document.querySelectorAll('[data-weapon]')) other.setAttribute('aria-pressed', String(other === button));
    updatePresence();
  });
  listen($('arena-play'), 'click', () => {
    if (!joined) return;
    playing = true; trigger = 0; resetInput(); updatePresence();
    $('arena-lobby').hidden = true; $('arena-battle').hidden = false; canvas.focus();
  });
  listen($('arena-back'), 'click', () => {
    playing = false; resetInput(); updatePresence(); $('arena-lobby').hidden = false; $('arena-battle').hidden = true;
  });
  listen($('arena-reload'), 'click', () => { reload = true; canvas.focus(); });
  listen(window, 'keydown', e => {
    if (!playing || !['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'KeyR'].includes(e.code)) return;
    e.preventDefault(); keys.add(e.code); if (e.code === 'KeyR') reload = true;
  });
  listen(window, 'keyup', e => keys.delete(e.code));
  listen(window, 'blur', () => { resetInput(); sendInput(); });
  listen(document, 'visibilitychange', () => { if (document.hidden) { resetInput(); sendInput(); } });
  function aim(e) {
    const rect = canvas.getBoundingClientRect();
    pointer = { x: (e.clientX - rect.left) / rect.width * WORLD.width, y: (e.clientY - rect.top) / rect.height * WORLD.height };
  }
  listen(canvas, 'pointermove', aim);
  listen(canvas, 'pointerdown', e => {
    if (e.button !== 0 || !playing) return;
    e.preventDefault(); canvas.focus(); aim(e);
    if (e.pointerType !== 'touch') { firing = true; trigger++; sendInput(); }
    canvas.setPointerCapture(e.pointerId);
  });
  listen(window, 'pointerup', e => { if (e.pointerType !== 'touch') { firing = false; sendInput(); } });
  listen(canvas, 'pointercancel', () => { firing = false; });
  listen(canvas, 'contextmenu', e => e.preventDefault());
  const pad = $('move-pad');
  let padPointer = null;
  function moveStick(e) {
    const rect = pad.getBoundingClientRect();
    stick = { x: (e.clientX - rect.left - rect.width / 2) / (rect.width / 2), y: (e.clientY - rect.top - rect.height / 2) / (rect.height / 2) };
  }
  listen(pad, 'pointerdown', e => { padPointer = e.pointerId; pad.setPointerCapture(e.pointerId); moveStick(e); });
  listen(pad, 'pointermove', e => { if (padPointer === e.pointerId) moveStick(e); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(pad, event, () => { padPointer = null; stick = { x: 0, y: 0 }; });
  listen($('touch-fire'), 'pointerdown', e => { e.preventDefault(); $('touch-fire').setPointerCapture(e.pointerId); firing = true; trigger++; sendInput(); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) listen($('touch-fire'), event, () => { firing = false; sendInput(); });
  function drawMap() {
    ctx.fillStyle = '#252e31'; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.strokeStyle = '#303a3d'; ctx.lineWidth = 1;
    for (let x = 0; x < WORLD.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.height); ctx.stroke(); }
    for (let y = 0; y < WORLD.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD.width, y); ctx.stroke(); }
    ctx.fillStyle = '#394140'; ctx.fillRect(35, 290, 1130, 8); ctx.fillRect(35, 462, 1130, 8);
    ctx.setLineDash([16, 20]); ctx.strokeStyle = '#736d45'; ctx.lineWidth = 3;
    ctx.strokeRect(510, 285, 180, 190); ctx.setLineDash([]);
    ctx.font = 'bold 22px Arial'; ctx.fillStyle = '#67736d'; ctx.textAlign = 'center';
    ctx.fillText('LOADING BAY', 600, 245); ctx.fillText('SECTOR 04', 600, 545);
    ctx.font = 'bold 44px Arial'; ctx.fillStyle = '#445352'; ctx.fillText('A', 100, 400); ctx.fillText('B', 1100, 400);
    for (let i = 0; i < WALLS.length; i++) {
      const w = WALLS[i];
      ctx.fillStyle = '#151d20'; ctx.fillRect(w.x + 8, w.y + 10, w.w, w.h);
      ctx.fillStyle = i < 4 ? '#727875' : i < 8 ? '#536664' : '#827658'; ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = i < 8 ? '#7c8e86' : '#b0a17b'; ctx.lineWidth = 2; ctx.strokeRect(w.x + 3, w.y + 3, w.w - 6, w.h - 6);
      if (i >= 4) {
        ctx.strokeStyle = '#283d3d'; ctx.lineWidth = 3;
        for (let x = w.x + 16; x < w.x + w.w - 8; x += 18) { ctx.beginPath(); ctx.moveTo(x, w.y + 7); ctx.lineTo(x, w.y + w.h - 7); ctx.stroke(); }
      }
    }
  }
  function draw(now) {
    if (disposed) return;
    frame = requestAnimationFrame(draw);
    if (!playing) return;
    drawMap();
    if (snapshot) {
      for (const trace of snapshot.traces) {
        ctx.strokeStyle = '#ffe6a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(trace.x, trace.y); ctx.lineTo(trace.endX, trace.endY); ctx.stroke();
      }
      for (const p of snapshot.players) {
        if (p.hp <= 0) continue;
        const own = p.id === selfId;
        ctx.save(); ctx.translate(p.x, p.y);
        ctx.fillStyle = '#1119'; ctx.beginPath(); ctx.ellipse(3, 7, 18, 16, 0, 0, Math.PI * 2); ctx.fill();
        if (p.shieldUntil > snapshot.time) { ctx.strokeStyle = '#daeaff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke(); }
        ctx.save(); ctx.rotate(own ? Math.atan2(pointer.y - p.y, pointer.x - p.x) : p.angle);
        ctx.fillStyle = own ? '#afd6bd' : '#e9a18e'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1b252c'; ctx.fillRect(7, -5, p.weapon === 'deagle' ? 20 : 29, 9);
        ctx.fillStyle = own ? '#547662' : '#854c42'; ctx.beginPath(); ctx.arc(-3, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#10181a'; ctx.fillRect(-20, -32, 40, 5); ctx.fillStyle = own ? '#b4e8be' : '#f0ab92'; ctx.fillRect(-20, -32, p.hp * 0.4, 5);
        ctx.font = '13px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(own ? '나' : getName(p.id), 0, -41); ctx.restore();
      }
    }
    ctx.strokeStyle = '#f5f6e9'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pointer.x - 9, pointer.y); ctx.lineTo(pointer.x + 9, pointer.y); ctx.moveTo(pointer.x, pointer.y - 9); ctx.lineTo(pointer.x, pointer.y + 9); ctx.stroke();
    if (snapshot?.feed.length) {
      ctx.textAlign = 'right'; ctx.font = '14px Arial'; ctx.fillStyle = '#eee';
      snapshot.feed.forEach((f, i) => ctx.fillText(`${getName(f.killer)} → ${getName(f.victim)} / ${WEAPONS[f.weapon].name}`, 1155, 50 + i * 22));
    }
    if (now - lastHud < 120) return;
    lastHud = now;
    const me = snapshot?.players.find(p => p.id === selfId);
    $('arena-health').textContent = `HP ${me?.hp ?? '—'}`;
    $('arena-weapon').textContent = WEAPONS[weapon].name;
    $('arena-ammo').textContent = me?.reloadUntil > snapshot?.time ? `재장전 ${Math.max(0, me.reloadUntil - snapshot.time).toFixed(1)}s` : `${me?.ammo ?? '—'} / ${WEAPONS[weapon].magazine}`;
    const stale = now - lastSnapshotAt > 2500;
    $('arena-banner').textContent = !me || stale ? '게임 연결을 기다리는 중…' : snapshot.winner ? `${getName(snapshot.winner)} 승리 · ${Math.ceil(snapshot.restartAt - snapshot.time)}초 후 새 라운드` : me.hp <= 0 ? `${Math.ceil(me.respawnAt - snapshot.time)}초 후 부활` : snapshot.players.length < 2 ? '연습 중 · 다른 참가자가 출격하면 FFA 시작' : '';
    $('arena-status').textContent = `${snapshot?.players.length || 0}명 전투 중 · 20킬 승리 · 사망 후 3초 부활${now < migrationUntil ? ' · 호스트 변경으로 라운드 재시작' : ''}`;
    const board = $('arena-scoreboard'); board.replaceChildren();
    for (const p of [...(snapshot?.players || [])].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)) {
      const item = document.createElement('li'); item.textContent = `${getName(p.id)}${p.id === selfId ? ' (나)' : ''} · ${p.kills} K / ${p.deaths} D`; board.append(item);
    }
  }
  frame = requestAnimationFrame(draw);
  return {
    peerJoined(id) { announce(id); },
    peerLeft(id) { members.delete(id); inputs.delete(id); inputTimes.delete(id); reconcile(); },
    destroy() {
      leave(); disposed = true; clearInterval(tick); cancelAnimationFrame(frame); events.abort(); members.clear(); inputs.clear();
      $('arena-count').textContent = '0명'; $('arena-lobby-count').textContent = '0명';
    },
  };
}
