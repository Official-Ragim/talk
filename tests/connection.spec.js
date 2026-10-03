import { test, expect } from '@playwright/test';

test('creator can immediately leave and recreate the same channel before a guest arrives', async ({ browser }) => {
  const context = await browser.newContext();
  const [creator, guest] = await Promise.all([context.newPage(), context.newPage()]);
  const channel = `recreate${Date.now()}`;
  try {
    await creator.goto(`./#channel=${channel}`);
    await creator.locator('#nickname-input').fill('Creator');
    await creator.locator('#join-button').click();
    await creator.evaluate(() => {
      document.getElementById('leave-button').click();
      document.getElementById('join-button').click();
    });
    await expect(creator.locator('#room-title')).toHaveText(channel);
    await guest.goto(`./#channel=${channel}`);
    await guest.locator('#nickname-input').fill('Guest');
    await guest.locator('#join-button').click();
    for (const page of [creator, guest]) await expect(page.locator('#participant-count')).toHaveText('2', { timeout: 20000 });
    await guest.locator('#message-input').fill('joined the recreated room'); await guest.locator('#send-button').click();
    await expect(creator.locator('.message-text')).toHaveText('joined the recreated room');
    await creator.evaluate(() => {
      document.getElementById('leave-button').click();
      document.getElementById('join-button').click();
      document.getElementById('leave-button').click();
    });
    await expect(guest.locator('#participant-count')).toHaveText('1');
    await expect(creator.locator('#room-title')).toHaveText('대기실');
    await expect(creator.locator('#messages')).toBeEmpty();
  } finally { await context.close(); }
});

test('a creator with blocked primary discovery can still receive guests in either join order', async ({ browser }) => {
  test.setTimeout(150000);
  const creatorContext = await browser.newContext(), guestContext = await browser.newContext();
  await creatorContext.routeWebSocket(url => !['test.mosquitto.org', 'broker.emqx.io', 'public.cloud.shiftr.io', 'broker-cn.emqx.io', 'broker.hivemq.com'].includes(url.hostname), socket => socket.close());
  const creator = await creatorContext.newPage(), guest = await guestContext.newPage();
  const errors = [];
  for (const page of [creator, guest]) page.on('pageerror', error => errors.push(error.message));
  try {
    for (const [round, order] of [[0, [creator, guest]], [1, [guest, creator]]]) {
      const channel = `fallback${round}${Date.now()}`;
      for (const page of order) {
        await page.goto(`./#channel=${channel}`);
        await page.locator('#nickname-input').fill(page === creator ? 'Creator' : 'Guest');
        await page.locator('#join-button').click();
      }
      for (const page of order) {
        await expect(page.locator('#participant-count')).toHaveText('2', { timeout: 60000 });
        await expect(page.locator('#participants')).toContainText('Creator');
        await expect(page.locator('#participants')).toContainText('Guest');
      }
      for (const [from, to] of [[creator, guest], [guest, creator]]) {
        const text = `round ${round} from ${from === creator ? 'creator' : 'guest'}`;
        await from.locator('#message-input').fill(text); await from.locator('#send-button').click();
        await expect(to.locator('.message-text').last()).toHaveText(text);
      }
      for (const page of order) await page.locator('#leave-button').click();
    }
    expect(errors).toEqual([]);
  } finally { await Promise.all([creatorContext.close(), guestContext.close()]); }
});
