export function validChannel(value) {
  return value.length >= 1 && value.length <= 32 && !/[^A-Za-z0-9]/.test(value);
}

export async function resolveIpRoom(signal) {
  // Use the IPv4-only endpoint: devices on one router can have different IPv6 addresses.
  const response = await fetch('https://api.ipify.org?format=json', {
    signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new Error('IP lookup failed');
  const { ip } = await response.json();
  if (typeof ip !== 'string' || !/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) throw new Error('Invalid IPv4');
  const octets = ip.split('.').map(Number);
  if (octets.some(value => value > 255)) throw new Error('Invalid IPv4');
  const address = octets.join('.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`talk-ip-room-v1:${address}`));
  // This hides the literal address in normal UI/URLs, but is not access control or anonymization.
  return `ip:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
