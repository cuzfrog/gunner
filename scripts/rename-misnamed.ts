#!/usr/bin/env bun
// Renames fitting files whose current name does not match their actual
// summarized classification.  Duplicate content → drop source; different
// content with same name → append .N suffix.
import * as fsp from "node:fs/promises";

import { renameFittingText, summarizeFitting } from "./fittingSummary";

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

async function exists(p: string): Promise<boolean> {
  return fsp.access(p, fsp.constants.F_OK).then(() => true).catch(() => false);
}

function toFileName(displayName: string): string {
  return displayName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();
}

async function main(): Promise<void> {
  const files = await walk(ROOT);
  console.log(`Scanning ${files.length} files for classification mismatches...`);

  let renamed = 0;
  let skippedDup = 0;
  let alreadyCorrect = 0;
  let failed = 0;

  for (const fittingPath of files) {
    const raw = await fsp.readFile(fittingPath, "utf-8");
    const summary = summarizeFitting(raw);
    if (!summary) {
      failed++;
      console.error(`[FAIL] ${fittingPath}: could not parse or summarize`);
      continue;
    }

    const desiredBase = toFileName(summary.displayName);
    const currentFile = fittingPath.split("/").pop()!;
    const currentBase = currentFile.replace(/\.txt$/i, "").replace(/\.\d+$/, "");

    if (currentBase === desiredBase) {
      alreadyCorrect++;
      continue;
    }

    const newName = `${desiredBase}.txt`;
    const newPath = fittingPath.replace(/[^/]*$/, newName);

    if (newPath === fittingPath) {
      alreadyCorrect++;
      continue;
    }

    try {
      if (await exists(newPath)) {
        const existingContent = await fsp.readFile(newPath, "utf-8");
        if (existingContent === raw) {
          // Identical content — keep canonical, drop source
          await fsp.unlink(fittingPath);
          skippedDup++;
          continue;
        }
        // True collision → numeric suffix
        let candidate = newPath;
        let counter = 1;
        while (await exists(candidate)) {
          candidate = fittingPath.replace(/[^/]*$/, `${desiredBase}.${counter}.txt`);
          counter++;
        }
        await fsp.rename(fittingPath, candidate);
        console.log(`[RENAME] ${currentFile} → ${desiredBase}.${counter}.txt  // ${summary.displayName}`);
      } else {
        const updated = renameFittingText(raw);
        if (!updated) {
          failed++;
          console.error(`[FAIL] ${fittingPath}: renameFittingText returned undefined`);
          continue;
        }
        await fsp.writeFile(newPath, updated, "utf-8");
        await fsp.unlink(fittingPath);
        console.log(`[RENAME] ${currentFile} → ${newName}  // ${summary.displayName}`);
      }
      renamed++;
    } catch (err) {
      failed++;
      console.error(`[ERROR] ${fittingPath}: ${(err as Error).message}`);
    }
  }

  console.log(
    `\nDone. Renamed: ${renamed} | Dup-skip: ${skippedDup} | Already-correct: ${alreadyCorrect} | Failed: ${failed}`,
  );
}

await main();