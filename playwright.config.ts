import { defineConfig } from "@playwright/test";

// One file = one serial scenario on a single shared page (one app boot per file).
// Workers spread files concurrently; sim-timing assertions are poll-based
// (expect.poll), so contention only stretches polls within their generous
// timeouts. 4 is the measured optimum on an 8-CPU box: more workers stretch the
// rAF-driven sim tests beyond the parallelism gain, fewer underuse the CPU.
// Trace is off: recording roughly doubles every action and poll round trip; on
// failure Playwright still attaches the error-context page snapshot.
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
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
