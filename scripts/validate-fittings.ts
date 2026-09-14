#!/usr/bin/env bun
// Validates all fitting files in data/ship-fittings/:
//   1. parseEft succeeds (valid EFT header)
//   2. summarizeFitting succeeds
//   3. header format is [Ship, FittingName]
//   4. bank sizes match hull slot counts (high/med/low/rig from ShipProfile)
//   5. drone bay volume fits within hull droneCapacity
// Reports any failures found.
import type { TypeId } from "../src/gamedata/ids";
import type { ShipProfile } from "../src/ships";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { parseEft, type EftBank, type EftLine } from "../src/fitting/eft";
import { summarizeFitting } from "./fittingSummary";
import { SHIP_PROFILES } from "../src/gamedata/shipProfiles/profiles";
import { FITTING_DB, type SubsystemSlotKind, type SubsystemStats } from "../src/gamedata/fittingDb";

const ROOT = process.cwd() + "/data/ship-fittings";

// Combat drones carry volume/bandwidth; non-combat db.drones entries only expose id/name.
const DRONE_VOLUME_BY_NAME: ReadonlyMap<string, number> = new Map(Object.values(FITTING_DB.combatDrones).map((drone) => [drone.name, drone.volume]));

// Strategic cruiser hulls (Tengu/Loki/Proteus/Legion) draw their slot capacity from fitted subsystems.
const STRATEGIC_CRUISER_HULL_TYPE_ID = "963";

const SUBSYSTEM_BY_NAME: ReadonlyMap<string, SubsystemStats> = new Map(Object.values(FITTING_DB.subsystems).map((stats) => [stats.name, stats]));
const LAUNCHER_IDS_BY_NAME: ReadonlyMap<string, TypeId> = new Map(Object.values(FITTING_DB.launchers).map((stats) => [stats.name, stats.id]));
const TURRET_IDS_BY_NAME: ReadonlyMap<string, TypeId> = new Map(Object.values(FITTING_DB.turrets).map((stats) => [stats.name, stats.id]));

interface ShipProfileWithSlots extends Pick<ShipProfile, "name" | "hullTypeId" | "highSlots" | "medSlots" | "lowSlots" | "rigSlots" | "droneCapacity"> {}

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

    const bankLines: Record<"high" | "mid" | "low" | "rig", number> = { high: 0, mid: 0, low: 0, rig: 0 };
    for (const bank of parsed.banks) {
      if (bank.bank === "high" || bank.bank === "mid" || bank.bank === "low" || bank.bank === "rig") bankLines[bank.bank] += bank.lines.length;
    }

    const subsystemBank = parsed.banks.find((bank) => bank.bank === "subsystem");
    const subsystemLines = (subsystemBank?.lines ?? []).filter((line) => line.kind === "module");
    const isStrategicCruiser = profile.hullTypeId === STRATEGIC_CRUISER_HULL_TYPE_ID;

    if (isStrategicCruiser) {
      const result = strategicCruiserExpectedSlots(subsystemLines, profile.rigSlots, fp, failures);
      failed += result.errorCount;
      if (result.expectation) {
        for (const kind of ["high", "mid", "low", "rig"] as const) {
          if (bankLines[kind] !== result.expectation[kind]) {
            failed++;
            failures.push(`[SLOT MISMATCH] ${fp}: ${kind} bank has ${bankLines[kind]} lines, subsystems provide ${result.expectation[kind]}`);
          }
        }
        failed += checkHardpoints(parsed.banks, result.expectation, fp, failures);
      }
    } else {
      if (subsystemLines.length > 0) {
        failed++;
        failures.push(`[SUBSYSTEM ON NON-STRATEGIC-CRUISER] ${fp}: ${hullName} cannot fit subsystems`);
      }
      const expected = { high: profile.highSlots, mid: profile.medSlots, low: profile.lowSlots, rig: profile.rigSlots };
      for (const kind of ["high", "mid", "low", "rig"] as const) {
        if (bankLines[kind] !== expected[kind]) {
          failed++;
          failures.push(`[SLOT MISMATCH] ${fp}: ${kind} bank has ${bankLines[kind]} lines, hull has ${expected[kind]} slots`);
        }
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

interface SlotExpectation {
  readonly high: number;
  readonly mid: number;
  readonly low: number;
  readonly rig: number;
  readonly turretHardpoints: number;
  readonly launcherHardpoints: number;
}

interface SlotExpectationResult {
  readonly expectation?: SlotExpectation;
  readonly errorCount: number;
}

function strategicCruiserExpectedSlots(subsystemLines: readonly EftLine[], rigSlots: number, fp: string, failures: string[]): SlotExpectationResult {
  const totals = { high: 0, mid: 0, low: 0, turretHardpoints: 0, launcherHardpoints: 0 };
  const kinds = new Set<SubsystemSlotKind>();
  for (const line of subsystemLines) {
    if (line.kind !== "module") continue;
    const stats = SUBSYSTEM_BY_NAME.get(line.name);
    if (!stats) {
      failures.push(`[UNKNOWN SUBSYSTEM] ${fp}: ${line.name}`);
      return { errorCount: 1 };
    }
    if (kinds.has(stats.slotKind)) {
      failures.push(`[DUPLICATE SUBSYSTEM] ${fp}: two ${stats.slotKind} subsystems (${stats.name})`);
      return { errorCount: 1 };
    }
    kinds.add(stats.slotKind);
    totals.high += stats.highSlots;
    totals.mid += stats.medSlots;
    totals.low += stats.lowSlots;
    totals.turretHardpoints += stats.turretHardpoints;
    totals.launcherHardpoints += stats.launcherHardpoints;
  }
  return { expectation: { ...totals, rig: rigSlots }, errorCount: 0 };
}

function checkHardpoints(banks: readonly EftBank[], expected: SlotExpectation, fp: string, failures: string[]): number {
  let launchers = 0;
  let turrets = 0;
  for (const bank of banks) {
    if (bank.bank !== "high") continue;
    for (const line of bank.lines) {
      if (line.kind !== "module") continue;
      if (LAUNCHER_IDS_BY_NAME.has(line.name)) launchers++;
      else if (TURRET_IDS_BY_NAME.has(line.name)) turrets++;
    }
  }
  let failed = 0;
  if (launchers > expected.launcherHardpoints) {
    failed++;
    failures.push(`[HARDPOINTS] ${fp}: ${launchers} launchers exceed ${expected.launcherHardpoints} launcher hardpoints`);
  }
  if (turrets > expected.turretHardpoints) {
    failed++;
    failures.push(`[HARDPOINTS] ${fp}: ${turrets} turrets exceed ${expected.turretHardpoints} turret hardpoints`);
  }
  return failed;
}

await main();
