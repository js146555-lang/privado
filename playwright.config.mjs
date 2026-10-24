import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);

export default defineConfig({
  testDir: './test/browser',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    launchOptions: { executablePath, args: ['--no-sandbox'] },
    viewport: { width: 1440, height: 1100 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node test/browser/server.mjs',
    url: 'http://127.0.0.1:4173/api/session',
    reuseExistingServer: false,
    timeout: 10000,
  },
});
