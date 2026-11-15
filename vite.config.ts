import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
const deployment = JSON.parse(readFileSync(new URL("./deployment.config.json", import.meta.url), "utf8"));
const base = process.env.DEPLOY_BASE || deployment.base;
if (!base.startsWith("/") || !base.endsWith("/")) throw Error("DEPLOY_BASE must start and end with /");
export default defineConfig({
  plugins: [react()],
  base,
  build: { chunkSizeWarningLimit: 1100 },
  test: { environment: "node", include: ["tests/*.test.ts"] },
});
