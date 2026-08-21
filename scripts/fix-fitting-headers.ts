#!/usr/bin/env bun
// Fixes all fitting file headers to the canonical `[ShipName, FittingName]` format.
// Handles two legacy formats:
//   - Original: [Ship, Killmail 12345]
// Validates every file after writing and reports failures.
import * as fsp from "node:fs/promises";

const ROOT = process.cwd() + "/data/ship-fittings";

const HEADER_RE = /^\[([^\]]*)\]\s*$/;

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
    const full = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile() && e.name.endsWith(".txt")) out.push(full);
  }
  return out;
}

function expectedHeader(filePath: string): string {
  const parts = filePath.split("/");
  const shipName = parts[parts.length - 2]!.replace(/_/g, " ");
  const fileName = parts[parts.length - 1]!.replace(/\.txt$/i, "");
  // Drop numeric collision suffix (.1, .2, …) before converting underscores
  const fittingName = fileName.replace(/\.\d+$/, "").replace(/_/g, " ");
  return `[${shipName}, ${fittingName}]`;
}

async function main(): Promise<void> {
  const files = await walk(ROOT);
  console.log(`Checking ${files.length} fitting files...`);

  let fixed = 0;
  let alreadyCorrect = 0;
  let failed = 0;

  for (const filePath of files) {
    const raw = await fsp.readFile(filePath, "utf-8");
    const firstNewline = raw.indexOf("\n");
    const headerLine = firstNewline >= 0 ? raw.slice(0, firstNewline) : raw;
    const match = HEADER_RE.exec(headerLine);

    if (!match) {
      console.error(`[FAIL] ${filePath}: no EFT header found`);
      failed++;
      continue;
    }

    const currentHeader = match[1]!.trim();
    const desired = expectedHeader(filePath);
    const desiredInner = desired.slice(1, -1); // strip [ ]

    if (currentHeader === desiredInner) {
      alreadyCorrect++;
      continue;
    }

    // Rewrite with correct header
    const rest = firstNewline >= 0 ? raw.slice(firstNewline) : "\n";
    await fsp.writeFile(filePath, desired + rest, "utf-8");

    // Verify write succeeded
    const verifyRaw = await fsp.readFile(filePath, "utf-8");
    const verifyFirstNewline = verifyRaw.indexOf("\n");
    const verifyHeaderLine = verifyFirstNewline >= 0 ? verifyRaw.slice(0, verifyFirstNewline) : verifyRaw;
    if (verifyHeaderLine.trim() === desired) {
      console.log(`[FIX] ${filePath.split("/").slice(-2).join("/")} → ${desired}`);
      fixed++;
    } else {
      console.error(`[FAIL] ${filePath}: wrote header but verification mismatch`);
      failed++;
    }
  }

  console.log(`\nDone. Fixed: ${fixed} | Already correct: ${alreadyCorrect} | Failed: ${failed}`);
}

await main();