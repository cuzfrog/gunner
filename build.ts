import { cpSync, mkdirSync } from "node:fs";
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
cpSync(join("public", "index.html"), join("dist", "index.html"), { force: true });
cpSync(join("public", "styles.css"), join("dist", "styles.css"), { force: true });

console.log("Build complete.");
