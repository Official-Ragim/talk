export const TEAM_NAMES = { red: '레드', blue: '블루' };
export function validRules(rules, custom) {
  return rules && (rules.mode === 'ffa' || (custom && rules.mode === 'teams')) && Number.isInteger(rules.size) && rules.size >= 1 && rules.size <= 6;
}
// Keep accepted seats before considering new requests, including simultaneous joins.
export function assignSeats(members, previous, size) {
  const seats = new Map();
  const counts = { red: 0, blue: 0 };
  const entries = [...members].sort(([a], [b]) => a.localeCompare(b));
  for (const [id, member] of entries) {
    const team = previous.get(id);
    if (team && (member.team === team || member.team === 'auto') && counts[team] < size) {
      seats.set(id, team); counts[team]++;
    }
  }
  for (const [id, member] of entries) {
    if (seats.has(id)) continue;
    const team = member.team === 'auto' ? (counts.red <= counts.blue ? 'red' : 'blue') : member.team;
    if (TEAM_NAMES[team] && counts[team] < size) { seats.set(id, team); counts[team]++; }
  }
  return seats;
}
