import { test, expect } from '@playwright/test';

const ipEndpoint = 'https://api.ipify.org/?format=json';
const ipRoute = 'https://api.ipify.org/**';

test('IP room groups equal IPs, separates different IPs, and clears messages when changing mode', async ({ browser }) => {
  const context = await browser.newContext();
  const [a, b, c] = await Promise.all([context.newPage(), context.newPage(), context.newPage()]);
  let requests = 0;
  for (const [page, ip] of [[a, '198.51.100.10'], [b, '198.51.100.10'], [c, '198.51.100.11']]) {
    await page.route(ipRoute, async route => {
      requests++;
      await route.fulfill({ json: { ip } });
    });
    await page.goto('./');
    await page.locator('#ip-mode').click();
    await expect(page.locator('#channel-input')).toBeHidden();
    await expect(page.locator('#join-button')).toHaveText('IP방 입장');
  }
  expect(requests).toBe(0); // Merely choosing the mode does not contact an IP service.
  try {
    for (const page of [a, b, c]) {
      await page.locator('#join-button').click();
      await expect(page.locator('#room-title')).toHaveText('IP방');
      expect(new URL(page.url()).hash).toBe('#mode=ip');
      await expect(page.locator('#share-button')).toBeHidden();
    }
    await expect(a.locator('#participant-count')).toHaveText('2', { timeout: 60000 });
    await expect(b.locator('#participant-count')).toHaveText('2');
    await expect(c.locator('#participant-count')).toHaveText('1');
    await a.locator('#message-input').fill('IP방 메시지');
    await a.locator('#send-button').click();
    await expect(b.locator('.message-text')).toHaveText('IP방 메시지');
    await expect(c.locator('.message-text')).toHaveCount(0);
    await a.locator('#custom-mode').click();
    await expect(a.locator('#messages')).toBeEmpty();
    await expect(a.locator('#channel-input')).toBeVisible();
    await a.locator('#channel-input').fill('ip');
    await a.locator('#join-button').click();
    await expect(a.locator('#room-title')).toHaveText('ip');
    await expect(a.locator('#participant-count')).toHaveText('1');
    await expect(b.locator('#participant-count')).toHaveText('1');
    await expect(a.locator('.message-text')).toHaveCount(0);
    await c.setViewportSize({ width: 390, height: 844 });
    expect(await c.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await c.screenshot({ path: 'test-results/ip-room-mobile.png', fullPage: true });
  } finally { await context.close(); }
});

test('IP lookup failures and cancellation leave the custom room usable', async ({ page }) => {
  await page.route(ipRoute, route => route.fulfill({ status: 503, body: '' }));
  await page.goto('./#mode=ip');
  await page.locator('#join-button').click();
  await expect(page.locator('#form-error')).toContainText('IP를 확인하지 못했습니다');
  await expect(page.locator('#room-title')).toHaveText('대기실');
  await expect(page.locator('#join-button')).toBeEnabled();
  await page.unroute(ipRoute);
  let held;
  await page.route(ipRoute, route => { held = route; });
  const requested = page.waitForRequest(ipEndpoint);
  await page.locator('#join-button').click();
  await requested;
  await expect(page.locator('#join-button')).toHaveText('IP 확인 중…');
  await page.locator('#custom-mode').click();
  await held.fulfill({ json: { ip: '198.51.100.12' } }).catch(() => {});
  await expect(page.locator('#join-button')).toHaveText('입장 / 만들기');
  await page.locator('#channel-input').fill('Custom123');
  await page.locator('#join-button').click();
  await expect(page.locator('#room-title')).toHaveText('custom123');
  expect(new URL(page.url()).hash).toBe('#channel=custom123');
  await expect(page.locator('#form-error')).toBeEmpty();
});

test('live IP service connects two tabs in the IP room', async ({ browser }) => {
  test.skip(!process.env.TALK_LIVE_IP, 'Opt-in check against the real public IP service');
  const context = await browser.newContext();
  const [a, b] = await Promise.all([context.newPage(), context.newPage()]);
  try {
    for (const page of [a, b]) {
      await page.goto('./#mode=ip');
      await page.locator('#join-button').click();
      await expect(page.locator('#room-title')).toHaveText('IP방', { timeout: 15000 });
    }
    await expect(a.locator('#participant-count')).toHaveText('2', { timeout: 60000 });
    await a.locator('#message-input').fill('IP방 연결 확인');
    await a.locator('#send-button').click();
    await expect(b.locator('.message-text')).toHaveText('IP방 연결 확인');
    await a.locator('#leave-button').click();
    await expect(a.locator('#messages')).toBeEmpty();
    await expect(b.locator('#participant-count')).toHaveText('1');
  } finally { await context.close(); }
});
