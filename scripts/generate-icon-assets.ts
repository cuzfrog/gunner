#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import * as process from "node:process";

const OUTPUT_PATH = "src/ui/icons/iconIds.ts";
const NAME_TO_ID_PATH = "data/ship-modules/nameToId.json";

interface NameToId {
  readonly byName: {
    readonly iconID: Readonly<Record<string, ReadonlyArray<{ readonly id: number }>>>;
  };
}

export function generateIconIdsContent(nameToId: NameToId): string {
  const ids: Record<string, number> = {};
  for (const [name, entries] of Object.entries(nameToId.byName.iconID)) {
    if (entries.length > 0) ids[name] = entries[0].id;
  }

  const lines = Object.keys(ids)
    .sort()
    .map((name) => `  ${JSON.stringify(name)}: ${ids[name]},`);

  return `export const ITEM_ICON_IDS: Readonly<Record<string, number>> = {\n${lines.join("\n")}\n} as const;\n`;
}

function main(): void {
  const raw: unknown = JSON.parse(readFileSync(NAME_TO_ID_PATH, "utf8"));
  const nameToId = decodeNameToId(raw);
  const content = generateIconIdsContent(nameToId);
  writeFileSync(OUTPUT_PATH, content, "utf8");
  console.log(`Wrote ${OUTPUT_PATH} with ${Object.keys(nameToId.byName.iconID).length} icon ids`);
}

function decodeNameToId(raw: unknown): NameToId {
  if (!isRecord(raw)) throw new Error("Expected nameToId root to be an object");
  const byName = raw["byName"];
  if (!isRecord(byName)) throw new Error("Expected byName to be an object");
  const iconID = byName["iconID"];
  if (!isRecord(iconID)) throw new Error("Expected iconID to be an object");

  const iconIDs: Record<string, ReadonlyArray<{ readonly id: number }>> = {};
  for (const [name, entries] of Object.entries(iconID)) {
    iconIDs[name] = decodeIconEntries(entries);
  }
  return { byName: { iconID: iconIDs } };
}

function decodeIconEntries(raw: unknown): ReadonlyArray<{ readonly id: number }> {
  if (!Array.isArray(raw)) throw new Error("Expected icon entries to be an array");
  return raw.map((entry, index) => decodeIconEntry(entry, index));
}

function decodeIconEntry(raw: unknown, index: number): { readonly id: number } {
  if (!isRecord(raw)) throw new Error(`Expected icon entry ${index} to be an object`);
  const id = raw["id"];
  if (!isNumber(id)) throw new Error(`Expected icon entry ${index} id to be a number`);
  return { id };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
