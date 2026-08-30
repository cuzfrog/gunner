declare global {
  // eslint-disable-next-line no-var
  var __e2eServer: { readonly pid: number; kill(signal?: string): void } | undefined;
}

export default async function globalTeardown(): Promise<void> {
  const server = globalThis.__e2eServer;
  if (!server) return;
  server.kill("SIGTERM");
  setTimeout(() => server.kill("SIGKILL"), 3000);
  globalThis.__e2eServer = undefined;
}
