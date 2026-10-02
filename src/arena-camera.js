export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
export const normalize = v => { const length = Math.hypot(...v) || 1; return v.map(n => n / length); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
export function cameraPose(player, view, yaw, pitch) {
  const x = player?.x ?? 600, z = player?.y ?? 380;
  const eye = view === 'fps' ? [x, 42, z] : [clamp(x, 350, 850), 480, clamp(z, 230, 530) + 260];
  const forward = view === 'fps' ? [Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch)] : normalize([0, -480, -260]);
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  return { eye, forward, right, up };
}
export function viewMatrix({ eye, forward: f, right: r, up: u }) {
  return new Float32Array([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, eye), -dot(u, eye), dot(f, eye), 1]);
}
export function perspective(fov, aspect, near = 1, far = 2400) {
  const f = 1 / Math.tan(fov * Math.PI / 360);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]);
}
export function aimOnGround(pose, nx, ny, fov, aspect) {
  const scale = Math.tan(fov * Math.PI / 360);
  const ray = pose.forward.map((n, i) => n + pose.right[i] * nx * scale * aspect + pose.up[i] * ny * scale);
  if (ray[1] >= -0.001) return null;
  const distance = (42 - pose.eye[1]) / ray[1];
  return { x: pose.eye[0] + ray[0] * distance, y: pose.eye[2] + ray[2] * distance };
}
export function relativeMove(strafe, forward, yaw) {
  return { x: Math.cos(yaw) * forward - Math.sin(yaw) * strafe, y: Math.sin(yaw) * forward + Math.cos(yaw) * strafe };
}
