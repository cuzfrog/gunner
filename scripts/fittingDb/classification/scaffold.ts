import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SdeProjection } from "../projectionTypes";
import type { AttributeClassification, EffectClassification, RigDrawbackKind } from "./classificationTypes";
import type { HullBonusAttribute, SkillBonusType } from "../../../src/gamedata/fittingDb/types";

type SemanticName = HullBonusAttribute | SkillBonusType | "drawback" | "moduleStat";

interface ScaffoldConfig {
  readonly combatAttributeMap: Readonly<Record<number, SemanticName>>;
  readonly outOfScopeAttributeIds: ReadonlySet<number>;
  readonly contextDependentAttributeIds: ReadonlySet<number>;
  readonly rigDrawbackEffectIds: ReadonlyMap<number, RigDrawbackKind>;
  readonly nonScalingEffectIds: ReadonlySet<number>;
  readonly knownModifierEffectIds: ReadonlyMap<number, "hullBonus" | "skillBonus" | "moduleStat" | "none">;
  readonly knownActionEffectIds: ReadonlyMap<number, "defense" | "none">;
}

function scaffoldAttributeClassification(
  projection: SdeProjection,
  config: ScaffoldConfig,
): Record<number, AttributeClassification> {
  const result: Record<number, AttributeClassification> = {};
  for (const attr of Object.values(projection.attributes)) {
    const id = attr.id;
    const name = attr.name;
    const semantic = config.combatAttributeMap[id];
    if (semantic !== undefined) {
      result[id] = {
        kind: "semantic",
        id,
        name,
        semantic,
        disambiguate: config.contextDependentAttributeIds.has(id) ? "context" : undefined,
      };
    } else if (config.outOfScopeAttributeIds.has(id)) {
      result[id] = { kind: "outOfScope", id, name, domain: "other", reason: "out of scope (scaffold)" };
    } else {
      result[id] = { kind: "outOfScope", id, name, domain: "other", reason: "scaffold - classify me" };
    }
  }
  return result;
}

function scaffoldEffectClassification(
  projection: SdeProjection,
  config: ScaffoldConfig,
): Record<number, EffectClassification> {
  const result: Record<number, EffectClassification> = {};
  for (const eff of Object.values(projection.effects)) {
    const id = eff.id;
    const name = eff.name;
    const drawback = config.rigDrawbackEffectIds.get(id);
    if (drawback !== undefined) {
      result[id] = {
        kind: "modifier",
        id,
        name,
        projection: "moduleStat",
        drawback,
        scalesWithHullSkill: !config.nonScalingEffectIds.has(id),
      };
      continue;
    }
    const knownProjection = config.knownModifierEffectIds.get(id);
    if (knownProjection !== undefined) {
      result[id] = {
        kind: "modifier",
        id,
        name,
        projection: knownProjection,
        scalesWithHullSkill: !config.nonScalingEffectIds.has(id),
      };
      continue;
    }
    const knownAction = config.knownActionEffectIds.get(id);
    if (knownAction !== undefined) {
      result[id] = { kind: "action", id, name, projection: knownAction };
      continue;
    }
    if (eff.modifiers.length === 0) {
      result[id] = { kind: "ignored", id, name, reason: "scaffold - no modifiers" };
    } else {
      result[id] = { kind: "ignored", id, name, reason: "scaffold - classify me" };
    }
  }
  return result;
}

export async function scaffoldClassificationFiles(
  projection: SdeProjection,
  config: ScaffoldConfig,
  outDir: string,
): Promise<void> {
  const attrClassification = scaffoldAttributeClassification(projection, config);
  const effClassification = scaffoldEffectClassification(projection, config);

  const attrContent = generateAttributeClassificationTs(attrClassification);
  const effContent = generateEffectClassificationTs(effClassification);

  await writeFile(join(outDir, "attributeClassification.ts"), attrContent);
  await writeFile(join(outDir, "effectClassification.ts"), effContent);
}

function generateAttributeClassificationTs(classification: Record<number, AttributeClassification>): string {
  const entries = Object.keys(classification).map(Number).sort((a, b) => a - b);
  const lines: string[] = [
    "// Auto-scaffolded from SDE projection. Hand-edit to improve classifications.",
    "/* eslint-disable */",
    "",
    'import type { AttributeClassification } from "./classificationTypes";',
    "",
    "export const ATTRIBUTE_CLASSIFICATION: Readonly<Record<number, AttributeClassification>> = {",
  ];
  for (const id of entries) {
    const c = classification[id];
    if (c.kind === "semantic") {
      const disambiguate = c.disambiguate ? `, disambiguate: "${c.disambiguate}"` : "";
      lines.push(`  ${id}: { kind: "semantic", id: ${id}, name: "${escapeStr(c.name)}", semantic: "${c.semantic}"${disambiguate} },`);
    } else {
      lines.push(`  ${id}: { kind: "outOfScope", id: ${id}, name: "${escapeStr(c.name)}", domain: "${c.domain}", reason: "${escapeStr(c.reason)}" },`);
    }
  }
  lines.push("};");
  lines.push("");
  return lines.join("\n");
}

function generateEffectClassificationTs(classification: Record<number, EffectClassification>): string {
  const entries = Object.keys(classification).map(Number).sort((a, b) => a - b);
  const lines: string[] = [
    "// Auto-scaffolded from SDE projection. Hand-edit to improve classifications.",
    "/* eslint-disable */",
    "",
    'import type { EffectClassification } from "./classificationTypes";',
    "",
    "export const EFFECT_CLASSIFICATION: Readonly<Record<number, EffectClassification>> = {",
  ];
  for (const id of entries) {
    const c = classification[id];
    if (c.kind === "modifier") {
      const drawback = c.drawback ? `, drawback: "${c.drawback}"` : "";
      lines.push(`  ${id}: { kind: "modifier", id: ${id}, name: "${escapeStr(c.name)}", projection: "${c.projection}"${drawback}, scalesWithHullSkill: ${c.scalesWithHullSkill} },`);
    } else if (c.kind === "action") {
      lines.push(`  ${id}: { kind: "action", id: ${id}, name: "${escapeStr(c.name)}", projection: "${c.projection}" },`);
    } else {
      lines.push(`  ${id}: { kind: "ignored", id: ${id}, name: "${escapeStr(c.name)}", reason: "${escapeStr(c.reason)}" },`);
    }
  }
  lines.push("};");
  lines.push("");
  return lines.join("\n");
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export { scaffoldAttributeClassification as _scaffoldAttributeClassification, scaffoldEffectClassification as _scaffoldEffectClassification };
