import { defineConfig, devices } from '@playwright/test';

const PREVIEW_URL = 'http://localhost:4173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: PREVIEW_URL,
    trace: 'on-first-retry',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'pnpm preview --port 4173 --strictPort',
    url: PREVIEW_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
