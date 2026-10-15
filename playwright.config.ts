import { defineConfig } from '@playwright/test';

// Runs against the static web export (`npm run build:web`); Supabase is replaced by e2e/fakeSupabase.ts.
// BASE_PATH=/brighton-seafishing tests a build made with EXPO_BASE_URL (the GitHub Pages layout).
const basePath = (process.env.BASE_PATH ?? '').replace(/\/$/, '');

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:8085${basePath}/`,
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node e2e/serve.mjs',
    url: `http://localhost:8085${basePath}/`,
    reuseExistingServer: true,
  },
});
