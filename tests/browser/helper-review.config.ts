import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir:".",testMatch:["helper.spec.ts","helper-conversation.spec.ts","helper-results.spec.ts"],workers:1,timeout:45000,
  outputDir:"../../test-results/helper-review",
  use:{baseURL:"http://127.0.0.1:4187/Agrorithm/",viewport:{width:1440,height:1000},trace:"retain-on-failure"},
  webServer:{command:"pnpm exec vite preview --outDir .helper-review-dist --port 4187 --host 127.0.0.1",url:"http://127.0.0.1:4187/Agrorithm/",reuseExistingServer:false,cwd:"../.."},
  reporter:[["list"],["json",{outputFile:"test-results/helper-review-results.json"}]],
});
