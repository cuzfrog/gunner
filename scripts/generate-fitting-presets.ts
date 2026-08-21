import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { SHIP_PROFILES } from "../src/ships/profiles";

const FITTINGS_DIR = join(import.meta.dir, "..", "data", "ship-fittings");
const OUT_FILE = join(import.meta.dir, "..", "src", "fitting", "fittingPresets.ts");

// Header form is whatever data/ship-fittings carries: `[Hull, Name]`, `[Display Name]`, or a future variant.
// The hull always comes from the directory name, never the header.
const HEADER_LINE = /^\[(.+)\]$/;

interface PresetFitting {
  readonly name: string;
  readonly body: string;
}

function splitFittingText(text: string): { name: string; body: string } | undefined {
  const lines = text.split("\n");
  const headerIndex = lines.findIndex((line) => HEADER_LINE.test(line.trim()));
  if (headerIndex < 0) return undefined;
  const header = HEADER_LINE.exec(lines[headerIndex].trim());
  if (!header) return undefined;
  const headerRest = header[1];
  const commaIndex = headerRest.indexOf(",");
  const name = (commaIndex >= 0 ? headerRest.slice(commaIndex + 1) : headerRest).trim();
  if (name.length === 0) return undefined;
  const body = lines.slice(headerIndex + 1).join("\n").trim();
  return { name, body };
}

async function main() {
  const knownHulls = new Set(SHIP_PROFILES.map((profile) => profile.name));
  const hullDirs = (await readdir(FITTINGS_DIR, { withFileTypes: true })).filter((entry) => entry.isDirectory());

  const presetFittings: Record<string, PresetFitting[]> = {};
  let fitCount = 0;
  const skipped: string[] = [];

  for (const hullDir of hullDirs) {
    const hullName = hullDir.name.replace(/_/g, " ");
    if (!knownHulls.has(hullName)) {
      skipped.push(`${hullDir.name}: hull not in SHIP_PROFILES`);
      continue;
    }

    const files = (await readdir(join(FITTINGS_DIR, hullDir.name))).filter((file) => file.endsWith(".txt")).sort();
    const fittings: PresetFitting[] = [];
    for (const file of files) {
      const text = await readFile(join(FITTINGS_DIR, hullDir.name, file), "utf8");
      const split = splitFittingText(text);
      if (!split) {
        skipped.push(`${hullDir.name}/${file}: no fitting header found`);
        continue;
      }
      fittings.push(split);
      fitCount++;
    }
    if (fittings.length > 0) presetFittings[hullName] = fittings;
  }

  const header = `// Generated from data/ship-fittings by scripts/generate-fitting-presets.ts. Do not edit by hand.\n/* eslint-disable */\n\n`;
  const typeDefinitions = `export interface PresetFitting {
  readonly name: string;
  readonly body: string;
}
\n`;
  const content = `${header}${typeDefinitions}export const PRESET_FITTINGS: Readonly<Record<string, readonly PresetFitting[]>> = ${JSON.stringify(presetFittings, null, 1)};\n`;

  await writeFile(OUT_FILE, content);
  console.log(`Wrote ${fitCount} fits for ${Object.keys(presetFittings).length} hulls to ${OUT_FILE} (${content.length} bytes)`);
  if (skipped.length > 0) {
    console.warn(`Skipped ${skipped.length} entries:`);
    for (const reason of skipped) console.warn(`  ${reason}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
