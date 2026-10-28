import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve('node_modules/.cache/ms-playwright');
process.env.KEEMESE_UI_CONTROL ??= randomUUID();
process.env.KEEMESE_UI_COMPLETION = path.resolve(`node_modules/.cache/ui-host-${process.env.KEEMESE_UI_CONTROL}.done`);

export default defineConfig({
  testDir: './e2e', timeout: 60000, expect: { timeout: 10000 }, workers: 1,
  fullyParallel: false, retries: 0, reporter: 'list',
  outputDir: 'node_modules/.cache/test-results',
  globalTeardown: './e2e/teardown.ts',
  use: { baseURL: 'http://127.0.0.1:5173', browserName: 'chromium', locale: 'vi-VN', trace: 'off', screenshot: 'off', viewport: { width: 1280, height: 900 } },
  webServer: [
    {
      command: 'dotnet test ../backend/Keemese.Api.Tests/Keemese.Api.Tests.csproj --no-build --filter FullyQualifiedName~UiTestHost --logger "console;verbosity=minimal"',
      url: 'http://127.0.0.1:5080/api/v1/health/live', timeout: 90000, reuseExistingServer: false,
      env: { KEEMESE_UI_TEST_HOST: '1', KEEMESE_UI_CONTROL: process.env.KEEMESE_UI_CONTROL, KEEMESE_UI_COMPLETION: process.env.KEEMESE_UI_COMPLETION },
    },
    { command: 'npm run preview -- --port 5173', url: 'http://127.0.0.1:5173', reuseExistingServer: false, timeout: 30000 },
  ],
});
