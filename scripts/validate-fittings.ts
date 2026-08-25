#!/usr/bin/env bun
// Validates all fitting files in data/ship-fittings/:
//   1. parseEft succeeds (valid EFT header)
//   2. summarizeFitting succeeds
// Reports any failures found.
import * as fsp from "node:fs/promises";

import { MODULE_SLOT_CATALOG } from "../src/gamedata/moduleSlots";
import { parseEft } from "../src/fitting/eft";
import { summarizeFitting } from "./fittingSummary";

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
  console.log(`Validating ${files.length} fitting files...\n`);

  let ok = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const fp of files) {
    const raw = await fsp.readFile(fp, "utf-8");

    const parsed = parseEft(raw, MODULE_SLOT_CATALOG);
    if (!parsed) {
      failed++;
      failures.push(`[PARSE FAIL] ${fp}`);
      continue;
    }

    const summary = summarizeFitting(raw);
    if (!summary) {
      failed++;
      failures.push(`[SUMMARY FAIL] ${fp}`);
      continue;
    }

    // Confirm header format is [Ship, FittingName]
    const firstLine = raw.split("\n")[0]!.trim();
    const headerOk = /^\[.+, .+\]$/.test(firstLine);
    if (!headerOk) {
      failed++;
      failures.push(`[BAD HEADER] ${fp}: ${firstLine}`);
      continue;
    }

    ok++;
  }

  console.log(`Valid: ${ok} | Failed: ${failed}`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(" ", f);
    process.exitCode = 1;
  }
}

await main();