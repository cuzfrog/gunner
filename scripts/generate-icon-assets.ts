#!/usr/bin/env bun
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import * as process from "node:process";
import { SHIP_PROFILES } from "../src/gamedata/shipProfiles/profiles";
import type { ShipProfile } from "../src/ships";

const ICON_OUTPUT_PATH = "src/ui/icons/iconIds.ts";
const SHIP_IMAGE_OUTPUT_PATH = "src/ui/icons/shipImageIds.ts";
const NAME_TO_ID_PATH = "data/ship-modules/nameToId.json";
const SHIP_IMAGES_SOURCE = "data/ship-images";

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

export function generateShipImageIdsContent(shipProfiles: readonly Pick<ShipProfile, "id" | "name">[], imageFileNames: readonly string[]): string {
  const filesByName = new Map<string, string>();
  for (const fileName of imageFileNames) {
    const name = fileName.slice(0, fileName.length - extname(fileName).length).replaceAll("_", " ");
    filesByName.set(name, fileName);
  }

  const entries: { readonly id: ShipProfile["id"]; readonly fileName: string }[] = [];
  for (const profile of shipProfiles) {
    const fileName = filesByName.get(profile.name);
    if (fileName) entries.push({ id: profile.id, fileName });
  }

  const lines = entries
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((entry) => `  [${JSON.stringify(entry.id)} as ShipId]: "images/ships/${entry.fileName}",`);

  return `import type { ShipId } from "../../gamedata/ids";\n\nexport const SHIP_IMAGE_FILES: Readonly<Record<ShipId, string>> = {\n${lines.join("\n")}\n} as const;\n`;
}

function readShipImageFileNames(): string[] {
  return readdirSync(SHIP_IMAGES_SOURCE, { withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name) === ".webp")
    .map((entry) => entry.name);
}

function main(): void {
  const raw: unknown = JSON.parse(readFileSync(NAME_TO_ID_PATH, "utf8"));
  const nameToId = decodeNameToId(raw);
  const iconContent = generateIconIdsContent(nameToId);
  writeFileSync(ICON_OUTPUT_PATH, iconContent, "utf8");
  console.log(`Wrote ${ICON_OUTPUT_PATH} with ${Object.keys(nameToId.byName.iconID).length} icon ids`);

  const shipImageContent = generateShipImageIdsContent(SHIP_PROFILES, readShipImageFileNames());
  writeFileSync(SHIP_IMAGE_OUTPUT_PATH, shipImageContent, "utf8");
  console.log(`Wrote ${SHIP_IMAGE_OUTPUT_PATH}`);
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
