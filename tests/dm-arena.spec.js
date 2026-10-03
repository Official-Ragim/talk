import { test, expect } from '@playwright/test';

async function custom(page, channel, name) {
  await page.goto(`./#channel=${channel}`);
  await page.locator('#nickname-input').fill(name);
  await page.locator('#join-button').click();
}
test('DM is participant-only, private, retained with one occupant, and erased when both leave', async ({ browser }) => {
  const context = await browser.newContext();
  const [a, b, c] = await Promise.all([context.newPage(), context.newPage(), context.newPage()]);
  const errors = [];
  for (const p of [a, b, c]) p.on('pageerror', e => errors.push(e.message));
  const channel = `dm${Date.now()}`;
  try {
    await custom(a, channel, 'Alice'); await custom(b, channel, 'Bob'); await custom(c, channel, 'Carol');
    await expect(a.locator('#participant-count')).toHaveText('3', { timeout: 60000 });
    await expect(b.locator('#participant-count')).toHaveText('3', { timeout: 60000 });
    await expect(c.locator('#participant-count')).toHaveText('3', { timeout: 60000 });
    await expect(a.locator('#minigame-entry')).toBeVisible();
    await a.getByRole('button', { name: 'Bob에게 DM' }).click();
    await a.locator('#dm-input').fill('<b>비밀 메시지</b>'); await a.locator('#dm-send').click();
    await expect(b.getByRole('button', { name: 'Alice에게 DM' })).toContainText('DM 1');
    await expect(b.locator('#dm-dialog')).not.toBeVisible();
    await expect(c.locator('#participants')).not.toContainText('DM 1');
    await expect(c.locator('#dm-messages')).toBeEmpty();
    await expect(b.locator('#messages')).not.toContainText('비밀 메시지');
    await b.getByRole('button', { name: 'Alice에게 DM' }).click();
    await expect(b.locator('#dm-messages')).toContainText('<b>비밀 메시지</b>');
    await expect(b.locator('#dm-messages b')).toHaveCount(0);
    await expect(a.locator('#dm-status')).toContainText('상대방이 DM에 있습니다');
    await b.locator('#dm-leave').click();
    await b.getByRole('button', { name: 'Alice에게 DM' }).click();
    await expect(b.locator('#dm-messages')).toContainText('비밀 메시지');
    await b.locator('#dm-input').fill('답장'); await b.locator('#dm-send').click();
    await expect(a.locator('#dm-messages')).toContainText('답장');
    await a.locator('#dm-leave').click();
    await expect(b.locator('#dm-status')).toContainText('기다리는');
    await b.locator('#dm-leave').click();
    await expect(a.getByRole('button', { name: 'Bob에게 DM' })).toHaveText('BobDM');
    await a.getByRole('button', { name: 'Bob에게 DM' }).click();
    await expect(a.locator('#dm-messages')).toBeEmpty();
    await b.getByRole('button', { name: 'Alice에게 DM' }).click();
    await expect(b.locator('#dm-messages')).toBeEmpty();
    await b.keyboard.press('Escape');
    await b.locator('#leave-button').click();
    await expect(a.locator('#dm-status')).toContainText('채팅방을 나갔습니다');
    await expect(a.locator('#dm-send')).toBeDisabled();
    await a.keyboard.press('Escape');
    await a.setViewportSize({ width: 390, height: 844 });
    await expect(a.getByRole('button', { name: 'Carol에게 DM' })).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('IP arena opts in separately, synchronizes weapons, supports reload and host departure', async ({ browser }) => {
  const context = await browser.newContext();
  const [a, b, c] = await Promise.all([context.newPage(), context.newPage(), context.newPage()]);
  const errors = [];
  try {
    for (const [p, name] of [[a, 'Alpha'], [b, 'Bravo'], [c, 'Spectator']]) {
      p.on('pageerror', e => errors.push(e.message));
      await p.route('https://api.ipify.org/**', route => route.fulfill({ json: { ip: '198.51.100.65' } }));
      await p.goto('./#mode=ip'); await p.locator('#nickname-input').fill(name); await p.locator('#join-button').click();
    }
    await expect(a.locator('#participant-count')).toHaveText('3', { timeout: 60000 });
    await expect(b.locator('#participant-count')).toHaveText('3', { timeout: 60000 });
    await expect(c.locator('#participant-count')).toHaveText('3', { timeout: 60000 });
    for (const p of [a, b]) {
      await p.locator('#arena-enter').click();
      await p.locator('[data-weapon="deagle"]').click();
    }
    await expect(a.locator('#arena-lobby-count')).toHaveText('2명');
    await expect(a.locator('#arena-game-rules')).toBeHidden();
    await expect(a.locator('#arena-view')).toBeEnabled();
    await expect(b.locator('#arena-view')).toBeDisabled();
    await a.locator('#arena-view').selectOption('fps');
    await expect(b.locator('#arena-view')).toHaveValue('fps');
    await a.locator('#arena-view').selectOption('top');
    await expect(b.locator('#arena-view')).toHaveValue('top');
    await expect(b.locator('#arena-lobby-count')).toHaveText('2명');
    await a.screenshot({ path: 'test-results/arena-lobby.png', fullPage: true });
    await a.locator('#arena-play').click(); await b.locator('#arena-play').click();
    await expect(a.locator('#arena-status')).toContainText('2명 전투 중');
    await expect(b.locator('#arena-status')).toContainText('2명 전투 중');
    await expect(a.locator('#arena-scoreboard')).toContainText('Bravo');
    await expect(b.locator('#arena-scoreboard')).toContainText('Alpha');
    await expect(c.locator('#arena-dialog')).not.toBeVisible();
    await expect(c.locator('#arena-count')).toHaveText('2명');
    await expect(c.locator('#arena-scoreboard')).toBeEmpty();
    for (const p of [a, b]) {
      await p.locator('#arena-canvas').click({ position: { x: 50, y: 50 } });
      await expect(p.locator('#arena-ammo')).toHaveText('6 / 7');
      await p.locator('#arena-reload').click();
      await expect(p.locator('#arena-ammo')).toContainText('재장전');
      await expect(p.locator('#arena-ammo')).toHaveText('7 / 7');
    }
    await a.setViewportSize({ width: 1440, height: 1000 });
    await a.screenshot({ path: 'test-results/arena-battle.png', fullPage: true });
    const host = a, survivor = b;
    await host.locator('#arena-leave').click();
    await expect(survivor.locator('#arena-status')).toContainText('1명 전투 중');
    await expect(survivor.locator('#arena-banner')).toContainText('연습 중');
    await survivor.locator('#arena-canvas').click({ position: { x: 100, y: 50 } });
    await expect(survivor.locator('#arena-ammo')).toHaveText('6 / 7');
    await survivor.setViewportSize({ width: 390, height: 844 });
    expect(await survivor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await survivor.locator('#arena-controls').selectOption('mobile');
    await expect(survivor.locator('#touch-fire')).toHaveCount(0);
    await expect(survivor.locator('#move-pad')).toBeVisible();
    await survivor.screenshot({ path: 'test-results/arena-mobile.png', fullPage: true });
    await survivor.locator('#arena-back').click();
    await survivor.locator('[data-weapon="m870"]').click(); await survivor.locator('#arena-play').click();
    await expect(survivor.locator('#arena-weapon')).toHaveText('M870');
    await expect(survivor.locator('#arena-ammo')).toHaveText('8 / 8');
    await survivor.keyboard.press('Escape');
    await survivor.locator('#custom-mode').click();
    await expect(survivor.locator('#minigame-entry')).toBeHidden();
    await expect(survivor.locator('#arena-scoreboard')).toBeEmpty();
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
