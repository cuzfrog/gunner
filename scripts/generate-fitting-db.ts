import { homedir } from "node:os";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ShipId, TypeId } from "../src/gamedata/ids";
import { SHIP_PROFILES } from "../src/gamedata/shipProfiles/profiles";
import type { ShipNameLanguage } from "../src/ships";
import type { DamageResists } from "../src/sim";

const SDE_DIR = process.argv[2] ?? join(homedir(), "workspace", "Pyfa", "staticdata", "fsd_built");
const OUT_FILE = join(import.meta.dir, "..", "src", "gamedata", "fittingDb", "fittingDb.ts");
const I18N_EN_FILE = join(import.meta.dir, "..", "src", "gamedata", "itemNames", "item-names-en.ts");
const I18N_ZH_FILE = join(import.meta.dir, "..", "src", "gamedata", "itemNames", "item-names-zh.ts");
const I18N_JA_FILE = join(import.meta.dir, "..", "src", "gamedata", "itemNames", "item-names-ja.ts");
const COLLISION_EN_FILE = join(import.meta.dir, "..", "src", "gamedata", "itemNames", "item-name-collisions-en.ts");
const COLLISION_ZH_FILE = join(import.meta.dir, "..", "src", "gamedata", "itemNames", "item-name-collisions-zh.ts");
const COLLISION_JA_FILE = join(import.meta.dir, "..", "src", "gamedata", "itemNames", "item-name-collisions-ja.ts");

const MODULE_CATEGORY_ID = 7;
const CHARGE_CATEGORY_ID = 8;
const DRONE_CATEGORY_ID = 18;
const SUBSYSTEM_CATEGORY_ID = 32;
const STRUCTURE_MODULE_CATEGORY_ID = 66;
const FIGHTER_CATEGORY_ID = 87;
const FUEL_CATEGORY_ID = 4;
const DEPLOYABLE_CATEGORY_ID = 22;
const IN_SCOPE_CATEGORY_IDS = new Set([
  MODULE_CATEGORY_ID, CHARGE_CATEGORY_ID, DRONE_CATEGORY_ID, SUBSYSTEM_CATEGORY_ID,
  STRUCTURE_MODULE_CATEGORY_ID, FIGHTER_CATEGORY_ID, FUEL_CATEGORY_ID, DEPLOYABLE_CATEGORY_ID,
]);

interface SdeType {
  typeID: number;
  "typeName_en-us": string;
  typeName_zh?: string;
  typeName_ja?: string;
  groupID: number;
  published: number;
  metaLevel?: number;
  metaGroupID?: number;
  volume?: number;
}

type LocalizedName = { readonly en: string; readonly zh?: string; readonly ja?: string };

type Row<T> = T & { readonly id: TypeId; readonly name: string };

interface DroneEntry {
  readonly id: TypeId;
  readonly name: string;
}

interface SdeDogmaAttribute {
  attributeID: number;
  name: string;
}

interface SdeDogmaEffectModifier {
  readonly domain: string;
  readonly func: string;
  readonly modifiedAttributeID: number;
  readonly modifyingAttributeID: number;
  readonly operation: number;
  readonly skillTypeID?: number;
  readonly groupID?: number;
}

interface SdeDogmaEffect {
  effectID: number;
  effectName?: string;
  modifierInfo?: readonly SdeDogmaEffectModifier[];
}

interface SdeGroup {
  groupID: number;
  categoryID: number;
}

interface SdeTypeDogma {
  dogmaAttributes: readonly { attributeID: number; value: number }[];
  dogmaEffects: readonly SdeDogmaEffect[];
}

type BonusAttribute = "turretTracking" | "turretOptimal" | "turretFalloff" | "maxVelocity" | "agility" | "missileDamage" | "missileRoF" | "missileVelocity" | "missileFlightTime" | "missileExplosionRadius" | "missileExplosionVelocity" | "turretDamage" | "turretRoF" | "droneDamage" | "armorResist" | "shieldResist" | "shieldHpPercent" | "armorHpPercent" | "hullHpPercent" | "plateHpPercent" | "extenderHpPercent";
type SkillBonusType = "turretDamage" | "turretRoF" | "turretTracking" | "turretOptimal" | "turretFalloff" | "missileDamage" | "missileRoF" | "missileVelocity" | "missileFlightTime" | "missileExplosionRadius" | "missileExplosionVelocity";

// The NON_SCALING_EFFECT_IDS set below preserves the only information that cannot be derived
// from the SDE: whether a given effect's magnitude scales with the hull skill level or is a
// flat role/rookie/AT/Pirate/NavyDestroyer bonus.
const NON_SCALING_EFFECT_IDS = new Set([
  1218, 1232, 1233, 1239, 1240, 2130, 2131, 2132, 2215, 3415, 3416, 3417, 3478, 3483, 3487, 4464, 4473, 4474, 4475, 4476, 4477, 4622, 4623, 4624, 4625, 4782, 4789, 4991, 4999, 5013, 5014, 5018, 5020, 5205, 5206, 5215, 5216, 5217, 5218, 5219, 5220, 5468, 5721, 5726, 5803, 5804, 5821, 6172, 6173, 6174, 6709, 6711, 6851, 6992, 7018, 7055, 8225, 11393, 11394, 11396, 11397, 11401, 11402, 11410, 11450, 12567,
]);

// Effects with constant magnitudes that cannot be read from the ship's modifying attribute.
const SPECIAL_MAGNITUDES: Readonly<Record<number, number>> = {
  1615: -5, // shipAdvancedSpaceshipCommandAgilityBonus: -5% agility per Advanced Spaceship Command level
};

interface HullBonus {
  readonly attribute: BonusAttribute;
  readonly magnitude: number;
  readonly scalesWithHullSkill: boolean;
  readonly chargeSkillId?: TypeId;
  readonly moduleSkillId?: TypeId;
  readonly moduleGroupId?: number;
}

const MODULE_GROUPS = new Set([
  38, // Shield Extender
  46, // Propulsion Module
  78, // Reinforced Bulkhead
  59, // Gyrostabilizer
  205, // Heat Sink
  211, // Tracking Enhancer
  // 213 Tracking Computer is handled explicitly below
  302, // Magnetic Field Stabilizer
  367, // Ballistic Control System
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
  647, // Drone Control Range Module
  // Defense modules
  60, // Damage Control
  62, // Armor Repair Unit
  63, // Hull Repair Unit
  77, // Shield Hardener
  98, // Armor Coating
  295, // Shield Resistance Amplifier
  326, // Energized Armor Membrane
  328, // Armor Hardener
  338, // Shield Boost Amplifier
  40, // Shield Booster
  41, // Shield Recharger
  57, // Shield Power Relay
  1150, // Armor Resistance Shift Hardener (RAH)
  1156, // Ancillary Shield Booster
  1199, // Ancillary Armor Repairer
]);

const SCRIPT_GROUPS = new Set([907]);
const EWAR_SCRIPT_GROUPS = new Set([909]);

const WARP_SCRAMBLER_GROUP = 52;
const STASIS_WEB_GROUP = 65;
const STASIS_GRAPPLER_GROUP = 1672;
const TRACKING_COMPUTER_GROUP = 213;
const WEAPON_DISRUPTOR_GROUP = 291;
const TARGET_PAINTER_GROUP = 379;
const MISSILE_GUIDANCE_COMPUTER_GROUP = 1396;
const MISSILE_GUIDANCE_ENHANCER_GROUP = 1395;
const MISSILE_SCRIPT_GROUP = 1400;
const SENSOR_DAMPENER_GROUP = 208;
const SENSOR_BOOSTER_GROUP = 212;
const SIGNAL_AMPLIFIER_GROUP = 210;
const SENSOR_BOOSTER_SCRIPT_GROUP = 910;
const SENSOR_DAMPENER_SCRIPT_GROUP = 911;
const MISSILE_DAMAGE_EFFECT = 763;
const MISSILE_ROF_EFFECT = 889;

const TURRET_GROUPS = new Set([53, 55, 74, 1986]);

// Maps SDE dogma attribute IDs to internal combat bonus categories. Used by
// buildHullBonuses to derive bonuses from modifierInfo. Context-dependent
// attributes (64, 51, 37, 54) are disambiguated by resolveHullBonusAttribute.
const COMBAT_ATTRIBUTE_MAP: Readonly<Record<number, BonusAttribute>> = {
  114: "missileDamage", 116: "missileDamage", 117: "missileDamage", 118: "missileDamage",
  64: "turretDamage",
  51: "turretRoF",
  160: "turretTracking", 204: "turretTracking",
  54: "turretOptimal",
  158: "turretFalloff",
  37: "maxVelocity",
  281: "missileFlightTime",
  654: "missileExplosionRadius",
  653: "missileExplosionVelocity",
  265: "armorHpPercent",
  263: "shieldHpPercent",
  9: "hullHpPercent",
  267: "armorResist", 268: "armorResist", 269: "armorResist", 270: "armorResist",
  271: "shieldResist", 272: "shieldResist", 273: "shieldResist", 274: "shieldResist",
  72: "extenderHpPercent",
  1159: "plateHpPercent",
  70: "agility",
};

const MISSILE_HULL_SKILL_IDS = new Set([3319, 3320, 3321, 3322, 3323, 3324, 3325, 3326, 25719, 20209, 20210, 20211, 20212, 20213, 25718, 41409, 41410, 21071, 20315, 12441, 12442, 20314]);
const DRONE_HULL_SKILL_IDS = new Set([3436, 3442, 24241, 33699, 23594, 23069]);
const TURRET_SKILL_IDS = new Set([3301, 3302, 3303, 3304, 3305, 3306, 3307, 3308, 3309, 20327, 21666, 21667]);
const TURRET_SUPPORT_SKILL_IDS = new Set([3300, 3310, 3311, 3312, 3315, 3317]);
const LAUNCHER_GROUP_IDS = new Set([506, 507, 508, 509, 510, 511, 512, 771, 1245, 1579, 1624]);

const CHARGE_GROUPS = new Set([
  83, 85, 86,
  372, 373, 374, 375, 376, 377,
  1987, 1989,
]);

const LAUNCHER_GROUPS = new Set([
  506, 507, 508, 509, 510, 511, 524, 771, 1245, 1673, 1674,
]);

const MISSILE_CHARGE_GROUPS = new Set([
  89, 384, 385, 386, 387, 394, 395, 396, 476, 648, 653, 654, 655, 656, 657, 772, 1019, 1677, 1678,
]);

const COMBAT_DRONE_GROUP = 100;
const OMNIDIRECTIONAL_TRACKING_LINK_GROUP = 646;
const OMNIDIRECTIONAL_TRACKING_ENHANCER_GROUP = 1292;
const DRONE_CONTROL_RANGE_MODULE_GROUP = 647;

const RIG_SIG_DRAWBACK_EFFECT = 2716;
const RIG_AGILITY_DRAWBACK_EFFECT = 2717;
const SHIP_CATEGORY_ID = 6;

// Defense module effect IDs (from RESEARCH.md pyfa effect anchors)
const DEFENSE_EFFECTS = {
  damageControl: 2302,
  armorResonancePassive: 2041,
  armorResonancePassiveRig: 2792,
  shieldResonancePassive: 2052,
  shieldResonancePassiveRig: 2795,
  shieldHardener: 5230,
  armorHardener: 5231,
  shieldBoost: 4,
  armorRepair: 27,
  structureRepair: 26,
  fueledShieldBoost: 4936,
  fueledArmorRepair: 5275,
  shieldBoostAmplifier: 1720,
  rah: 4928,
  shieldExtender: 21,
  armorPlate: 1959,
  shieldRecharge: 50,
  structureHpMultiply: 60,
  hullHpBonus: 392,
} as const;

// Maps module dogma effectIDs to the weapon group they modify. These are damage/RoF
// multiplier effects from Heat Sinks, Gyrostabilizers, Magnetic Field Stabilizers, and
// their rig/booster variants. The module's damageMultiplier and speedMultiplier attributes
// are applied to turret modules of the matching weapon group with stacking penalties.
const DAMAGE_MODULE_EFFECTS: Readonly<Record<number, TurretWeaponGroup>> = {
  89: "Projectile Weapon",
  91: "Energy Weapon",
  92: "Projectile Weapon",
  93: "Hybrid Weapon",
  95: "Energy Weapon",
  96: "Hybrid Weapon",
  2798: "Projectile Weapon",
  2799: "Projectile Weapon",
  2802: "Hybrid Weapon",
  2803: "Energy Weapon",
  2804: "Hybrid Weapon",
};

// Skill typeIDs that provide turret damage or rate-of-fire bonuses. The bonus attribute
// on the skill item is a percentage per level; it is applied as an unpenalized boost.
// Drone skill typeIDs referenced by DroneSkillModelImpl (src/fitting/droneStats.ts).
// These must stay in sync with the runtime constants so that addSkillNames includes them
// in the item name packs for display-time resolution via ItemNameCatalog.
const DRONE_SKILL_IDS = ["3442", "24241", "33699", "3441", "23594"];
// Legacy effects with empty modifierInfo that need special handling in buildSkillBonuses.
const LEGACY_MISSILE_DAMAGE_EFFECTS = new Set([660, 661, 662, 668]);
const LEGACY_ROF_EFFECT = 1851;

