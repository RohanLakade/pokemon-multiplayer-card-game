import { defineConfig, devices } from '@playwright/test';

// The tests start their own copy of the game on ports that the normal dev servers do not use,
// so they never depend on (or disturb) what you have running, and never touch the live site.
const SERVER_PORT = 3100;
const CLIENT_PORT = 5273;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const CLIENT_URL = `http://localhost:${CLIENT_PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.js',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // One test at a time: every test creates a room, and the server limits room creation per IP
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: CLIENT_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      // The real server, started the way Render starts it
      command: 'npm run start --workspace @pokemon-game/server',
      url: `${SERVER_URL}/api/health`,
      env: { PORT: String(SERVER_PORT), CLIENT_ORIGIN: CLIENT_URL, TRUST_PROXY: '0' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // The website in development mode, told where the test server is
      command: `npm run dev --workspace @pokemon-game/client -- --port ${CLIENT_PORT} --strictPort`,
      url: CLIENT_URL,
      env: { VITE_SERVER_URL: SERVER_URL },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
