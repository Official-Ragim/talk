import { test, expect } from '@playwright/test';

test('three real clients exchange messages and private DM with an A–C transport link missing', async ({ browser }) => {
  test.setTimeout(120000);
  const context = await browser.newContext();
  const pages = await Promise.all([context.newPage(), context.newPage(), context.newPage()]);
  const [a, b, c] = pages, channel = `partial${Date.now()}`, errors = [];
  try {
    await context.route(url => url.pathname.endsWith('/vendor/trystero.js') && !url.searchParams.has('original'), route => route.fulfill({ contentType: 'text/javascript', body: `
      import { joinRoom as original, selfId } from './trystero.js?original=1';
      export { selfId };
      export function joinRoom(...args) {
        const raw = original(...args), allowed = id => id !== window.missingPeer;
        return {
          getPeers: () => Object.fromEntries(Object.entries(raw.getPeers()).filter(([id]) => allowed(id))),
          set onPeerJoin(callback) { raw.onPeerJoin = id => { if (allowed(id)) callback(id); }; },
          set onPeerLeave(callback) { raw.onPeerLeave = id => { if (allowed(id)) callback(id); }; },
          makeAction(name) {
            const action = raw.makeAction(name);
            return {
              send(value, options) {
                const targets = (options?.target === undefined ? Object.keys(raw.getPeers()) : [options.target].flat()).filter(allowed);
                return targets.length ? action.send(value, { target: targets }) : Promise.resolve();
              },
              set onMessage(callback) { action.onMessage = (value, meta) => { if (allowed(meta.peerId)) callback(value, meta); }; },
            };
          },
          leave: () => raw.leave(),
        };
      }` }));
    for (const page of pages) {
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`./#channel=${channel}`);
    }
    const ids = await Promise.all(pages.map(p => p.evaluate(async () => (await import('./vendor/trystero.js?v=20261003-discovery2')).selfId)));
    await a.evaluate(id => { window.missingPeer = id; }, ids[2]);
    await c.evaluate(id => { window.missingPeer = id; }, ids[0]);
    for (let i = 0; i < pages.length; i++) {
      await pages[i].locator('#nickname-input').fill(['Alice', 'Bob', 'Carol'][i]);
      await pages[i].locator('#join-button').click();
      if (i === 1) await expect(a.locator('#participant-count')).toHaveText('2', { timeout: 60000 });
    }
    for (const page of pages) {
      await expect(page.locator('#participant-count')).toHaveText('3', { timeout: 60000 });
      for (const name of ['Alice', 'Bob', 'Carol']) await expect(page.locator('#participants')).toContainText(name);
    }
    for (let i = 0; i < pages.length; i++) {
      const message = `message from ${i}`;
      await pages[i].locator('#message-input').fill(message); await pages[i].locator('#send-button').click();
      for (const page of pages) await expect(page.locator('.message-text').last()).toHaveText(message);
    }
    await a.getByRole('button', { name: 'Carol에게 DM' }).click();
    await a.locator('#dm-input').fill('A C private'); await a.locator('#dm-send').click();
    await c.getByRole('button', { name: 'Alice에게 DM' }).click();
    await expect(c.locator('#dm-messages')).toContainText('A C private');
    await expect(b.locator('#dm-messages')).toBeEmpty();
    await expect(b.locator('#messages')).not.toContainText('A C private');
    await a.locator('#dm-leave').click(); await c.locator('#dm-leave').click();
    for (const page of pages) await page.locator('#arena-enter').click();
    for (const page of pages) {
      await expect(page.locator('#arena-lobby-count')).toHaveText('3명');
      await page.locator('#arena-play').click();
    }
    for (const page of pages) await expect(page.locator('#arena-status')).toContainText('3명 전투 중');
    await c.locator('#arena-leave').click(); await c.locator('#leave-button').click();
    for (const page of [a, b]) {
      await expect(page.locator('#participant-count')).toHaveText('2');
      await expect(page.locator('#arena-status')).toContainText('2명 전투 중');
    }
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
