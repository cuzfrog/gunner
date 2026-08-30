import { spawn } from "node:child_process";
import type { FullConfig } from "@playwright/test";

const PORT = 4321;
const BASE_URL = `http://localhost:${PORT}`;
const POLL_INTERVAL_MS = 200;
const POLL_TIMEOUT_MS = 120_000;

interface ServerHandle {
  readonly pid: number;
  kill(signal?: string): void;
}

declare global {
  // eslint-disable-next-line no-var
  var __e2eServer: ServerHandle | undefined;
}

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

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const child = spawn("bun", ["run", "scripts/e2e-server.ts"], {
    stdio: "inherit",
    env: { ...process.env, E2E_PORT: String(PORT) },
  });

  globalThis.__e2eServer = {
    pid: child.pid ?? -1,
    kill: (signal?: string) => child.kill(signal ?? "SIGTERM"),
  };

  try {
    await pollPort();
  } catch (err) {
    child.kill("SIGKILL");
    throw err;
  }
}
