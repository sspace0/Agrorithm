import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
const deployment = JSON.parse(readFileSync(new URL("./deployment.config.json", import.meta.url), "utf8"));
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:4173${process.env.DEPLOY_BASE || deployment.base}`;
export default defineConfig({
  testDir: "tests/browser",
  timeout: 45000,
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm preview --port 4173",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/browser-results.json" }],
  ],
});
