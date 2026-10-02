import { test, expect } from '@playwright/test';

test('custom rooms offer FFA and host-controlled n vs n with shared teams and readiness', async ({ browser }) => {
  test.setTimeout(180000);
  const context = await browser.newContext();
  const pages = await Promise.all(Array.from({ length: 4 }, () => context.newPage()));
  const channel = `teams${Date.now()}`, errors = [];
  try {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`./#channel=${channel}`);
      await page.locator('#nickname-input').fill(`Player${i + 1}`);
      await page.locator('#join-button').click();
      await expect(page.locator('#minigame-entry')).toBeVisible();
    }
    for (const page of pages) await expect(page.locator('#participant-count')).toHaveText('4', { timeout: 60000 });
    for (const page of pages) await page.locator('#arena-enter').click();
    for (const page of pages) await expect(page.locator('#arena-lobby-count')).toHaveText('4명');
    const host = pages[0];
    const client = pages.find(page => page !== host);
    await expect(host.locator('#arena-mode')).toBeEnabled();
    await expect(client.locator('#arena-mode')).toBeDisabled();
    for (const page of [host, client]) await page.locator('#arena-play').click();
    for (const page of [host, client]) await expect(page.locator('#arena-status')).toContainText('2명 전투 중');
    for (const page of [host, client]) await page.locator('#arena-back').click();
    await expect(host.locator('#arena-mode')).toBeEnabled();
    await host.locator('#arena-mode').selectOption('teams');
    for (const page of pages) await expect(page.locator('#arena-mode-label')).toContainText('1 VS 1');
    await expect(host.locator('#red-count')).toHaveText('레드 · 1 / 1');
    await expect(host.locator('#blue-count')).toHaveText('블루 · 1 / 1');
    const overflow = [];
    for (const page of pages) if (await page.locator('#arena-play').isDisabled()) overflow.push(page);
    expect(overflow).toHaveLength(2);
    for (const page of overflow) await expect(page.locator('#arena-team-status')).toContainText('자리가 없습니다');
    await host.locator('#arena-size').selectOption('3');
    for (const page of pages) await expect(page.locator('#arena-mode-label')).toContainText('3 VS 3');
    // Explicit team choices propagate to every lobby, then return to balanced auto assignment.
    await client.locator('[data-team="blue"]').click();
    await expect(client.locator('#arena-team-status')).toContainText('내 팀: 블루');
    await client.locator('[data-team="auto"]').click();
    await host.locator('#arena-size').selectOption('2');
    for (const page of pages) {
      await expect(page.locator('#red-count')).toHaveText('레드 · 2 / 2');
      await expect(page.locator('#blue-count')).toHaveText('블루 · 2 / 2');
      await expect(page.locator('#arena-play')).toBeEnabled();
      await page.locator('[data-weapon="deagle"]').click();
    }
    await host.screenshot({ path: 'test-results/team-lobby.png', fullPage: true });
    await client.locator('#arena-play').click();
    await expect(client.locator('#arena-banner')).toContainText('준비 대기');
    await client.locator('#arena-canvas').click({ position: { x: 50, y: 50 } });
    await expect(client.locator('#arena-ammo')).toHaveText('7 / 7');
    await expect(host.locator('#arena-mode')).toBeDisabled();
    for (const page of pages.filter(page => page !== client)) await page.locator('#arena-play').click();
    for (const page of pages) {
      await expect(page.locator('#arena-status')).toContainText('4명 전투 중');
      await expect(page.locator('#arena-team-score')).toContainText('레드 0 : 0 블루 · 2 vs 2');
      await expect(page.locator('#arena-scoreboard li')).toHaveCount(4);
      await expect(page.locator('#arena-scoreboard')).toContainText('[레드]');
      await expect(page.locator('#arena-scoreboard')).toContainText('[블루]');
    }
    await client.locator('#arena-canvas').click({ position: { x: 50, y: 50 } });
    await expect(client.locator('#arena-ammo')).toHaveText('6 / 7');
    await client.setViewportSize({ width: 390, height: 844 });
    expect(await client.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await client.screenshot({ path: 'test-results/team-mobile.png', fullPage: true });
    // Departure pauses the match and the elected host retains the selected rules.
    await host.locator('#arena-leave').click();
    for (const page of pages.filter(page => page !== host)) {
      await expect(page.locator('#arena-banner')).toContainText('준비 대기');
      await expect(page.locator('#arena-mode-label')).toContainText('2 VS 2');
    }
    await host.locator('#arena-enter').click();
    await expect(host.locator('#arena-mode-label')).toContainText('2 VS 2');
    await host.locator('#arena-play').click();
    for (const page of pages) await expect(page.locator('#arena-status')).toContainText('4명 전투 중');
    for (const page of pages) await page.locator('#arena-back').click();
    await expect(host.locator('#arena-mode')).toBeDisabled();
    await expect(pages[1].locator('#arena-mode')).toBeEnabled();
    await pages[1].locator('#arena-mode').selectOption('ffa');
    for (const page of pages) {
      await expect(page.locator('#arena-mode-label')).toContainText('FREE FOR ALL');
      await expect(page.locator('#arena-teams')).toBeHidden();
    }
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
