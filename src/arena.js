import { ArenaEngine, WORLD, WALLS, WEAPONS, validInput } from './arena-engine.js';
import { assignSeats, TEAM_NAMES, validRules, firstStarter } from './arena-lobby.js';
import { createArenaRenderer } from './arena-renderer.js';
import { clamp, wrapAngle, relativeMove } from './arena-camera.js';

export function createArena({ room, selfId, getName, hasPeer, custom = false }) {
  const $ = id => document.getElementById(id);
  const membership = room.makeAction('arenaMember');
  const control = room.makeAction('arenaInput');
  const state = room.makeAction('arenaState');
  const setup = room.makeAction('arenaSetup');
  const members = new Map();
  const inputs = new Map();
  const inputTimes = new Map();
  const events = new AbortController();
  const keys = new Set();
  const canvas = $('arena-canvas');
  let renderer = null;
  let joined = false, playing = false, weapon = 'm4', session = '', host = null, hostKey = '', engine = null, disposed = false;
  let snapshot = null, lastSnapshotAt = 0, lastTick = performance.now(), lastSend = 0, frame = 0, lastHud = 0;
  let migrationUntil = 0;
  let rules = { mode: 'ffa', size: 1, view: 'top' }, revision = -1, seats = new Map(), team = 'auto', lastSetup = 0;
  let order = 0, startedAt = 0, yaw = 0, pitch = 0, fov = 75, cameraReady = false, unlockedAt = -1000, lockUnavailable = false, lookPointer = null;
  let pointerN = { x: 0, y: 0 };
  let pointer = { x: 600, y: 380 }, firing = false, trigger = 0, reload = false, stick = { x: 0, y: 0 };
  const listen = (target, type, fn) => target.addEventListener(type, fn, { signal: events.signal });
  const safeSend = (action, value, target) => { action.send(value, target ? { target } : undefined).catch(() => {}); };
  const localPresence = () => ({ joined, playing, weapon, session, team, order, startedAt });
  const setupPacket = () => ({ hostKey, rules, revision, seats: [...seats] });
  function publishSetup() { if (joined && host === selfId) safeSend(setup, setupPacket()); }
  function renderLobby() {
    const teams = rules.mode === 'teams';
    for (const button of document.querySelectorAll('[data-weapon]')) button.setAttribute('aria-pressed', String(button.dataset.weapon === weapon));
    $('arena-mode-label').textContent = teams ? `${rules.size} VS ${rules.size} · TEAM DEATHMATCH · 20 KILLS` : 'FREE FOR ALL · 20 KILLS TO WIN';
    const fps = rules.view === 'fps';
    $('arena-match-settings').hidden = false;
    $('arena-game-rules').hidden = !custom;
    $('arena-view').value = rules.view;
    $('arena-current-view').textContent = fps ? '3D 1인칭' : '3D 탑뷰';
    $('arena-look-hint').textContent = fps ? '화면 클릭: 마우스 잠금 · Esc: 잠금 해제 · 모바일: 드래그 조준' : '마우스 / 터치로 조준 · 시야각을 넓히면 더 멀리 보입니다.';
    $('arena-controls-help').textContent = fps ? 'WASD 이동 · 화면 클릭 후 마우스로 둘러보기 · 클릭 / Space 사격 · R 재장전 · Esc 마우스 해제. 모바일: 이동 패드 + 화면 드래그 조준 + 사격 버튼.' : 'WASD / 방향키 이동 · 마우스 조준 · 클릭 / Space 사격 · R 재장전. 모바일: 이동 패드 + 화면 터치 조준 + 사격 버튼.';
    $('arena-mode').value = rules.mode;
    $('arena-size').value = String(rules.size);
    const locked = [...members.values()].some(m => m.playing);
    $('arena-view').disabled = $('arena-mode').disabled = $('arena-size').disabled = !joined || host !== selfId || locked;
    $('arena-size-field').hidden = !teams;
    $('arena-settings-note').textContent = locked ? '시점은 모든 참가자에게 공통 적용됩니다. 모두 준비를 해제하면 방장이 변경할 수 있습니다.' : host === selfId ? '내가 게임 방장입니다. 첫 입장자가 시점과 게임 방식을 정합니다. 시야각은 출격 후 각자 조절합니다.' : `게임 방장: ${host ? getName(host) : '연결 중'} · 첫 입장자가 시점을 정합니다. 시야각은 각자 조절합니다.`;
    $('arena-teams').hidden = !teams;
    $('arena-team-score').hidden = !teams;
    $('arena-play').textContent = teams ? '준비 / 출격 →' : '출격하기 →';
    $('arena-play').disabled = !joined || revision < 0 || (teams && !seats.has(selfId));
    for (const side of ['red', 'blue']) {
      const ids = [...seats].filter(([, value]) => value === side).map(([id]) => id);
      $(`${side}-count`).textContent = `${TEAM_NAMES[side]} · ${ids.length} / ${rules.size}`;
      const list = $(`${side}-roster`); list.replaceChildren();
      for (const id of ids) {
        const item = document.createElement('li'); item.textContent = `${getName(id)}${id === selfId ? ' (나)' : ''} · ${members.get(id)?.playing ? '준비 완료' : '장비 선택 중'}`; list.append(item);
      }
    }
    for (const button of document.querySelectorAll('[data-team]')) {
      const side = button.dataset.team;
      button.setAttribute('aria-pressed', String(side === team));
      button.disabled = playing || (side !== 'auto' && seats.get(selfId) !== side && [...seats.values()].filter(value => value === side).length >= rules.size);
    }
    $('arena-team-status').textContent = seats.has(selfId) ? `내 팀: ${TEAM_NAMES[seats.get(selfId)]} · 양 팀 ${rules.size}명씩 준비하면 시작합니다. 아군 피해 없음.` : '선택한 팀에 자리가 없습니다. 다른 팀을 선택하거나 빈자리를 기다려 주세요.';
    canvas.setAttribute('aria-label', `${teams ? `${rules.size} 대 ${rules.size} 팀전` : 'FFA'} 전장. WASD 이동, 마우스 조준, 클릭 사격, R 재장전`);
  }
  function syncPlayers() {
    if (!engine) return;
    if (rules.mode === 'teams') seats = assignSeats(members, seats, rules.size); else seats.clear();
    for (const [id, player] of engine.players) {
      const member = members.get(id);
      const side = rules.mode === 'teams' ? seats.get(id) : null;
      if (!member?.playing || (rules.mode === 'teams' && !side) || player.weapon !== member.weapon || player.team !== side) {
        engine.remove(id); inputs.delete(id); inputTimes.delete(id);
      }
    }
    for (const [id, member] of members) {
      if (member.playing) engine.add(id, member.weapon, rules.mode === 'teams' ? seats.get(id) : null);
    }
  }
  function resetInput() { keys.clear(); firing = false; reload = false; stick = { x: 0, y: 0 }; }
  function announce(target) { safeSend(membership, localPresence(), target); }
  function reconcile() {
    const next = firstStarter(members);
    const nextKey = next ? `${next}:${members.get(next).session}` : '';
    if (nextKey !== hostKey) {
      if (host && next && joined) migrationUntil = performance.now() + 4000;
      host = next; hostKey = nextKey; inputs.clear(); inputTimes.clear(); snapshot = null;
      trigger = 0; revision = host === selfId ? 0 : -1;
      if (!host) { rules = { mode: 'ffa', size: 1, view: 'top' }; seats.clear(); }
      engine = joined && host === selfId ? new ArenaEngine(rules) : null;
      lastSend = 0;
    }
    syncPlayers();
    $('arena-count').textContent = `${members.size}명`;
    $('arena-lobby-count').textContent = `${members.size}명`;
    renderLobby(); publishSetup();
  }
  function updatePresence() {
    if (joined) members.set(selfId, localPresence()); else members.delete(selfId);
    reconcile(); announce();
  }
  membership.onMessage = (packet, { peerId }) => {
    if (disposed || !hasPeer(peerId) || !packet || typeof packet.joined !== 'boolean' || typeof packet.playing !== 'boolean' || !Object.hasOwn(WEAPONS, packet.weapon) || typeof packet.session !== 'string' || packet.session.length > 64 || !['auto', 'red', 'blue'].includes(packet.team) || !Number.isSafeInteger(packet.order) || packet.order < 0 || !Number.isSafeInteger(packet.startedAt) || packet.startedAt < 0) return;
    const previous = members.get(peerId);
    if (packet.joined) members.set(peerId, packet); else members.delete(peerId);
    if (!packet.joined || previous?.session !== packet.session || previous?.playing !== packet.playing) {
      inputs.delete(peerId); inputTimes.delete(peerId); engine?.remove(peerId);
    }
    reconcile();
  };
  function acceptSetup(packet, peerId) {
    if (disposed || peerId !== host || packet?.hostKey !== hostKey || !validRules(packet.rules, custom) || !Number.isSafeInteger(packet.revision) || packet.revision < 0 || packet.revision < revision || !Array.isArray(packet.seats) || packet.seats.length > members.size || !packet.seats.every(s => Array.isArray(s) && s.length === 2 && members.has(s[0]) && ['red', 'blue'].includes(s[1]))) return false;
    if (new Set(packet.seats.map(s => s[0])).size !== packet.seats.length || ['red', 'blue'].some(side => packet.seats.filter(s => s[1] === side).length > packet.rules.size)) return false;
    const changed = packet.revision !== revision || JSON.stringify(packet.seats) !== JSON.stringify([...seats]);
    if (packet.revision !== revision) { snapshot = null; trigger = 0; resetInput(); cameraReady = false; }
    rules = { ...packet.rules }; revision = packet.revision; seats = new Map(packet.seats);
    if (changed) renderLobby(); return true;
  }
  setup.onMessage = (packet, { peerId }) => { acceptSetup(packet, peerId); };
  control.onMessage = (packet, { peerId }) => {
    if (disposed || host !== selfId || !engine || !members.get(peerId)?.playing || packet?.hostKey !== hostKey || packet.revision !== revision || packet?.session !== members.get(peerId).session || !validInput(packet.input)) return;
    if (packet.input.trigger < (inputs.get(peerId)?.trigger || 0)) return;
    inputs.set(peerId, { ...packet.input, reload: packet.input.reload || inputs.get(peerId)?.reload || false }); inputTimes.set(peerId, performance.now());
  };
  function validSnapshot(s) {
    return s && Number.isFinite(s.time) && Array.isArray(s.players) && s.players.length <= members.size && s.players.every(p => members.get(p.id)?.playing && Object.hasOwn(WEAPONS, p.weapon) && ['x', 'y', 'angle', 'hp', 'ammo', 'kills', 'deaths', 'shieldUntil', 'respawnAt', 'reloadUntil'].every(k => Number.isFinite(p[k])) && p.x >= 0 && p.x <= WORLD.width && p.y >= 0 && p.y <= WORLD.height && p.hp >= 0 && p.hp <= 100) && Array.isArray(s.traces) && s.traces.length <= 160 && s.traces.every(t => ['x', 'y', 'endX', 'endY'].every(k => Number.isFinite(t[k]))) && Array.isArray(s.feed) && s.feed.length <= 4 && s.feed.every(f => typeof f.killer === 'string' && typeof f.victim === 'string' && Object.hasOwn(WEAPONS, f.weapon)) && (s.winner === null || typeof s.winner === 'string') && Number.isFinite(s.restartAt);
  }
  state.onMessage = (packet, { peerId }) => {
    if (disposed || !joined || peerId !== host || !acceptSetup(packet, peerId) || !validSnapshot(packet.snapshot) || typeof packet.snapshot.waiting !== 'boolean' || !['red', 'blue'].every(side => Number.isInteger(packet.snapshot.teamScores?.[side]) && packet.snapshot.teamScores[side] >= 0)) return;
    if (snapshot && packet.snapshot.time < snapshot.time) return;
    snapshot = packet.snapshot; lastSnapshotAt = performance.now();
  };
  function input() {
    const me = snapshot?.players.find(p => p.id === selfId);
    const fps = rules.view === 'fps';
    const horizontal = clamp(Number(keys.has('KeyD') || (!fps && keys.has('ArrowRight'))) - Number(keys.has('KeyA') || (!fps && keys.has('ArrowLeft'))) + stick.x, -1, 1);
    const vertical = clamp(Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) + stick.y, -1, 1);
    const move = fps ? relativeMove(horizontal, -vertical, yaw) : { x: horizontal, y: vertical };
    const length = Math.max(1, Math.hypot(move.x, move.y));
    return {
      x: move.x / length, y: move.y / length,
      angle: fps ? yaw : me ? Math.atan2(pointer.y - me.y, pointer.x - me.x) : 0,
      pitch: fps ? pitch : 0,
      fire: firing, trigger, reload,
    };
  }
  function sendInput() {
    if (!playing || !host) return;
    const value = input();
    if (host === selfId) { inputs.set(selfId, { ...value, reload: value.reload || inputs.get(selfId)?.reload || false }); inputTimes.set(selfId, performance.now()); }
    else safeSend(control, { hostKey, revision, session, input: value }, host);
    reload = false;
  }
  const tick = setInterval(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastTick) / 1000); lastTick = now;
    if (!joined) return;
    if (playing && rules.view === 'fps') yaw = wrapAngle(yaw + (Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'))) * dt * 1.8);
    sendInput();
    if (!engine) return;
    if (now - lastSetup > 1000) { lastSetup = now; publishSetup(); }
    for (const [id, stamp] of inputTimes) if (now - stamp > 350) inputs.delete(id);
    engine.step(dt, inputs);
    for (const value of inputs.values()) value.reload = false;
    snapshot = engine.snapshot(); lastSnapshotAt = now;
    if (now - lastSend > 65) {
      lastSend = now;
      const targets = [...members.keys()].filter(id => id !== selfId);
      if (targets.length) safeSend(state, { ...setupPacket(), snapshot }, targets);
    }
  }, 1000 / 30);
  function leave() {
    if (!joined) return;
    joined = playing = false; resetInput(); updatePresence(); engine = null; snapshot = null;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    $('arena-dialog').close(); $('arena-battle').hidden = true; $('arena-lobby').hidden = false;
    $('arena-scoreboard').replaceChildren(); $('arena-banner').textContent = ''; $('arena-status').textContent = '';
    renderer?.clear();
    $('arena-enter').focus();
  }
  listen($('arena-enter'), 'click', () => {
    if (joined) return;
    joined = true; session = crypto.randomUUID(); trigger = 0;
    order = Math.max(0, ...[...members.values()].map(m => m.order)) + 1; startedAt = Date.now();
    updatePresence(); $('arena-dialog').showModal();
  });
  listen($('arena-leave'), 'click', leave);
  listen($('arena-dialog'), 'cancel', e => { e.preventDefault(); if (document.pointerLockElement === canvas || performance.now() - unlockedAt < 350) return; leave(); });
  function changeRules() {
    if (!joined || host !== selfId || [...members.values()].some(m => m.playing)) { renderLobby(); return; }
    const next = { mode: custom ? $('arena-mode').value : 'ffa', size: Number($('arena-size').value), view: $('arena-view').value };
    if (!validRules(next, custom)) { renderLobby(); return; }
    rules = next; revision++; snapshot = null; inputs.clear(); inputTimes.clear(); resetInput(); trigger = 0; cameraReady = false;
    engine = new ArenaEngine(rules); syncPlayers(); renderLobby(); publishSetup();
  }
  listen($('arena-mode'), 'change', changeRules);
  listen($('arena-size'), 'change', changeRules);
  listen($('arena-view'), 'change', changeRules);
  listen($('arena-fov'), 'input', () => { fov = clamp(Number($('arena-fov').value), 55, 110); $('arena-fov-value').textContent = `${fov}°`; });
  for (const button of document.querySelectorAll('[data-team]')) listen(button, 'click', () => {
    if (!joined || playing) return;
    team = button.dataset.team; updatePresence();
  });
  for (const button of document.querySelectorAll('[data-weapon]')) listen(button, 'click', () => {
    weapon = button.dataset.weapon;
    for (const other of document.querySelectorAll('[data-weapon]')) other.setAttribute('aria-pressed', String(other === button));
    updatePresence();
  });
  listen($('arena-play'), 'click', () => {
    if (!joined || revision < 0 || (rules.mode === 'teams' && !seats.has(selfId))) return;
    try { renderer ||= createArenaRenderer(canvas); $('arena-render-error').hidden = true; }
    catch (error) { $('arena-render-error').textContent = error.message; $('arena-render-error').hidden = false; return; }
    cameraReady = false;
    playing = true; trigger = 0; resetInput(); updatePresence();
    $('arena-lobby').hidden = true; $('arena-battle').hidden = false; canvas.focus();
  });
  listen($('arena-back'), 'click', () => {
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    playing = false; resetInput(); updatePresence(); $('arena-lobby').hidden = false; $('arena-battle').hidden = true;
  });
  listen($('arena-reload'), 'click', () => { reload = true; canvas.focus(); });
  listen(window, 'keydown', e => {
    if (e.code === 'Escape' && document.pointerLockElement === canvas) {
      e.preventDefault(); unlockedAt = performance.now(); document.exitPointerLock(); resetInput(); sendInput(); return;
    }
    if (!playing || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || !['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'KeyR', 'Space'].includes(e.code)) return;
    e.preventDefault(); keys.add(e.code); if (e.code === 'KeyR') reload = true;
    if (e.code === 'Space' && !e.repeat) { firing = true; trigger++; sendInput(); }
  });
  listen(window, 'keyup', e => { keys.delete(e.code); if (e.code === 'Space') { firing = false; sendInput(); } });
  listen(window, 'blur', () => { resetInput(); sendInput(); });
  listen(document, 'visibilitychange', () => { if (document.hidden) { resetInput(); sendInput(); } });
  function aim(e) {
    const rect = canvas.getBoundingClientRect();
    pointerN = { x: clamp((e.clientX - rect.left) / rect.width * 2 - 1, -1, 1), y: clamp(1 - (e.clientY - rect.top) / rect.height * 2, -1, 1) };
    const aimed = renderer?.aim(pointerN.x, pointerN.y);
    if (aimed) pointer = aimed;
  }
  function turn(dx, dy) { yaw = wrapAngle(yaw + dx * 0.0028); pitch = clamp(pitch - dy * 0.0028, -1.15, 1.15); }
  listen(canvas, 'pointermove', e => {
    if (!playing) return;
    if (rules.view === 'top') aim(e);
    else if (document.pointerLockElement !== canvas && lookPointer?.id === e.pointerId) {
      turn(e.clientX - lookPointer.x, e.clientY - lookPointer.y); lookPointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  });
  listen(document, 'mousemove', e => { if (playing && rules.view === 'fps' && document.pointerLockElement === canvas) turn(e.movementX, e.movementY); });
  function lockFailed() { lockUnavailable = true; $('arena-look-hint').textContent = '마우스 잠금 불가 · 화면 드래그로 조준 · Space로 사격'; }
  listen(document, 'pointerlockerror', lockFailed);
  listen(document, 'pointerlockchange', () => {
    if (document.pointerLockElement !== canvas) { unlockedAt = performance.now(); resetInput(); sendInput(); }
  });
  listen(canvas, 'pointerdown', e => {
    if (e.button !== 0 || !playing) return;
    e.preventDefault(); canvas.focus();
    if (rules.view === 'fps') {
      lookPointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
      if (e.pointerType !== 'touch' && document.pointerLockElement !== canvas && !lockUnavailable) {
        try { if (canvas.requestPointerLock) canvas.requestPointerLock()?.catch(lockFailed); else lockFailed(); } catch { lockFailed(); }
        return;
      }
    } else aim(e);
    if (e.pointerType !== 'touch') { firing = true; trigger++; sendInput(); }
    if (document.pointerLockElement !== canvas) canvas.setPointerCapture(e.pointerId);
  });
  listen(window, 'pointerup', e => { if (lookPointer?.id === e.pointerId) lookPointer = null; if (e.pointerType !== 'touch') { firing = false; sendInput(); } });
  listen(canvas, 'pointercancel', () => { firing = false; lookPointer = null; });
  listen(canvas, 'contextmenu', e => e.preventDefault());
  listen(canvas, 'webglcontextlost', e => {
    e.preventDefault(); playing = false; resetInput(); updatePresence();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    $('arena-lobby').hidden = false; $('arena-battle').hidden = true;
    $('arena-render-error').textContent = '3D 그래픽 연결이 끊겼습니다. 복구된 후 다시 출격해 주세요.'; $('arena-render-error').hidden = false;
  });
  listen(canvas, 'webglcontextrestored', () => { renderer?.destroy(); renderer = null; $('arena-render-error').hidden = true; });
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
  function draw(now) {
    if (disposed) return;
    frame = requestAnimationFrame(draw);
    if (!playing || !renderer) return;
    const viewPlayer = snapshot?.players.find(p => p.id === selfId);
    if (viewPlayer && !cameraReady) {
      yaw = Math.atan2(380 - viewPlayer.y, 600 - viewPlayer.x); pitch = 0; cameraReady = true;
    }
    if (rules.view === 'top' && viewPlayer) yaw = Math.atan2(pointer.y - viewPlayer.y, pointer.x - viewPlayer.x);
    renderer.draw(snapshot, selfId, rules, { yaw, pitch, fov });
    if (rules.view === 'top') {
      const aimed = renderer.aim(pointerN.x, pointerN.y);
      if (aimed) pointer = aimed;
    }
    const rect = canvas.getBoundingClientRect(), stage = canvas.parentElement.getBoundingClientRect();
    $('arena-crosshair').style.left = (rect.left - stage.left + rect.width * (rules.view === 'fps' ? 0.5 : (pointerN.x + 1) / 2)) + 'px';
    $('arena-crosshair').style.top = (rect.top - stage.top + rect.height * (rules.view === 'fps' ? 0.5 : (1 - pointerN.y) / 2)) + 'px';
    if (now - lastHud < 120) return;
    lastHud = now;
    const me = snapshot?.players.find(p => p.id === selfId);
    $('arena-health').textContent = `HP ${me?.hp ?? '—'}`;
    $('arena-weapon').textContent = WEAPONS[weapon].name;
    $('arena-ammo').textContent = me?.reloadUntil > snapshot?.time ? `재장전 ${Math.max(0, me.reloadUntil - snapshot.time).toFixed(1)}s` : `${me?.ammo ?? '—'} / ${WEAPONS[weapon].magazine}`;
    const stale = now - lastSnapshotAt > 2500;
    const teams = rules.mode === 'teams';
    const ready = side => snapshot?.players.filter(p => p.team === side).length || 0;
    const waiting = `준비 대기 · 레드 ${ready('red')}/${rules.size} · 블루 ${ready('blue')}/${rules.size}`;
    const winnerName = teams ? `${TEAM_NAMES[snapshot?.winner]} 팀` : snapshot?.winner ? getName(snapshot.winner) : '';
    $('arena-banner').textContent = !me || stale ? '게임 연결을 기다리는 중…' : snapshot.waiting ? waiting : snapshot.winner ? `${winnerName} 승리 · ${Math.ceil(snapshot.restartAt - snapshot.time)}초 후 새 라운드` : me.hp <= 0 ? `${Math.ceil(me.respawnAt - snapshot.time)}초 후 부활` : !teams && snapshot.players.length < 2 ? '연습 중 · 다른 참가자가 출격하면 FFA 시작' : '';
    $('arena-status').textContent = `${snapshot?.waiting ? waiting : `${snapshot?.players.length || 0}명 전투 중`} · ${teams ? '팀 합산 ' : ''}20킬 승리 · 사망 후 3초 부활${now < migrationUntil ? ' · 호스트 변경으로 라운드 재시작' : ''}`;
    $('arena-team-score').textContent = `레드 ${snapshot?.teamScores.red ?? 0} : ${snapshot?.teamScores.blue ?? 0} 블루 · ${rules.size} vs ${rules.size} · 내 팀: ${TEAM_NAMES[me?.team] || '배정 중'}`;
    const board = $('arena-scoreboard'); board.replaceChildren();
    for (const p of [...(snapshot?.players || [])].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)) {
      const item = document.createElement('li'); item.textContent = `${teams ? `[${TEAM_NAMES[p.team]}] ` : ''}${getName(p.id)}${p.id === selfId ? ' (나)' : ''} · ${p.kills} K / ${p.deaths} D`; board.append(item);
    }
  }
  $('arena-fov').value = String(fov); $('arena-fov-value').textContent = `${fov}°`;
  renderLobby();
  frame = requestAnimationFrame(draw);
  return {
    peerJoined(id) { announce(id); },
    peerLeft(id) { members.delete(id); inputs.delete(id); inputTimes.delete(id); reconcile(); },
    destroy() {
      leave(); disposed = true; clearInterval(tick); cancelAnimationFrame(frame); events.abort(); members.clear(); inputs.clear();
      renderer?.destroy(); renderer = null;
      $('arena-count').textContent = '0명'; $('arena-lobby-count').textContent = '0명';
    },
  };
}
