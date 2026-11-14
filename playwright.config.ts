import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  timeout: 45000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173/FieldShift/",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm preview --port 4173",
    url: "http://127.0.0.1:4173/FieldShift/",
    reuseExistingServer: !process.env.CI,
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/browser-results.json" }],
  ],
});
