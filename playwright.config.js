import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', channel: 'msedge', headless: true },
  webServer: { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
