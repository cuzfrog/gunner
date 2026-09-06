import { join } from "node:path";
import { buildProjection } from "./fittingDb/projection";
import { scaffoldClassificationFiles } from "./fittingDb/classification/scaffold";
import type { RigDrawbackKind } from "./fittingDb/classification/classificationTypes";
import { COMBAT_ATTRIBUTE_MAP, OUT_OF_SCOPE_ATTRIBUTE_IDS, NON_SCALING_EFFECT_IDS } from "./fittingDb/classification/scaffoldSeed";

const SDE_DIR = process.argv[2] ?? join(import.meta.dir, "..", "sde");
const OUT_DIR = join(import.meta.dir, "fittingDb", "classification");

async function main(): Promise<void> {
  const projection = await buildProjection(SDE_DIR);
  const contextDependentAttributeIds = new Set([37, 51, 54, 64, 554]);
  const rigDrawbackEffectIds = new Map<number, RigDrawbackKind>([
    [2716, "signature"],
    [2717, "agility"],
    [2712, "armorHp"],
    [2718, "shieldHp"],
    [2713, "cpu"],
    [2714, "cpuNeed"],
    [2706, "powerNeed"],
    [2707, "powerNeed"],
    [2708, "powerNeed"],
    [3528, "capacitorRecharge"],
    [5868, "cargoCapacity"],
    [5951, "warpSpeed"],
    [5267, "repairPowerGrid"],
    [5268, "repairPowerGrid"],
  ]);
  const knownModifierEffectIds = new Map<number, "hullBonus" | "skillBonus" | "moduleStat" | "none">();
  for (const eid of NON_SCALING_EFFECT_IDS) {
    knownModifierEffectIds.set(eid, "none");
  }
  const knownActionEffectIds = new Map<number, "defense" | "none">();

  await scaffoldClassificationFiles(projection, {
    combatAttributeMap: COMBAT_ATTRIBUTE_MAP,
    outOfScopeAttributeIds: OUT_OF_SCOPE_ATTRIBUTE_IDS,
    contextDependentAttributeIds,
    rigDrawbackEffectIds,
    nonScalingEffectIds: NON_SCALING_EFFECT_IDS,
    knownModifierEffectIds,
    knownActionEffectIds,
  }, OUT_DIR);

  console.log(`Scaffolded classification files to ${OUT_DIR}`);
  console.log(`  Attributes: ${Object.keys(projection.attributes).length}`);
  console.log(`  Effects: ${Object.keys(projection.effects).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
