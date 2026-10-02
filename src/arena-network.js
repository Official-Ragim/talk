// One in-flight state per recipient. Slow peers retain only the newest pending state.
export function createLatestSender(send) {
  const slots = new Map();
  let closed = false;
  async function drain(target, slot) {
    slot.busy = true;
    while (!closed && slots.get(target) === slot && slot.pending !== null) {
      const value = slot.pending; slot.pending = null;
      try { await send(value, target); } catch { /* A later snapshot can recover. */ }
    }
    slot.busy = false;
  }
  return {
    send(value, targets) {
      if (closed) return;
      for (const target of targets) {
        let slot = slots.get(target);
        if (!slot) { slot = { busy: false, pending: null }; slots.set(target, slot); }
        slot.pending = value;
        if (!slot.busy) void drain(target, slot);
      }
    },
    remove(target) { slots.delete(target); },
    clear() { slots.clear(); },
    close() { closed = true; slots.clear(); },
  };
}
