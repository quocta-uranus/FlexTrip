import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // first hit on a cold Next dev server compiles each route
  timeout: 120_000,
  workers: 1,
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    // wide enough that the floating AI launcher does not cover the composer
    viewport: { width: 1400, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'npm run dev', url: 'http://localhost:3000/login', reuseExistingServer: true, timeout: 120_000 },
    {
      // not npm run start:dev: its prestart hook recreates the Docker containers
      command: 'npx nest start --watch',
      cwd: '../be',
      url: 'http://localhost:3001/api/v1/listings?limit=1',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
