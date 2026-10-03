import assert from 'node:assert/strict';
import { createRoomMesh } from '../src/room-mesh.js';

const raw = new Map(), rooms = new Map(), members = new Map(), received = new Map(), packets = [];
function add(id) {
  const links = new Set(), handlers = new Map();
  let joinHandler, leaveHandler;
  const transport = {
    set onPeerJoin(fn) { joinHandler = fn; },
    set onPeerLeave(fn) { leaveHandler = fn; },
    notifyJoin: peer => joinHandler?.(peer),
    notifyLeave: peer => leaveHandler?.(peer),
    links, getPeers: () => Object.fromEntries([...links].map(peer => [peer, {}])),
    makeAction(name) {
      if (!handlers.has(name)) handlers.set(name, {
        onMessage: null,
        async send(value, { target } = {}) {
          if (transport.dropPresence && value.kind === 'presence') return;
          for (const peer of target === undefined ? links : [target].flat()) {
            if (!links.has(peer)) throw new Error('No direct link');
            packets.push([id, peer, structuredClone(value)]);
            queueMicrotask(() => raw.get(peer)?.deliver(name, structuredClone(value), id));
          }
        },
      });
      return handlers.get(name);
    },
    deliver: (name, value, from) => { if (links.has(from)) handlers.get(name)?.onMessage?.(value, { peerId: from }); },
    async leave() { for (const peer of [...links]) unlink(id, peer); },
  };
  raw.set(id, transport);
  const room = createRoomMesh(transport, id, { heartbeatMs: 50, expiryMs: 2000 });
  rooms.set(id, room); members.set(id, new Set()); received.set(id, []);
  room.onPeerJoin = peer => members.get(id).add(peer);
  room.onPeerLeave = peer => members.get(id).delete(peer);
  room.makeAction('message').onMessage = (value, { peerId }) => received.get(id).push([peerId, value]);
}
function link(a, b, notify = true) {
  raw.get(a).links.add(b); raw.get(b).links.add(a);
  if (notify) { raw.get(a).notifyJoin(b); raw.get(b).notifyJoin(a); }
}
function unlink(a, b) {
  raw.get(a).links.delete(b); raw.get(b).links.delete(a);
  raw.get(a).notifyLeave(b); raw.get(b).notifyLeave(a);
}
async function until(check, label) {
  const deadline = Date.now() + 4000;
  while (!check() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(check(), label);
}
try {
  add('A'); add('B'); link('A', 'B');
  await until(() => members.get('A').has('B') && members.get('B').has('A'), 'Initial pair');
  await rooms.get('A').makeAction('message').send('earlier message');
  await until(() => received.get('B').length === 1, 'Initial message');
  add('C'); link('B', 'C', false); // Missing A–C link AND missed connection callbacks.
  await until(() => [...members.values()].every(set => set.size === 2), 'All three discover each other over incomplete mesh');
  assert.deepEqual(received.get('C'), [], 'Newcomer receives no chat history');
  for (const id of rooms.keys()) await rooms.get(id).makeAction('message').send(`from ${id}`);
  await until(() => received.get('A').length === 2 && received.get('B').length === 3 && received.get('C').length === 2, 'Every sender reaches both recipients exactly once');
  assert.deepEqual(new Set(received.get('A').map(([id]) => id)), new Set(['B', 'C']));
  let secret;
  rooms.get('C').makeAction('dm').onMessage = value => { secret = value; };
  await rooms.get('A').makeAction('dm').send('private A to C', { target: 'C' });
  await until(() => secret === 'private A to C', 'DM reaches indirect recipient');
  assert.ok(packets.some(([from, to, p]) => from === 'B' && to === 'C' && p.action === 'dm'));
  assert.ok(!JSON.stringify(packets).includes('private A to C'), 'Transit packets never expose DM plaintext');
  for (const transport of raw.values()) transport.dropPresence = true;
  await new Promise(resolve => setTimeout(resolve, 2100));
  assert.ok([...members.values()].every(set => set.size === 2), 'Throttled background heartbeats do not remove reachable participants');
  for (const transport of raw.values()) transport.dropPresence = false;
  link('A', 'C');
  await new Promise(resolve => setTimeout(resolve, 100));
  unlink('B', 'C');
  await rooms.get('B').makeAction('message').send('alternate route', { target: 'C' });
  await until(() => received.get('C').some(([, value]) => value === 'alternate route'), 'Route survives an individual link failure');
  unlink('A', 'B');
  await until(() => !members.get('A').has('B') && !members.get('C').has('B'), 'Disconnected member is removed throughout component');
  await rooms.get('C').leave();
  await until(() => members.get('A').size === 0, 'Graceful departure clears presence');
  console.log('Mesh checks passed: missing link, missed callbacks, all-pairs messages, no history, encrypted relay, alternate routes, departure.');
} finally { await Promise.all([...rooms.values()].map(room => room.leave())); }
