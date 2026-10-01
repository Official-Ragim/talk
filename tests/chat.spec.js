import { test, expect } from '@playwright/test';

test('lobby, validation, help dialog, mobile layout and invitation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '대기실' })).toBeVisible();
  expect(await page.locator('.workspace').evaluate(el => getComputedStyle(el).display)).toBe('grid');
  await expect(page.locator('#send-button')).toBeDisabled();
  await page.locator('#channel-input').fill('invalid channel');
  await page.locator('#join-button').click();
  await expect(page.locator('#form-error')).toContainText('1~32자');
  await page.locator('#help-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#channel-input').fill('');
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const bounds = await page.evaluate(() => ({
    workspace: document.querySelector('.workspace').getBoundingClientRect().bottom,
    composer: document.querySelector('.composer').getBoundingClientRect().bottom,
  }));
  expect(bounds.composer).toBeLessThanOrEqual(bounds.workspace);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  await page.goto('./#channel=Friends');
  await expect(page.locator('#channel-input')).toHaveValue('friends');
  await expect(page.locator('#join-button')).toHaveText('입장');
  await page.locator('#join-button').click();
  await expect(page.locator('#room-title')).toHaveText('friends');
  await expect(page.locator('#send-button')).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#leave-button').click();
  await expect(page.locator('#messages')).toBeEmpty();
  expect(new URL(page.url()).hash).toBe('');
  expect(errors).toEqual([]);
});

test('real WebRTC peers exchange text and never replay history', async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  const [a, b, c] = await Promise.all(contexts.map(ctx => ctx.newPage()));
  const channel = `test-${Date.now()}`;
  async function join(page, name) {
    await page.goto(`./#channel=${channel}`);
    await page.locator('#nickname-input').fill(name);
    await page.locator('#join-button').click();
  }
  try {
    await join(a, '친구 A');
    await join(b, '친구 B');
    await expect(a.locator('#participant-count')).toHaveText('2', { timeout: 60000 });
    await expect(b.locator('#participants')).toContainText('친구 A');
    const payload = '<img src=x onerror=alert(1)> 안녕!';
    await a.locator('#message-input').fill(payload);
    await a.locator('#message-input').press('Enter');
    await expect(b.locator('.message-text')).toHaveText(payload, { timeout: 10000 });
    await expect(b.locator('#messages img')).toHaveCount(0);
    await expect(a.locator('.message-delivery')).toHaveText('전송됨');
    await join(c, '늦은 친구');
    await expect(c.locator('#participant-count')).toHaveText('3', { timeout: 60000 });
    await expect(c.locator('.message-text')).toHaveCount(0);
    await b.locator('#message-input').fill('반가워\n줄바꿈도 됩니다');
    await b.locator('#send-button').click();
    await expect(c.locator('.message-text')).toHaveText('반가워\n줄바꿈도 됩니다');
    await a.emulateMedia({ reducedMotion: 'reduce' });
    await a.screenshot({ path: 'test-results/chat.png', fullPage: true });
    await a.locator('#leave-button').click();
    await expect(a.locator('#messages')).toBeEmpty();
    await join(a, '돌아온 친구');
    await expect(a.locator('#participant-count')).toHaveText('3', { timeout: 60000 });
    await expect(a.locator('.message-text')).toHaveCount(0);
    await a.reload();
    await expect(a.locator('#messages')).toBeEmpty();
    await expect(a.locator('#room-title')).toHaveText('대기실');
    const storage = await a.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie }));
    expect(storage).toEqual({ local: 0, session: 0, cookies: '' });
  } finally { await Promise.all(contexts.map(ctx => ctx.close())); }
});
