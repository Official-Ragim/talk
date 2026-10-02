import { WALLS, WORLD } from './arena-engine.js';
import { cameraPose, viewMatrix, perspective, aimOnGround } from './arena-camera.js';

// Native WebGL meshes: both perspectives share the same geometry and depth buffer.
export function createArenaRenderer(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: true });
  if (!gl) throw new Error('이 브라우저에서 3D 화면을 열 수 없습니다. 브라우저의 그래픽 가속을 확인해 주세요.');
  function shader(type, source) {
    const item = gl.createShader(type); gl.shaderSource(item, source); gl.compileShader(item);
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) throw new Error('3D 셰이더를 준비하지 못했습니다.');
    return item;
  }
  const vertex = shader(gl.VERTEX_SHADER, `
    attribute vec3 position; attribute vec3 normal; attribute vec3 color;
    uniform mat4 projection; uniform mat4 view; uniform vec3 eye;
    varying vec3 tint; varying float distanceToEye;
    void main() {
      float light = 0.56 + 0.44 * max(dot(normalize(normal), normalize(vec3(-0.4, 0.9, 0.3))), 0.0);
      tint = color * light; distanceToEye = length(position - eye);
      gl_Position = projection * view * vec4(position, 1.0);
    }`);
  const fragment = shader(gl.FRAGMENT_SHADER, `
    precision mediump float; varying vec3 tint; varying float distanceToEye;
    uniform vec3 fog;
    void main() { gl_FragColor = vec4(mix(tint, fog, smoothstep(800.0, 2100.0, distanceToEye)), 1.0); }`);
  const program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('3D 화면을 준비하지 못했습니다.');
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  const attributes = ['position', 'normal', 'color'].map(name => gl.getAttribLocation(program, name));
  const uniforms = Object.fromEntries(['projection', 'view', 'eye', 'fog'].map(name => [name, gl.getUniformLocation(program, name)]));
  const staticBuffer = gl.createBuffer(), dynamicBuffer = gl.createBuffer();
  const faces = [
    [[1, 0, 0], [[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]],
    [[-1,0,0], [[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]]],
    [[0,1,0], [[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]],
    [[0,-1,0], [[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]]],
    [[0,0,1], [[1,-1,1],[1,1,1],[-1,1,1],[-1,-1,1]]],
    [[0,0,-1], [[-1,-1,-1],[-1,1,-1],[1,1,-1],[1,-1,-1]]],
  ];
  function box(data, x, y, z, width, height, depth, color, angle = 0) {
    const c = Math.cos(angle), s = Math.sin(angle);
    for (const [normal, points] of faces) {
      const n = [normal[0] * c - normal[2] * s, normal[1], normal[0] * s + normal[2] * c];
      for (const i of [0, 1, 2, 0, 2, 3]) {
        const p = points[i], px = p[0] * width / 2, pz = p[2] * depth / 2;
        data.push(x + px * c - pz * s, y + p[1] * height / 2, z + px * s + pz * c, ...n, ...color);
      }
    }
  }
  const staticData = [];
  box(staticData, 600, -6, 380, 2600, 10, 2300, [0.22, 0.28, 0.28]);
  box(staticData, 600, -0.8, 380, 1200, 1, 760, [0.34, 0.39, 0.38]);
  for (let x = 40; x < WORLD.width; x += 80) box(staticData, x, 0, 380, 1, 0.5, 710, [0.29,0.34,0.33]);
  for (let z = 40; z < WORLD.height; z += 80) box(staticData, 600, 0, z, 1150, 0.5, 1, [0.29,0.34,0.33]);
  for (const z of [290, 470]) for (let x = 60; x < 1160; x += 55) box(staticData, x, 0.3, z, 28, 0.8, 4, [0.76,0.68,0.37]);
  WALLS.forEach((w, i) => {
    const color = i < 4 ? [0.56,0.59,0.55] : i < 8 ? [0.35,0.49,0.46] : [0.57,0.48,0.30];
    box(staticData, w.x + w.w / 2, w.height / 2, w.y + w.h / 2, w.w, w.height, w.h, color);
    box(staticData, w.x + w.w / 2, w.height + 1, w.y + w.h / 2, w.w + 3, 2, w.h + 3, color.map(n => n * 1.12));
    if (i >= 4) {
      for (let x = w.x + 12; x < w.x + w.w - 5; x += 20) {
        for (const z of [w.y - 1, w.y + w.h + 1]) box(staticData, x, w.height / 2, z, 3, w.height - 6, 2, color.map(n => n * 0.72));
      }
      for (const z of [w.y + 6, w.y + w.h - 6]) box(staticData, w.x + w.w / 2, w.height + 3, z, w.w - 8, 3, 3, [0.62,0.68,0.58]);
    }
  });
  gl.bindBuffer(gl.ARRAY_BUFFER, staticBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(staticData), gl.STATIC_DRAW);
  let pose = cameraPose(null, 'top', 0, 0), fov = 75, aspect = 1200 / 760;
  function bind(buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    attributes.forEach((location, index) => { gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 36, index * 12); });
  }
  function drawDynamic(data, kind = gl.TRIANGLES) {
    if (!data.length) return;
    bind(dynamicBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW); gl.drawArrays(kind, 0, data.length / 9);
  }
  function draw(snapshot, selfId, rules, camera) {
    if (gl.isContextLost()) return;
    const rect = canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(rect.width * ratio)), height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    aspect = width / height; fov = camera.fov;
    const me = snapshot?.players.find(p => p.id === selfId);
    pose = cameraPose(me, rules.view, camera.yaw, camera.pitch);
    const fog = rules.view === 'fps' ? [0.48,0.57,0.57] : [0.13,0.19,0.20];
    gl.viewport(0, 0, width, height); gl.clearColor(...fog, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.projection, false, perspective(fov, aspect)); gl.uniformMatrix4fv(uniforms.view, false, viewMatrix(pose));
    gl.uniform3fv(uniforms.eye, pose.eye); gl.uniform3fv(uniforms.fog, fog);
    bind(staticBuffer); gl.drawArrays(gl.TRIANGLES, 0, staticData.length / 9);
    const data = [];
    for (const p of snapshot?.players || []) {
      if (p.hp <= 0 || (rules.view === 'fps' && p.id === selfId)) continue;
      const own = p.id === selfId;
      const color = rules.mode === 'teams' ? (p.team === 'red' ? [0.79,0.27,0.20] : [0.20,0.48,0.82]) : own ? [0.38,0.73,0.49] : [0.83,0.38,0.24];
      const angle = own ? camera.yaw : p.angle;
      const part = (x,y,z,w,h,d,c) => box(data, p.x + x * Math.cos(angle) - z * Math.sin(angle), y, p.y + x * Math.sin(angle) + z * Math.cos(angle), w,h,d,c,angle);
      box(data, p.x, 0.4, p.y, 35, 0.8, 30, own ? [0.78,0.87,0.75] : [0.18,0.22,0.21]);
      part(0,12,-7,11,24,9,[0.18,0.23,0.22]); part(0,12,7,11,24,9,[0.18,0.23,0.22]);
      part(0,35,0,20,25,23,color); part(0,54,0,17,18,17,[0.67,0.55,0.41]);
      part(-1,61,0,20,6,20,p.shieldUntil > snapshot.time ? [0.76,0.90,1] : color);
      part(7,36,-16,22,9,8,color); part(7,36,16,22,9,8,color);
      part(19,42,8,p.weapon === 'deagle' ? 21 : 36,7,7,[0.12,0.15,0.16]);
    }
    drawDynamic(data);
    const lines = [];
    for (const t of snapshot?.traces || []) {
      lines.push(t.x,t.z ?? 42,t.y,0,1,0,1,0.87,0.43, t.endX,t.endZ ?? 42,t.endY,0,1,0,1,0.87,0.43);
    }
    drawDynamic(lines, gl.LINES);
    if (rules.view === 'fps' && me?.hp > 0) {
      // A camera-space weapon model stays below the crosshair without clipping walls.
      const gun = [], recoil = snapshot.traces.some(t => t.owner === selfId) ? 2 : 0;
      box(gun, 17,-18,-29 + recoil,11,9,22,[0.63,0.50,0.35]);
      box(gun, 10,-15,-37 + recoil,8,7,22,[0.63,0.50,0.35]);
      box(gun, 14,-10,-42 + recoil,7,8,me.weapon === 'deagle' ? 22 : 40,[0.21,0.25,0.26]);
      box(gun, 14,-10,-64 + recoil,3,3,me.weapon === 'deagle' ? 5 : 14,[0.09,0.12,0.13]);
      box(gun, 14,-15,-35 + recoil,5,15,8,me.weapon === 'm870' ? [0.39,0.25,0.15] : [0.13,0.16,0.17]);
      box(gun, 14,-5,-47 + recoil,2,3,3,[0.08,0.10,0.10]);
      if (recoil) box(gun, 14,-10,-74,6,6,9,[1,0.75,0.22]);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(uniforms.view, false, new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]));
      gl.uniform3fv(uniforms.eye, [0,0,0]); drawDynamic(gun);
    }
    canvas.dataset.renderedView = rules.view;
  }
  return {
    draw,
    aim(nx, ny) { return aimOnGround(pose, nx, ny, fov, aspect); },
    clear() { gl.clearColor(0.1,0.15,0.16,1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); },
    destroy() { gl.deleteBuffer(staticBuffer); gl.deleteBuffer(dynamicBuffer); gl.deleteProgram(program); },
  };
}
