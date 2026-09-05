import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { SdeDogmaAttribute, SdeDogmaEffect, SdeGroup, SdeType, SdeTypeDogma } from "./dogmaTypes";
import type { SdeProjection, SdeProjectionAttribute, SdeProjectionEffect, SdeProjectionType } from "./projectionTypes";

async function loadMerged<T>(sdeDir: string, prefix: string): Promise<Record<string, T>> {
  const files = (await readdir(sdeDir)).filter((f) => f.startsWith(prefix) && f.endsWith(".json")).sort();
  const all: Record<string, T> = {};
  for (const file of files) {
    const text = await readFile(join(sdeDir, file), "utf8");
    Object.assign(all, JSON.parse(text) as Record<string, T>);
  }
  return all;
}

export async function buildProjection(sdeDir: string): Promise<SdeProjection> {
  const attributes = await loadMerged<SdeDogmaAttribute>(sdeDir, "dogmaattributes.");
  const effects = await loadMerged<SdeDogmaEffect>(sdeDir, "dogmaeffects.");
  const types = await loadMerged<SdeType>(sdeDir, "types.");
  const typedogmas = await loadMerged<SdeTypeDogma>(sdeDir, "typedogma.");
  const groups = await loadMerged<SdeGroup>(sdeDir, "groups.");

  const projectionAttributes: Record<string, SdeProjectionAttribute> = {};
  for (const [id, attr] of Object.entries(attributes)) {
    const raw = attr as unknown as Record<string, unknown>;
    projectionAttributes[id] = {
      id: attr.attributeID,
      name: attr.name,
      defaultValue: (raw.defaultValue as number) ?? 0,
      highIsGood: (raw.highIsGood as boolean) ?? false,
      stackable: (raw.stackable as boolean) ?? true,
    };
  }

  const projectionEffects: Record<string, SdeProjectionEffect> = {};
  for (const [id, eff] of Object.entries(effects)) {
    projectionEffects[id] = {
      id: eff.effectID,
      name: eff.effectName ?? "",
      category: eff.effectCategory,
      modifiers: eff.modifierInfo ?? [],
    };
  }

  const projectionTypes: Record<string, SdeProjectionType> = {};
  for (const [id, type] of Object.entries(types)) {
    const td = typedogmas[id];
    const isPublished = type.published === 1;
    projectionTypes[id] = {
      typeId: type.typeID,
      groupId: type.groupID,
      published: isPublished,
      attributes: (td?.dogmaAttributes ?? []).map((a) => ({ attributeId: a.attributeID, value: a.value })),
      effectIds: td?.dogmaEffects.map((e) => e.effectID) ?? [],
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    attributes: projectionAttributes,
    effects: projectionEffects,
    types: projectionTypes,
  };
}

export async function writeProjection(projection: SdeProjection, outPath: string): Promise<void> {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(projection));
}

export { loadMerged as _loadMerged };
