#!/usr/bin/env bun
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import * as process from "node:process";
import type { TypeId } from "../src/gamedata/ids";
import {
  FITTING_MODULES,
  MISSILE_GUIDANCE_COMPUTERS,
  MISSILE_GUIDANCE_ENHANCERS,
  STASIS_GRAPPLERS,
  STASIS_WEBS,
  TARGET_PAINTERS,
  TRACKING_COMPUTERS,
  TRACKING_DISRUPTORS,
  TURRETS,
  WARP_SCRAMBLERS,
} from "../src/gamedata/fittingDb";

const OUTPUT_PATH = "src/gamedata/moduleSlots/moduleSlots.ts";
const NAME_TO_ID_PATH = "data/ship-modules/nameToId.json";

export type ModuleSlot = "high" | "mid" | "low" | "rig";

interface NamedTypeId {
  readonly name: string;
  readonly id: TypeId;
}

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
  "Stasis Grappler": "mid",
  "Warp Scrambler": "mid",
  "Weapon Disruptor": "mid",
  "Target Painter": "mid",
  "Missile Guidance Computer": "mid",
  "Missile Guidance Enhancer": "low",
  "Ballistic Control System": "low",
  "Armor Plate": "low",
  "Inertial Stabilizer": "low",
  "Nanofiber Internal Structure": "low",
  "Overdrive Injector System": "low",
  "Reinforced Bulkhead": "low",
  "Shield Extender": "mid",
  "Tracking Enhancer": "low",
  "Gyrostabilizer": "low",
  "Heat Sink": "low",
  "Magnetic Field Stabilizer": "low",
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
  modules: readonly NamedTypeId[],
  turrets: readonly NamedTypeId[],
  groupSlots: Readonly<Record<string, ModuleSlot>>,
): string {
  const missing: string[] = [];
  const unmatched: string[] = [];
  const slotsByName: Record<string, ModuleSlot> = {};
  const slotsById: Record<string, ModuleSlot> = {};

  for (const module of modules) collectSlot(module);
  for (const turret of turrets) collectSlot(turret);

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

  const nameLines = Object.keys(slotsByName)
    .sort()
    .map((name) => `  ${JSON.stringify(name)}: "${slotsByName[name]}",`);

  const idLines = Object.keys(slotsById)
    .sort((a, b) => Number(a) - Number(b))
    .map((id) => `  [${JSON.stringify(id)} as TypeId]: "${slotsById[id]}",`);

  return `import type { TypeId } from "../ids";\n\nexport type ModuleSlot = "high" | "mid" | "low" | "rig";\n\nexport const MODULE_SLOTS_BY_NAME: Readonly<Record<string, ModuleSlot>> = {\n${nameLines.join("\n")}\n} as const;\n\nexport const MODULE_SLOTS_BY_ID: Readonly<Record<TypeId, ModuleSlot>> = {\n${idLines.join("\n")}\n} as const;\n`;

  function collectSlot(item: NamedTypeId): void {
    if (item.name in slotsByName) return;
    const entries = nameToId.byName.iconID[item.name];
    if (entries === undefined || entries.length === 0) {
      if (!missing.includes(item.name)) missing.push(item.name);
      return;
    }
    const group = entries[0].group;
    const slot = groupSlots[group];
    if (slot === undefined) {
      if (!unmatched.includes(`${item.name} (${group})`)) unmatched.push(`${item.name} (${group})`);
      return;
    }
    slotsByName[item.name] = slot;
    slotsById[item.id] = slot;
  }
}

function main(): void {
  const raw: unknown = JSON.parse(readFileSync(NAME_TO_ID_PATH, "utf8"));
  const nameToId = decodeNameToId(raw);
  const modulesByName = new Map<string, TypeId>();
  for (const stats of Object.values(FITTING_MODULES)) modulesByName.set(stats.name, stats.id);
  for (const stats of Object.values(STASIS_WEBS)) modulesByName.set(stats.name, stats.id);
  for (const stats of Object.values(STASIS_GRAPPLERS)) modulesByName.set(stats.name, stats.id);
  for (const stats of Object.values(TRACKING_COMPUTERS)) modulesByName.set(stats.name, stats.id);
  for (const stats of Object.values(TRACKING_DISRUPTORS)) modulesByName.set(stats.name, stats.id);
  for (const stats of Object.values(WARP_SCRAMBLERS)) modulesByName.set(stats.name, stats.id);
  for (const stats of Object.values(TARGET_PAINTERS)) modulesByName.set(stats.name, stats.id);
  for (const stats of Object.values(MISSILE_GUIDANCE_COMPUTERS)) modulesByName.set(stats.name, stats.id);
  for (const stats of Object.values(MISSILE_GUIDANCE_ENHANCERS)) modulesByName.set(stats.name, stats.id);
  const modules: NamedTypeId[] = [...modulesByName.entries()].map(([name, id]) => ({ name, id })).sort((a, b) => a.name.localeCompare(b.name));
  const turrets: NamedTypeId[] = Object.values(TURRETS)
    .map((stats) => ({ name: stats.name, id: stats.id }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const content = generateModuleSlotsContent(nameToId, modules, turrets, GROUP_SLOTS);
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
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