function stringifyWithTypeIds<T>(value: T): string {
  return JSON.stringify(value)
    .replace(/"id":"(\d+)"/g, '"id":"$1" as TypeId')
    .replace(/"requiredSkillIds":\[(.*?)\]/g, (match, inner) => `"requiredSkillIds":[${inner.replace(/"(\d+)"/g, '"$1" as TypeId')}]`);
}

function stringifyHullBonuses(value: Record<ShipId, readonly HullBonus[]>): string {
  const entries = Object.entries(value)
    .map(([shipId, bonuses]) => `[${JSON.stringify(shipId)} as ShipId]:${stringifyHullBonusArray(bonuses)}`)
    .join(",");
  return `{${entries}}`;
}

function stringifyHullBonusArray(bonuses: readonly HullBonus[]): string {
  const json = JSON.stringify(bonuses);
  return json.replace(/"(chargeSkillId|moduleSkillId)":"(\d+)"/g, '"$1":"$2" as TypeId');
}

function stringifySkillBonuses(bonuses: readonly RawSkillBonus[]): string {
  const entries = bonuses.map((b) => {
    const obj: Record<string, unknown> = {
      skillId: String(b.skillId),
      bonusType: b.bonusType,
      magnitudePerLevel: b.magnitudePerLevel,
      appliesTo: b.appliesTo,
    };
    if (b.requiredSkillId !== undefined) obj.requiredSkillId = String(b.requiredSkillId);
    if (b.moduleGroupId !== undefined) obj.moduleGroupId = b.moduleGroupId;
    return JSON.stringify(obj)
      .replace(/"skillId":"(\d+)"/, '"skillId":"$1" as TypeId')
      .replace(/"requiredSkillId":"(\d+)"/, '"requiredSkillId":"$1" as TypeId');
  });
  return `[${entries.join(",")}]`;
}

function buildShipNameToId(): ReadonlyMap<string, ShipId> {
  const map = new Map<string, ShipId>();
  for (const profile of SHIP_PROFILES) map.set(profile.name, profile.id);
  return map;
}

function resolveShipId(name: string, sdeType: SdeType | undefined, shipNameToId: ReadonlyMap<string, ShipId>): ShipId {
  const legacy = shipNameToId.get(name);
  if (legacy) return legacy;
  if (sdeType) return String(sdeType.typeID) as ShipId;
  throw new Error(`Unknown ship hull name: ${name}`);
}

