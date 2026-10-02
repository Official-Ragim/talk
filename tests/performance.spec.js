import { test, expect } from '@playwright/test';

test('renderer resource use with twelve players', async ({ page }) => {
  await page.goto('./');
  const result = await page.evaluate(async () => {
    const { createArenaRenderer } = await import('./src/arena-renderer.js');
    const { ArenaEngine } = await import('./src/arena-engine.js');
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:960px;height:600px'; document.body.append(canvas);
    const gl = canvas.getContext('webgl', { alpha: false, antialias: true });
    const renderer = createArenaRenderer(canvas);
    const engine = new ArenaEngine({ mode: 'ffa', size: 1, view: 'fps' });
    for (let i = 0; i < 12; i++) engine.add(`p${i}`, 'm4');
    let allocations = 0, uploads = 0, bytes = 0, layoutReads = 0;
    const bufferData = gl.bufferData.bind(gl), bufferSubData = gl.bufferSubData.bind(gl), bounds = canvas.getBoundingClientRect.bind(canvas);
    gl.bufferData = (...args) => { allocations++; if (typeof args[1] !== 'number') bytes += args[1].byteLength; return bufferData(...args); };
    gl.bufferSubData = (...args) => { uploads++; bytes += args[2].byteLength; return bufferSubData(...args); };
    canvas.getBoundingClientRect = () => { layoutReads++; return bounds(); };
    let snapshot = engine.snapshot(), cpu = 0;
    for (let frame = 0; frame < 60; frame++) {
      await new Promise(requestAnimationFrame);
      if (frame % 4 === 0) { engine.time += 1 / 15; engine.players.get('p1').x += 1; snapshot = engine.snapshot(); }
      const start = performance.now();
      renderer.draw(snapshot, 'p0', engine.rules, { yaw: 0, pitch: 0, fov: 75, ads: 0, now: performance.now() });
      cpu += performance.now() - start;
    }
    const result = { allocations, uploads, bytes, layoutReads, meanCpuMs: Number((cpu / 60).toFixed(3)), frames: 60 };
    renderer.destroy(); canvas.remove(); return result;
  });
  console.log('ARENA_RENDER_BENCHMARK', JSON.stringify(result));
  expect(result.frames).toBe(60);
  expect(result.allocations).toBeLessThanOrEqual(4);
  expect(result.uploads).toBeLessThanOrEqual(18);
  expect(result.bytes).toBeLessThan(2500000);
  expect(result.layoutReads).toBeLessThanOrEqual(2);
});
