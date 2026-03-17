import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:7922',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // webServer disabled — dev server already running on port 7922
  // webServer: {
  //   command: 'pnpm build && pnpm start',
  //   url: 'http://localhost:7922',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
})
