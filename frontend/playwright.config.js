import { defineConfig } from '@playwright/test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { requireTestDbConfig } = require('../tests/helpers/testEnv');
const db = requireTestDbConfig();
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const backendPort = 3115;
const frontendPort = 4173;
const jwtSecret = 'role_management_playwright_test_secret';

const databaseEnv = {
  ...process.env,
  DB_HOST: db.host,
  DB_PORT: String(db.port),
  DB_USER: db.user,
  DB_PASSWORD: db.password,
  DB_NAME: db.database,
  JWT_SECRET: jwtSecret,
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : 'list',
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node src/server.js',
      cwd: backendDir,
      url: `http://127.0.0.1:${backendPort}/api/health`,
      env: { ...databaseEnv, PORT: String(backendPort) },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
      cwd: frontendDir,
      url: `http://127.0.0.1:${frontendPort}/login`,
      env: {
        ...process.env,
        VITE_BACKEND_ORIGIN: `http://127.0.0.1:${backendPort}`,
        VITE_DEV_SERVER_PORT: String(frontendPort),
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
