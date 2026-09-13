# e2e

Playwright end-to-end tests. `playwright.config.ts` at the repo root is the entry point.

## Architecture invariant: scenario chaining

Each `*.e2e.ts` file is ONE scenario: a `test.describe.serial` with a `beforeAll` that
creates a single browser context + page, boots the app once (goto with
`waitUntil: "domcontentloaded"`, gated on `#scene` visible), and an `afterAll` that
closes the context. Tests within a file share the page and chain state.

Rules that keep chaining sound:

- Each test establishes its own preconditions (import a fitting, open a popup) and
  restores any state it toggles, unless it is the last consumer in the file.
- Popups opened by a test must be closed by that test (outside click), because a
  later trigger click toggles an already-open popup closed.
- `importFittingViaPaste` (fixtures.ts) overrides `navigator.clipboard` to force the
  paste fallback and ALWAYS restores the real clipboard afterwards. Never inline a
  raw `Object.defineProperty(navigator, "clipboard", ...)` in a test; it leaks into
  later tests that use the real clipboard.
- Sim-timing assertions must be state-based (`expect.poll` with generous timeouts),
  never single reads after fixed sleeps. Exception: a fixed window that bounds
  movement from below (sim must NOT have moved far) is the measurement itself.

## Concurrency

`workers: 4` is fixed in playwright.config.ts. Each file is one serial scenario, so
throughput comes from 4 files running concurrently. 4 is the measured optimum on
an 8-CPU box: higher counts stretch the rAF-driven sim tests beyond the
parallelism gain, lower counts underuse the CPU. Do not change via CLI in CI.

## Infrastructure

- `scripts/e2e-server.ts` serves `dist/` via astro preview on port 4321; globalSetup
  reuses an already-running server and rebuilds only when sources are newer than dist.
- `fixtures.ts` exports `test`/`expect`, fitting text paths (`FITTING_*`),
  clipboard helpers, and the import helpers. `BASE_URL` is the app origin.
  `pauseIfPlaying`/`resetSim` (fixtures.ts) stop the sim safely: a kill flips the
  play button to "Restart", and reset does NOT stop a running sim, so always pause
  via the helpers before resetting.
- `trace: "off"` — trace recording roughly doubles per-action cost across the
  suite. On failure Playwright still attaches the `error-context.md` page
  snapshot to the report; reproduce deeper failures locally with
  `npx playwright test --trace on`.
