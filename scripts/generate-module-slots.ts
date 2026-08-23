#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import * as process from "node:process";
import { FITTING_MODULES, TURRETS } from "../src/fitting/fittingDb";

const OUTPUT_PATH = "src/fitting/moduleSlots.ts";
const NAME_TO_ID_PATH = "data/ship-modules/nameToId.json";

export type ModuleSlot = "high" | "mid" | "low" | "rig";

interface NameToId {
  readonly byName: {
    readonly iconID: Readonly<Record<string, ReadonlyArray<{ readonly group: string }>>>;
  };
}

const GROUP_SLOTS: Readonly<Record<string, ModuleSlot>> = {
  "Energy Weapon": "high",
  "Hybrid Weapon": "high",
  "Projectile Weapon": "high",
  "Propulsion Module": "mid",
  "Tracking Computer": "mid",
  "Stasis Web": "mid",
  "Weapon Disruptor": "mid",
  "Armor Plate": "low",
  "Inertial Stabilizer": "low",
  "Nanofiber Internal Structure": "low",
  "Overdrive Injector System": "low",
  "Reinforced Bulkhead": "low",
  "Shield Extender": "low",
  "Tracking Enhancer": "low",
  "Energized Armor Membrane": "low",
  "Rig Anchor": "rig",
  "Rig Armor": "rig",
  "Rig Core": "rig",
  "Rig Drones": "rig",
  "Rig Electronic Systems": "rig",
  "Rig Energy Weapon": "rig",
  "Rig Hybrid Weapon": "rig",
  "Rig Launcher": "rig",
  "Rig Mining": "rig",
  "Rig Navigation": "rig",
  "Rig Projectile Weapon": "rig",
  "Rig Resource Processing": "rig",
  "Rig Scanning": "rig",
  "Rig Shield": "rig",
  "Rig Targeting": "rig",
} as const;

export function generateModuleSlotsContent(
  nameToId: NameToId,
  moduleNames: readonly string[],
  turretNames: readonly string[],
  groupSlots: Readonly<Record<string, ModuleSlot>>,
): string {
  const missing: string[] = [];
  const unmatched: string[] = [];
  const slots: Record<string, ModuleSlot> = {};

  for (const name of moduleNames) collectSlot(name);
  for (const name of turretNames) collectSlot(name);

  if (missing.length > 0 || unmatched.length > 0) {
    missing.sort();
    unmatched.sort();
    const parts: string[] = [];
    if (missing.length > 0) {
      const names = missing.map((n) => JSON.stringify(n)).join(", ");
      parts.push(`missing from nameToId: ${names}`);
    }
    if (unmatched.length > 0) {
      const names = unmatched.map((n) => JSON.stringify(n)).join(", ");
      parts.push(`unmatched groups: ${names}`);
    }
    throw new Error(parts.join("; "));
  }

  const lines = Object.keys(slots)
    .sort()
    .map((name) => `  ${JSON.stringify(name)}: "${slots[name]}",`);

  return `export type ModuleSlot = "high" | "mid" | "low" | "rig";\n\nexport const MODULE_SLOTS: Readonly<Record<string, ModuleSlot>> = {\n${lines.join("\n")}\n} as const;\n`;

  function collectSlot(name: string): void {
    if (name in slots) return;
    const entries = nameToId.byName.iconID[name];
    if (entries === undefined || entries.length === 0) {
      if (!missing.includes(name)) missing.push(name);
      return;
    }
    const group = entries[0].group;
    const slot = groupSlots[group];
    if (slot === undefined) {
      if (!unmatched.includes(`${name} (${group})`)) unmatched.push(`${name} (${group})`);
      return;
    }
    slots[name] = slot;
  }
}

function main(): void {
  const raw: unknown = JSON.parse(readFileSync(NAME_TO_ID_PATH, "utf8"));
  const nameToId = decodeNameToId(raw);
  const content = generateModuleSlotsContent(nameToId, Object.keys(FITTING_MODULES), Object.keys(TURRETS), GROUP_SLOTS);
  writeFileSync(OUTPUT_PATH, content, "utf8");
  console.log(`Wrote ${OUTPUT_PATH}`);
}

function decodeNameToId(raw: unknown): NameToId {
  if (!isRecord(raw)) throw new Error("Expected nameToId root to be an object");
  const byName = raw["byName"];
  if (!isRecord(byName)) throw new Error("Expected byName to be an object");
  const iconID = byName["iconID"];
  if (!isRecord(iconID)) throw new Error("Expected iconID to be an object");

  const iconIDs: Record<string, ReadonlyArray<{ readonly group: string }>> = {};
  for (const [name, entries] of Object.entries(iconID)) {
    iconIDs[name] = decodeGroupEntries(entries);
  }
  return { byName: { iconID: iconIDs } };
}

function decodeGroupEntries(raw: unknown): ReadonlyArray<{ readonly group: string }> {
  if (!Array.isArray(raw)) throw new Error("Expected group entries to be an array");
  return raw.map((entry, index) => decodeGroupEntry(entry, index));
}

function decodeGroupEntry(raw: unknown, index: number): { readonly group: string } {
  if (!isRecord(raw)) throw new Error(`Expected group entry ${index} to be an object`);
  const group = raw["group"];
  if (typeof group !== "string") throw new Error(`Expected group entry ${index} group to be a string`);
  return { group };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
