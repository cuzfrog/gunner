import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildTypeIconEntries, IN_SCOPE_CATEGORY_IDS, readSdeGroups, readSdeTypes, TYPE_ICON_FILE_PREFIX, validateTypeIconBytes } from "../scripts/iconAssets";
import { TYPE_ICON_FILES } from "../src/ui/icons/typeIconFiles";

const TYPE_ICONS_DIR = join("data", "ship-modules", "type-icons");
const entries = buildTypeIconEntries(readSdeTypes("sde"), readSdeGroups("sde"), IN_SCOPE_CATEGORY_IDS);

describe("type icon data guard", () => {
  test("every type-icons file referenced by TYPE_ICON_FILES is a valid PNG of at least 32x32", () => {
    const failures: string[] = [];
    for (const [typeId, file] of Object.entries(TYPE_ICON_FILES)) {
      if (!file.startsWith(TYPE_ICON_FILE_PREFIX)) continue;
      const path = join("data/ship-modules", file);
      if (!existsSync(path)) {
        failures.push(`${typeId}: missing file ${file}`);
        continue;
      }
      const reason = validateTypeIconBytes(readFileSync(path));
      if (reason !== undefined) failures.push(`${typeId}: ${file} ${reason}`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  test("no orphaned files in data/ship-modules/type-icons", () => {
    const expected = new Set(Object.values(entries).filter((file) => file.startsWith(TYPE_ICON_FILE_PREFIX)).map((file) => file.slice(TYPE_ICON_FILE_PREFIX.length)));
    const actual = readdirSync(TYPE_ICONS_DIR);
    const orphaned = actual.filter((name) => !expected.has(name));
    expect(orphaned, `Run bun scripts/sync-type-icons.ts --prune to remove: ${orphaned.join(", ")}`).toEqual([]);
  });
});