async function loadMerged<T>(prefix: string): Promise<Record<string, T>> {
  const files = (await readdir(SDE_DIR))
    .filter((file) => file.startsWith(prefix) && file.endsWith(".json"))
    .sort();
  const all: Record<string, T> = {};
  for (const file of files) {
    const text = await readFile(join(SDE_DIR, file), "utf8");
    const parsed: Record<string, T> = JSON.parse(text);
    Object.assign(all, parsed);
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

function buildAttributeValueMap(typeDogma: SdeTypeDogma | undefined): Map<number, number> {
  const values = new Map<number, number>();
  if (!typeDogma) return values;
  for (const { attributeID, value } of typeDogma.dogmaAttributes) values.set(attributeID, value);
  return values;
}

function buildEffectSet(typeDogma: SdeTypeDogma | undefined): Set<number> {
  const effects = new Set<number>();
  if (!typeDogma) return effects;
  for (const { effectID } of typeDogma.dogmaEffects) effects.add(effectID);
  return effects;
}

function buildSkillBonuses(
  attributeNames: Map<number, string>,
  typedogmas: Record<string, SdeTypeDogma>,
  types: Record<string, SdeType>,
  groups: Record<string, SdeGroup>,
  dogmaEffects: Record<string, SdeDogmaEffect>,
): readonly RawSkillBonus[] {
  const skillGroupIds = new Set<number>();
  for (const g of Object.values(groups)) {
    if (g.categoryID === 16) skillGroupIds.add(g.groupID);
  }
  const bonuses: RawSkillBonus[] = [];
  const seen = new Set<string>();
  for (const [sid, type] of Object.entries(types)) {
    if (!skillGroupIds.has(type.groupID)) continue;
    const skillId = Number(sid);
    const typeDogma = typedogmas[sid];
    if (!typeDogma) continue;
    const skillAttrValues = buildAttributeValueMap(typeDogma);
    const effectIds = typeDogma.dogmaEffects.map((e) => e.effectID);
    for (const eid of effectIds) {
      const eff = dogmaEffects[String(eid)];
      if (!eff) continue;
      if (LEGACY_MISSILE_DAMAGE_EFFECTS.has(eid)) {
        const magnitude = skillAttrValues.get(292);
        if (magnitude === undefined || magnitude === 0) continue;
        const key = `missileDamage:${sid}:${sid}`;
        if (seen.has(key)) continue;
        seen.add(key);
        bonuses.push({ skillId: sid, bonusType: "missileDamage", magnitudePerLevel: magnitude, requiredSkillId: sid, appliesTo: "charge" });
        continue;
      }
      if (eid === LEGACY_ROF_EFFECT) {
        const magnitude = skillAttrValues.get(293);
        if (magnitude === undefined || magnitude === 0) continue;
        const bonusType = MISSILE_HULL_SKILL_IDS.has(skillId) ? "missileRoF" : "turretRoF";
        const key = `${bonusType}:${sid}:${sid}`;
        if (seen.has(key)) continue;
        seen.add(key);
        bonuses.push({ skillId: sid, bonusType, magnitudePerLevel: magnitude, requiredSkillId: sid, appliesTo: "module" });
        continue;
      }
      for (const modifier of eff.modifierInfo ?? []) {
        if (modifier.func === "ItemModifier") continue;
        const base = COMBAT_ATTRIBUTE_MAP[modifier.modifiedAttributeID];
        if (base === undefined) continue;
        const resolved = resolveSkillBonusAttribute(base, modifier, attributeNames);
        if (resolved === undefined) continue;
        const magnitude = skillAttrValues.get(modifier.modifyingAttributeID);
        if (magnitude === undefined || !Number.isFinite(magnitude) || magnitude === 0) continue;
        const filter = resolveSkillBonusFilter(modifier);
        if (!filter) continue;
        const key = `${resolved}:${sid}:${filter.requiredSkillId ?? ""}:${filter.moduleGroupId ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        bonuses.push({ skillId: sid, bonusType: resolved, magnitudePerLevel: magnitude, ...filter });
      }
    }
  }
  return bonuses.sort((a, b) => Number(a.skillId) - Number(b.skillId));
}

interface RawSkillBonus {
  readonly skillId: string;
  readonly bonusType: SkillBonusType;
  readonly magnitudePerLevel: number;
  readonly requiredSkillId?: string;
  readonly moduleGroupId?: number;
  readonly appliesTo: "module" | "charge";
}

function resolveSkillBonusFilter(modifier: SdeDogmaEffectModifier): { requiredSkillId?: string; moduleGroupId?: number; appliesTo: "module" | "charge" } | undefined {
  if (modifier.func === "LocationRequiredSkillModifier") {
    return { requiredSkillId: String(modifier.skillTypeID), appliesTo: "module" };
  }
  if (modifier.func === "OwnerRequiredSkillModifier") {
    return { requiredSkillId: String(modifier.skillTypeID), appliesTo: "charge" };
  }
  if (modifier.func === "LocationGroupModifier") {
    return { moduleGroupId: modifier.groupID, appliesTo: "module" };
  }
  return undefined;
}

function resolveSkillBonusAttribute(
  base: BonusAttribute,
  modifier: SdeDogmaEffectModifier,
  attributeNames: Map<number, string>,
): SkillBonusType | undefined {
  const skillId = modifier.skillTypeID;
  if (base === "turretRoF") {
    if (skillId !== undefined && MISSILE_HULL_SKILL_IDS.has(skillId)) return "missileRoF";
    return "turretRoF";
  }
  if (base === "maxVelocity") {
    if (modifier.func === "OwnerRequiredSkillModifier" && skillId !== undefined && DRONE_HULL_SKILL_IDS.has(skillId)) return undefined;
    if (modifier.func === "OwnerRequiredSkillModifier" && skillId !== undefined && MISSILE_HULL_SKILL_IDS.has(skillId)) return "missileVelocity";
    return undefined;
  }
  if (base === "turretOptimal") {
    if (skillId !== undefined && DRONE_HULL_SKILL_IDS.has(skillId)) return undefined;
    if (skillId !== undefined && !TURRET_SKILL_IDS.has(skillId) && !TURRET_SUPPORT_SKILL_IDS.has(skillId) && !MISSILE_HULL_SKILL_IDS.has(skillId)) return undefined;
    if (modifier.groupID !== undefined && !TURRET_GROUPS.has(modifier.groupID)) return undefined;
    return "turretOptimal";
  }
  if (base === "turretDamage") {
    if (modifier.func === "OwnerRequiredSkillModifier" && skillId !== undefined && DRONE_HULL_SKILL_IDS.has(skillId)) return undefined;
    return base;
  }
  if (base === "turretTracking" || base === "turretFalloff") return base;
  if (base === "missileDamage" || base === "missileFlightTime" || base === "missileExplosionRadius" || base === "missileExplosionVelocity") return base;
  return undefined;
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
  readonly turretTrackingPercent?: number;
  readonly turretOptimalPercent?: number;
  readonly turretFalloffPercent?: number;
  readonly turretDamageMultiplier?: number;
  readonly turretSpeedMultiplier?: number;
  readonly turretWeaponGroup?: TurretWeaponGroup;
  readonly propulsion?: FittingPropulsionStats;
  readonly stasisWeb?: StasisWebStats;
  readonly stasisGrappler?: StasisGrapplerStats;
  readonly trackingDisruptor?: TrackingDisruptorStats;
  readonly warpScrambler?: WarpScramblerStats;
  readonly targetPainter?: TargetPainterStats;
  readonly sensorDampener?: SensorDampenerStats;
  readonly sensorBooster?: SensorBoosterStats;
  readonly signalAmplifier?: SignalAmplifierStats;
  readonly missileDamageMultiplier?: number;
  readonly missileCycleTimeMultiplier?: number;
  readonly droneDamageBonus?: number;
  readonly droneControlRangeBonus?: number;
  readonly defense?: DefenseModuleStats;
}

type TurretWeaponGroup = "Energy Weapon" | "Hybrid Weapon" | "Projectile Weapon";

interface TurretStats {
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly chargeSize: number;
  readonly damageMultiplier: number;
  readonly cycleTime: number;
  readonly turretSkill?: string;
  readonly specializationSkill?: string;
  readonly requiredSkillIds: readonly TypeId[];
  readonly groupID: number;
  readonly metaLevel: number;
  readonly metaGroupID: number;
}

interface ChargeStats {
  readonly trackingMultiplier?: number;
  readonly rangeMultiplier?: number;
  readonly falloffMultiplier?: number;
  readonly emDamage?: number;
  readonly thermalDamage?: number;
  readonly kineticDamage?: number;
  readonly explosiveDamage?: number;
}

interface LauncherStats {
  readonly rateOfFire: number;
  readonly launcherGroup: number;
  readonly chargeGroups: readonly number[];
  readonly requiredSkillIds: readonly TypeId[];
  readonly metaLevel: number;
  readonly metaGroupID: number;
}

interface MissileStats {
  readonly damage: number;
  readonly damageType: "em" | "thermal" | "kinetic" | "explosive";
  readonly explosionRadius: number;
  readonly explosionVelocity: number;
  readonly damageReductionFactor: number;
  readonly maxVelocity: number;
  readonly flightTime: number;
  readonly launcherGroup: number;
  readonly chargeGroup: number;
  readonly requiredSkillIds: readonly TypeId[];
}

interface TurretScriptStats {
  readonly trackingMultiplier: number;
  readonly optimalMultiplier: number;
  readonly falloffMultiplier: number;
}

export interface StasisWebStats {
  readonly maxRange: number;
  readonly speedFactorPercent: number;
  readonly overloadRangeBonusPercent: number;
}

export interface StasisGrapplerStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly speedFactorPercent: number;
  readonly overloadOptimalBonusPercent: number;
}

export interface TrackingDisruptorStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly disruptionPercent: number;
  readonly overloadStrengthBonusPercent: number;
}

export interface DisruptionScriptStats {
  readonly trackingDeltaBonus: number;
  readonly rangeDeltaBonus: number;
  readonly falloffDeltaBonus: number;
}

export interface WarpScramblerStats {
  readonly maxRange: number;
  readonly overloadRangeBonusPercent: number;
}

export interface TrackingComputerStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
}

export interface TargetPainterStats {
  readonly maxRange: number;
  readonly falloff: number;
  readonly signatureRadiusBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
}

export interface MissileGuidanceComputerStats {
  readonly explosionRadiusBonusPercent: number;
  readonly explosionVelocityBonusPercent: number;
  readonly missileVelocityBonusPercent: number;
  readonly flightTimeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
}

export interface MissileGuidanceEnhancerStats {
  readonly explosionRadiusBonusPercent: number;
  readonly explosionVelocityBonusPercent: number;
  readonly missileVelocityBonusPercent: number;
  readonly flightTimeBonusPercent: number;
}

export interface MissileScriptStats {
  readonly explosionRadiusMultiplier: number;
  readonly explosionVelocityMultiplier: number;
  readonly missileVelocityMultiplier: number;
  readonly flightTimeMultiplier: number;
}

interface OmnidirectionalTrackingLinkStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
}

interface OmnidirectionalTrackingEnhancerStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
}

interface SensorDampenerStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly scanResolutionBonusPercent: number;
  readonly maxTargetRangeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
}

interface SensorBoosterStats {
  readonly scanResolutionBonusPercent: number;
  readonly maxTargetRangeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
}

interface SignalAmplifierStats {
  readonly scanResolutionBonusPercent: number;
  readonly maxTargetRangeBonusPercent: number;
  readonly maxLockedTargetsBonus: number;
}

interface SensorBoosterScriptStats {
  readonly scanResolutionMultiplier: number;
  readonly maxTargetRangeMultiplier: number;
}

interface SensorDampenerScriptStats {
  readonly scanResolutionMultiplier: number;
  readonly maxTargetRangeMultiplier: number;
}

type DroneSizeClass = "light" | "medium" | "heavy" | "sentry";

interface DroneStats {
  readonly sizeClass: DroneSizeClass;
  readonly damageMultiplier: number;
  readonly emDamage: number;
  readonly thermalDamage: number;
  readonly kineticDamage: number;
  readonly explosiveDamage: number;
  readonly tracking: number;
  readonly sigResolution: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly maxVelocity: number;
  readonly orbitSpeed: number;
  readonly orbitRange: number;
  readonly cycleTime: number;
  readonly bandwidth: number;
  readonly volume: number;
  readonly metaLevel: number;
  readonly metaGroupID: number;
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
  const stats: { -readonly [K in keyof FittingModuleStats]?: FittingModuleStats[K] } = {};

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

  const turretTrackingPercent = optionalNumber(values.get("trackingSpeedBonus"));
  if (turretTrackingPercent !== undefined) stats.turretTrackingPercent = turretTrackingPercent;

  const turretOptimalPercent = optionalNumber(values.get("maxRangeBonus"));
  if (turretOptimalPercent !== undefined) stats.turretOptimalPercent = turretOptimalPercent;

  const turretFalloffPercent = optionalNumber(values.get("falloffBonus"));
  if (turretFalloffPercent !== undefined) stats.turretFalloffPercent = turretFalloffPercent;

  const drawback = values.get("drawback") ?? 0;
  if (effects.has(RIG_SIG_DRAWBACK_EFFECT) && Number.isFinite(drawback) && drawback !== 0) {
    stats.sigDrawbackPercent = drawback;
  }
  if (effects.has(RIG_AGILITY_DRAWBACK_EFFECT) && Number.isFinite(drawback) && drawback !== 0) {
    stats.agilityDrawbackPercent = drawback;
  }

  const damageGroup = resolveDamageModuleGroup(effects);
  if (damageGroup !== undefined) {
    const damageMultiplier = optionalNumber(values.get("damageMultiplier"));
    const speedMultiplier = optionalNumber(values.get("speedMultiplier"));
    if ((damageMultiplier !== undefined && damageMultiplier !== 0) || (speedMultiplier !== undefined && speedMultiplier !== 0)) {
      stats.turretWeaponGroup = damageGroup;
      if (damageMultiplier !== undefined && damageMultiplier !== 0) stats.turretDamageMultiplier = damageMultiplier;
      if (speedMultiplier !== undefined && speedMultiplier !== 0) stats.turretSpeedMultiplier = speedMultiplier;
    }
  }

  if (effects.has(MISSILE_DAMAGE_EFFECT) || effects.has(MISSILE_ROF_EFFECT)) {
    const missileDamageMultiplier = optionalNumber(values.get("missileDamageMultiplierBonus"));
    const missileCycleTimeMultiplier = optionalNumber(values.get("speedMultiplier"));
    if (missileDamageMultiplier !== undefined) stats.missileDamageMultiplier = missileDamageMultiplier;
    if (missileCycleTimeMultiplier !== undefined) stats.missileCycleTimeMultiplier = missileCycleTimeMultiplier;
  }

  const droneDamageBonus = optionalNumber(values.get("droneDamageBonus"));
  if (droneDamageBonus !== undefined) stats.droneDamageBonus = droneDamageBonus;

  const droneControlRangeBonus = optionalNumber(values.get("droneRangeBonus"));
  if (droneControlRangeBonus !== undefined) stats.droneControlRangeBonus = droneControlRangeBonus;

  if (Object.keys(stats).length === 0) return undefined;
  return { ...stats };
}

function resolveDamageModuleGroup(effects: Set<number>): TurretWeaponGroup | undefined {
  for (const effectId of effects) {
    const group = DAMAGE_MODULE_EFFECTS[effectId];
    if (group !== undefined) return group;
  }
  return undefined;
}

interface DefenseRepairerOverload {
  readonly amountMultiplier: number;
  readonly cycleTimeMultiplier: number;
}

interface DefenseAncillary {
  readonly chargeMultiplier: number;
  readonly shots: number;
  readonly reloadTime: number;
}

interface DefenseModuleStats {
  readonly kind: "damageControl" | "rah" | "repairer" | "boostAmplifier"
    | "resistModule" | "shieldExtender" | "armorPlate" | "rechargeModule" | "hullBulkhead";
  readonly layer?: "shield" | "armor" | "hull";
  readonly active?: boolean;
  readonly resistBonus?: DamageResists;
  readonly overloadBonusMultiplier?: number;
  readonly shieldResists?: DamageResists;
  readonly armorResists?: DamageResists;
  readonly hullResists?: DamageResists;
  readonly baseArmorResists?: DamageResists;
  readonly resistanceShiftAmount?: number;
  readonly amount?: number;
  readonly cycleTime?: number;
  readonly capacitorNeed?: number;
  readonly heatDamage?: number;
  readonly overload?: DefenseRepairerOverload;
  readonly overloadCycleTimeMultiplier?: number;
  readonly ancillary?: DefenseAncillary;
  readonly multiplier?: number;
  readonly shieldHpAdd?: number;
  readonly armorHpAdd?: number;
  readonly hullHpPercent?: number;
  readonly sigRadiusPenalty?: number;
  readonly rechargeMultiplier?: number;
}

function buildDefenseStats(values: Map<string, number>, effects: Set<number>, groupId: number): DefenseModuleStats | undefined {
  if (effects.has(DEFENSE_EFFECTS.damageControl)) return buildDamageControlStats(values);
  if (effects.has(DEFENSE_EFFECTS.rah)) return buildRahStats(values);
  if (effects.has(DEFENSE_EFFECTS.shieldBoost) || effects.has(DEFENSE_EFFECTS.fueledShieldBoost)) {
    return buildShieldBoosterStats(values, effects);
  }
  if (effects.has(DEFENSE_EFFECTS.armorRepair) || effects.has(DEFENSE_EFFECTS.fueledArmorRepair)) {
    return buildArmorRepairerStats(values, effects, groupId);
  }
  if (effects.has(DEFENSE_EFFECTS.structureRepair)) return buildHullRepairerStats(values);
  if (effects.has(DEFENSE_EFFECTS.shieldBoostAmplifier)) return buildShieldBoostAmplifierStats(values);
  if (effects.has(DEFENSE_EFFECTS.shieldHardener) || effects.has(DEFENSE_EFFECTS.armorHardener)) {
    return buildActiveHardenerStats(values, effects);
  }
  if (effects.has(DEFENSE_EFFECTS.armorResonancePassive) || effects.has(DEFENSE_EFFECTS.shieldResonancePassive) || effects.has(DEFENSE_EFFECTS.armorResonancePassiveRig) || effects.has(DEFENSE_EFFECTS.shieldResonancePassiveRig)) {
    return buildPassiveResistStats(values, effects);
  }
  if (effects.has(DEFENSE_EFFECTS.shieldExtender)) return buildShieldExtenderStats(values);
  if (effects.has(DEFENSE_EFFECTS.armorPlate)) return buildArmorPlateStats(values);
  if (effects.has(DEFENSE_EFFECTS.shieldRecharge)) return buildRechargeModuleStats(values);
  if (effects.has(DEFENSE_EFFECTS.structureHpMultiply)) return buildHullBulkheadStatsFromMultiplier(values);
  if (effects.has(DEFENSE_EFFECTS.hullHpBonus)) return buildHullBulkheadStatsFromPercent(values);
  return undefined;
}

function buildDamageControlStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const shieldResists = extractDcResonances(values, "shield");
  const armorResists = extractDcResonances(values, "armor");
  const hullResists = extractDcResonances(values, "hull");
  if (!shieldResists && !armorResists && !hullResists) return undefined;
  return {
    kind: "damageControl",
    shieldResists: shieldResists ?? undefined,
    armorResists: armorResists ?? undefined,
    hullResists: hullResists ?? undefined,
  };
}

function buildRahStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const armorResonances = extractDcResonances(values, "armor");
  const resistanceShiftAmount = optionalNumber(values.get("resistanceShiftAmount"));
  const duration = optionalNumber(values.get("duration"));
  const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
  const overloadDurationBonus = optionalNumber(values.get("overloadSelfDurationBonus"));
  if (!armorResonances) return undefined;
  return {
    kind: "rah",
    baseArmorResists: armorResonances,
    resistanceShiftAmount: resistanceShiftAmount ?? 6,
    cycleTime: duration !== undefined ? duration / 1000 : undefined,
    capacitorNeed,
    overloadCycleTimeMultiplier: overloadDurationBonus !== undefined ? 1 + overloadDurationBonus / 100 : undefined,
  };
}

function buildShieldBoosterStats(values: Map<string, number>, effects: Set<number>): DefenseModuleStats | undefined {
  const shieldBonus = optionalNumber(values.get("shieldBonus"));
  const duration = optionalNumber(values.get("duration"));
  if (shieldBonus === undefined || duration === undefined) return undefined;
  const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
  const heatDamage = optionalNumber(values.get("heatDamage"));
  const overloadShieldBonus = optionalNumber(values.get("overloadShieldBonus"));
  const overloadDurationBonus = optionalNumber(values.get("overloadSelfDurationBonus"));
  const isAncillary = effects.has(DEFENSE_EFFECTS.fueledShieldBoost);
  const reloadTime = optionalNumber(values.get("reloadTime"));
  const ancillary = isAncillary ? { chargeMultiplier: 1, shots: 0, reloadTime: (reloadTime ?? 0) / 1000 } : undefined;
  return {
    kind: "repairer",
    layer: "shield",
    amount: shieldBonus,
    cycleTime: duration / 1000,
    capacitorNeed,
    heatDamage,
    overload: buildRepairerOverload(overloadShieldBonus, overloadDurationBonus),
    ancillary,
  };
}

function buildArmorRepairerStats(values: Map<string, number>, effects: Set<number>, groupId: number): DefenseModuleStats | undefined {
  const armorDamageAmount = optionalNumber(values.get("armorDamageAmount"));
  const duration = optionalNumber(values.get("duration"));
  if (armorDamageAmount === undefined || duration === undefined) return undefined;
  const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
  const heatDamage = optionalNumber(values.get("heatDamage"));
  const overloadAmountBonus = optionalNumber(values.get("overloadArmorDamageAmount"));
  const overloadDurationBonus = optionalNumber(values.get("overloadSelfDurationBonus"));
  const isAncillary = groupId === 1199 || effects.has(DEFENSE_EFFECTS.fueledArmorRepair);
  const chargedArmorDamageMultiplier = optionalNumber(values.get("chargedArmorDamageMultiplier"));
  const reloadTime = optionalNumber(values.get("reloadTime"));
  const ancillary = buildAncillary(isAncillary, chargedArmorDamageMultiplier ?? 1, reloadTime);
  return {
    kind: "repairer",
    layer: "armor",
    amount: armorDamageAmount,
    cycleTime: duration / 1000,
    capacitorNeed,
    heatDamage,
    overload: buildRepairerOverload(overloadAmountBonus, overloadDurationBonus),
    ancillary,
  };
}

function buildHullRepairerStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const structureDamageAmount = optionalNumber(values.get("structureDamageAmount"));
  const duration = optionalNumber(values.get("duration"));
  if (structureDamageAmount === undefined || duration === undefined) return undefined;
  const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
  const heatDamage = optionalNumber(values.get("heatDamage"));
  return {
    kind: "repairer",
    layer: "hull",
    amount: structureDamageAmount,
    cycleTime: duration / 1000,
    capacitorNeed,
    heatDamage,
    overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 },
  };
}

function buildShieldBoostAmplifierStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const shieldBoostMultiplier = optionalNumber(values.get("shieldBoostMultiplier"));
  if (shieldBoostMultiplier === undefined) return undefined;
  return { kind: "boostAmplifier", multiplier: round6(1 + shieldBoostMultiplier / 100) };
}

function buildActiveHardenerStats(values: Map<string, number>, effects: Set<number>): DefenseModuleStats | undefined {
  const layer = effects.has(DEFENSE_EFFECTS.shieldHardener) ? "shield" : "armor";
  const resistBonus = extractResistBonus(values);
  if (!resistBonus) return undefined;
  const duration = optionalNumber(values.get("duration"));
  const capacitorNeed = optionalNumber(values.get("capacitorNeed"));
  const heatDamage = optionalNumber(values.get("heatDamage"));
  const overloadHardeningBonus = optionalNumber(values.get("overloadHardeningBonus"));
  return {
    kind: "resistModule",
    layer,
    active: true,
    resistBonus,
    overloadBonusMultiplier: overloadHardeningBonus !== undefined ? 1 + overloadHardeningBonus / 100 : undefined,
    cycleTime: duration !== undefined ? duration / 1000 : undefined,
    capacitorNeed,
    heatDamage,
  };
}

function buildPassiveResistStats(values: Map<string, number>, effects: Set<number>): DefenseModuleStats | undefined {
  const layer = (effects.has(DEFENSE_EFFECTS.shieldResonancePassive) || effects.has(DEFENSE_EFFECTS.shieldResonancePassiveRig)) ? "shield" : "armor";
  const resistBonus = extractResistBonus(values);
  if (!resistBonus) return undefined;
  return { kind: "resistModule", layer, active: false, resistBonus };
}

function buildShieldExtenderStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const capacityBonus = optionalNumber(values.get("capacityBonus"));
  if (capacityBonus === undefined) return undefined;
  const sigRadiusAdd = optionalNumber(values.get("signatureRadiusAdd"));
  return { kind: "shieldExtender", shieldHpAdd: capacityBonus, sigRadiusPenalty: sigRadiusAdd };
}

function buildArmorPlateStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const armorHpBonusAdd = optionalNumber(values.get("armorHPBonusAdd"));
  if (armorHpBonusAdd === undefined) return undefined;
  return { kind: "armorPlate", armorHpAdd: armorHpBonusAdd };
}

function buildHullBulkheadStatsFromMultiplier(values: Map<string, number>): DefenseModuleStats | undefined {
  const multiplier = optionalNumber(values.get("structureHPMultiplier"));
  if (multiplier === undefined) return undefined;
  return { kind: "hullBulkhead", hullHpPercent: round6((multiplier - 1) * 100) };
}

function buildHullBulkheadStatsFromPercent(values: Map<string, number>): DefenseModuleStats | undefined {
  const hullHpBonusPercent = optionalNumber(values.get("hullHpBonus"));
  if (hullHpBonusPercent === undefined) return undefined;
  return { kind: "hullBulkhead", hullHpPercent: hullHpBonusPercent };
}

function buildRechargeModuleStats(values: Map<string, number>): DefenseModuleStats | undefined {
  const rechargeBonus = optionalNumber(values.get("rechargeratebonus")) ?? optionalNumber(values.get("shieldRechargeRateMultiplier"));
  if (rechargeBonus === undefined) return undefined;
  return { kind: "rechargeModule", rechargeMultiplier: 1 + rechargeBonus / 100 };
}

function buildRepairerOverload(amountBonus: number | undefined, durationBonus: number | undefined): DefenseRepairerOverload {
  return {
    amountMultiplier: amountBonus !== undefined ? 1 + amountBonus / 100 : 1,
    cycleTimeMultiplier: durationBonus !== undefined ? 1 + durationBonus / 100 : 1,
  };
}

function buildAncillary(isAncillary: boolean, chargeMultiplier: number, reloadTime: number | undefined): DefenseAncillary | undefined {
  if (!isAncillary) return undefined;
  return { chargeMultiplier, shots: 0, reloadTime: (reloadTime ?? 0) / 1000 };
}

function extractResistBonus(values: Map<string, number>): DamageResists | undefined {
  const em = optionalNumber(values.get("emDamageResistanceBonus"));
  const thermal = optionalNumber(values.get("thermalDamageResistanceBonus"));
  const kinetic = optionalNumber(values.get("kineticDamageResistanceBonus"));
  const explosive = optionalNumber(values.get("explosiveDamageResistanceBonus"));
  if (em === undefined && thermal === undefined && kinetic === undefined && explosive === undefined) return undefined;
  return {
    em: round6(Math.abs(em ?? 0) / 100),
    thermal: round6(Math.abs(thermal ?? 0) / 100),
    kinetic: round6(Math.abs(kinetic ?? 0) / 100),
    explosive: round6(Math.abs(explosive ?? 0) / 100),
  };
}

function extractDcResonances(values: Map<string, number>, prefix: string): DamageResists | undefined {
  const emAttr = prefix === "hull" ? "hullEmDamageResonance" : `${prefix}EmDamageResonance`;
  const thermalAttr = prefix === "hull" ? "hullThermalDamageResonance" : `${prefix}ThermalDamageResonance`;
  const kineticAttr = prefix === "hull" ? "hullKineticDamageResonance" : `${prefix}KineticDamageResonance`;
  const explosiveAttr = prefix === "hull" ? "hullExplosiveDamageResonance" : `${prefix}ExplosiveDamageResonance`;
  const em = optionalNumber(values.get(emAttr));
  const thermal = optionalNumber(values.get(thermalAttr));
  const kinetic = optionalNumber(values.get(kineticAttr));
  const explosive = optionalNumber(values.get(explosiveAttr));
  if (em === undefined && thermal === undefined && kinetic === undefined && explosive === undefined) return undefined;
  return {
    em: round6(1 - (em ?? 1)),
    thermal: round6(1 - (thermal ?? 1)),
    kinetic: round6(1 - (kinetic ?? 1)),
    explosive: round6(1 - (explosive ?? 1)),
  };
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function buildStasisWebStats(values: Map<string, number>): StasisWebStats | undefined {
  const speedFactor = values.get("speedFactor");
  const maxRange = values.get("maxRange");
  if (speedFactor === undefined || maxRange === undefined) return undefined;
  return {
    maxRange,
    speedFactorPercent: speedFactor,
    overloadRangeBonusPercent: values.get("overloadRangeBonus") ?? 0,
  };
}

export function buildStasisGrapplerStats(values: Map<string, number>): StasisGrapplerStats | undefined {
  const speedFactor = values.get("speedFactor");
  const maxRange = values.get("maxRange");
  if (speedFactor === undefined || maxRange === undefined) return undefined;
  return {
    optimal: maxRange,
    falloff: values.get("falloffEffectiveness") ?? 0,
    speedFactorPercent: speedFactor,
    overloadOptimalBonusPercent: values.get("overloadRangeBonus") ?? 0,
  };
}

export function buildTrackingComputerStats(values: Map<string, number>): TrackingComputerStats | undefined {
  const trackingBonus = values.get("trackingSpeedBonus");
  if (trackingBonus === undefined) return undefined;
  return {
    trackingBonusPercent: trackingBonus,
    optimalBonusPercent: values.get("maxRangeBonus") ?? 0,
    falloffBonusPercent: values.get("falloffBonus") ?? 0,
  };
}

export function buildTargetPainterStats(values: Map<string, number>): TargetPainterStats | undefined {
  const signatureRadiusBonus = values.get("signatureRadiusBonus");
  const maxRange = values.get("maxRange");
  if (signatureRadiusBonus === undefined || maxRange === undefined) return undefined;
  return {
    maxRange,
    falloff: values.get("falloffEffectiveness") ?? 0,
    signatureRadiusBonusPercent: signatureRadiusBonus,
    overloadStrengthBonusPercent: values.get("overloadPainterStrengthBonus") ?? 0,
  };
}

export function buildMissileGuidanceComputerStats(values: Map<string, number>): MissileGuidanceComputerStats | undefined {
  const explosionRadiusBonus = values.get("aoeCloudSizeBonus");
  if (explosionRadiusBonus === undefined) return undefined;
  return {
    explosionRadiusBonusPercent: explosionRadiusBonus,
    explosionVelocityBonusPercent: values.get("aoeVelocityBonus") ?? 0,
    missileVelocityBonusPercent: values.get("missileVelocityBonus") ?? 0,
    flightTimeBonusPercent: values.get("explosionDelayBonus") ?? 0,
    overloadStrengthBonusPercent: values.get("overloadTrackingModuleStrengthBonus") ?? 0,
  };
}

export function buildMissileGuidanceEnhancerStats(values: Map<string, number>): MissileGuidanceEnhancerStats | undefined {
  const explosionRadiusBonus = values.get("aoeCloudSizeBonus");
  if (explosionRadiusBonus === undefined) return undefined;
  return {
    explosionRadiusBonusPercent: explosionRadiusBonus,
    explosionVelocityBonusPercent: values.get("aoeVelocityBonus") ?? 0,
    missileVelocityBonusPercent: values.get("missileVelocityBonus") ?? 0,
    flightTimeBonusPercent: values.get("explosionDelayBonus") ?? 0,
  };
}

export function buildMissileScriptStats(values: Map<string, number>): MissileScriptStats | undefined {
  const explosionRadiusBonusBonus = values.get("aoeCloudSizeBonusBonus");
  if (explosionRadiusBonusBonus === undefined) return undefined;
  return {
    explosionRadiusMultiplier: 1 + explosionRadiusBonusBonus / 100,
    explosionVelocityMultiplier: 1 + (values.get("aoeVelocityBonusBonus") ?? 0) / 100,
    missileVelocityMultiplier: 1 + (values.get("missileVelocityBonusBonus") ?? 0) / 100,
    flightTimeMultiplier: 1 + (values.get("explosionDelayBonusBonus") ?? 0) / 100,
  };
}

export function buildTrackingDisruptorStats(values: Map<string, number>): TrackingDisruptorStats | undefined {
  const disruptionPercent = values.get("trackingSpeedBonus");
  if (disruptionPercent === undefined) return undefined;
  return {
    optimal: values.get("maxRange") ?? 0,
    falloff: values.get("falloffEffectiveness") ?? 0,
    disruptionPercent,
    overloadStrengthBonusPercent: values.get("overloadTrackingModuleStrengthBonus") ?? 0,
  };
}

export function buildWarpScramblerStats(values: Map<string, number>): WarpScramblerStats | undefined {
  const propulsionBlock = values.get("activationBlockedStrenght");
  const maxRange = values.get("maxRange");
  if (propulsionBlock === undefined || propulsionBlock <= 0 || maxRange === undefined) return undefined;
  return {
    maxRange,
    overloadRangeBonusPercent: values.get("overloadRangeBonus") ?? 0,
  };
}

export function buildDisruptionScriptStats(values: Map<string, number>): DisruptionScriptStats {
  return {
    trackingDeltaBonus: values.get("trackingSpeedBonusBonus") ?? 0,
    rangeDeltaBonus: values.get("maxRangeBonusBonus") ?? 0,
    falloffDeltaBonus: values.get("falloffBonusBonus") ?? 0,
  };
}

export function buildSensorDampenerStats(values: Map<string, number>): SensorDampenerStats | undefined {
  const scanResolutionBonus = values.get("scanResolutionBonus");
  const maxTargetRangeBonus = values.get("maxTargetRangeBonus");
  if (scanResolutionBonus === undefined && maxTargetRangeBonus === undefined) return undefined;
  return {
    optimal: values.get("maxRange") ?? 0,
    falloff: values.get("falloffEffectiveness") ?? 0,
    scanResolutionBonusPercent: scanResolutionBonus ?? 0,
    maxTargetRangeBonusPercent: maxTargetRangeBonus ?? 0,
    overloadStrengthBonusPercent: values.get("overloadSensorModuleStrengthBonus") ?? 0,
  };
}

export function buildSensorBoosterStats(values: Map<string, number>): SensorBoosterStats | undefined {
  const scanResolutionBonus = values.get("scanResolutionBonus");
  const maxTargetRangeBonus = values.get("maxTargetRangeBonus");
  if (scanResolutionBonus === undefined && maxTargetRangeBonus === undefined) return undefined;
  return {
    scanResolutionBonusPercent: scanResolutionBonus ?? 0,
    maxTargetRangeBonusPercent: maxTargetRangeBonus ?? 0,
    overloadStrengthBonusPercent: values.get("overloadSensorModuleStrengthBonus") ?? 0,
  };
}

export function buildSignalAmplifierStats(values: Map<string, number>): SignalAmplifierStats | undefined {
  const scanResolutionBonus = values.get("scanResolutionBonus");
  const maxTargetRangeBonus = values.get("maxTargetRangeBonus");
  if (scanResolutionBonus === undefined && maxTargetRangeBonus === undefined) return undefined;
  return {
    scanResolutionBonusPercent: scanResolutionBonus ?? 0,
    maxTargetRangeBonusPercent: maxTargetRangeBonus ?? 0,
    maxLockedTargetsBonus: values.get("maxLockedTargetsBonus") ?? 0,
  };
}

export function buildSensorBoosterScriptStats(values: Map<string, number>): SensorBoosterScriptStats | undefined {
  const scanResolutionBonusBonus = values.get("scanResolutionBonusBonus");
  const maxTargetRangeBonusBonus = values.get("maxTargetRangeBonusBonus");
  if (scanResolutionBonusBonus === undefined && maxTargetRangeBonusBonus === undefined) return undefined;
  return {
    scanResolutionMultiplier: 1 + (scanResolutionBonusBonus ?? 0) / 100,
    maxTargetRangeMultiplier: 1 + (maxTargetRangeBonusBonus ?? 0) / 100,
  };
}

export function buildSensorDampenerScriptStats(values: Map<string, number>): SensorDampenerScriptStats | undefined {
  const scanResolutionBonusBonus = values.get("scanResolutionBonusBonus");
  const maxTargetRangeBonusBonus = values.get("maxTargetRangeBonusBonus");
  if (scanResolutionBonusBonus === undefined && maxTargetRangeBonusBonus === undefined) return undefined;
  return {
    scanResolutionMultiplier: 1 + (scanResolutionBonusBonus ?? 0) / 100,
    maxTargetRangeMultiplier: 1 + (maxTargetRangeBonusBonus ?? 0) / 100,
  };
}

function buildHullBonuses(
  attributeNames: Map<number, string>,
  attributeValues: Map<number, number>,
  typeDogma: SdeTypeDogma | undefined,
  dogmaEffects: Readonly<Record<string, SdeDogmaEffect>>,
): readonly HullBonus[] {
  if (!typeDogma) return [];
  const effects = buildEffectSet(typeDogma);
  const bonuses: HullBonus[] = [];
  const seen = new Set<string>();
  for (const effectID of effects) {
    const effect = dogmaEffects[String(effectID)];
    if (!effect?.modifierInfo) continue;
    const effectNonScaling = NON_SCALING_EFFECT_IDS.has(effectID);
    const specialMagnitude = SPECIAL_MAGNITUDES[effectID];
    for (const modifier of effect.modifierInfo) {
      const attribute = resolveHullBonusAttribute(modifier, attributeNames);
      if (!attribute) continue;
      const magnitude = specialMagnitude ?? attributeValues.get(modifier.modifyingAttributeID);
      if (magnitude === undefined || !Number.isFinite(magnitude) || magnitude === 0) continue;
      const filter = resolveHullBonusFilter(modifier);
      if (!filter) continue;
      const modifyingAttrName = attributeNames.get(modifier.modifyingAttributeID) ?? "";
      const scalesWithHullSkill = !effectNonScaling && !isNonScalingAttribute(modifyingAttrName);
      const key = `${attribute}:${filter.chargeSkillId ?? ""}:${filter.moduleSkillId ?? ""}:${filter.moduleGroupId ?? ""}:${scalesWithHullSkill}`;
      if (seen.has(key)) continue;
      seen.add(key);
      bonuses.push({ attribute, magnitude, scalesWithHullSkill, ...filter });
    }
  }
  return bonuses;
}

function resolveHullBonusAttribute(
  modifier: SdeDogmaEffectModifier,
  attributeNames: Map<number, string>,
): BonusAttribute | undefined {
  const base = COMBAT_ATTRIBUTE_MAP[modifier.modifiedAttributeID];
  if (!base) return undefined;
  const skillId = modifier.skillTypeID;
  const func = modifier.func;
  // Disambiguate context-dependent attributes.
  if (base === "turretRoF" && skillId !== undefined && MISSILE_HULL_SKILL_IDS.has(skillId)) return "missileRoF";
  if (base === "turretRoF" && modifier.groupID !== undefined && LAUNCHER_GROUP_IDS.has(modifier.groupID)) return "missileRoF";
  if (base === "maxVelocity" && func === "OwnerRequiredSkillModifier" && skillId !== undefined && MISSILE_HULL_SKILL_IDS.has(skillId)) return "missileVelocity";
  if (base === "turretDamage" && func === "OwnerRequiredSkillModifier" && skillId !== undefined && DRONE_HULL_SKILL_IDS.has(skillId)) return "droneDamage";
  if (base === "turretOptimal" && modifier.groupID === WARP_SCRAMBLER_GROUP) return undefined;
  // Skip maxRange bonuses filtered by non-turret skills (e.g. Leadership for command bursts).
  if (base === "turretOptimal" && skillId !== undefined && !TURRET_SKILL_IDS.has(skillId)) return undefined;
  // Skip turret attribute bonuses for non-turret module groups (tractor beams, remote repairers, etc.).
  if ((base === "turretOptimal" || base === "turretDamage" || base === "turretRoF" || base === "turretTracking" || base === "turretFalloff") && modifier.groupID !== undefined && !TURRET_GROUPS.has(modifier.groupID)) return undefined;
  // Skip drone HP/resist bonuses (OwnerRequiredSkillModifier on ship HP attributes with drone skill).
  if (func === "OwnerRequiredSkillModifier" && skillId !== undefined && DRONE_HULL_SKILL_IDS.has(skillId) && (base === "hullHpPercent" || base === "armorHpPercent" || base === "shieldHpPercent" || base === "armorResist" || base === "shieldResist")) return undefined;
  return base;
}

function resolveHullBonusFilter(modifier: SdeDogmaEffectModifier): { chargeSkillId?: TypeId; moduleSkillId?: TypeId; moduleGroupId?: number } | undefined {
  switch (modifier.func) {
    case "OwnerRequiredSkillModifier":
      return modifier.skillTypeID !== undefined ? { chargeSkillId: String(modifier.skillTypeID) as TypeId } : undefined;
    case "LocationRequiredSkillModifier":
      return modifier.skillTypeID !== undefined ? { moduleSkillId: String(modifier.skillTypeID) as TypeId } : undefined;
    case "LocationGroupModifier":
      return modifier.groupID !== undefined ? { moduleGroupId: modifier.groupID } : undefined;
    case "ItemModifier":
      return {};
    default:
      return undefined;
  }
}

function isNonScalingAttribute(attrName: string): boolean {
  return attrName.startsWith("shipBonusRole") || attrName.startsWith("roleBonus") || attrName.startsWith("shipRoleBonus") || attrName.startsWith("battleship");
}

function turretSkillFromRequired(
  types: Record<string, SdeType>,
  requiredSkills: Record<string, Record<string, number>>,
  typeID: number,
): string | undefined {
  const skills = requiredSkills[String(typeID)];
  if (!skills) return undefined;
  for (const skillTypeID of Object.keys(skills)) {
    const name = types[skillTypeID]?.["typeName_en-us"];
    if (name?.includes("Turret")) return name;
  }
  return undefined;
}

function specializationSkillFromRequired(
  types: Record<string, SdeType>,
  requiredSkills: Record<string, Record<string, number>>,
  typeID: number,
): string | undefined {
  const skills = requiredSkills[String(typeID)];
  if (!skills) return undefined;
  for (const skillTypeID of Object.keys(skills)) {
    const name = types[skillTypeID]?.["typeName_en-us"];
    if (name?.includes("Specialization")) return name;
  }
  return undefined;
}

function buildRequiredSkillIds(requiredSkills: Record<string, Record<string, number>>, typeID: number): readonly TypeId[] {
  const skills = requiredSkills[String(typeID)];
  if (!skills) return [];
  return Object.keys(skills).map((id) => id as TypeId);
}

export function buildLauncherStats(values: Map<string, number>, groupID: number, type: SdeType, requiredSkillIds: readonly TypeId[]): LauncherStats | undefined {
  const speed = values.get("speed");
  if (speed === undefined || speed <= 0) return undefined;
  const chargeGroups: number[] = [];
  for (const attr of ["chargeGroup1", "chargeGroup2", "chargeGroup3", "chargeGroup4", "chargeGroup5"]) {
    const group = values.get(attr);
    if (group !== undefined && group > 0) chargeGroups.push(group);
  }
  if (chargeGroups.length === 0) return undefined;
  return { rateOfFire: speed / 1000, launcherGroup: groupID, chargeGroups, requiredSkillIds, metaLevel: type.metaLevel ?? 0, metaGroupID: type.metaGroupID ?? 1 };
}

export function buildMissileStats(values: Map<string, number>, groupID: number, requiredSkillIds: readonly TypeId[]): MissileStats | undefined {
  const emDamage = values.get("emDamage") ?? 0;
  const thermalDamage = values.get("thermalDamage") ?? 0;
  const kineticDamage = values.get("kineticDamage") ?? 0;
  const explosiveDamage = values.get("explosiveDamage") ?? 0;
  const damage = emDamage + thermalDamage + kineticDamage + explosiveDamage;
  if (damage <= 0) return undefined;
  const explosionRadius = values.get("aoeCloudSize");
  const explosionVelocity = values.get("aoeVelocity");
  const damageReductionFactor = values.get("aoeDamageReductionFactor");
  const maxVelocity = values.get("maxVelocity");
  const flightTime = values.get("explosionDelay");
  const launcherGroup = values.get("launcherGroup");
  if (explosionRadius === undefined || explosionVelocity === undefined) return undefined;
  if (damageReductionFactor === undefined || maxVelocity === undefined) return undefined;
  if (flightTime === undefined || launcherGroup === undefined) return undefined;
  return {
    damage,
    damageType: damageTypeFromValues(emDamage, thermalDamage, kineticDamage, explosiveDamage),
    explosionRadius,
    explosionVelocity,
    damageReductionFactor,
    maxVelocity,
    flightTime: flightTime / 1000,
    launcherGroup,
    chargeGroup: groupID,
    requiredSkillIds,
  };
}

function damageTypeFromValues(em: number, thermal: number, kinetic: number, explosive: number): "em" | "thermal" | "kinetic" | "explosive" {
  if (em > 0) return "em";
  if (thermal > 0) return "thermal";
  if (kinetic > 0) return "kinetic";
  return "explosive";
}

export function buildDroneStats(values: Map<string, number>, type: SdeType): DroneStats | undefined {
  const damageMultiplier = values.get("damageMultiplier");
  const tracking = values.get("trackingSpeed");
  const sigResolution = values.get("optimalSigRadius");
  const optimal = values.get("maxRange");
  const speed = values.get("speed");
  if (damageMultiplier === undefined || tracking === undefined || sigResolution === undefined || optimal === undefined || speed === undefined) return undefined;
  const emDamage = values.get("emDamage") ?? 0;
  const thermalDamage = values.get("thermalDamage") ?? 0;
  const kineticDamage = values.get("kineticDamage") ?? 0;
  const explosiveDamage = values.get("explosiveDamage") ?? 0;
  if (emDamage + thermalDamage + kineticDamage + explosiveDamage <= 0) return undefined;
  const falloff = values.get("falloff") ?? 0;
  const maxVelocity = values.get("maxVelocity") ?? 0;
  const orbitSpeed = values.get("entityCruiseSpeed") ?? 0;
  const bandwidth = values.get("droneBandwidthUsed") ?? 0;
  const sizeClass = droneSizeClassFromStats(maxVelocity, orbitSpeed, bandwidth);
  const rawOrbitRange = values.get("entityFlyRange") ?? 0;
  const orbitRange = sizeClass === "sentry" ? 0 : rawOrbitRange;
  const volume = type.volume ?? bandwidth;
  return {
    sizeClass,
    damageMultiplier,
    emDamage,
    thermalDamage,
    kineticDamage,
    explosiveDamage,
    tracking,
    sigResolution,
    optimal,
    falloff,
    maxVelocity,
    orbitSpeed,
    orbitRange,
    cycleTime: speed / 1000,
    bandwidth,
    volume,
    metaLevel: type.metaLevel ?? 0,
    metaGroupID: type.metaGroupID ?? 1,
  };
}

function droneSizeClassFromStats(maxVelocity: number, orbitSpeed: number, bandwidth: number): DroneSizeClass {
  if (maxVelocity <= 1 && orbitSpeed <= 1) return "sentry";
  if (bandwidth <= 5) return "light";
  if (bandwidth <= 10) return "medium";
  return "heavy";
}

export function buildOmnidirectionalTrackingLinkStats(values: Map<string, number>): OmnidirectionalTrackingLinkStats | undefined {
  const trackingBonusPercent = values.get("trackingSpeedBonus");
  const optimalBonusPercent = values.get("maxRangeBonus");
  const falloffBonusPercent = values.get("falloffBonus");
  if (trackingBonusPercent === undefined || optimalBonusPercent === undefined || falloffBonusPercent === undefined) return undefined;
  const overloadStrengthBonusPercent = values.get("overloadTrackingModuleStrengthBonus") ?? 0;
  return { trackingBonusPercent, optimalBonusPercent, falloffBonusPercent, overloadStrengthBonusPercent };
}

export function buildOmnidirectionalTrackingEnhancerStats(values: Map<string, number>): OmnidirectionalTrackingEnhancerStats | undefined {
  const trackingBonusPercent = values.get("trackingSpeedBonus");
  const optimalBonusPercent = values.get("maxRangeBonus");
  const falloffBonusPercent = values.get("falloffBonus");
  if (trackingBonusPercent === undefined || optimalBonusPercent === undefined || falloffBonusPercent === undefined) return undefined;
  return { trackingBonusPercent, optimalBonusPercent, falloffBonusPercent };
}

async function main() {
  const types = await loadMerged<SdeType>("types.");
  const typedogmas = await loadMerged<SdeTypeDogma>("typedogma.");
  const attributes = await loadMerged<SdeDogmaAttribute>("dogmaattributes.");
  const dogmaEffects = await loadMerged<SdeDogmaEffect>("dogmaeffects.");
  const groups = await loadMerged<SdeGroup>("groups.");
  const requiredSkills = await loadMerged<Record<string, number>>("requiredskillsfortypes.");
  const attributeNames = buildAttributeNameMap(attributes);
  const shipGroupIds = new Set(Object.values(groups).filter((group) => group.categoryID === SHIP_CATEGORY_ID).map((group) => group.groupID));

  const fittingModules: Record<string, Row<FittingModuleStats>> = {};
  const turrets: Record<string, Row<TurretStats>> = {};
  const charges: Record<string, Row<ChargeStats>> = {};
  const launchers: Record<string, Row<LauncherStats>> = {};
  const missiles: Record<string, Row<MissileStats>> = {};
  const scripts: Record<string, Row<TurretScriptStats>> = {};
  const stasisWebs: Record<string, Row<StasisWebStats>> = {};
  const stasisGrapplers: Record<string, Row<StasisGrapplerStats>> = {};
  const trackingComputers: Record<string, Row<TrackingComputerStats>> = {};
  const trackingDisruptors: Record<string, Row<TrackingDisruptorStats>> = {};
  const warpScramblers: Record<string, Row<WarpScramblerStats>> = {};
  const disruptionScripts: Record<string, Row<DisruptionScriptStats>> = {};
  const targetPainters: Record<string, Row<TargetPainterStats>> = {};
  const missileGuidanceComputers: Record<string, Row<MissileGuidanceComputerStats>> = {};
  const missileGuidanceEnhancers: Record<string, Row<MissileGuidanceEnhancerStats>> = {};
  const missileScripts: Record<string, Row<MissileScriptStats>> = {};
  const omnidirectionalTrackingLinks: Record<string, Row<OmnidirectionalTrackingLinkStats>> = {};
  const omnidirectionalTrackingEnhancers: Record<string, Row<OmnidirectionalTrackingEnhancerStats>> = {};
  const sensorDampeners: Record<string, Row<SensorDampenerStats>> = {};
  const sensorBoosters: Record<string, Row<SensorBoosterStats>> = {};
  const signalAmplifiers: Record<string, Row<SignalAmplifierStats>> = {};
  const sensorBoosterScripts: Record<string, Row<SensorBoosterScriptStats>> = {};
  const sensorDampenerScripts: Record<string, Row<SensorDampenerScriptStats>> = {};
  const hullBonuses: Record<ShipId, readonly HullBonus[]> = {};
  const drones: Record<string, DroneEntry> = {};
  const combatDrones: Record<string, Row<DroneStats>> = {};
  const itemNames: Record<string, LocalizedName> = {};
  const idToType = new Map<string, SdeType>();
  const shipNameToId = buildShipNameToId();

  for (const type of Object.values(types)) {
    const id = String(type.typeID) as TypeId;
    idToType.set(id, type);
    if (!type.published) continue;
    const typeDogma = typedogmas[String(type.typeID)];
    const values = buildAttributeValues(attributeNames, typeDogma);
    const enName = type["typeName_en-us"];

    if (shipGroupIds.has(type.groupID)) {
      const attributeValueMap = buildAttributeValueMap(typeDogma);
      const bonuses = buildHullBonuses(attributeNames, attributeValueMap, typeDogma, dogmaEffects);
      const shipId = resolveShipId(enName, type, shipNameToId);
      if (bonuses.length > 0) hullBonuses[shipId] = bonuses;
      continue;
    }

    if (TURRET_GROUPS.has(type.groupID)) {
      const tracking = values.get("trackingSpeed");
      const optimal = values.get("maxRange");
      const speed = values.get("speed");
      const damageMultiplier = values.get("damageMultiplier");
      if (tracking !== undefined && optimal !== undefined && speed !== undefined && damageMultiplier !== undefined) {
        turrets[id] = {
          id,
          name: enName,
          tracking,
          optimal,
          falloff: values.get("falloff") ?? 0,
          chargeSize: values.get("chargeSize") ?? 1,
          damageMultiplier,
          cycleTime: speed / 1000,
          turretSkill: turretSkillFromRequired(types, requiredSkills, type.typeID),
          specializationSkill: specializationSkillFromRequired(types, requiredSkills, type.typeID),
          requiredSkillIds: buildRequiredSkillIds(requiredSkills, type.typeID),
          groupID: type.groupID,
          metaLevel: type.metaLevel ?? 0,
          metaGroupID: type.metaGroupID ?? 1,
        };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (CHARGE_GROUPS.has(type.groupID)) {
      const trackingMultiplier = values.get("trackingSpeedMultiplier");
      const rangeMultiplier = values.get("weaponRangeMultiplier");
      const falloffMultiplier = values.get("fallofMultiplier");
      const emDamage = values.get("emDamage");
      const thermalDamage = values.get("thermalDamage");
      const kineticDamage = values.get("kineticDamage");
      const explosiveDamage = values.get("explosiveDamage");
      const hasRangeMods = trackingMultiplier !== undefined || rangeMultiplier !== undefined || falloffMultiplier !== undefined;
      const hasDamage = (emDamage ?? 0) + (thermalDamage ?? 0) + (kineticDamage ?? 0) + (explosiveDamage ?? 0) > 0;
      if (hasRangeMods || hasDamage) {
        charges[id] = { id, name: enName, trackingMultiplier, rangeMultiplier, falloffMultiplier, emDamage, thermalDamage, kineticDamage, explosiveDamage };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (LAUNCHER_GROUPS.has(type.groupID)) {
      const stats = buildLauncherStats(values, type.groupID, type, buildRequiredSkillIds(requiredSkills, type.typeID));
      if (stats) {
        launchers[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (MISSILE_CHARGE_GROUPS.has(type.groupID)) {
      const stats = buildMissileStats(values, type.groupID, buildRequiredSkillIds(requiredSkills, type.typeID));
      if (stats) {
        missiles[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (SCRIPT_GROUPS.has(type.groupID)) {
      const tracking = values.get("trackingSpeedBonusBonus");
      const optimal = values.get("maxRangeBonusBonus");
      const falloff = values.get("falloffBonusBonus");
      if (tracking !== undefined || optimal !== undefined || falloff !== undefined) {
        scripts[id] = {
          id,
          name: enName,
          trackingMultiplier: 1 + (tracking ?? 0) / 100,
          optimalMultiplier: 1 + (optimal ?? 0) / 100,
          falloffMultiplier: 1 + (falloff ?? 0) / 100,
        };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (EWAR_SCRIPT_GROUPS.has(type.groupID)) {
      const stats = buildDisruptionScriptStats(values);
      if (stats) {
        disruptionScripts[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (groups[String(type.groupID)]?.categoryID === DRONE_CATEGORY_ID) {
      drones[id] = { id, name: enName };
      if (type.groupID === COMBAT_DRONE_GROUP) {
        const stats = buildDroneStats(values, type);
        if (stats) combatDrones[id] = { ...stats, id, name: enName };
      }
      addItemName(itemNames, id, type);
      continue;
    }

    if (type.groupID === STASIS_WEB_GROUP) {
      const stats = buildStasisWebStats(values);
      if (stats) {
        stasisWebs[id] = { ...stats, id, name: enName };
        fittingModules[id] = { stasisWeb: stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === STASIS_GRAPPLER_GROUP) {
      const stats = buildStasisGrapplerStats(values);
      if (stats) {
        stasisGrapplers[id] = { ...stats, id, name: enName };
        fittingModules[id] = { stasisGrappler: stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === WEAPON_DISRUPTOR_GROUP) {
      const stats = buildTrackingDisruptorStats(values);
      if (stats) {
        trackingDisruptors[id] = { ...stats, id, name: enName };
        fittingModules[id] = { trackingDisruptor: stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === TRACKING_COMPUTER_GROUP) {
      const stats = buildTrackingComputerStats(values);
      if (stats) {
        trackingComputers[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === WARP_SCRAMBLER_GROUP) {
      const stats = buildWarpScramblerStats(values);
      if (stats) {
        warpScramblers[id] = { ...stats, id, name: enName };
        fittingModules[id] = { warpScrambler: stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === TARGET_PAINTER_GROUP) {
      const stats = buildTargetPainterStats(values);
      if (stats) {
        targetPainters[id] = { ...stats, id, name: enName };
        fittingModules[id] = { targetPainter: stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === MISSILE_GUIDANCE_COMPUTER_GROUP) {
      const stats = buildMissileGuidanceComputerStats(values);
      if (stats) {
        missileGuidanceComputers[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === MISSILE_GUIDANCE_ENHANCER_GROUP) {
      const stats = buildMissileGuidanceEnhancerStats(values);
      if (stats) {
        missileGuidanceEnhancers[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === MISSILE_SCRIPT_GROUP) {
      const stats = buildMissileScriptStats(values);
      if (stats) {
        missileScripts[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === OMNIDIRECTIONAL_TRACKING_LINK_GROUP) {
      const stats = buildOmnidirectionalTrackingLinkStats(values);
      if (stats) {
        omnidirectionalTrackingLinks[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === OMNIDIRECTIONAL_TRACKING_ENHANCER_GROUP) {
      const stats = buildOmnidirectionalTrackingEnhancerStats(values);
      if (stats) {
        omnidirectionalTrackingEnhancers[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === SENSOR_DAMPENER_GROUP) {
      const stats = buildSensorDampenerStats(values);
      if (stats) {
        sensorDampeners[id] = { ...stats, id, name: enName };
        fittingModules[id] = { sensorDampener: stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === SENSOR_BOOSTER_GROUP) {
      const stats = buildSensorBoosterStats(values);
      if (stats) {
        sensorBoosters[id] = { ...stats, id, name: enName };
        fittingModules[id] = { sensorBooster: stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === SIGNAL_AMPLIFIER_GROUP) {
      const stats = buildSignalAmplifierStats(values);
      if (stats) {
        signalAmplifiers[id] = { ...stats, id, name: enName };
        fittingModules[id] = { signalAmplifier: stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === SENSOR_BOOSTER_SCRIPT_GROUP) {
      const stats = buildSensorBoosterScriptStats(values);
      if (stats) {
        sensorBoosterScripts[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (type.groupID === SENSOR_DAMPENER_SCRIPT_GROUP) {
      const stats = buildSensorDampenerScriptStats(values);
      if (stats) {
        sensorDampenerScripts[id] = { ...stats, id, name: enName };
        addItemName(itemNames, id, type);
      }
      continue;
    }

    if (MODULE_GROUPS.has(type.groupID)) {
      const effects = buildEffectSet(typeDogma);
      if (type.groupID === 46) {
        fittingModules[id] = { ...buildPropulsionStats(values, type), id, name: enName };
        addItemName(itemNames, id, type);
      } else {
        const stats = buildModuleStats(values, effects);
        const defense = buildDefenseStats(values, effects, type.groupID);
        if (stats || defense) {
          fittingModules[id] = { ...stats, defense, id, name: enName };
          addItemName(itemNames, id, type);
        }
      }
    }
  }

  const sortedDrones = Object.fromEntries(
    Object.entries(drones).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([id, entry]) => [id, entry]),
  );
  const sortedCombatDrones = Object.fromEntries(
    Object.entries(combatDrones).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([id, entry]) => [id, entry]),
  );

  const skillBonuses = buildSkillBonuses(attributeNames, typedogmas, types, groups, dogmaEffects);

  const date = new Date().toISOString().split("T")[0];
  const header =
    `// Generated from EVE Online SDE via Pyfa staticdata (${date}). Do not edit by hand.\n` +
    `/* eslint-disable */\n\n` +
    `import type { ShipId, TypeId } from "../ids";\n` +
    `import type { HullTier } from "../../ships";\n` +
    `import type { DamageResists } from "../../sim";\n\n`;
  const typeDefinitions = `export interface FittingPropulsionStats {
  readonly kind: "afterburner" | "microwarpdrive";
  readonly sizeTier: HullTier;
  readonly thrust: number;
  readonly speedBonus: number;
  readonly massAddition: number;
  readonly sigBloom: number;
}

export type DefenseLayer = "shield" | "armor" | "hull";

export interface DefenseRepairerOverload {
  readonly amountMultiplier: number;
  readonly cycleTimeMultiplier: number;
}

export interface DefenseAncillary {
  readonly chargeMultiplier: number;
  readonly shots: number;
  readonly reloadTime: number;
}

export interface DefenseModuleStats {
  readonly kind: "damageControl" | "rah" | "repairer" | "boostAmplifier" | "resistModule" | "shieldExtender" | "armorPlate" | "rechargeModule" | "hullBulkhead";
  readonly layer?: DefenseLayer;
  readonly active?: boolean;
  readonly resistBonus?: DamageResists;
  readonly overloadBonusMultiplier?: number;
  readonly shieldResists?: DamageResists;
  readonly armorResists?: DamageResists;
  readonly hullResists?: DamageResists;
  readonly baseArmorResists?: DamageResists;
  readonly resistanceShiftAmount?: number;
  readonly amount?: number;
  readonly cycleTime?: number;
  readonly capacitorNeed?: number;
  readonly heatDamage?: number;
  readonly overload?: DefenseRepairerOverload;
  readonly overloadCycleTimeMultiplier?: number;
  readonly ancillary?: DefenseAncillary;
  readonly multiplier?: number;
  readonly shieldHpAdd?: number;
  readonly armorHpAdd?: number;
  readonly hullHpPercent?: number;
  readonly sigRadiusPenalty?: number;
  readonly rechargeMultiplier?: number;
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
  readonly turretTrackingPercent?: number;
  readonly turretOptimalPercent?: number;
  readonly turretFalloffPercent?: number;
  readonly turretDamageMultiplier?: number;
  readonly turretSpeedMultiplier?: number;
  readonly turretWeaponGroup?: TurretWeaponGroup;
  readonly propulsion?: FittingPropulsionStats;
  readonly stasisWeb?: Omit<StasisWebStats, "id" | "name">;
  readonly stasisGrappler?: Omit<StasisGrapplerStats, "id" | "name">;
  readonly trackingDisruptor?: Omit<TrackingDisruptorStats, "id" | "name">;
  readonly warpScrambler?: Omit<WarpScramblerStats, "id" | "name">;
  readonly targetPainter?: Omit<TargetPainterStats, "id" | "name">;
  readonly sensorDampener?: Omit<SensorDampenerStats, "id" | "name">;
  readonly sensorBooster?: Omit<SensorBoosterStats, "id" | "name">;
  readonly signalAmplifier?: Omit<SignalAmplifierStats, "id" | "name">;
  readonly missileDamageMultiplier?: number;
  readonly missileCycleTimeMultiplier?: number;
  readonly droneDamageBonus?: number;
  readonly droneControlRangeBonus?: number;
  readonly defense?: DefenseModuleStats;
  readonly id: TypeId;
  readonly name: string;
}

export type TurretWeaponGroup = "Energy Weapon" | "Hybrid Weapon" | "Projectile Weapon";

export interface TurretStats {
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly chargeSize: number;
  readonly damageMultiplier: number;
  readonly cycleTime: number;
  readonly turretSkill?: string;
  readonly specializationSkill?: string;
  readonly requiredSkillIds: readonly TypeId[];
  readonly groupID: number;
  readonly metaLevel: number;
  readonly metaGroupID: number;
  readonly id: TypeId;
  readonly name: string;
}

export type HullBonusAttribute = "turretTracking" | "turretOptimal" | "turretFalloff" | "maxVelocity" | "agility" | "missileDamage" | "missileRoF" | "missileVelocity" | "missileFlightTime" | "missileExplosionRadius" | "missileExplosionVelocity" | "turretDamage" | "turretRoF" | "droneDamage" | "armorResist" | "shieldResist" | "shieldHpPercent" | "armorHpPercent" | "hullHpPercent" | "plateHpPercent" | "extenderHpPercent";

export interface HullBonus {
  readonly attribute: HullBonusAttribute;
  readonly magnitude: number;
  readonly scalesWithHullSkill: boolean;
  readonly chargeSkillId?: TypeId;
  readonly moduleSkillId?: TypeId;
  readonly moduleGroupId?: number;
}

export type SkillBonusType = "turretDamage" | "turretRoF" | "turretTracking" | "turretOptimal" | "turretFalloff" | "missileDamage" | "missileRoF" | "missileVelocity" | "missileFlightTime" | "missileExplosionRadius" | "missileExplosionVelocity";

export interface SkillBonus {
  readonly skillId: TypeId;
  readonly bonusType: SkillBonusType;
  readonly magnitudePerLevel: number;
  readonly requiredSkillId?: TypeId;
  readonly moduleGroupId?: number;
  readonly appliesTo: "module" | "charge";
}

export interface ChargeStats {
  readonly trackingMultiplier?: number;
  readonly rangeMultiplier?: number;
  readonly falloffMultiplier?: number;
  readonly emDamage?: number;
  readonly thermalDamage?: number;
  readonly kineticDamage?: number;
  readonly explosiveDamage?: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface LauncherStats {
  readonly rateOfFire: number;
  readonly launcherGroup: number;
  readonly chargeGroups: readonly number[];
  readonly requiredSkillIds: readonly TypeId[];
  readonly metaLevel: number;
  readonly metaGroupID: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface MissileStats {
  readonly damage: number;
  readonly damageType: "em" | "thermal" | "kinetic" | "explosive";
  readonly explosionRadius: number;
  readonly explosionVelocity: number;
  readonly damageReductionFactor: number;
  readonly maxVelocity: number;
  readonly flightTime: number;
  readonly launcherGroup: number;
  readonly chargeGroup: number;
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface TurretScriptStats {
  readonly trackingMultiplier: number;
  readonly optimalMultiplier: number;
  readonly falloffMultiplier: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface StasisWebStats {
  readonly maxRange: number;
  readonly speedFactorPercent: number;
  readonly overloadRangeBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface StasisGrapplerStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly speedFactorPercent: number;
  readonly overloadOptimalBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface TrackingDisruptorStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly disruptionPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface DisruptionScriptStats {
  readonly trackingDeltaBonus: number;
  readonly rangeDeltaBonus: number;
  readonly falloffDeltaBonus: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface WarpScramblerStats {
  readonly maxRange: number;
  readonly overloadRangeBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface TrackingComputerStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface TargetPainterStats {
  readonly maxRange: number;
  readonly falloff: number;
  readonly signatureRadiusBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface MissileGuidanceComputerStats {
  readonly explosionRadiusBonusPercent: number;
  readonly explosionVelocityBonusPercent: number;
  readonly missileVelocityBonusPercent: number;
  readonly flightTimeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface MissileGuidanceEnhancerStats {
  readonly explosionRadiusBonusPercent: number;
  readonly explosionVelocityBonusPercent: number;
  readonly missileVelocityBonusPercent: number;
  readonly flightTimeBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface MissileScriptStats {
  readonly explosionRadiusMultiplier: number;
  readonly explosionVelocityMultiplier: number;
  readonly missileVelocityMultiplier: number;
  readonly flightTimeMultiplier: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface OmnidirectionalTrackingLinkStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface OmnidirectionalTrackingEnhancerStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface SensorDampenerStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly scanResolutionBonusPercent: number;
  readonly maxTargetRangeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface SensorBoosterStats {
  readonly scanResolutionBonusPercent: number;
  readonly maxTargetRangeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface SignalAmplifierStats {
  readonly scanResolutionBonusPercent: number;
  readonly maxTargetRangeBonusPercent: number;
  readonly maxLockedTargetsBonus: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface SensorBoosterScriptStats {
  readonly scanResolutionMultiplier: number;
  readonly maxTargetRangeMultiplier: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface SensorDampenerScriptStats {
  readonly scanResolutionMultiplier: number;
  readonly maxTargetRangeMultiplier: number;
  readonly id: TypeId;
  readonly name: string;
}

export type DroneSizeClass = "light" | "medium" | "heavy" | "sentry";

export interface DroneStats {
  readonly sizeClass: DroneSizeClass;
  readonly damageMultiplier: number;
  readonly emDamage: number;
  readonly thermalDamage: number;
  readonly kineticDamage: number;
  readonly explosiveDamage: number;
  readonly tracking: number;
  readonly sigResolution: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly maxVelocity: number;
  readonly orbitSpeed: number;
  readonly orbitRange: number;
  readonly cycleTime: number;
  readonly bandwidth: number;
  readonly volume: number;
  readonly metaLevel: number;
  readonly metaGroupID: number;
  readonly id: TypeId;
  readonly name: string;
}

`;

  const scriptDefinitions = `export const SCRIPTS: Readonly<Record<string, TurretScriptStats>> = ${stringifyWithTypeIds(scripts)};

export const STASIS_WEBS: Readonly<Record<string, StasisWebStats>> = ${stringifyWithTypeIds(stasisWebs)};

export const STASIS_GRAPPLERS: Readonly<Record<string, StasisGrapplerStats>> = ${stringifyWithTypeIds(stasisGrapplers)};

export const TRACKING_COMPUTERS: Readonly<Record<string, TrackingComputerStats>> = ${stringifyWithTypeIds(trackingComputers)};

export const TRACKING_DISRUPTORS: Readonly<Record<string, TrackingDisruptorStats>> = ${stringifyWithTypeIds(trackingDisruptors)};

export const WARP_SCRAMBLERS: Readonly<Record<string, WarpScramblerStats>> = ${stringifyWithTypeIds(warpScramblers)};

export const DISRUPTION_SCRIPTS: Readonly<Record<string, DisruptionScriptStats>> = ${stringifyWithTypeIds(disruptionScripts)};

export const TARGET_PAINTERS: Readonly<Record<string, TargetPainterStats>> = ${stringifyWithTypeIds(targetPainters)};

export const MISSILE_GUIDANCE_COMPUTERS: Readonly<Record<string, MissileGuidanceComputerStats>> = ${stringifyWithTypeIds(missileGuidanceComputers)};

export const MISSILE_GUIDANCE_ENHANCERS: Readonly<Record<string, MissileGuidanceEnhancerStats>> = ${stringifyWithTypeIds(missileGuidanceEnhancers)};

export const MISSILE_SCRIPTS: Readonly<Record<string, MissileScriptStats>> = ${stringifyWithTypeIds(missileScripts)};

export const OMNIDIRECTIONAL_TRACKING_LINKS: Readonly<Record<string, OmnidirectionalTrackingLinkStats>> = ${stringifyWithTypeIds(omnidirectionalTrackingLinks)};

export const OMNIDIRECTIONAL_TRACKING_ENHANCERS: Readonly<Record<string, OmnidirectionalTrackingEnhancerStats>> = ${stringifyWithTypeIds(omnidirectionalTrackingEnhancers)};

export const SENSOR_DAMPENERS: Readonly<Record<string, SensorDampenerStats>> = ${stringifyWithTypeIds(sensorDampeners)};

export const SENSOR_BOOSTERS: Readonly<Record<string, SensorBoosterStats>> = ${stringifyWithTypeIds(sensorBoosters)};

export const SIGNAL_AMPLIFIERS: Readonly<Record<string, SignalAmplifierStats>> = ${stringifyWithTypeIds(signalAmplifiers)};

export const SENSOR_BOOSTER_SCRIPTS: Readonly<Record<string, SensorBoosterScriptStats>> = ${stringifyWithTypeIds(sensorBoosterScripts)};

export const SENSOR_DAMPENER_SCRIPTS: Readonly<Record<string, SensorDampenerScriptStats>> = ${stringifyWithTypeIds(sensorDampenerScripts)};

`;

  const lines: string[] = [
    header,
    typeDefinitions,
    scriptDefinitions,
    `export const FITTING_MODULES: Readonly<Record<string, FittingModuleStats>> = ${stringifyWithTypeIds(fittingModules)};`,
    ``,
    `export const TURRETS: Readonly<Record<string, TurretStats>> = ${stringifyWithTypeIds(turrets)};`,
    ``,
    `export const CHARGES: Readonly<Record<string, ChargeStats>> = ${stringifyWithTypeIds(charges)};`,
    ``,
    `export const LAUNCHERS: Readonly<Record<string, LauncherStats>> = ${stringifyWithTypeIds(launchers)};`,
    ``,
    `export const MISSILES: Readonly<Record<string, MissileStats>> = ${stringifyWithTypeIds(missiles)};`,
    ``,
    `export const HULL_BONUSES: Readonly<Record<ShipId, readonly HullBonus[]>> = ${stringifyHullBonuses(hullBonuses)};`,
    ``,
    `export const SKILL_BONUSES: readonly SkillBonus[] = ${stringifySkillBonuses(skillBonuses)};`,
    ``,
    `export const DRONES: Readonly<Record<string, { readonly id: TypeId; readonly name: string }>> = ${stringifyWithTypeIds(sortedDrones)};`,
    ``,
    `export const COMBAT_DRONES: Readonly<Record<string, DroneStats>> = ${stringifyWithTypeIds(sortedCombatDrones)};`,
    ``,
  ];

  addInScopeItemNames(itemNames, types, groups, IN_SCOPE_CATEGORY_IDS);
  addSkillNames(itemNames, types, skillBonuses);

  const dbTableNames = collectDbTableNames(
    fittingModules,
    turrets,
    charges,
    launchers,
    missiles,
    scripts,
    stasisWebs,
    stasisGrapplers,
    trackingComputers,
    trackingDisruptors,
    warpScramblers,
    disruptionScripts,
    targetPainters,
    missileGuidanceComputers,
    missileGuidanceEnhancers,
    missileScripts,
    omnidirectionalTrackingLinks,
    omnidirectionalTrackingEnhancers,
    sensorDampeners,
    sensorBoosters,
    signalAmplifiers,
    sensorBoosterScripts,
    sensorDampenerScripts,
    drones,
    combatDrones,
    skillBonuses,
  );
  const filteredItemNames = filterItemNames(itemNames, idToType, groups, dbTableNames);

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, lines.join("\n"));
  await writeI18nFiles(filteredItemNames, date);
  const counts = [
    `${Object.keys(fittingModules).length} modules`,
    `${Object.keys(turrets).length} turrets`,
    `${Object.keys(charges).length} charges`,
    `${Object.keys(launchers).length} launchers`,
    `${Object.keys(missiles).length} missiles`,
    `${Object.keys(scripts).length} turret scripts`,
    `${Object.keys(stasisWebs).length} stasis webs`,
    `${Object.keys(stasisGrapplers).length} stasis grapplers`,
    `${Object.keys(trackingComputers).length} tracking computers`,
    `${Object.keys(trackingDisruptors).length} tracking disruptors`,
    `${Object.keys(warpScramblers).length} warp scramblers`,
    `${Object.keys(disruptionScripts).length} disruption scripts`,
    `${Object.keys(targetPainters).length} target painters`,
    `${Object.keys(missileGuidanceComputers).length} missile guidance computers`,
    `${Object.keys(missileGuidanceEnhancers).length} missile guidance enhancers`,
    `${Object.keys(missileScripts).length} missile scripts`,
    `${Object.keys(omnidirectionalTrackingLinks).length} omnidirectional tracking links`,
    `${Object.keys(omnidirectionalTrackingEnhancers).length} omnidirectional tracking enhancers`,
    `${Object.keys(sensorDampeners).length} sensor dampeners`,
    `${Object.keys(sensorBoosters).length} sensor boosters`,
    `${Object.keys(signalAmplifiers).length} signal amplifiers`,
    `${Object.keys(sensorBoosterScripts).length} sensor booster scripts`,
    `${Object.keys(sensorDampenerScripts).length} sensor dampener scripts`,
    `${Object.keys(hullBonuses).length} hull bonus sets`,
    `${Object.keys(sortedDrones).length} drones`,
    `${Object.keys(sortedCombatDrones).length} combat drones`,
  ];
  console.log(`Wrote ${counts.join(", ")} to ${OUT_FILE}`);
  console.log(`Wrote ${Object.keys(filteredItemNames).length} item names to ${I18N_EN_FILE}, ${I18N_ZH_FILE}, ${I18N_JA_FILE}`);
}

function addItemName(
  itemNames: Record<string, LocalizedName>,
  id: string,
  type: SdeType,
): void {
  const en = type["typeName_en-us"];
  itemNames[id] = {
    en,
    zh: type.typeName_zh?.trim() || en,
    ja: type.typeName_ja?.trim() || en,
  };
}

function addInScopeItemNames(
  itemNames: Record<string, LocalizedName>,
  types: Readonly<Record<string, SdeType>>,
  groups: Readonly<Record<string, SdeGroup>>,
  inScopeCategoryIds: ReadonlySet<number>,
): void {
  const inScopeGroupIds = new Set<string>();
  for (const [gid, group] of Object.entries(groups)) {
    if (inScopeCategoryIds.has(group.categoryID)) inScopeGroupIds.add(gid);
  }
  for (const [id, type] of Object.entries(types)) {
    if (!inScopeGroupIds.has(String(type.groupID))) continue;
    if (id in itemNames) continue;
    addItemName(itemNames, id, type);
  }
}

function relevantSkillIds(skillBonuses: readonly RawSkillBonus[]): readonly string[] {
  const ids = new Set<string>();
  for (const bonus of skillBonuses) {
    ids.add(String(bonus.skillId));
    if (bonus.requiredSkillId !== undefined) ids.add(String(bonus.requiredSkillId));
  }
  for (const id of DRONE_SKILL_IDS) ids.add(id);
  return [...ids];
}

// Localized names for skill IDs that are not present in the SDE types table.
// These skills were introduced in expansions after the SDE snapshot used by this script.
// When the SDE is updated and these IDs appear in types.0.json, this fallback becomes
// a no-op because addSkillNames checks the SDE first.
const SKILL_NAME_FALLBACKS: Readonly<Record<string, LocalizedName>> = {
  "24241": { en: "Light Drone Operation", zh: "轻型无人机操控理论", ja: "ライトドローンオペレーション" },
  "33699": { en: "Medium Drone Operation", zh: "中型无人机操控理论", ja: "ミディアムドローンオペレーション" },
  "23594": { en: "Sentry Drone Interfacing", zh: "岗哨无人机操控理论", ja: "セントリードローンインターフェイス" },
};

function addSkillNames(itemNames: Record<string, LocalizedName>, types: Readonly<Record<string, SdeType>>, skillBonuses: readonly RawSkillBonus[]): void {
  for (const id of relevantSkillIds(skillBonuses)) {
    if (id in itemNames) continue;
    const type = types[id];
    if (type) { addItemName(itemNames, id, type); continue; }
    const fallback = SKILL_NAME_FALLBACKS[id];
    if (fallback) itemNames[id] = fallback;
  }
}

function collectDbTableNames(
  fittingModules: Record<string, FittingModuleStats>,
  turrets: Record<string, TurretStats>,
  charges: Record<string, ChargeStats>,
  launchers: Record<string, LauncherStats>,
  missiles: Record<string, MissileStats>,
  scripts: Record<string, TurretScriptStats>,
  stasisWebs: Record<string, StasisWebStats>,
  stasisGrapplers: Record<string, StasisGrapplerStats>,
  trackingComputers: Record<string, TrackingComputerStats>,
  trackingDisruptors: Record<string, TrackingDisruptorStats>,
  warpScramblers: Record<string, WarpScramblerStats>,
  disruptionScripts: Record<string, DisruptionScriptStats>,
  targetPainters: Record<string, TargetPainterStats>,
  missileGuidanceComputers: Record<string, MissileGuidanceComputerStats>,
  missileGuidanceEnhancers: Record<string, MissileGuidanceEnhancerStats>,
  missileScripts: Record<string, MissileScriptStats>,
  omnidirectionalTrackingLinks: Record<string, Row<OmnidirectionalTrackingLinkStats>>,
  omnidirectionalTrackingEnhancers: Record<string, Row<OmnidirectionalTrackingEnhancerStats>>,
  sensorDampeners: Record<string, Row<SensorDampenerStats>>,
  sensorBoosters: Record<string, Row<SensorBoosterStats>>,
  signalAmplifiers: Record<string, Row<SignalAmplifierStats>>,
  sensorBoosterScripts: Record<string, Row<SensorBoosterScriptStats>>,
  sensorDampenerScripts: Record<string, Row<SensorDampenerScriptStats>>,
  drones: Record<string, DroneEntry>,
  combatDrones: Record<string, Row<DroneStats>>,
  skillBonuses: readonly RawSkillBonus[],
): Set<string> {
  return new Set([
    ...Object.keys(fittingModules),
    ...Object.keys(turrets),
    ...Object.keys(charges),
    ...Object.keys(launchers),
    ...Object.keys(missiles),
    ...Object.keys(scripts),
    ...Object.keys(stasisWebs),
    ...Object.keys(stasisGrapplers),
    ...Object.keys(trackingComputers),
    ...Object.keys(trackingDisruptors),
    ...Object.keys(warpScramblers),
    ...Object.keys(disruptionScripts),
    ...Object.keys(targetPainters),
    ...Object.keys(missileGuidanceComputers),
    ...Object.keys(missileGuidanceEnhancers),
    ...Object.keys(missileScripts),
    ...Object.keys(omnidirectionalTrackingLinks),
    ...Object.keys(omnidirectionalTrackingEnhancers),
    ...Object.keys(sensorDampeners),
    ...Object.keys(sensorBoosters),
    ...Object.keys(signalAmplifiers),
    ...Object.keys(sensorBoosterScripts),
    ...Object.keys(sensorDampenerScripts),
    ...Object.keys(drones),
    ...Object.keys(combatDrones),
    ...relevantSkillIds(skillBonuses),
  ]);
}

function isInScopeItem(type: SdeType | undefined, groups: Record<string, SdeGroup>): boolean {
  if (!type) return false;
  const group = groups[String(type.groupID)];
  if (!group) return false;
  return IN_SCOPE_CATEGORY_IDS.has(group.categoryID);
}

function filterItemNames(
  itemNames: Record<string, LocalizedName>,
  idToType: ReadonlyMap<string, SdeType>,
  groups: Record<string, SdeGroup>,
  dbTableNames: ReadonlySet<string>,
): Record<string, LocalizedName> {
  const filtered: Record<string, LocalizedName> = {};
  for (const [id, localizations] of Object.entries(itemNames)) {
    if (dbTableNames.has(id) || isInScopeItem(idToType.get(id), groups)) {
      filtered[id] = localizations;
    }
  }
  return filtered;
}

const CANONICAL_OVERRIDES: Record<ShipNameLanguage, Record<string, string>> = {
  en: {},
  zh: {
    "莱塞勒氏改良型爆炸装甲增强器": "Raysere's Modified Explosive Armor Hardener",
  },
  ja: {
    "ドミネーション炭化鉛弾XL": "Domination Carbonized Lead XL",
    "デュアルアフォーカルパルスレーザーI": "Dual Afocal Pulse Laser I",
    "大型エクスプローシブ・アーマーレインフォーサーII": "Large Explosive Armor Reinforcer II",
    "大型キネティック・アーマーレインフォーサーI": "Large Kinetic Armor Reinforcer I",
    "中型重力子スマートボムII": "Medium Graviton Smartbomb II",
    "共和国海軍仕様炭化鉛弾S": "Republic Fleet Carbonized Lead S",
    "トゥルーサンシャEMコーティング": "True Sansha EM Coating",
  },
};

interface CollisionTables {
  readonly en: Record<string, string>;
  readonly zh: Record<string, string>;
  readonly ja: Record<string, string>;
}

function buildCollisionTables(
  itemNames: Record<string, LocalizedName>,
  canonicalOverrides: Record<ShipNameLanguage, Record<string, string>> = CANONICAL_OVERRIDES,
): CollisionTables {
  const groups: Record<ShipNameLanguage, Map<string, string[]>> = {
    en: new Map(),
    zh: new Map(),
    ja: new Map(),
  };
  const languages: readonly ShipNameLanguage[] = ["en", "zh", "ja"];
  for (const [id, names] of Object.entries(itemNames)) {
    for (const language of languages) {
      const name = (language === "en" ? names.en : names[language]?.trim() || names.en).trim();
      if (name.length === 0) continue;
      const list = groups[language].get(name) ?? [];
      list.push(id);
      groups[language].set(name, list);
    }
  }

  const collisions: Record<ShipNameLanguage, Record<string, string>> = { en: {}, zh: {}, ja: {} };
  for (const language of languages) {
    for (const [name, ids] of groups[language]) {
      if (ids.length < 2) continue;
      const override = canonicalOverrides[language][name];
      let preferred: string;
      if (override) {
        const match = ids.find((id) => itemNames[id].en === override);
        if (!match) throw new Error(`Collision override for ${language} "${name}" maps to unknown English name "${override}"`);
        preferred = match;
      } else {
        preferred = [...ids].sort((a, b) => Number(a) - Number(b))[0];
      }
      collisions[language][name] = preferred;
    }
  }

  for (const language of languages) {
    for (const [name, override] of Object.entries(canonicalOverrides[language])) {
      const ids = groups[language].get(name);
      if (!ids || ids.length < 2) throw new Error(`Collision override for ${language} "${name}" does not match a colliding name`);
      if (!ids.some((id) => itemNames[id].en === override)) throw new Error(`Collision override for ${language} "${name}" maps to unknown English name "${override}"`);
    }
  }

  return collisions;
}

interface WriteI18nOptions {
  readonly enFile?: string;
  readonly zhFile?: string;
  readonly jaFile?: string;
  readonly collisionEnFile?: string;
  readonly collisionZhFile?: string;
  readonly collisionJaFile?: string;
  readonly canonicalOverrides?: Record<ShipNameLanguage, Record<string, string>>;
}

async function writeI18nFiles(
  itemNames: Record<string, LocalizedName>,
  date: string,
  {
    enFile = I18N_EN_FILE,
    zhFile = I18N_ZH_FILE,
    jaFile = I18N_JA_FILE,
    collisionEnFile = COLLISION_EN_FILE,
    collisionZhFile = COLLISION_ZH_FILE,
    collisionJaFile = COLLISION_JA_FILE,
    canonicalOverrides = CANONICAL_OVERRIDES,
  }: WriteI18nOptions = {},
): Promise<void> {
  const sorted = Object.entries(itemNames).sort((a, b) => a[1].en.localeCompare(b[1].en));
  const en: Record<string, string> = {};
  const zh: Record<string, string> = {};
  const ja: Record<string, string> = {};
  for (const [id, names] of sorted) {
    en[id] = names.en;
    zh[id] = names.zh?.trim() || names.en;
    ja[id] = names.ja?.trim() || names.en;
  }
  const header = `// Generated from EVE Online SDE via Pyfa staticdata (${date}). Do not edit by hand.\n/* eslint-disable */\n\n`;
  const recordType = "Readonly<Record<string, string>>";
  const enContent = `${header}export const ITEM_NAMES_EN: ${recordType} = ${JSON.stringify(en)};\n`;
  const zhContent = `${header}export const ITEM_NAMES_ZH: ${recordType} = ${JSON.stringify(zh)};\n`;
  const jaContent = `${header}export const ITEM_NAMES_JA: ${recordType} = ${JSON.stringify(ja)};\n`;

  const collisions = buildCollisionTables(itemNames, canonicalOverrides);
  const collisionEnContent = `${header}export const ITEM_NAME_COLLISIONS_EN: ${recordType} = ${JSON.stringify(collisions.en)};\n`;
  const collisionZhContent = `${header}export const ITEM_NAME_COLLISIONS_ZH: ${recordType} = ${JSON.stringify(collisions.zh)};\n`;
  const collisionJaContent = `${header}export const ITEM_NAME_COLLISIONS_JA: ${recordType} = ${JSON.stringify(collisions.ja)};\n`;

  await mkdir(dirname(enFile), { recursive: true });
  await writeFile(enFile, enContent);
  await mkdir(dirname(zhFile), { recursive: true });
  await writeFile(zhFile, zhContent);
  await mkdir(dirname(jaFile), { recursive: true });
  await writeFile(jaFile, jaContent);
  await mkdir(dirname(collisionEnFile), { recursive: true });
  await writeFile(collisionEnFile, collisionEnContent);
  await mkdir(dirname(collisionZhFile), { recursive: true });
  await writeFile(collisionZhFile, collisionZhContent);
  await mkdir(dirname(collisionJaFile), { recursive: true });
  await writeFile(collisionJaFile, collisionJaContent);
}

export { filterItemNames as _filterItemNames, writeI18nFiles as _writeI18nFiles, buildModuleStats as _buildModuleStats, buildDefenseStats as _buildDefenseStats, buildTargetPainterStats as _buildTargetPainterStats, buildMissileGuidanceComputerStats as _buildMissileGuidanceComputerStats, buildMissileGuidanceEnhancerStats as _buildMissileGuidanceEnhancerStats, buildMissileScriptStats as _buildMissileScriptStats };

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
