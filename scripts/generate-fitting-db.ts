import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SDE_DIR = process.env.SDE_DIR ?? "/tmp/eve-sde";
const OUT_FILE = join(import.meta.dir, "..", "src", "fitting", "fittingDb.ts");

interface SdeType {
  _key: number;
  name: { en: string };
  groupID: number;
  mass?: number;
  published: boolean;
}

interface SdeDogmaAttribute {
  _key: number;
  name: string;
}

interface SdeTypeDogma {
  _key: number;
  dogmaAttributes: readonly { attributeID: number; value: number }[];
}

const MODULE_GROUPS = new Set([
  38,  // Shield Extender
  46,  // Propulsion Module
  78,  // Reinforced Bulkhead
  329, // Armor Plate
  762, // Inertial Stabilizer
  763, // Nanofiber Internal Structure
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

async function loadJsonl<T>(file: string): Promise<T[]> {
  const text = await readFile(join(SDE_DIR, file), "utf8");
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function toMap<T extends { _key: number }>(items: T[]): Map<number, T> {
  const map = new Map<number, T>();
  for (const item of items) map.set(item._key, item);
  return map;
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

function getAttr(attrs: Map<number, SdeDogmaAttribute>, typeDogma: SdeTypeDogma | undefined, names: string[]): Record<string, number | undefined> {
  const result: Record<string, number | undefined> = {};
  if (!typeDogma) return result;
  for (const { attributeID, value } of typeDogma.dogmaAttributes) {
    const name = attrs.get(attributeID)?.name;
    if (name && names.includes(name)) result[name] = value;
  }
  return result;
}

function buildPropulsionStats(attrs: Record<string, number | undefined>, name: string): {
  kind: "afterburner" | "microwarpdrive";
  sizeTier: "small" | "medium" | "large" | "capital";
  thrust: number;
  speedBonus: number;
  massAddition: number;
  sigBloom: number;
  activeMassMultiplier: number;
} {
  const massAddition = attrs.massAddition ?? 0;
  const speedFactor = attrs.speedFactor ?? 0;
  const speedBoostFactor = attrs.speedBoostFactor ?? 0;
  const sigBloom = (attrs.signatureRadiusBonus ?? 0) / 100;
  return {
    kind: kindFromPropulsionName(name),
    sizeTier: sizeTierFromPropulsionName(name),
    thrust: speedBoostFactor,
    speedBonus: speedFactor / 100,
    massAddition,
    sigBloom,
    activeMassMultiplier: 1,
  };
}

function buildModuleStats(
  type: SdeType,
  attrs: Map<number, SdeDogmaAttribute>,
  typeDogma: SdeTypeDogma | undefined,
): { massAddition: number | undefined; stats: FittingModuleStats } | undefined {
  const at = getAttr(attrs, typeDogma, [
    "massAddition",
    "massBonusPercentage",
    "agilityMultiplier",
    "agilityBonus",
    "velocityBonus",
    "implantBonusVelocity",
    "signatureRadiusAdd",
    "signatureRadiusBonus",
    "speedFactor",
    "speedBoostFactor",
  ]);

  if (type.groupID === 46) {
    const propulsion = buildPropulsionStats(at, type.name.en);
    return { massAddition: propulsion.massAddition, stats: { propulsion } };
  }

  const rawMass = at.massAddition ?? type.mass;
  const massAddition = typeof rawMass === "number" && rawMass !== 0 ? rawMass : undefined;
  const sigRadiusAdd = at.signatureRadiusAdd;

  const speedBonusRaw = at.velocityBonus ?? at.implantBonusVelocity;
  const speedBonusPercent = typeof speedBonusRaw === "number" && speedBonusRaw !== 0 ? speedBonusRaw : undefined;

  const agilityBonusRaw = at.agilityMultiplier ?? at.agilityBonus;
  const agilityMultiplier = typeof agilityBonusRaw === "number" && agilityBonusRaw !== 0 ? 1 + agilityBonusRaw / 100 : undefined;

  const massBonusPercent = typeof at.massBonusPercentage === "number" && at.massBonusPercentage !== 0 ? at.massBonusPercentage : undefined;

  if (
    massAddition === undefined &&
    speedBonusPercent === undefined &&
    agilityMultiplier === undefined &&
    massBonusPercent === undefined &&
    sigRadiusAdd === undefined
  ) {
    return undefined;
  }

  return {
    massAddition,
    stats: { massAddition, massBonusPercent, speedBonusPercent, agilityMultiplier, sigRadiusAdd },
  };
}

interface FittingModuleStats {
  readonly massAddition?: number;
  readonly massBonusPercent?: number;
  readonly speedBonusPercent?: number;
  readonly agilityMultiplier?: number;
  readonly sigRadiusAdd?: number;
  readonly propulsion?: {
    readonly kind: "afterburner" | "microwarpdrive";
    readonly sizeTier: "small" | "medium" | "large" | "capital";
    readonly thrust: number;
    readonly speedBonus: number;
    readonly massAddition: number;
    readonly sigBloom: number;
    readonly activeMassMultiplier: number;
  };
}

interface TurretStats {
  readonly tracking: number;
  readonly sigResolution: number;
  readonly optimal: number;
  readonly falloff: number;
}

interface ChargeStats {
  readonly trackingMultiplier: number;
  readonly rangeMultiplier: number;
  readonly falloffMultiplier: number;
}

async function main() {
  const sdeTypes = toMap(await loadJsonl<SdeType>("types.jsonl"));
  const groups = toMap(await loadJsonl<{ _key: number; name: { en: string }; categoryID: number }>("groups.jsonl"));
  const sdeAttrs = toMap(await loadJsonl<SdeDogmaAttribute>("dogmaAttributes.jsonl"));
  const typeDogmas = toMap(await loadJsonl<SdeTypeDogma>("typeDogma.jsonl"));

  const fittingModules: Record<string, FittingModuleStats> = {};
  const turrets: Record<string, TurretStats> = {};
  const charges: Record<string, ChargeStats> = {};

  for (const [id, type] of sdeTypes) {
    if (!type.published) continue;
    const group = groups.get(type.groupID);
    const typeDogma = typeDogmas.get(id);

    if (TURRET_GROUPS.has(type.groupID)) {
      const at = getAttr(sdeAttrs, typeDogma, ["trackingSpeed", "optimalSigRadius", "maxRange", "falloff"]);
      if (at.trackingSpeed !== undefined && at.optimalSigRadius !== undefined && at.maxRange !== undefined) {
        turrets[type.name.en] = {
          tracking: at.trackingSpeed,
          sigResolution: at.optimalSigRadius,
          optimal: at.maxRange,
          falloff: at.falloff ?? 0,
        };
      }
      continue;
    }

    if (CHARGE_GROUPS.has(type.groupID)) {
      const at = getAttr(sdeAttrs, typeDogma, ["weaponRangeMultiplier", "trackingSpeedMultiplier", "fallofMultiplier"]);
      if (at.weaponRangeMultiplier !== undefined || at.trackingSpeedMultiplier !== undefined || at.fallofMultiplier !== undefined) {
        charges[type.name.en] = {
          trackingMultiplier: at.trackingSpeedMultiplier ?? 1,
          rangeMultiplier: at.weaponRangeMultiplier ?? 1,
          falloffMultiplier: at.fallofMultiplier ?? 1,
        };
      }
      continue;
    }

    if (MODULE_GROUPS.has(type.groupID)) {
      const result = buildModuleStats(type, sdeAttrs, typeDogma);
      if (result) fittingModules[type.name.en] = result.stats;
    }
  }

  const header = `// Generated from EVE Online SDE (${new Date().toISOString().split("T")[0]}). Do not edit by hand.\n/* eslint-disable */\n\nimport type { HullTier } from "../ships";\n\n`;
  const typeDefinitions = `export interface FittingPropulsionStats {
  readonly kind: "afterburner" | "microwarpdrive";
  readonly sizeTier: HullTier;
  readonly thrust: number;
  readonly speedBonus: number;
  readonly massAddition: number;
  readonly sigBloom: number;
  readonly activeMassMultiplier: number;
}

export interface FittingModuleStats {
  readonly massAddition?: number;
  readonly massBonusPercent?: number;
  readonly speedBonusPercent?: number;
  readonly agilityMultiplier?: number;
  readonly sigRadiusAdd?: number;
  readonly propulsion?: FittingPropulsionStats;
}

export interface TurretStats {
  readonly tracking: number;
  readonly sigResolution: number;
  readonly optimal: number;
  readonly falloff: number;
}

export interface ChargeStats {
  readonly trackingMultiplier: number;
  readonly rangeMultiplier: number;
  readonly falloffMultiplier: number;
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

  await writeFile(OUT_FILE, lines.join("\n"));
  console.log(`Wrote ${Object.keys(fittingModules).length} modules, ${Object.keys(turrets).length} turrets, ${Object.keys(charges).length} charges to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
