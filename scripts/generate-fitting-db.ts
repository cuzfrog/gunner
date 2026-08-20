import { homedir } from "node:os";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SDE_DIR = process.argv[2] ?? join(homedir(), "workspace", "Pyfa", "staticdata", "fsd_built");
const OUT_FILE = join(import.meta.dir, "..", "src", "fitting", "fittingDb.ts");

interface SdeType {
  typeID: number;
  "typeName_en-us": string;
  groupID: number;
  published: number;
}

interface SdeDogmaAttribute {
  attributeID: number;
  name: string;
}

interface SdeDogmaEffect {
  effectID: number;
}

interface SdeTypeDogma {
  dogmaAttributes: readonly { attributeID: number; value: number }[];
  dogmaEffects: readonly SdeDogmaEffect[];
}

const MODULE_GROUPS = new Set([
  38, // Shield Extender
  46, // Propulsion Module
  78, // Reinforced Bulkhead
  329, // Armor Plate
  762, // Inertial Stabilizer
  763, // Nanofiber Internal Structure
  764, // Overdrive Injector System
  773, // Rig Armor
  774, // Rig Shield
  775, // Rig Energy Weapon
  776, // Rig Hybrid Weapon
  777, // Rig Projectile Weapon
  778, // Rig Drones
  779, // Rig Launcher
  781, // Rig Core
  782, // Rig Navigation
  786, // Rig Electronic Systems
  1308, // Rig Anchor
]);

const TURRET_GROUPS = new Set([53, 55, 74]);

const CHARGE_GROUPS = new Set([
  83, 85, 86,
  372, 373, 374, 375, 376, 377,
  648, 653, 654, 655, 656, 657,
  1677, 1678,
  1987, 1989,
]);

const RIG_SIG_DRAWBACK_EFFECT = 2716;
const RIG_AGILITY_DRAWBACK_EFFECT = 2717;

async function loadMerged<T>(prefix: string): Promise<Record<string, T>> {
  const files = (await readdir(SDE_DIR))
    .filter((file) => file.startsWith(prefix) && file.endsWith(".json"))
    .sort();
  const all: Record<string, T> = {};
  for (const file of files) {
    const text = await readFile(join(SDE_DIR, file), "utf8");
    Object.assign(all, JSON.parse(text) as Record<string, T>);
  }
  return all;
}

function buildAttributeNameMap(attributes: Record<string, SdeDogmaAttribute>): Map<number, string> {
  const map = new Map<number, string>();
  for (const attribute of Object.values(attributes)) {
    if (!map.has(attribute.attributeID)) map.set(attribute.attributeID, attribute.name);
  }
  return map;
}

function buildAttributeValues(
  attributeNames: Map<number, string>,
  typeDogma: SdeTypeDogma | undefined,
): Map<string, number> {
  const values = new Map<string, number>();
  if (!typeDogma) return values;
  for (const { attributeID, value } of typeDogma.dogmaAttributes) {
    const name = attributeNames.get(attributeID);
    if (name) values.set(name, value);
  }
  return values;
}

function buildEffectSet(typeDogma: SdeTypeDogma | undefined): Set<number> {
  const effects = new Set<number>();
  if (!typeDogma) return effects;
  for (const { effectID } of typeDogma.dogmaEffects) effects.add(effectID);
  return effects;
}

function sizeTierFromPropulsionName(name: string): "small" | "medium" | "large" | "capital" {
  if (/10000MN|50000MN/.test(name)) return "capital";
  if (/100MN|500MN/.test(name)) return "large";
  if (/10MN|50MN/.test(name)) return "medium";
  return "small";
}

function kindFromPropulsionName(name: string): "afterburner" | "microwarpdrive" {
  return /microwarpdrive|mwd/i.test(name) ? "microwarpdrive" : "afterburner";
}

interface FittingPropulsionStats {
  readonly kind: "afterburner" | "microwarpdrive";
  readonly sizeTier: "small" | "medium" | "large" | "capital";
  readonly thrust: number;
  readonly speedBonus: number;
  readonly massAddition: number;
  readonly sigBloom: number;
}

interface FittingModuleStats {
  readonly massAddition?: number;
  readonly massBonusPercentage?: number;
  readonly speedBonusPercent?: number;
  readonly agilityMultiplier?: number;
  readonly sigRadiusAdd?: number;
  readonly sigBonusPercent?: number;
  readonly sigDrawbackPercent?: number;
  readonly agilityDrawbackPercent?: number;
  readonly propulsion?: FittingPropulsionStats;
}

interface TurretStats {
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly chargeSize: number;
}

interface ChargeStats {
  readonly trackingMultiplier?: number;
  readonly rangeMultiplier?: number;
  readonly falloffMultiplier?: number;
}

function optionalNumber(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value === 0) return undefined;
  return value;
}

function buildPropulsionStats(values: Map<string, number>, type: SdeType): FittingModuleStats {
  const massAddition = values.get("massAddition") ?? 0;
  const speedFactor = values.get("speedFactor") ?? 0;
  const speedBoostFactor = values.get("speedBoostFactor") ?? 0;
  const sigBloom = (values.get("signatureRadiusBonus") ?? 0) / 100;
  const name = type["typeName_en-us"];
  return {
    propulsion: {
      kind: kindFromPropulsionName(name),
      sizeTier: sizeTierFromPropulsionName(name),
      thrust: speedBoostFactor,
      speedBonus: speedFactor / 100,
      massAddition,
      sigBloom,
    },
  };
}

