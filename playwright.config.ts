import { defineConfig } from '@playwright/test';

// Runs against the static web export (`npm run build:web`); Supabase is replaced by e2e/fakeSupabase.ts.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8085',
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node e2e/serve.mjs',
    url: 'http://localhost:8085',
    reuseExistingServer: true,
  },
});
