import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: './tests', fullyParallel: false, timeout: 45_000,
  expect: { timeout: 10_000 }, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4273', screenshot: 'only-on-failure', trace: 'retain-on-failure',
    launchOptions: process.env.ATLAS_TEST_CHROMIUM ? { executablePath: process.env.ATLAS_TEST_CHROMIUM, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : undefined },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: { command: 'pnpm exec vite --config obsidian/dev/vite.config.ts', cwd: fileURLToPath(new URL('..', import.meta.url)), url: 'http://127.0.0.1:4273/obsidian/dev/index.html', reuseExistingServer: !process.env.CI, timeout: 120_000 }
});
