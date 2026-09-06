#!/usr/bin/env bun
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as process from "node:process";

const SDE_DIR = process.argv[2] ?? join(import.meta.dir, "..", "sde");
const ICONS_SOURCE_DIRECTORY = "data/ship-modules";
const TYPE_ICONS_DIR = join(ICONS_SOURCE_DIRECTORY, "type-icons");
const IN_SCOPE_CATEGORY_IDS = new Set([7, 8, 18, 32, 66, 87, 4, 22]);
const FETCH_CONCURRENCY = 8;

interface SdeType {
  readonly typeID: number;
  readonly groupID: number;
  readonly iconID?: number;
}

interface SdeGroup {
  readonly groupID: number;
  readonly categoryID: number;
}

async function main(): Promise<void> {
  mkdirSync(TYPE_ICONS_DIR, { recursive: true });
  const groups = JSON.parse(readFileSync(join(SDE_DIR, "groups.0.json"), "utf8")) as Record<string, SdeGroup>;
  const inScopeGroupIds = new Set<string>();
  for (const [gid, group] of Object.entries(groups)) {
    if (IN_SCOPE_CATEGORY_IDS.has(group.categoryID)) inScopeGroupIds.add(gid);
  }

  const needed: number[] = [];
  for (const file of readdirSync(SDE_DIR).filter((f) => f.startsWith("types.") && f.endsWith(".json")).sort()) {
    const types = JSON.parse(readFileSync(join(SDE_DIR, file), "utf8")) as Record<string, SdeType>;
    for (const type of Object.values(types)) {
      if (type.iconID !== undefined) continue;
      if (!inScopeGroupIds.has(String(type.groupID))) continue;
      needed.push(type.typeID);
    }
  }
  needed.sort((a, b) => a - b);

  const toFetch = needed.filter((tid) => !existsSync(join(TYPE_ICONS_DIR, `${tid}@1x.png`)));
  console.log(`${needed.length} in-scope types without an SDE iconID; ${toFetch.length} missing on disk.`);
  if (toFetch.length === 0) {
    console.log("Nothing to fetch.");
    return;
  }

  let done = 0;
  let failed = 0;
  for (let i = 0; i < toFetch.length; i += FETCH_CONCURRENCY) {
    const batch = toFetch.slice(i, i + FETCH_CONCURRENCY);
    await Promise.all(batch.map(async (tid) => {
      const outPath = join(TYPE_ICONS_DIR, `${tid}@1x.png`);
      const url = `https://images.evetech.net/types/${tid}/icon`;
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        await Bun.write(outPath, await resp.blob());
        done++;
      } catch (error) {
        failed++;
        console.warn(`Failed to fetch icon for typeId ${tid}: ${(error as Error).message}`);
      }
    }));
    if ((i + FETCH_CONCURRENCY) % 80 === 0 || i + FETCH_CONCURRENCY >= toFetch.length) {
      console.log(`Progress: ${done} fetched, ${failed} failed, ${toFetch.length - done - failed} remaining.`);
    }
  }
  console.log(`Done: ${done} fetched, ${failed} failed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
