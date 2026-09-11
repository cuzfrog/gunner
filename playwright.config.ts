import { defineConfig } from "@playwright/test";

// Fixed at 2: each e2e file runs as one serial scenario on a single shared page
// (one app boot per file), so throughput comes from running 2 files concurrently.
// Higher worker counts cause CPU contention (wall-clock sim tests slow down under
// load) and must not be raised via CLI overrides.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts$/,
  fullyParallel: false,
  workers: 2,
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
