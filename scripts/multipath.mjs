// Two independent discovery services, one logical participant per peer ID.
// Application data still travels over WebRTC, not through the discovery brokers.
export function createMultipathRoom(rooms) {
  const known = new Set(), actions = new Map();
  let closed = false, leaving;
  function inventory() { return Object.assign({}, ...rooms.map(room => room.getPeers())); }
  function refresh() {
    if (closed) return;
    const current = new Set(Object.keys(inventory()));
    const joined = [...current].filter(id => !known.has(id)), left = [...known].filter(id => !current.has(id));
    for (const id of left) known.delete(id);
    for (const id of joined) known.add(id);
    for (const id of left) api.onPeerLeave?.(id);
    for (const id of joined) api.onPeerJoin?.(id);
  }
  const api = {
    onPeerJoin: null, onPeerLeave: null,
    getPeers() { refresh(); return closed ? {} : inventory(); },
    makeAction(name) {
      if (actions.has(name)) return actions.get(name);
      const paths = rooms.map(room => room.makeAction(name));
      const action = {
        onMessage: null,
        async send(value, options) {
          if (closed) throw new Error('Room closed');
          const targets = options?.target === undefined ? Object.keys(inventory()) : [options.target].flat();
          return Promise.all([...new Set(targets)].map(async id => {
            const candidates = rooms.map((room, index) => Object.hasOwn(room.getPeers(), id) ? index : -1).filter(index => index >= 0);
            let failure = new Error('Peer not connected');
            for (const index of candidates) {
              try { return await paths[index].send(value, { target: id }); }
              catch (error) { failure = error; }
            }
            throw failure;
          }));
        },
      };
      paths.forEach(path => { path.onMessage = (value, meta) => {
        if (closed) return;
        refresh();
        if (known.has(meta.peerId)) action.onMessage?.(value, meta);
      }; });
      actions.set(name, action); return action;
    },
    leave() {
      if (!leaving) {
        closed = true; known.clear(); actions.clear();
        leaving = Promise.allSettled(rooms.map(room => room.leave()));
      }
      return leaving;
    },
  };
  for (const room of rooms) { room.onPeerJoin = refresh; room.onPeerLeave = refresh; }
  queueMicrotask(refresh);
  return api;
}
