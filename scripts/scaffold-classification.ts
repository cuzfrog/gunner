import { homedir } from "node:os";
import { join } from "node:path";
import { buildProjection } from "./fittingDb/projection";
import { scaffoldClassificationFiles } from "./fittingDb/classification/scaffold";
import type { RigDrawbackKind } from "./fittingDb/classification/classificationTypes";
import { COMBAT_ATTRIBUTE_MAP, OUT_OF_SCOPE_ATTRIBUTE_IDS, RIG_SIG_DRAWBACK_EFFECT, RIG_AGILITY_DRAWBACK_EFFECT, NON_SCALING_EFFECT_IDS } from "./fittingDb/classification/knownMaps";

const SDE_DIR = process.argv[2] ?? join(homedir(), "workspace", "Pyfa", "staticdata", "fsd_built");
const OUT_DIR = join(import.meta.dir, "fittingDb", "classification");

async function main(): Promise<void> {
  const projection = await buildProjection(SDE_DIR);
  const contextDependentAttributeIds = new Set([37, 51, 54, 64, 554]);
  const rigDrawbackEffectIds = new Map<number, RigDrawbackKind>([
    [RIG_SIG_DRAWBACK_EFFECT, "signature"],
    [RIG_AGILITY_DRAWBACK_EFFECT, "agility"],
  ]);
  const knownModifierEffectIds = new Map<number, "hullBonus" | "skillBonus" | "moduleStat" | "none">();
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
