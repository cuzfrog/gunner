import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const result = await Bun.build({
  entrypoints: ["src/main.ts"],
  outdir: "dist",
  target: "browser",
  minify: true,
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

mkdirSync("dist", { recursive: true });

const publicDir = "public";
const distDir = "dist";
for (const entry of readdirSync(publicDir, { withFileTypes: true })) {
  const src = join(publicDir, entry.name);
  const dst = join(distDir, entry.name);
  cpSync(src, dst, { force: true, recursive: true });
}

console.log("Build complete.");
