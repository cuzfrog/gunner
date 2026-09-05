import { homedir } from "node:os";
import { join } from "node:path";
import { buildProjection } from "./fittingDb/projection";
import { scaffoldClassificationFiles } from "./fittingDb/classification/scaffold";
import type { RigDrawbackKind } from "./fittingDb/classification/classificationTypes";
import { _COMBAT_ATTRIBUTE_MAP as COMBAT_ATTRIBUTE_MAP, _OUT_OF_SCOPE_ATTRIBUTE_IDS as OUT_OF_SCOPE_ATTRIBUTE_IDS, _RIG_SIG_DRAWBACK_EFFECT as RIG_SIG_DRAWBACK_EFFECT, _RIG_AGILITY_DRAWBACK_EFFECT as RIG_AGILITY_DRAWBACK_EFFECT } from "./generate-fitting-db";

const SDE_DIR = process.argv[2] ?? join(homedir(), "workspace", "Pyfa", "staticdata", "fsd_built");
const OUT_DIR = join(import.meta.dir, "fittingDb", "classification");

async function main(): Promise<void> {
  const projection = await buildProjection(SDE_DIR);
  const contextDependentAttributeIds = new Set([37, 51, 54, 64, 552, 554]);
  const rigDrawbackEffectIds = new Map<number, RigDrawbackKind>([
    [RIG_SIG_DRAWBACK_EFFECT, "signature"],
    [RIG_AGILITY_DRAWBACK_EFFECT, "agility"],
  ]);
  const nonScalingEffectIds = new Set<number>();
  const knownModifierEffectIds = new Map<number, "hullBonus" | "skillBonus" | "moduleStat" | "none">();
  const knownActionEffectIds = new Map<number, "defense" | "none">();

  await scaffoldClassificationFiles(projection, {
    combatAttributeMap: COMBAT_ATTRIBUTE_MAP,
    outOfScopeAttributeIds: OUT_OF_SCOPE_ATTRIBUTE_IDS,
    contextDependentAttributeIds,
    rigDrawbackEffectIds,
    nonScalingEffectIds,
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
