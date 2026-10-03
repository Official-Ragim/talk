import assert from 'node:assert/strict';
import { createMultipathRoom } from './multipath.mjs';
function transport() {
  const peers = {}, actions = new Map(), sent = [];
  return {
    peers, actions, sent, closed: 0,
    getPeers: () => peers,
    makeAction(name) {
      if (!actions.has(name)) actions.set(name, { async send(value, options) { sent.push([value, options]); }, onMessage: null });
      return actions.get(name);
    },
    async leave() { this.closed++; },
    join(id) { peers[id] = {}; this.onPeerJoin(id); },
    exit(id) { delete peers[id]; this.onPeerLeave(id); },
  };
}
const a = transport(), b = transport(), room = createMultipathRoom([a, b]);
const joins = [], leaves = [];
room.onPeerJoin = id => joins.push(id); room.onPeerLeave = id => leaves.push(id);
const action = room.makeAction('test'), received = [];
action.onMessage = value => received.push(value);
a.join('p'); b.join('p');
assert.deepEqual(joins, ['p'], 'Two discovery paths still yield one participant');
await action.send('first', { target: 'p' });
assert.equal(a.sent.length, 1); assert.equal(b.sent.length, 0, 'Application data is not duplicated');
a.exit('p');
assert.deepEqual(leaves, [], 'Losing only one path must not remove the participant');
await action.send('fallback', { target: 'p' });
assert.equal(b.sent.length, 1);
b.actions.get('test').onMessage('reply', { peerId: 'p' }); assert.deepEqual(received, ['reply']);
b.exit('p'); assert.deepEqual(leaves, ['p']);
await assert.rejects(action.send('missing', { target: 'p' }));
await room.leave(); await room.leave();
assert.equal(a.closed, 1); assert.equal(b.closed, 1);
assert.deepEqual(room.getPeers(), {});
console.log('Transport checks passed: merged discovery, no duplicates, secondary path, final departure, idempotent cleanup.');
