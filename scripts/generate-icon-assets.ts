#!/usr/bin/env bun
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import * as process from "node:process";
import { SHIP_PROFILES } from "../src/gamedata/shipProfiles/profiles";
import type { ShipProfile } from "../src/ships";

const SDE_DIR = process.argv[2] ?? join(import.meta.dir, "..", "sde");
const TYPE_ICON_OUTPUT_PATH = "src/ui/icons/typeIconFiles.ts";
const SHIP_IMAGE_OUTPUT_PATH = "src/ui/icons/shipImageIds.ts";
const SHIP_IMAGES_SOURCE = "data/ship-images";
const ICONS_SOURCE_DIRECTORY = "data/ship-modules";

const IN_SCOPE_CATEGORY_IDS = new Set([7, 8, 18, 32, 66, 87, 4, 22]);

interface SdeType {
  readonly typeID: number;
  readonly groupID: number;
  readonly published: number;
  readonly iconID?: number;
}

interface SdeGroup {
  readonly groupID: number;
  readonly categoryID: number;
}

export function buildTypeIconEntries(
  types: Readonly<Record<string, SdeType>>,
  groups: Readonly<Record<string, SdeGroup>>,
  inScopeCategoryIds: ReadonlySet<number>,
): Record<string, string> {
  const inScopeGroupIds = new Set<string>();
  for (const [gid, group] of Object.entries(groups)) {
    if (inScopeCategoryIds.has(group.categoryID)) inScopeGroupIds.add(gid);
  }
  const entries: Record<string, string> = {};
  for (const [tid, type] of Object.entries(types)) {
    if (!inScopeGroupIds.has(String(type.groupID))) continue;
    entries[tid] = type.iconID !== undefined ? `icons/${type.iconID}@1x.png` : `type-icons/${tid}@1x.png`;
  }
  return entries;
}

export function generateTypeIconFilesContent(entries: Readonly<Record<string, string>>): string {
  const lines = Object.keys(entries)
    .sort((a, b) => Number(a) - Number(b))
    .map((typeId) => `  [${JSON.stringify(typeId)} as TypeId]: ${JSON.stringify(entries[typeId])},`);
  return `import type { TypeId } from "../../gamedata/ids";\n\nexport const TYPE_ICON_FILES: Readonly<Record<TypeId, string>> = {\n${lines.join("\n")}\n} as const;\n`;
}

export function findMissingIconFiles(entries: Readonly<Record<string, string>>, existingFiles: ReadonlySet<string>): string[] {
  const missing: string[] = [];
  for (const file of new Set(Object.values(entries))) {
    if (!existingFiles.has(file)) missing.push(file);
  }
  return missing.sort();
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

function readSdeGroups(): Record<string, SdeGroup> {
  return JSON.parse(readFileSync(join(SDE_DIR, "groups.0.json"), "utf8"));
}

function readSdeTypes(): Record<string, SdeType> {
  const types: Record<string, SdeType> = {};
  for (const file of readdirSync(SDE_DIR).filter((f) => f.startsWith("types.") && f.endsWith(".json")).sort()) {
    const shard = JSON.parse(readFileSync(join(SDE_DIR, file), "utf8")) as Record<string, SdeType>;
    for (const [tid, type] of Object.entries(shard)) types[tid] = type;
  }
  return types;
}

function collectExistingIconFiles(): Set<string> {
  const files = new Set<string>();
  for (const sub of ["icons", "type-icons"]) {
    const dir = join(ICONS_SOURCE_DIRECTORY, sub);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (statSync(join(dir, name)).isFile()) files.add(`${sub}/${name}`);
    }
  }
  return files;
}

function main(): void {
  const groups = readSdeGroups();
  const types = readSdeTypes();
  const allEntries = buildTypeIconEntries(types, groups, IN_SCOPE_CATEGORY_IDS);
  const existingFiles = collectExistingIconFiles();

  const entries = filterEntriesWithIcons(allEntries, existingFiles);
  const droppedCount = Object.keys(allEntries).length - Object.keys(entries).length;
  if (droppedCount > 0) {
    console.warn(
      `Excluded ${droppedCount} in-scope types with no icon on disk` +
      ` (unpublished types without an SDE iconID or evetech icon).`,
    );
  }

  writeFileSync(TYPE_ICON_OUTPUT_PATH, generateTypeIconFilesContent(entries), "utf8");
  console.log(`Wrote ${TYPE_ICON_OUTPUT_PATH} with ${Object.keys(entries).length} entries.`);

  writeFileSync(SHIP_IMAGE_OUTPUT_PATH, generateShipImageIdsContent(SHIP_PROFILES, readShipImageFileNames()), "utf8");
  console.log(`Wrote ${SHIP_IMAGE_OUTPUT_PATH}`);
}

function filterEntriesWithIcons(entries: Readonly<Record<string, string>>, existingFiles: ReadonlySet<string>): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const [tid, file] of Object.entries(entries)) {
    if (existingFiles.has(file)) filtered[tid] = file;
  }
  return filtered;
}

export { filterEntriesWithIcons as _filterEntriesWithIcons };

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
