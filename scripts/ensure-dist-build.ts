import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";

const DIST_MARKER = "dist/index.html";
// Any build input being newer than dist invalidates the build; src/ui and package.json feed
// the built page (contract ids, i18n keys, version), so they must be watched too.
const STALE_SOURCES = ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"];
const LOCK_PATH = "node_modules/.dist-build.lock";
const LOCK_POLL_MS = 500;
const LOCK_STALE_MS = 180_000;

/**
 * Builds `dist/` when any build input is newer than it. A directory lock serializes
 * concurrent callers (parallel test shards, e2e server) into one astro build; a second
 * caller that acquires the lock after a finished build re-checks staleness and skips.
 */
export function ensureDistBuild(): void {
  if (!isDistStale()) return;
  console.log("dist is missing or stale; building...");
  withDistBuildLock(() => {
    if (!isDistStale()) return;
    const result = spawnSync("bun", ["run", "build"], { stdio: "inherit" });
    if (result.status !== 0) throw new Error(`dist build failed with exit code ${result.status}`);
  });
}

function isDistStale(): boolean {
  if (!existsSync(DIST_MARKER)) return true;
  const existing = STALE_SOURCES.filter((path) => existsSync(path));
  const result = spawnSync("find", [...existing, "-newer", DIST_MARKER, "-print", "-quit"], { encoding: "utf8" });
  return result.stdout.trim().length > 0;
}

function withDistBuildLock(run: () => void): void {
  acquireLock();
  try {
    run();
  } finally {
    rmSync(LOCK_PATH, { recursive: true, force: true });
  }
}

function acquireLock(): void {
  for (;;) {
    try {
      mkdirSync(LOCK_PATH);
      return;
    } catch {
      if (lockAgeMs() > LOCK_STALE_MS) rmSync(LOCK_PATH, { recursive: true, force: true });
      else sleepSync(LOCK_POLL_MS);
    }
  }
}

function lockAgeMs(): number {
  try {
    return Date.now() - statSync(LOCK_PATH).mtimeMs;
  } catch {
    return 0;
  }
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
