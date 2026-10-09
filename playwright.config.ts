import { defineConfig, devices } from "@playwright/test";

// Teste de ponta a ponta contra o app compilado e um banco exclusivo de teste.
const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql://conecta:conecta_dev@localhost:5432/conecta_e2e_test";
const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "celular", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx prisma migrate deploy && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: E2E_DB,
      STORAGE_LOCAL_DIR: ".storage/e2e",
      ALLOW_LOCAL_STORAGE_IN_PRODUCTION: "true",
    },
  },
});
