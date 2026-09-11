import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const PORT = Number(process.env.E2E_PORT ?? 4321);
const BASE_URL = `http://localhost:${PORT}`;
const POLL_INTERVAL_MS = 200;
const POLL_TIMEOUT_MS = 60_000;
const DIST_MARKER = "dist/index.html";
const STALE_SOURCES = ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"];

function pollPort(): Promise<void> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    function attempt(): void {
      fetch(BASE_URL, { method: "HEAD" })
        .then(() => resolve())
        .catch(() => {
          if (Date.now() > deadline) reject(new Error(`Server not ready at ${BASE_URL} after ${POLL_TIMEOUT_MS}ms`));
          else setTimeout(attempt, POLL_INTERVAL_MS);
        });
    }
    attempt();
  });
}

async function isServerUp(): Promise<boolean> {
  return fetch(BASE_URL, { method: "HEAD", signal: AbortSignal.timeout(500) })
    .then(() => true)
    .catch(() => false);
}

function isDistStale(): boolean {
  if (!existsSync(DIST_MARKER)) return true;
  const existing = STALE_SOURCES.filter((path) => existsSync(path));
  const result = spawnSync("find", [...existing, "-newer", DIST_MARKER, "-print", "-quit"], { encoding: "utf-8" });
  return result.stdout.trim().length > 0;
}

async function main(): Promise<void> {
  if (await isServerUp()) {
    console.log(`e2e server already running at ${BASE_URL}; reusing it`);
    return;
  }

  if (isDistStale()) {
    console.log("dist is missing or stale; building...");
    const buildResult = spawnSync("bun", ["run", "build"], { stdio: "inherit" });
    if (buildResult.status !== 0) process.exit(buildResult.status ?? 1);
  }

  const child = spawn("bun", ["run", "preview", "--port", String(PORT)], {
    stdio: "inherit",
    env: { ...process.env },
  });

  function cleanup(signal: NodeJS.Signals): void {
    child.kill(signal);
    setTimeout(() => {
      if (!child.killed) child.kill("SIGKILL");
      process.exit(0);
    }, 3000);
  }

  process.on("SIGINT", () => cleanup("SIGINT"));
  process.on("SIGTERM", () => cleanup("SIGTERM"));
  child.on("exit", (code) => process.exit(code ?? 0));

  pollPort()
    .then(() => console.log(`e2e-server ready on ${BASE_URL}`))
    .catch((err) => {
      console.error(err.message);
      child.kill("SIGKILL");
      process.exit(1);
    });
}

main();
