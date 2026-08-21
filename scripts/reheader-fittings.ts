#!/usr/bin/env bun
// Re-writes the EFT header in every fitting file using the current
// summarizeFitting + renameFittingText logic, then validates the result.
import * as fsp from "node:fs/promises";

import { renameFittingText } from "./fittingSummary";

const ROOT = process.cwd() + "/data/ship-fittings";

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
    const full = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile() && e.name.endsWith(".txt")) out.push(full);
  }
  return out;
}

async function main(): Promise<void> {
  const files = await walk(ROOT);
  console.log(`Re-writing headers in ${files.length} fitting files...`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const fp of files) {
    const raw = await fsp.readFile(fp, "utf-8");
    const newText = renameFittingText(raw);
    if (!newText) {
      failed++;
      console.error(`[FAIL] ${fp}: renameFittingText returned undefined`);
      continue;
    }
    if (newText === raw) {
      skipped++;
      continue; // already correct
    }
    await fsp.writeFile(fp, newText, "utf-8");
    updated++;
  }

  console.log(`Done. Updated: ${updated} | Skipped (already correct): ${skipped} | Failed: ${failed}`);
}

await main();