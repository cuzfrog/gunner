#!/usr/bin/env bun
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import * as process from "node:process";
import { SHIP_PROFILES } from "../src/gamedata/shipProfiles/profiles";
import type { ShipProfile } from "../src/ships";
import { buildTypeIconEntries, IN_SCOPE_CATEGORY_IDS, readSdeGroups, readSdeTypes } from "./iconAssets";

const SDE_DIR = process.argv[2] ?? join(import.meta.dir, "..", "sde");
const TYPE_ICON_OUTPUT_PATH = "src/ui/icons/typeIconFiles.ts";
const SHIP_IMAGE_OUTPUT_PATH = "src/ui/icons/shipImageIds.ts";
const SHIP_IMAGES_SOURCE = "data/ship-images";
const ICONS_SOURCE_DIRECTORY = "data/ship-modules";

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
  const groups = readSdeGroups(SDE_DIR);
  const types = readSdeTypes(SDE_DIR);
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
