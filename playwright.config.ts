import { defineConfig, devices } from '@playwright/test'
import { getE2EDatabaseUrl } from './e2e/lab-02/environment'

const e2eDatabaseUrl = getE2EDatabaseUrl()
const { FORCE_COLOR: _forceColor, NO_COLOR: _noColor, ...cleanEnv } = process.env

export default defineConfig({
  testDir: './e2e/lab-02',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  globalSetup: './e2e/lab-02/global-setup.ts',
  outputDir: 'artifacts/lab-02/playwright-results',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run dev',
      cwd: 'server',
      env: { ...cleanEnv, DATABASE_URL: e2eDatabaseUrl, NO_COLOR: '1', PORT: '3002' },
      url: 'http://127.0.0.1:3002/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174',
      cwd: 'client',
      env: { ...cleanEnv, NO_COLOR: '1', VITE_API_BASE_URL: 'http://127.0.0.1:3002' },
      url: 'http://127.0.0.1:5174/select-requester',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
