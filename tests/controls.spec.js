import { test, expect } from '@playwright/test';

test('desktop can use the mobile pad, drag camera, and crosshair auto fire without a fire button', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    const { createArena } = await import('./src/arena.js');
    const { ArenaEngine } = await import('./src/arena-engine.js');
    const actions = new Map(), engine = new ArenaEngine({ mode: 'ffa', size: 1, view: 'fps' });
    let input = null;
    engine.add('host', 'deagle');
    const room = { makeAction(name) {
      if (!actions.has(name)) actions.set(name, {
        onMessage: null,
        async send(packet) {
          if (name === 'arenaMember') {
            if (packet.playing && !engine.players.has('self')) {
              engine.add('self', packet.weapon);
              Object.assign(engine.players.get('self'), { x: 100, y: 90, shieldUntil: 0 });
              Object.assign(engine.players.get('host'), { x: 200, y: 148, shieldUntil: 0 });
            } else if (!packet.playing) engine.remove('self');
            queueMicrotask(() => actions.get('arenaSetup').onMessage({ hostKey: 'host:host-session', revision: 0, rules: engine.rules, seats: [] }, { peerId: 'host' }));
          }
          if (name === 'arenaInput') input = packet.input;
        },
      });
      return actions.get(name);
    } };
    const arena = createArena({ room, selfId: 'self', getName: id => id, hasPeer: id => id === 'host', custom: true });
    actions.get('arenaMember').onMessage({ joined: true, playing: true, weapon: 'deagle', session: 'host-session', team: 'auto', order: 1, startedAt: 1 }, { peerId: 'host' });
    document.getElementById('minigame-entry').hidden = false;
    const timer = setInterval(() => {
      engine.step(1 / 30, input ? new Map([['self', input]]) : new Map());
      actions.get('arenaState').onMessage({ hostKey: 'host:host-session', revision: 0, snapshot: engine.snapshot() }, { peerId: 'host' });
    }, 1000 / 30);
    window.controlsFixture = {
      get input() { return input; },
      health: () => engine.players.get('host').hp,
      position: () => ({ x: engine.players.get('self').x, y: engine.players.get('self').y }),
      close: () => { clearInterval(timer); arena.destroy(); },
    };
  });
  try {
    await page.locator('#arena-enter').click();
    await page.locator('[data-weapon="deagle"]').click();
    await page.locator('#arena-play').click();
    await expect(page.locator('#arena-health')).toHaveText('HP 100');
    await expect(page.locator('#arena-controls')).toHaveValue('computer');
    await expect(page.locator('#move-pad')).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.controlsFixture.input?.autoFire)).toBe(false);
    await expect(page.locator('#arena-ammo')).toHaveText('7 / 7');
    await page.locator('#arena-controls').selectOption('mobile');
    await expect(page.locator('#move-pad')).toBeVisible();
    await expect(page.locator('#touch-fire')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.controlsFixture.health())).toBe(0);
    await expect(page.locator('#arena-ammo')).toHaveText('5 / 7');
    await page.keyboard.press('Space');
    await expect(page.locator('#arena-ammo')).toHaveText('5 / 7');
    const angle = await page.evaluate(() => window.controlsFixture.input.angle);
    const canvas = await page.locator('#arena-canvas').boundingBox();
    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await page.mouse.down(); await page.mouse.move(canvas.x + canvas.width / 2 + 90, canvas.y + canvas.height / 2 + 10); await page.mouse.up();
    await expect.poll(() => page.evaluate(before => Math.abs(window.controlsFixture.input.angle - before), angle)).toBeGreaterThan(0.1);
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
    const before = await page.evaluate(() => window.controlsFixture.position());
    await page.locator('#move-pad').scrollIntoViewIfNeeded();
    const pad = await page.locator('#move-pad').boundingBox();
    await page.mouse.move(pad.x + pad.width * 0.85, pad.y + pad.height / 2); await page.mouse.down();
    await expect.poll(() => page.evaluate(start => {
      const p = window.controlsFixture.position(); return Math.hypot(p.x - start.x, p.y - start.y);
    }, before)).toBeGreaterThan(5);
    await page.mouse.up();
    await page.screenshot({ path: 'test-results/desktop-mobile-controls.png', fullPage: true });
    await page.locator('#arena-controls').selectOption('computer');
    await expect.poll(() => page.evaluate(() => window.controlsFixture.input?.autoFire)).toBe(false);
    await expect(page.locator('#move-pad')).toBeHidden();
  } finally { await page.evaluate(() => window.controlsFixture.close()); }
});

test('touch devices start in mobile mode and can choose computer controls', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.goto('./#channel=touchdefault'); await page.locator('#join-button').click();
    await page.locator('#arena-enter').click();
    await expect(page.locator('#arena-controls')).toHaveValue('mobile');
    await page.locator('#arena-controls').selectOption('computer');
    await expect(page.locator('#arena-controls')).toHaveValue('computer');
    await page.locator('#arena-controls').selectOption('mobile'); await page.locator('#arena-play').click();
    await expect(page.locator('#arena-health')).toHaveText('HP 100');
    await expect(page.locator('#move-pad')).toBeVisible();
    await expect(page.locator('#touch-fire')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/mobile-auto-controls.png', fullPage: true });
  } finally { await context.close(); }
});
