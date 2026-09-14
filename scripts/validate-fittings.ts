#!/usr/bin/env bun
// Validates all fitting files in data/ship-fittings/:
//   1. parseEft succeeds (valid EFT header)
//   2. summarizeFitting succeeds
//   3. header format is [Ship, FittingName]
//   4. bank sizes match hull slot counts (high/med/low/rig from ShipProfile)
//   5. drone bay volume fits within hull droneCapacity
// Reports any failures found.
import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { parseEft } from "../src/fitting/eft";
import { summarizeFitting } from "./fittingSummary";
import { SHIP_PROFILES } from "../src/gamedata/shipProfiles/profiles";
import { FITTING_DB } from "../src/gamedata/fittingDb";

const ROOT = process.cwd() + "/data/ship-fittings";

// Combat drones carry volume/bandwidth; non-combat db.drones entries only expose id/name.
const DRONE_VOLUME_BY_NAME: ReadonlyMap<string, number> = new Map(Object.values(FITTING_DB.combatDrones).map((drone) => [drone.name, drone.volume]));

interface ShipProfileWithSlots {
  readonly name: string;
  readonly highSlots: number;
  readonly medSlots: number;
  readonly lowSlots: number;
  readonly rigSlots: number;
  readonly droneCapacity: number;
}

const PROFILE_BY_NAME: ReadonlyMap<string, ShipProfileWithSlots> = new Map(SHIP_PROFILES.map((profile) => [profile.name, profile]));

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

    const parsed = parseEft(raw);
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

    // Hull comes from the directory name (generate-fitting-presets.ts rule), never the header.
    const hullName = path.basename(path.dirname(fp)).replaceAll("_", " ");
    const profile = PROFILE_BY_NAME.get(hullName);
    if (!profile) {
      failed++;
      failures.push(`[UNKNOWN HULL] ${fp}: hull "${hullName}" is not in SHIP_PROFILES`);
      continue;
    }

    const bankLines = { high: 0, mid: 0, low: 0, rig: 0 };
    for (const bank of parsed.banks) {
      if (bank.bank in bankLines) bankLines[bank.bank] += bank.lines.length;
    }
    const expected = { high: profile.highSlots, mid: profile.medSlots, low: profile.lowSlots, rig: profile.rigSlots };
    for (const kind of ["high", "mid", "low", "rig"] as const) {
      if (bankLines[kind] !== expected[kind]) {
        failed++;
        failures.push(`[SLOT MISMATCH] ${fp}: ${kind} bank has ${bankLines[kind]} lines, hull has ${expected[kind]} slots`);
      }
    }

    // Parser maps the first quantity block to drones even when it holds cargo; only real drones carry volume.
    let droneVolume = 0;
    for (const drone of parsed.drones) {
      const volume = DRONE_VOLUME_BY_NAME.get(drone.name);
      if (volume !== undefined) droneVolume += volume * drone.quantity;
    }
    if (droneVolume > profile.droneCapacity) {
      failed++;
      failures.push(`[DRONE BAY] ${fp}: ${droneVolume} m3 of drones exceeds hull capacity ${profile.droneCapacity} m3`);
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
