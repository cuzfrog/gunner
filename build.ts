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

const PUBLIC_DIRECTORY = "public";
const DISTRIBUTION_DIRECTORY = "dist";
for (const entry of readdirSync(PUBLIC_DIRECTORY, { withFileTypes: true })) {
  const src = join(PUBLIC_DIRECTORY, entry.name);
  const dst = join(DISTRIBUTION_DIRECTORY, entry.name);
  cpSync(src, dst, { force: true, recursive: true });
}

console.log("Build complete.");
