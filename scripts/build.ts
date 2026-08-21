import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { ITEM_ICON_IDS } from "../src/fitting";

const PUBLIC_DIRECTORY = "public";
const DISTRIBUTION_DIRECTORY = "dist";
const SHIP_IMAGES_SOURCE = "data/ship-images";
const ICONS_SOURCE_DIRECTORY = "data/ship-modules/icons";
const STYLES_FILE_NAME = "styles.css";
const INDEX_FILE_NAME = "index.html";
const HASH_LENGTH = 8;
const STYLES_LINK_PATTERN = /href=["']styles\.css["']/;
const SCRIPT_SRC_PATTERN = /src=["']\.\/main\.js["']/;
const ENTRY_NAMING_PATTERN = "[name]-[hash].[ext]";

rmSync(DISTRIBUTION_DIRECTORY, { force: true, recursive: true });

const result = await Bun.build({
  entrypoints: ["src/main.ts"],
  outdir: DISTRIBUTION_DIRECTORY,
  target: "browser",
  minify: true,
  naming: { entry: ENTRY_NAMING_PATTERN },
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  throw new Error("Build failed");
}

const jsEntry = result.outputs.find((output) => output.kind === "entry-point");
if (jsEntry === undefined) {
  throw new Error("No JS entry point produced");
}
const mainJsName = basename(jsEntry.path);

mkdirSync(DISTRIBUTION_DIRECTORY, { recursive: true });

for (const entry of readdirSync(PUBLIC_DIRECTORY, { withFileTypes: true })) {
  const src = join(PUBLIC_DIRECTORY, entry.name);
  const dst = join(DISTRIBUTION_DIRECTORY, entry.name);
  cpSync(src, dst, { force: true, recursive: true });
}

cpSync(SHIP_IMAGES_SOURCE, join(DISTRIBUTION_DIRECTORY, "images", "ships"), { recursive: true });

const iconsDist = join(DISTRIBUTION_DIRECTORY, "images", "icons");
mkdirSync(iconsDist, { recursive: true });
for (const iconId of new Set(Object.values(ITEM_ICON_IDS))) {
  const src = join(ICONS_SOURCE_DIRECTORY, `${iconId}@1x.png`);
  if (!existsSync(src)) throw new Error(`Missing icon source: ${src}`);
  cpSync(src, join(iconsDist, `${iconId}@1x.png`));
}

const stylesHash = hashFile(join(PUBLIC_DIRECTORY, STYLES_FILE_NAME));
const hashedStylesName = `styles-${stylesHash}.css`;
renameSync(join(DISTRIBUTION_DIRECTORY, STYLES_FILE_NAME), join(DISTRIBUTION_DIRECTORY, hashedStylesName));

let indexHtml = readFileSync(join(DISTRIBUTION_DIRECTORY, INDEX_FILE_NAME), "utf-8");
indexHtml = indexHtml.replace(STYLES_LINK_PATTERN, `href="${hashedStylesName}"`);
indexHtml = indexHtml.replace(SCRIPT_SRC_PATTERN, `src="./${mainJsName}"`);
writeFileSync(join(DISTRIBUTION_DIRECTORY, INDEX_FILE_NAME), indexHtml, "utf-8");

console.log("Build complete.");

function hashFile(filePath: string): string {
  return createHash("sha256")
    .update(readFileSync(filePath))
    .digest("hex")
    .slice(0, HASH_LENGTH);
}