function buildModuleStats(values: Map<string, number>, effects: Set<number>): FittingModuleStats | undefined {
  const stats: Record<string, unknown> = {};

  const massAddition = optionalNumber(values.get("massAddition"));
  if (massAddition !== undefined) stats.massAddition = massAddition;

  const massBonusPercentage = optionalNumber(values.get("massBonusPercentage"));
  if (massBonusPercentage !== undefined) stats.massBonusPercentage = massBonusPercentage;

  const speedBonusRaw = values.get("velocityBonus") ?? values.get("implantBonusVelocity");
  const speedBonusPercent = optionalNumber(speedBonusRaw);
  if (speedBonusPercent !== undefined) stats.speedBonusPercent = speedBonusPercent;

  const agilityBonusRaw = values.get("agilityMultiplier") ?? values.get("agilityBonus");
  if (agilityBonusRaw !== undefined && Number.isFinite(agilityBonusRaw) && agilityBonusRaw !== 0) {
    stats.agilityMultiplier = 1 + agilityBonusRaw / 100;
  }

  const sigRadiusAdd = optionalNumber(values.get("signatureRadiusAdd"));
  if (sigRadiusAdd !== undefined) stats.sigRadiusAdd = sigRadiusAdd;

  const sigBonusPercent = optionalNumber(values.get("signatureRadiusBonus"));
  if (sigBonusPercent !== undefined) stats.sigBonusPercent = sigBonusPercent;

  const drawback = values.get("drawback") ?? 0;
  if (effects.has(RIG_SIG_DRAWBACK_EFFECT) && Number.isFinite(drawback) && drawback !== 0) {
    stats.sigDrawbackPercent = drawback;
  }
  if (effects.has(RIG_AGILITY_DRAWBACK_EFFECT) && Number.isFinite(drawback) && drawback !== 0) {
    stats.agilityDrawbackPercent = drawback;
  }

  if (Object.keys(stats).length === 0) return undefined;
  return stats as FittingModuleStats;
}

async function main() {
  const types = await loadMerged<SdeType>("types.");
  const typedogmas = await loadMerged<SdeTypeDogma>("typedogma.");
  const attributes = await loadMerged<SdeDogmaAttribute>("dogmaattributes.");
  const attributeNames = buildAttributeNameMap(attributes);

  const fittingModules: Record<string, FittingModuleStats> = {};
  const turrets: Record<string, TurretStats> = {};
  const charges: Record<string, ChargeStats> = {};

  for (const type of Object.values(types)) {
    if (!type.published) continue;
    const typeDogma = typedogmas[String(type.typeID)];
    const values = buildAttributeValues(attributeNames, typeDogma);

    if (TURRET_GROUPS.has(type.groupID)) {
      const tracking = values.get("trackingSpeed");
      const optimal = values.get("maxRange");
      if (tracking !== undefined && optimal !== undefined) {
        turrets[type["typeName_en-us"]] = {
          tracking,
          optimal,
          falloff: values.get("falloff") ?? 0,
          chargeSize: values.get("chargeSize") ?? 1,
        };
      }
      continue;
    }

    if (CHARGE_GROUPS.has(type.groupID)) {
      const trackingMultiplier = values.get("trackingSpeedMultiplier");
      const rangeMultiplier = values.get("weaponRangeMultiplier");
      const falloffMultiplier = values.get("fallofMultiplier");
      if (trackingMultiplier !== undefined || rangeMultiplier !== undefined || falloffMultiplier !== undefined) {
        charges[type["typeName_en-us"]] = {
          trackingMultiplier,
          rangeMultiplier,
          falloffMultiplier,
        };
      }
      continue;
    }

    if (MODULE_GROUPS.has(type.groupID)) {
      const effects = buildEffectSet(typeDogma);
      if (type.groupID === 46) {
        fittingModules[type["typeName_en-us"]] = buildPropulsionStats(values, type);
      } else {
        const stats = buildModuleStats(values, effects);
        if (stats) fittingModules[type["typeName_en-us"]] = stats;
      }
    }
  }

  const header = `// Generated from EVE Online SDE via Pyfa staticdata (${new Date().toISOString().split("T")[0]}). Do not edit by hand.\n/* eslint-disable */\n\nimport type { HullTier } from "../ships";\n\n`;
  const typeDefinitions = `export interface FittingPropulsionStats {
  readonly kind: "afterburner" | "microwarpdrive";
  readonly sizeTier: HullTier;
  readonly thrust: number;
  readonly speedBonus: number;
  readonly massAddition: number;
  readonly sigBloom: number;
}

export interface FittingModuleStats {
  readonly massAddition?: number;
  readonly massBonusPercentage?: number;
  readonly speedBonusPercent?: number;
  readonly agilityMultiplier?: number;
  readonly sigRadiusAdd?: number;
  readonly sigBonusPercent?: number;
  readonly sigDrawbackPercent?: number;
  readonly agilityDrawbackPercent?: number;
  readonly propulsion?: FittingPropulsionStats;
}

export interface TurretStats {
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly chargeSize: number;
}

export interface ChargeStats {
  readonly trackingMultiplier?: number;
  readonly rangeMultiplier?: number;
  readonly falloffMultiplier?: number;
}

`;

  const lines: string[] = [
    header,
    typeDefinitions,
    `export const FITTING_MODULES = ${JSON.stringify(fittingModules, null, 2)} as unknown as Readonly<Record<string, FittingModuleStats>>;`,
    ``,
    `export const TURRETS = ${JSON.stringify(turrets, null, 2)} as unknown as Readonly<Record<string, TurretStats>>;`,
    ``,
    `export const CHARGES = ${JSON.stringify(charges, null, 2)} as unknown as Readonly<Record<string, ChargeStats>>;`,
    ``,
  ];

  await mkdir(import.meta.dir, { recursive: true });
  await writeFile(OUT_FILE, lines.join("\n"));
  console.log(`Wrote ${Object.keys(fittingModules).length} modules, ${Object.keys(turrets).length} turrets, ${Object.keys(charges).length} charges to ${OUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
