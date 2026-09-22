import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SdeGroup, SdeType } from "./iconScope";

export function readSdeGroups(sdeDir: string): Record<string, SdeGroup> {
  return JSON.parse(readFileSync(join(sdeDir, "groups.0.json"), "utf8")) as Record<string, SdeGroup>;
}

export function readSdeTypes(sdeDir: string): Record<string, SdeType> {
  const types: Record<string, SdeType> = {};
  for (const file of readdirSync(sdeDir).filter((f) => f.startsWith("types.") && f.endsWith(".json")).sort()) {
    const shard = JSON.parse(readFileSync(join(sdeDir, file), "utf8")) as Record<string, SdeType>;
    for (const [tid, type] of Object.entries(shard)) types[tid] = type;
  }
  return types;
}
