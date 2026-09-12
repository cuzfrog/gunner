import { defineConfig } from "@playwright/test";

// One file = one serial scenario on a single shared page (one app boot per file).
// Workers spread files concurrently; sim-timing assertions are poll-based
// (expect.poll), so contention only stretches polls within their generous
// timeouts. Do not lower below 4: the suite budget assumes this parallelism.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts$/,
  fullyParallel: false,
  workers: 4,
  globalSetup: "./e2e/globalSetup.ts",
  globalTeardown: "./e2e/globalTeardown.ts",
  use: {
    baseURL: "http://localhost:4321",
    permissions: ["clipboard-read", "clipboard-write"],
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
