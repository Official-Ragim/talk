import { test, expect } from '@playwright/test';

test('first starter chooses shared 3D view; FOV and first-person controls work independently', async ({ browser }) => {
  test.setTimeout(150000);
  const context = await browser.newContext();
  const [a, b] = await Promise.all([context.newPage(), context.newPage()]);
  const errors = [], channel = `camera${Date.now()}`;
  try {
    for (const [p, name] of [[a, 'First'], [b, 'Second']]) {
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(`./#channel=${channel}`); await p.locator('#nickname-input').fill(name); await p.locator('#join-button').click();
    }
    await expect(a.locator('#participant-count')).toHaveText('2', { timeout: 60000 });
    await a.locator('#arena-enter').click();
    await expect(a.locator('#arena-view')).toBeEnabled();
    await a.locator('#arena-view').selectOption('fps');
    await b.locator('#arena-enter').click();
    await expect(b.locator('#arena-view')).toHaveValue('fps');
    await expect(b.locator('#arena-view')).toBeDisabled();
    await b.locator('#arena-view').evaluate(el => { el.disabled = false; el.value = 'top'; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await expect(b.locator('#arena-view')).toBeDisabled();
    await expect(b.locator('#arena-view')).toHaveValue('fps');
    await expect(a.locator('#arena-view')).toHaveValue('fps');
    for (const p of [a, b]) { await p.locator('[data-weapon="deagle"]').click(); await p.locator('#arena-play').click(); }
    for (const p of [a, b]) {
      await expect(p.locator('#arena-canvas')).toHaveAttribute('data-rendered-view', 'fps');
      await expect(p.locator('#arena-status')).toContainText('2명 전투 중');
      await expect(p.locator('#arena-render-error')).toBeHidden();
    }
    await a.locator('#arena-fov').fill('105');
    await expect(a.locator('#arena-fov-value')).toHaveText('105°');
    await expect(b.locator('#arena-fov')).toHaveValue('75');
    await a.bringToFront();
    await a.locator('#arena-canvas').click();
    await expect.poll(() => a.evaluate(() => document.pointerLockElement?.id)).toBe('arena-canvas');
    const viewBounds = await a.locator('#arena-canvas').boundingBox();
    await a.mouse.move(viewBounds.x + viewBounds.width / 2 + 6, viewBounds.y + viewBounds.height / 2 + 4);
    await a.keyboard.press('Space');
    await expect(a.locator('#arena-ammo')).toHaveText('6 / 7');
    await a.screenshot({ path: 'test-results/arena-fps.png', fullPage: true });
    await a.mouse.down({ button: 'right' });
    await expect(a.locator('#arena-canvas')).toHaveAttribute('data-aiming', 'true');
    await expect(a.locator('#arena-aim')).toHaveAttribute('aria-pressed', 'true');
    await expect(a.locator('#arena-fov')).toHaveValue('105');
    await a.screenshot({ path: 'test-results/arena-ads.png', fullPage: true });
    await a.keyboard.press('KeyR');
    await expect(a.locator('#arena-ammo')).toContainText('재장전');
    await expect(a.locator('#arena-canvas')).toHaveAttribute('data-aiming', 'false');
    await expect(a.locator('#arena-ammo')).toHaveText('7 / 7');
    await expect(a.locator('#arena-canvas')).toHaveAttribute('data-aiming', 'true');
    await a.mouse.down({ button: 'left' });
    await expect(a.locator('#arena-ammo')).toHaveText('6 / 7');
    await a.mouse.up({ button: 'right' });
    await expect(a.locator('#arena-canvas')).toHaveAttribute('data-aiming', 'false');
    await a.mouse.up({ button: 'left' });
    await a.keyboard.press('Escape');
    await expect.poll(() => a.evaluate(() => document.pointerLockElement === null)).toBe(true);
    await expect(a.locator('#arena-dialog')).toBeVisible();
    for (const p of [a, b]) await p.locator('#arena-back').click();
    await expect(a.locator('#arena-view')).toBeEnabled();
    await a.locator('#arena-view').selectOption('top');
    await expect(b.locator('#arena-view')).toHaveValue('top');
    await a.locator('#arena-play').click();
    await expect(a.locator('#arena-canvas')).toHaveAttribute('data-rendered-view', 'top');
    await expect(a.locator('#arena-health')).toHaveText('HP 100');
    await a.locator('#arena-fov').fill('65');
    await expect(a.locator('#arena-fov-value')).toHaveText('65°');
    await a.locator('#arena-canvas').focus();
    await a.keyboard.down('Shift');
    await expect(a.locator('#arena-canvas')).toHaveAttribute('data-aiming', 'true');
    await a.keyboard.up('Shift');
    await expect(a.locator('#arena-canvas')).toHaveAttribute('data-aiming', 'false');
    const normalResolution = await a.locator('#arena-canvas').evaluate(el => el.width * el.height);
    await a.locator('#arena-quality').selectOption('low');
    await expect.poll(() => a.locator('#arena-canvas').evaluate(el => el.width * el.height)).toBeLessThan(normalResolution);
    await a.locator('#arena-quality').selectOption('auto');
    await a.screenshot({ path: 'test-results/arena-3d-top.png', fullPage: true });
    await a.locator('#arena-leave').click();
    await expect(b.locator('#arena-view')).toBeEnabled();
    await b.locator('#arena-view').selectOption('fps');
    await a.locator('#arena-enter').click();
    await expect(a.locator('#arena-view')).toHaveValue('fps');
    await expect(a.locator('#arena-view')).toBeDisabled();
    await b.setViewportSize({ width: 390, height: 844 });
    await b.bringToFront();
    await b.locator('#arena-controls').selectOption('mobile');
    await b.locator('#arena-play').click();
    await expect(b.locator('#arena-canvas')).toHaveAttribute('data-rendered-view', 'fps');
    await expect(b.locator('#touch-fire')).toHaveCount(0);
    await expect(b.locator('#move-pad')).toBeVisible();
    await expect(b.locator('#arena-health')).toHaveText('HP 100');
    await b.locator('#touch-aim').click();
    await expect(b.locator('#touch-aim')).toHaveAttribute('aria-pressed', 'true');
    await expect(b.locator('#arena-canvas')).toHaveAttribute('data-aiming', 'true');
    await b.locator('#arena-quality').selectOption('low');
    await b.waitForTimeout(400); // Let the ADS camera transition settle before comparing views.
    const beforeLook = await b.locator('#arena-canvas').screenshot();
    const mobile = await context.newCDPSession(b);
    await mobile.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
    const mobileBounds = await b.locator('#arena-canvas').boundingBox();
    const touch = { x: mobileBounds.x + mobileBounds.width / 2, y: mobileBounds.y + mobileBounds.height / 2 };
    await mobile.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
    await mobile.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touch.x + 35, y: touch.y + 8 }] });
    await mobile.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    // Read the composited frame: WebGL may discard its drawing buffer after presentation.
    await expect.poll(async () => !(await b.locator('#arena-canvas').screenshot()).equals(beforeLook)).toBe(true);
    await b.locator('#arena-canvas').focus();
    await b.keyboard.press('Space');
    await expect(b.locator('#arena-ammo')).toHaveText('7 / 7');
    await b.locator('#touch-aim').click();
    await expect(b.locator('#arena-canvas')).toHaveAttribute('data-aiming', 'false');
    expect(await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await b.screenshot({ path: 'test-results/arena-fps-mobile.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
