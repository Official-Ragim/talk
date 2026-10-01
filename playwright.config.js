import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5174/talk/', channel: 'msedge', headless: true },
  webServer: { command: 'node scripts/serve-static.mjs', url: 'http://127.0.0.1:5174/talk/', reuseExistingServer: true },
});
