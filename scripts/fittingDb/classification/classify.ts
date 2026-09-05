import type { SdeProjection } from "../projectionTypes";
import type { AttributeClassification, EffectClassification } from "./classificationTypes";

export interface ClassificationAssertResult {
  readonly missingAttributeIds: readonly number[];
  readonly extraAttributeIds: readonly number[];
  readonly missingEffectIds: readonly number[];
  readonly extraEffectIds: readonly number[];
  readonly attributeNameMismatches: readonly { readonly id: number; readonly classificationName: string; readonly projectionName: string }[];
  readonly effectNameMismatches: readonly { readonly id: number; readonly classificationName: string; readonly projectionName: string }[];
}

export function assertClassificationComplete(
  projection: SdeProjection,
  attributeClassification: Readonly<Record<number, AttributeClassification>>,
  effectClassification: Readonly<Record<number, EffectClassification>>,
): ClassificationAssertResult {
  const projectionAttrIds = new Set(Object.values(projection.attributes).map((a) => a.id));
  const classificationAttrIds = new Set(Object.keys(attributeClassification).map(Number));
  const missingAttributeIds = [...projectionAttrIds].filter((id) => !classificationAttrIds.has(id)).sort((a, b) => a - b);
  const extraAttributeIds = [...classificationAttrIds].filter((id) => !projectionAttrIds.has(id)).sort((a, b) => a - b);

  const projectionEffectIds = new Set(Object.values(projection.effects).map((e) => e.id));
  const classificationEffectIds = new Set(Object.keys(effectClassification).map(Number));
  const missingEffectIds = [...projectionEffectIds].filter((id) => !classificationEffectIds.has(id)).sort((a, b) => a - b);
  const extraEffectIds = [...classificationEffectIds].filter((id) => !projectionEffectIds.has(id)).sort((a, b) => a - b);

  const attributeNameMismatches: { id: number; classificationName: string; projectionName: string }[] = [];
  for (const id of projectionAttrIds) {
    const classified = attributeClassification[id];
    if (classified && classified.name !== projection.attributes[String(id)]?.name) {
      attributeNameMismatches.push({ id, classificationName: classified.name, projectionName: projection.attributes[String(id)]?.name ?? "" });
    }
  }

  const effectNameMismatches: { id: number; classificationName: string; projectionName: string }[] = [];
  for (const id of projectionEffectIds) {
    const classified = effectClassification[id];
    if (classified && classified.name !== projection.effects[String(id)]?.name) {
      effectNameMismatches.push({ id, classificationName: classified.name, projectionName: projection.effects[String(id)]?.name ?? "" });
    }
  }

  return { missingAttributeIds, extraAttributeIds, missingEffectIds, extraEffectIds, attributeNameMismatches, effectNameMismatches };
}

export function failOnClassificationErrors(result: ClassificationAssertResult): void {
  const errors: string[] = [];
  if (result.missingAttributeIds.length > 0) {
    errors.push(`Missing attribute classifications (${result.missingAttributeIds.length}): ${result.missingAttributeIds.slice(0, 20).join(", ")}${result.missingAttributeIds.length > 20 ? " ..." : ""}`);
  }
  if (result.extraAttributeIds.length > 0) {
    errors.push(`Extra attribute classifications (not in SDE) (${result.extraAttributeIds.length}): ${result.extraAttributeIds.slice(0, 20).join(", ")}${result.extraAttributeIds.length > 20 ? " ..." : ""}`);
  }
  if (result.missingEffectIds.length > 0) {
    errors.push(`Missing effect classifications (${result.missingEffectIds.length}): ${result.missingEffectIds.slice(0, 20).join(", ")}${result.missingEffectIds.length > 20 ? " ..." : ""}`);
  }
  if (result.extraEffectIds.length > 0) {
    errors.push(`Extra effect classifications (not in SDE) (${result.extraEffectIds.length}): ${result.extraEffectIds.slice(0, 20).join(", ")}${result.extraEffectIds.length > 20 ? " ..." : ""}`);
  }
  if (result.attributeNameMismatches.length > 0) {
    errors.push(`Attribute name mismatches (${result.attributeNameMismatches.length}): ${result.attributeNameMismatches.slice(0, 10).map((m) => `${m.id}="${m.classificationName}" vs "${m.projectionName}"`).join(", ")}`);
  }
  if (result.effectNameMismatches.length > 0) {
    errors.push(`Effect name mismatches (${result.effectNameMismatches.length}): ${result.effectNameMismatches.slice(0, 10).map((m) => `${m.id}="${m.classificationName}" vs "${m.projectionName}"`).join(", ")}`);
  }
  if (errors.length > 0) {
    throw new Error(`Classification audit failed:\n${errors.join("\n")}`);
  }
}
