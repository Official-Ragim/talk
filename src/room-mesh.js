// Route around missing WebRTC links. Only presence is replayed to new links;
// messages remain ephemeral. Targeted payloads are encrypted end to end.
export function createRoomMesh(raw, selfId, { heartbeatMs = 2000, expiryMs = 12000 } = {}) {
  const wire = raw.makeAction('talkMeshV1');
  const session = crypto.randomUUID(), nodes = new Map(), direct = new Set(), actions = new Map();
  const seen = new Set(), retired = new Set(), keys = new Map(), outgoing = new Map(), incoming = new Map();
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  let sequence = 0, closed = false;
  const pack = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const unpack = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  const ready = crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  const publicKey = ready.then(pair => crypto.subtle.exportKey('raw', pair.publicKey)).then(pack);
  const remember = (set, value, limit = 4096) => { set.add(value); if (set.size > limit) set.delete(set.values().next().value); };
  const identity = p => `${p.from}:${p.session}`;
  const header = p => encoder.encode(JSON.stringify([p.from, p.session, p.to, p.toSession, p.action, p.seq]));
  const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 100;
  const sendWire = (packet, targets) => targets.length ? wire.send(packet, { target: targets }) : Promise.resolve();
  const forward = (packet, except) => sendWire({ ...packet, hops: packet.hops - 1 }, [...direct].filter(id => id !== except));
  function route(target, learned = true) {
    if (direct.has(target)) return target;
    const visited = new Set([selfId, ...direct]), queue = [...direct].map(id => [id, id]);
    for (let i = 0; i < queue.length; i++) {
      const [id, first] = queue[i];
      for (const next of nodes.get(id)?.neighbors || []) {
        if (visited.has(next) || !nodes.has(next)) continue;
        if (next === target) return first;
        visited.add(next); queue.push([next, first]);
      }
    }
    const node = nodes.get(target), via = node?.via;
    return learned && node && Date.now() - node.at <= expiryMs && direct.has(via) ? via : null;
  }
  function remove(id) {
    const node = nodes.get(id);
    if (!node) return;
    nodes.delete(id); keys.delete(identity({ from: id, session: node.session }));
    api.onPeerLeave?.(id);
  }
  function prune() {
    for (const [id, node] of nodes) {
      // A background tab can throttle heartbeats while its WebRTC connection is
      // still live. Presence age alone must never remove a reachable participant.
      if (!direct.has(id) && !route(id, false) && Date.now() - node.at > heartbeatMs * 2) remove(id);
    }
  }
  async function announce() {
    const key = await publicKey;
    if (closed) return;
    const packet = { from: selfId, session, seq: ++sequence, kind: 'presence', publicKey: key, neighbors: [...direct], hops: 16 };
    await sendWire(packet, [...direct]);
  }
  function shared(id, node) {
    const key = `${id}:${node.session}`;
    if (!keys.has(key)) keys.set(key, (async () => {
      const peerKey = await crypto.subtle.importKey('raw', unpack(node.publicKey), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
      return crypto.subtle.deriveKey({ name: 'ECDH', public: peerKey }, (await ready).privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    })());
    return keys.get(key);
  }
  async function transmit(action, value, target) {
    const node = nodes.get(target), next = route(target);
    if (closed || !node || !next) throw new Error('상대방으로 이어지는 연결이 없습니다.');
    const packet = { from: selfId, session, seq: ++sequence, kind: 'data', to: target, toSession: node.session, action, hops: 16 };
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = encoder.encode(JSON.stringify(value));
    if (plaintext.length > 64000) throw new Error('메시지가 너무 큽니다.');
    packet.body = pack(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: header(packet) }, await shared(target, node), plaintext));
    packet.iv = pack(iv);
    if (closed || nodes.get(target) !== node) throw new Error('상대방 연결이 변경되었습니다.');
    await sendWire(packet, [route(target)].filter(Boolean));
  }
  function send(action, value, options) {
    const targets = options?.target === undefined ? [...nodes.keys()] : [options.target].flat();
    return Promise.all([...new Set(targets)].map(target => {
      const task = (outgoing.get(target) || Promise.resolve()).catch(() => {}).then(() => transmit(action, value, target));
      outgoing.set(target, task);
      void task.finally(() => { if (outgoing.get(target) === task) outgoing.delete(target); }).catch(() => {});
      return task;
    }));
  }
  const api = {
    onPeerJoin: null, onPeerLeave: null,
    makeAction(name) {
      if (!actions.has(name)) actions.set(name, { onMessage: null, send: (value, options) => send(name, value, options) });
      return actions.get(name);
    },
    getPeers: () => Object.fromEntries([...nodes.keys()].map(id => [id, { direct: direct.has(id) }])),
    async leave() {
      if (closed) return;
      closed = true; clearInterval(timer);
      const packet = { from: selfId, session, seq: ++sequence, kind: 'leave', hops: 16 };
      // Sending is queued before closing channels, without waiting indefinitely for a slow peer.
      await Promise.race([sendWire(packet, [...direct]).catch(() => {}), new Promise(resolve => setTimeout(resolve, 150))]);
      nodes.clear(); keys.clear(); actions.clear(); seen.clear(); retired.clear(); incoming.clear(); outgoing.clear(); direct.clear();
      await raw.leave();
    },
  };
  wire.onMessage = (packet, { peerId }) => {
    if (closed || !direct.has(peerId) || !packet || !validId(packet.from) || !validId(packet.session) || packet.from === selfId || !Number.isSafeInteger(packet.seq) || packet.seq < 1 || !Number.isInteger(packet.hops) || packet.hops < 1 || packet.hops > 16) return;
    const origin = identity(packet), token = `${origin}:${packet.seq}`;
    if (seen.has(token) || retired.has(origin)) return;
    if (packet.kind === 'presence') {
      if (typeof packet.publicKey !== 'string' || packet.publicKey.length !== 88 || !Array.isArray(packet.neighbors) || packet.neighbors.length > 128 || !packet.neighbors.every(validId)) return;
      const previous = nodes.get(packet.from);
      if (previous?.session === packet.session && packet.seq <= previous.packet.seq) return;
      if (previous && previous.session !== packet.session) { remember(retired, `${packet.from}:${previous.session}`); remove(packet.from); }
      remember(seen, token);
      // Preserve the node object so asynchronous sends can detect actual reconnections.
      const node = nodes.get(packet.from) || {};
      Object.assign(node, { session: packet.session, publicKey: packet.publicKey, neighbors: packet.neighbors, via: peerId, at: Date.now(), packet });
      nodes.set(packet.from, node);
      void forward(packet, peerId).catch(() => {});
      if (!previous || previous.session !== packet.session) api.onPeerJoin?.(packet.from);
      return;
    }
    const node = nodes.get(packet.from);
    if (!node || node.session !== packet.session) return;
    if (packet.kind === 'leave') {
      remember(seen, token); remember(retired, origin); remove(packet.from);
      void forward(packet, peerId).catch(() => {}); return;
    }
    if (packet.kind !== 'data' || !validId(packet.to) || !validId(packet.toSession) || typeof packet.action !== 'string' || packet.action.length > 32 || typeof packet.body !== 'string' || packet.body.length > 90000 || typeof packet.iv !== 'string' || packet.iv.length !== 16) return;
    remember(seen, token);
    if (packet.to !== selfId) {
      const next = route(packet.to);
      if (packet.hops > 1 && next && next !== peerId) void sendWire({ ...packet, hops: packet.hops - 1 }, [next]).catch(() => {});
      return;
    }
    if (packet.toSession !== session) return;
    const task = (incoming.get(origin) || Promise.resolve()).catch(() => {}).then(async () => {
      const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unpack(packet.iv), additionalData: header(packet) }, await shared(packet.from, node), unpack(packet.body));
      if (!closed && nodes.get(packet.from) === node) actions.get(packet.action)?.onMessage?.(JSON.parse(decoder.decode(bytes)), { peerId: packet.from });
    });
    incoming.set(origin, task);
    void task.finally(() => { if (incoming.get(origin) === task) incoming.delete(origin); }).catch(() => {});
  };
  raw.onPeerJoin = async id => {
    if (closed || direct.has(id)) return;
    direct.add(id);
    await announce().catch(() => {});
    if (closed || !direct.has(id)) return;
    // Topology/key announcements only: never send prior chat or DM history.
    for (const node of nodes.values()) void sendWire({ ...node.packet, hops: 16 }, [id]).catch(() => {});
  };
  raw.onPeerLeave = id => { direct.delete(id); prune(); void announce().catch(() => {}); };
  const timer = setInterval(() => {
    if (closed) return;
    // Also recover a missed join/leave callback using the transport's live inventory.
    const connected = new Set(Object.keys(raw.getPeers()));
    for (const id of connected) if (!direct.has(id)) raw.onPeerJoin(id);
    for (const id of direct) if (!connected.has(id)) raw.onPeerLeave(id);
    prune(); void announce().catch(() => {});
  }, heartbeatMs);
  queueMicrotask(() => { for (const id of Object.keys(raw.getPeers())) raw.onPeerJoin(id); });
  return api;
}
