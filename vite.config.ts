import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: process.env.DEPLOY_BASE || "/FieldShift/",
  build: { chunkSizeWarningLimit: 1100 },
  test: { environment: "node", include: ["tests/*.test.ts"] },
});
