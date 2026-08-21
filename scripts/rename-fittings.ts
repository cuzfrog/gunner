#!/usr/bin/env bun
// Usage: bun run scripts/rename-fittings.ts [--dry-run]
//   --dry-run  report renames without writing (default: apply changes)
// Scans data/ship-fittings/ for all fitting txt files and renames them
// according to a summarized fitting name derived from their content.
//
// Collision/de-duplication rules:
//   - Target already exists with identical content → drop source (duplicate).
//   - Target already exists with different content → rename source to name.N.txt
//     where N is the smallest positive integer that avoids collision.
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";

import * as path from "node:path";

import { parseEft } from "../src/fitting/eft";
import { renameFittingText, summarizeFitting } from "./fittingSummary";

const FITTINGS_DIR = process.cwd() + "/data/ship-fittings";
const PATTERN = /^fit-\d+\.txt$/;
const MAX_NAME_LEN = 60;

function sanitizeName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile() && PATTERN.test(e.name)) out.push(full);
  }
  return out;
}

async function exists(p: string): Promise<boolean> {
  return fsp.access(p, fs.constants.F_OK).then(() => true).catch(() => false);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const files = await walk(FITTINGS_DIR);
  console.log(`Scanning ${files.length} fitting files in ${FITTINGS_DIR}...`);

  let renamed = 0;
  let ignoredDuplicates = 0;
  let failed = 0;

  for (const fittingPath of files) {
    const raw = await fsp.readFile(fittingPath, "utf-8");
    const parsed = parseEft(raw);
    const summary = summarizeFitting(raw);
    if (!summary) {
      failed++;
      console.error(`[FAIL] ${fittingPath}: could not parse or summarize`);
      continue;
    }
    if (!summary.displayName) continue;

    let displayName = summary.displayName;
    if (displayName.length > MAX_NAME_LEN) displayName = displayName.slice(0, MAX_NAME_LEN).trimEnd();
    const sanitized = sanitizeName(displayName);
    const newName = `${sanitized}.txt`;
    const newPath = `${path.dirname(fittingPath)}/${newName}`;

    if (newPath === fittingPath) {
      ignoredDuplicates++;
      continue; // already named correctly, no-op
    }

    if (dryRun) {
      console.log(
        `[DRY RUN] ${path.basename(fittingPath)} → ${path.basename(newPath)}  // ${summary.displayName}`,
      );
      ignoredDuplicates++;
      continue;
    }

    try {
      if (await exists(newPath)) {
        const existingContent = await fsp.readFile(newPath, "utf-8");
        if (existingContent === raw) {
          // Exact duplicate fitting already present — keep the canonical, delete source
          await fsp.unlink(fittingPath);
          ignoredDuplicates++;
          continue;
        }
        // True collision: append numeric suffix to get a unique filename
        let candidate = newPath;
        let counter = 1;
        while (await exists(candidate)) {
          candidate = `${path.dirname(fittingPath)}/${sanitized}.${counter}.txt`;
          counter++;
        }
        await fsp.rename(fittingPath, candidate);
        console.log(
          `[RENAME] ${path.basename(fittingPath)} → ${path.basename(candidate)}  // ${summary.displayName}`,
        );
      } else {
        const updated = renameFittingText(raw);
        if (!updated) {
          failed++;
          console.error(`[FAIL] ${fittingPath}: renameFittingText returned undefined`);
          continue;
        }
        await fsp.writeFile(newPath, updated, "utf-8");
        await fsp.unlink(fittingPath);
        console.log(
          `[RENAME] ${path.basename(fittingPath)} → ${path.basename(newPath)}  // ${summary.displayName}`,
        );
      }
      renamed++;
    } catch (err) {
      failed++;
      console.error(`[ERROR] ${fittingPath}: ${(err as Error).message}`);
    }
  }

  console.log(
    `\nDone. Renamed: ${renamed} | Skipped (dup or already named): ${ignoredDuplicates} | Failed: ${failed}`,
  );
}

await main();