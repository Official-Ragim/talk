import { joinRoom as joinNostr, selfId } from 'trystero';
import { joinRoom as joinMqtt } from '@trystero-p2p/mqtt';
import { createMultipathRoom } from './multipath.mjs';

export { selfId };
export function joinRoom(config, channel, callbacks) {
  const rooms = [], errors = [];
  for (const join of [joinNostr, joinMqtt]) {
    try { rooms.push(join(config, channel, callbacks)); }
    catch (error) { errors.push(error); }
  }
  if (!rooms.length) throw errors[0];
  return createMultipathRoom(rooms);
}
