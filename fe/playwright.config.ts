import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    // wide enough that the floating AI launcher does not cover the composer
    viewport: { width: 1400, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120_000 },
    {
      command: 'npm run start:dev',
      cwd: '../be',
      url: 'http://localhost:3001/api/v1/listings?limit=1',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
