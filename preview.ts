import { join } from "node:path";

// Build, then serve dist/ on the first available port.
await import("./build");

const server = Bun.serve({
  port: 56789,
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const file = Bun.file(join("dist", pathname));
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response(`Not found: ${pathname}`, { status: 404 });
  },
});

console.log(`Preview: http://localhost:${server.port}`);
