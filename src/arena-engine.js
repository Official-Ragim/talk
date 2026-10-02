export const WORLD = { width: 1200, height: 760 };
export const WEAPONS = {
  m870: { name: 'M870', damage: 16, pellets: 8, spread: 0.18, range: 360, cooldown: 0.85, magazine: 8, reload: 2.6 },
  m4: { name: 'M4 Carbin', damage: 25, pellets: 1, spread: 0.018, range: 880, cooldown: 0.12, magazine: 30, reload: 1.9 },
  deagle: { name: 'Desert Eagle', damage: 50, pellets: 1, spread: 0, range: 950, cooldown: 0.42, magazine: 7, reload: 1.8 },
};
export const WALLS = [
  { x: 0, y: 0, w: 1200, h: 24 }, { x: 0, y: 736, w: 1200, h: 24 },
  { x: 0, y: 0, w: 24, h: 760 }, { x: 1176, y: 0, w: 24, h: 760 },
  { x: 185, y: 160, w: 260, h: 100 }, { x: 185, y: 500, w: 260, h: 100 },
  { x: 755, y: 160, w: 260, h: 100 }, { x: 755, y: 500, w: 260, h: 100 },
  { x: 535, y: 315, w: 130, h: 130 },
  { x: 310, y: 350, w: 65, h: 65 }, { x: 825, y: 350, w: 65, h: 65 },
  { x: 565, y: 100, w: 70, h: 65 }, { x: 565, y: 595, w: 70, h: 65 },
];
const SPAWNS = [[90, 90], [1110, 670], [90, 670], [1110, 90], [90, 380], [1110, 380], [490, 70], [710, 690]];
export const RADIUS = 16;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function blocked(x, y) {
  return WALLS.some(w => Math.hypot(x - clamp(x, w.x, w.x + w.w), y - clamp(y, w.y, w.y + w.h)) < RADIUS);
}
export function rayWall(x, y, dx, dy, wall) {
  let near = 0, far = Infinity;
  for (const [origin, direction, min, max] of [[x, dx, wall.x, wall.x + wall.w], [y, dy, wall.y, wall.y + wall.h]]) {
    if (Math.abs(direction) < 1e-8) { if (origin < min || origin > max) return Infinity; }
    else {
      const a = (min - origin) / direction, b = (max - origin) / direction;
      near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
    }
  }
  return far >= near ? near : Infinity;
}
function rayPlayer(x, y, dx, dy, p) {
  const ox = p.x - x, oy = p.y - y;
  const along = ox * dx + oy * dy;
  const distance2 = ox * ox + oy * oy - along * along;
  if (distance2 > RADIUS * RADIUS || along < 0) return Infinity;
  return Math.max(0, along - Math.sqrt(RADIUS * RADIUS - distance2));
}
export function validInput(input) {
  return input && ['x', 'y', 'angle'].every(key => Number.isFinite(input[key])) && Math.abs(input.x) <= 1 && Math.abs(input.y) <= 1 && Math.abs(input.angle) <= Math.PI * 2 && typeof input.fire === 'boolean' && typeof input.reload === 'boolean' && Number.isSafeInteger(input.trigger) && input.trigger >= 0;
}
export class ArenaEngine {
  constructor(rules = { mode: 'ffa', size: 1 }) { this.rules = { ...rules }; this.teamScores = { red: 0, blue: 0 }; this.players = new Map(); this.time = 0; this.traces = []; this.feed = []; this.winner = null; this.restartAt = 0; this.shotId = 0; }
  get waiting() { return this.rules.mode === 'teams' && ['red', 'blue'].some(team => [...this.players.values()].filter(p => p.team === team).length !== this.rules.size); }
  add(id, weapon = 'm4', team = null) {
    if (this.players.has(id) || !WEAPONS[weapon]) return;
    if (this.rules.mode === 'teams' && (!['red', 'blue'].includes(team) || [...this.players.values()].filter(p => p.team === team).length >= this.rules.size)) return;
    const p = { id, weapon, team, kills: 0, deaths: 0, angle: 0, lastTrigger: 0, cooldown: 0, reloadUntil: 0, respawnAt: 0 };
    this.players.set(id, p); this.spawn(p);
  }
  remove(id) { this.players.delete(id); }
  spawn(p) {
    // Prefer the spawn farthest from living opponents.
    const others = [...this.players.values()].filter(other => other.id !== p.id && other.hp > 0);
    const spawns = this.rules.mode === 'teams' ? [80, 200, 320, 440, 560, 680].map(y => [p.team === 'red' ? 90 : 1110, y]) : SPAWNS;
    const ranked = spawns.map((point, index) => ({ point, score: others.length ? Math.min(...others.map(o => Math.hypot(o.x - point[0], o.y - point[1]))) : (index === this.players.size % spawns.length ? 1 : 0) })).sort((a, b) => b.score - a.score);
    [p.x, p.y] = ranked[0].point;
    p.hp = 100; p.ammo = WEAPONS[p.weapon].magazine; p.reloadUntil = 0; p.respawnAt = 0; p.cooldown = 0; p.shieldUntil = this.time + 1.5;
  }
  step(dt, inputs) {
    if (this.waiting) {
      this.traces = [];
      for (const p of this.players.values()) if (inputs.has(p.id)) p.lastTrigger = inputs.get(p.id).trigger;
      return;
    }
    this.time += dt;
    this.traces = this.traces.filter(t => t.until > this.time);
    if (this.winner) {
      if (this.time >= this.restartAt) {
        this.winner = null; this.feed = []; this.teamScores = { red: 0, blue: 0 };
        for (const p of this.players.values()) { p.kills = p.deaths = 0; this.spawn(p); }
      }
      return;
    }
    for (const p of this.players.values()) {
      const input = inputs.get(p.id);
      if (p.hp <= 0) {
        if (input) p.lastTrigger = input.trigger;
        if (this.time >= p.respawnAt) this.spawn(p);
        continue;
      }
      if (p.reloadUntil && this.time >= p.reloadUntil) { p.ammo = WEAPONS[p.weapon].magazine; p.reloadUntil = 0; }
      if (!input || !validInput(input)) continue;
      p.angle = input.angle;
      const magnitude = Math.max(1, Math.hypot(input.x, input.y));
      const x = p.x + input.x / magnitude * 215 * dt;
      const y = p.y + input.y / magnitude * 215 * dt;
      if (!blocked(x, p.y)) p.x = x;
      if (!blocked(p.x, y)) p.y = y;
      const w = WEAPONS[p.weapon];
      if (input.reload && p.ammo < w.magazine && !p.reloadUntil) p.reloadUntil = this.time + w.reload;
      const trigger = input.trigger > p.lastTrigger;
      p.lastTrigger = input.trigger;
      if ((p.weapon === 'deagle' ? trigger : input.fire || trigger) && this.time >= p.cooldown && !p.reloadUntil && p.ammo > 0) {
        this.shoot(p); p.ammo--; p.cooldown = this.time + w.cooldown; p.shieldUntil = 0;
      }
      if (!p.ammo && !p.reloadUntil) p.reloadUntil = this.time + w.reload;
      if (this.winner) break;
    }
  }
  shoot(p) {
    if (this.waiting || this.winner || p.hp <= 0) return;
    const w = WEAPONS[p.weapon];
    const damage = new Map();
    for (let i = 0; i < w.pellets; i++) {
      const angle = p.angle + (w.pellets > 1 ? (i / (w.pellets - 1) * 2 - 1) * w.spread : (Math.random() * 2 - 1) * w.spread);
      const dx = Math.cos(angle), dy = Math.sin(angle);
      let distance = Math.min(w.range, ...WALLS.map(wall => rayWall(p.x, p.y, dx, dy, wall)));
      let target = null;
      for (const other of this.players.values()) {
        if (other.id === p.id || other.hp <= 0 || other.shieldUntil > this.time || (this.rules.mode === 'teams' && other.team === p.team)) continue;
        const hit = rayPlayer(p.x, p.y, dx, dy, other);
        if (hit < distance) { distance = hit; target = other; }
      }
      if (target) damage.set(target, (damage.get(target) || 0) + w.damage);
      this.traces.push({ id: ++this.shotId, x: p.x, y: p.y, endX: p.x + dx * distance, endY: p.y + dy * distance, until: this.time + 0.14 });
    }
    this.traces = this.traces.slice(-160);
    for (const [target, amount] of damage) {
      target.hp = Math.max(0, target.hp - amount);
      if (!target.hp) {
        target.deaths++; p.kills++; target.respawnAt = this.time + 3;
        this.feed.unshift({ killer: p.id, victim: target.id, weapon: p.weapon, at: this.time });
        this.feed = this.feed.slice(0, 4);
        if (this.rules.mode === 'teams') this.teamScores[p.team]++;
        if (this.rules.mode === 'teams' ? this.teamScores[p.team] >= 20 : p.kills >= 20) { this.winner = this.rules.mode === 'teams' ? p.team : p.id; this.restartAt = this.time + 8; }
      }
    }
  }
  snapshot() { return { time: this.time, players: [...this.players.values()].map(p => ({ ...p })), traces: this.traces, feed: this.feed, winner: this.winner, restartAt: this.restartAt, waiting: this.waiting, teamScores: { ...this.teamScores } }; }
}
