import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ShipProfile } from "../src/ships";
import type { SensorStrengths } from "../src/sim";
import type { FactionId, HullTypeId, ShipId } from "../src/gamedata/ids";

type ShipBonusGroup = ShipProfile["bonuses"][number];

interface ShipIdentity {
  readonly name: string;
  readonly faction: string;
  readonly hullType: string;
}

export interface SdeType {
  typeID: number;
  "typeName_en-us": string;
  typeName_zh?: string;
  typeName_ja?: string;
  groupID: number;
  published: number;
  mass: number;
}

export interface SdeGroup {
  groupID: number;
  categoryID: number;
  "groupName_en-us": string;
  groupName_zh?: string;
  groupName_ja?: string;
  published: number;
}

export interface SdeDogmaAttribute {
  attributeID: number;
  name: string;
}

export interface SdeTypeDogma {
  dogmaAttributes: readonly { attributeID: number; value: number }[];
}

const DATA_PATH = "data/ship-profiles.json";
const SDE_DIR = process.argv[2] ?? join(import.meta.dir, "..", "sde");
const OUTPUT_PATH = "src/gamedata/shipProfiles/profiles.ts";
const SHIP_CATEGORY_ID = 6;
const SHIELD_RECHARGE_RATE_MS = 1_000; // SDE stores shieldRechargeRate in milliseconds
// The SDE snapshot carries no per-type maxActiveDrones dogma attribute; 5 is the standard hull limit.
const MAX_ACTIVE_DRONES_FALLBACK = 5;
const EXTRACT_REQUIRED_ATTRIBUTES: readonly string[] = ["hp", "armorHP", "shieldCapacity", "capacitorCapacity", "rechargeRate"];

function hasString(value: Record<string, unknown>, key: string, context: string): string {
  const field = value[key];
  if (typeof field !== "string") throw new Error(`${context}: missing or invalid ${key}`);
  return field;
}

function optionalString(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === "string" && field.length > 0 ? field : undefined;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replaceAll("'", "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadMerged<T>(prefix: string, sdeDir = SDE_DIR): Promise<Record<string, T>> {
  const files = (await readdir(sdeDir))
    .filter((file) => file.startsWith(prefix) && file.endsWith(".json"))
    .sort();
  const all: Record<string, T> = {};
  for (const file of files) {
    const text = await readFile(join(sdeDir, file), "utf8");
    const parsed: Record<string, T> = JSON.parse(text);
    Object.assign(all, parsed);
  }
  return all;
}

interface SdeData {
  readonly types: Record<string, SdeType>;
  readonly groups: Record<string, SdeGroup>;
  readonly typedogmas: Record<string, SdeTypeDogma>;
  readonly attributeNames: Map<number, string>;
}

async function loadSdeData(sdeDir = SDE_DIR): Promise<SdeData> {
  const [types, groups, typedogmas, attributes] = await Promise.all([
    loadMerged<SdeType>("types", sdeDir),
    loadMerged<SdeGroup>("groups", sdeDir),
    loadMerged<SdeTypeDogma>("typedogma", sdeDir),
    loadMerged<SdeDogmaAttribute>("dogmaattributes", sdeDir),
  ]);
  const attributeNames = buildAttributeNameMap(attributes);
  return { types, groups, typedogmas, attributeNames };
}

function buildAttributeNameMap(attributes: Record<string, SdeDogmaAttribute>): Map<number, string> {
  const map = new Map<number, string>();
  for (const attribute of Object.values(attributes)) {
    if (!map.has(attribute.attributeID)) map.set(attribute.attributeID, attribute.name);
  }
  return map;
}

interface CapacitorData {
  readonly capacitorCapacity: number;
  readonly capacitorRechargeTime: number;
}

function extractCapacitorData(typeId: string, typedogmas: Record<string, SdeTypeDogma>, attributeNames: Map<number, string>): CapacitorData {
  const typeDogma = typedogmas[typeId];
  if (!typeDogma) throw new Error(`${typeId}: missing typedogma`);
  const values = buildAttributeValues(attributeNames, typeDogma);
  const capacity = values.get("capacitorCapacity");
  const rechargeRate = values.get("rechargeRate");
  if (capacity === undefined) throw new Error(`${typeId}: missing capacitorCapacity dogma attribute`);
  if (rechargeRate === undefined) throw new Error(`${typeId}: missing rechargeRate dogma attribute`);
  return {
    capacitorCapacity: capacity,
    capacitorRechargeTime: rechargeRate / SHIELD_RECHARGE_RATE_MS,
  };
}

interface SlotData {
  readonly highSlots: number;
  readonly medSlots: number;
  readonly lowSlots: number;
  readonly rigSlots: number;
}

function extractSlotData(typeId: string, typedogmas: Record<string, SdeTypeDogma>, attributeNames: Map<number, string>): SlotData {
  const typeDogma = typedogmas[typeId];
  const values = buildAttributeValues(attributeNames, typeDogma);
  return {
    highSlots: values.get("hiSlots") ?? 0,
    medSlots: values.get("medSlots") ?? 0,
    lowSlots: values.get("lowSlots") ?? 0,
    rigSlots: values.get("rigSlots") ?? 0,
  };
}

interface DefenseData {
  readonly shieldHp: number;
  readonly shieldRechargeTime: number;
  readonly armorHp: number;
  readonly hullHp: number;
  readonly shieldResists: Resists;
  readonly armorResists: Resists;
  readonly hullResists: Resists;
}

function extractDefenseData(typeId: string, typedogmas: Record<string, SdeTypeDogma>, attributeNames: Map<number, string>): DefenseData {
  const typeDogma = typedogmas[typeId];
  if (!typeDogma) throw new Error(`${typeId}: missing typedogma`);
  const values = buildAttributeValues(attributeNames, typeDogma);
  const shieldHp = values.get("shieldCapacity") ?? 0;
  const armorHp = values.get("armorHP") ?? 0;
  const hullHp = values.get("hp") ?? 0;
  const shieldRechargeTime = (values.get("shieldRechargeRate") ?? 0) / SHIELD_RECHARGE_RATE_MS;
  return {
    shieldHp,
    shieldRechargeTime,
    armorHp,
    hullHp,
    shieldResists: resistsFromResonances(values, "shield"),
    armorResists: resistsFromResonances(values, "armor"),
    hullResists: resistsFromResonances(values, ""),
  };
}

function buildAttributeValues(attributeNames: Map<number, string>, typeDogma: SdeTypeDogma | undefined): Map<string, number> {
  const values = new Map<string, number>();
  if (!typeDogma) return values;
  for (const { attributeID, value } of typeDogma.dogmaAttributes) {
    const name = attributeNames.get(attributeID);
    if (name) values.set(name, value);
  }
  return values;
}

type Resists = { readonly em: number; readonly thermal: number; readonly kinetic: number; readonly explosive: number };

function resistsFromResonances(values: Map<string, number>, prefix: string): Resists {
  const emAttr = prefix ? `${prefix}EmDamageResonance` : "emDamageResonance";
  const thermalAttr = prefix ? `${prefix}ThermalDamageResonance` : "thermalDamageResonance";
  const kineticAttr = prefix ? `${prefix}KineticDamageResonance` : "kineticDamageResonance";
  const explosiveAttr = prefix ? `${prefix}ExplosiveDamageResonance` : "explosiveDamageResonance";
  return {
    em: roundResist(1 - (values.get(emAttr) ?? 1)),
    thermal: roundResist(1 - (values.get(thermalAttr) ?? 1)),
    kinetic: roundResist(1 - (values.get(kineticAttr) ?? 1)),
    explosive: roundResist(1 - (values.get(explosiveAttr) ?? 1)),
  };
}

function roundResist(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function buildShipNameToType(
  types: Record<string, SdeType>,
  groups: Record<string, SdeGroup>,
): ReadonlyMap<string, SdeType> {
  const map = new Map<string, SdeType>();
  for (const type of Object.values(types)) {
    const group = groups[String(type.groupID)];
    if (!group || group.categoryID !== SHIP_CATEGORY_ID) continue;
    const name = type["typeName_en-us"];
    if (!name) continue;
    if (map.has(name)) throw new Error(`Duplicate ship name "${name}" in SDE.`);
    map.set(name, type);
  }
  return map;
}

interface ResolvedShip {
  readonly id: ShipId;
  readonly factionId: FactionId;
  readonly hullTypeId: HullTypeId;
  readonly type: SdeType;
}

function resolveShipIds(profile: ShipIdentity, shipNameToType: ReadonlyMap<string, SdeType>): ResolvedShip {
  const ship = shipNameToType.get(profile.name);
  if (!ship) throw new Error(`No SDE ship for "${profile.name}"`);
  return {
    id: String(ship.typeID) as ShipId,
    factionId: slugify(profile.faction) as FactionId,
    hullTypeId: String(ship.groupID) as HullTypeId,
    type: ship,
  };
}

function requiredPositive(values: Map<string, number>, attribute: string, shipName: string): number {
  const value = values.get(attribute);
  if (value === undefined || value <= 0) throw new Error(`${shipName}: SDE attribute "${attribute}" is missing or not positive.`);
  return value;
}

function requiredPositiveMass(mass: number, shipName: string): number {
  if (!(mass > 0)) throw new Error(`${shipName}: SDE type record "mass" is missing or not positive.`);
  return mass;
}

function fallbackMaxActiveDrones(droneCapacity: number, droneBandwidth: number): number {
  return droneCapacity > 0 || droneBandwidth > 0 ? MAX_ACTIVE_DRONES_FALLBACK : 0;
}

// Breaks glued one-line wiki blobs: lower-to-upper word joins ("speedRole"), lower-to-digit joins
// ("speed10%"), paren-glued numbers ("level)20% bonus"), glued bullets ("duration• Can fit"), and
// colon-glued statements ("level):10% bonus").
const GLUED_BREAK_PATTERN = /(?<=[a-z])(?=[A-Z0-9])|(?<=[\)])(?=[0-9])|(?<=[a-z\):])(?=• )|(?<=:)(?=[A-Z0-9])/g;

function parseBonuses(raw: string | undefined): readonly ShipBonusGroup[] {
  if (raw === undefined) return [];
  const drafts: { header: string; lines: string[] }[] = [];
  let current: { header: string; lines: string[] } | undefined;
  for (const line of bonusLines(raw)) {
    if (isBonusHeader(line)) {
      current = { header: bonusHeaderText(line), lines: [] };
      drafts.push(current);
      continue;
    }
    if (current === undefined) {
      current = { header: "", lines: [] };
      drafts.push(current);
    }
    current.lines.push(line);
  }
  return drafts.filter((draft) => draft.lines.length > 0).map((draft) => ({ header: draft.header, lines: [...draft.lines] }));
}

// Wiki text glues bullets to the previous word with a non-breaking space; normalize before splitting.
function bonusLines(raw: string): readonly string[] {
  return raw.replace(/\u00a0/g, " ").split("\n").flatMap((line) => line.split(GLUED_BREAK_PATTERN)).map((line) => line.trim()).filter((line) => line.length > 0);
}

function isBonusHeader(line: string): boolean {
  return line.endsWith(":") || /^• .+ Mode$/i.test(line) || /bonuses( per level)?$/i.test(line) || /bonuses \(per skill level\)$/i.test(line) || /^[A-Z][A-Za-z]+( [A-Z][A-Za-z]+){1,3}$/.test(line);
}

function bonusHeaderText(line: string): string {
  return line.replace(/:$/, "").replace(/^• /, "");
}

function parseProfile(
  raw: unknown,
  index: number,
  shipNameToType: ReadonlyMap<string, SdeType>,
  typedogmas: Record<string, SdeTypeDogma>,
  attributeNames: Map<number, string>,
): ShipProfile {
  if (!raw || typeof raw !== "object") throw new Error(`Entry ${index} is not an object`);
  const record = raw as Record<string, unknown>;

  const name = hasString(record, "name", `Entry ${index}`);
  if (name.length === 0) throw new Error(`Entry ${index} has an empty name`);
  const faction = hasString(record, "faction", name);
  const hullType = hasString(record, "hullType", name);

  const { id, factionId, hullTypeId, type } = resolveShipIds({ name, faction, hullType }, shipNameToType);
  const values = buildAttributeValues(attributeNames, typedogmas[String(id)]);
  const mass = requiredPositiveMass(type.mass, name);
  for (const attribute of EXTRACT_REQUIRED_ATTRIBUTES) requiredPositive(values, attribute, name);
  const inertiaModifier = requiredPositive(values, "agility", name);
  const baseSpeed = requiredPositive(values, "maxVelocity", name);
  const sigRadius = requiredPositive(values, "signatureRadius", name);
  const droneCapacity = values.get("droneCapacity") ?? 0;
  const droneBandwidth = values.get("droneBandwidth") ?? 0;
  const fighterCapacity = values.get("fighterCapacity") ?? 0;
  const fighterTubes = values.get("fighterTubes") ?? 0;
  const fighterLightSlots = values.get("fighterLightSlots") ?? 0;
  const fighterHeavySlots = values.get("fighterHeavySlots") ?? 0;
  const fighterSupportSlots = values.get("fighterSupportSlots") ?? 0;
  const defense = extractDefenseData(String(id), typedogmas, attributeNames);
  const capacitor = extractCapacitorData(String(id), typedogmas, attributeNames);
  const slots = extractSlotData(String(id), typedogmas, attributeNames);
  const bonuses = parseBonuses(optionalString(record, "shipBonuses"));
  const sensorStrengths: SensorStrengths = {
    gravimetric: values.get("scanGravimetricStrength") ?? 0,
    ladar: values.get("scanLadarStrength") ?? 0,
    magnetometric: values.get("scanMagnetometricStrength") ?? 0,
    radar: values.get("scanRadarStrength") ?? 0,
  };

  return {
    id,
    name,
    factionId,
    hullTypeId,
    mass,
    inertiaModifier,
    baseSpeed,
    sigRadius,
    scanResolution: values.get("scanResolution") ?? 0,
    maxTargetingRange: values.get("maxTargetRange") ?? 0,
    maxLockedTargets: values.get("maxLockedTargets") ?? 0,
    sensorStrengths,
    highSlots: slots.highSlots,
    medSlots: slots.medSlots,
    lowSlots: slots.lowSlots,
    rigSlots: slots.rigSlots,
    powerGrid: values.get("powerOutput") ?? 0,
    cpuOutput: values.get("cpuOutput") ?? 0,
    droneBandwidth,
    droneCapacity,
    maxActiveDrones: values.get("maxActiveDrones") ?? fallbackMaxActiveDrones(droneCapacity, droneBandwidth),
    fighterCapacity,
    fighterTubes,
    fighterLightSlots,
    fighterHeavySlots,
    fighterSupportSlots,
    shieldHp: defense.shieldHp,
    shieldRechargeTime: defense.shieldRechargeTime,
    armorHp: defense.armorHp,
    hullHp: defense.hullHp,
    capacitorCapacity: capacitor.capacitorCapacity,
    capacitorRechargeTime: capacitor.capacitorRechargeTime,
    shieldResists: defense.shieldResists,
    armorResists: defense.armorResists,
    hullResists: defense.hullResists,
    bonuses,
  };
}

function buildSource(profiles: readonly ShipProfile[]): string {
  const lines: string[] = [
    "// Generated by scripts/generate-ship-profiles.ts; do not edit manually.",
    'import type { ShipProfile } from "../../ships";',
    "",
    "export const SHIP_PROFILES: readonly ShipProfile[] = [",
  ];

  for (const p of profiles) {
    lines.push("  {");
    lines.push(`    id: ${JSON.stringify(p.id)} as ShipProfile["id"],`);
    lines.push(`    name: ${JSON.stringify(p.name)},`);
    lines.push(`    factionId: ${JSON.stringify(p.factionId)} as ShipProfile["factionId"],`);
    lines.push(`    hullTypeId: ${JSON.stringify(p.hullTypeId)} as ShipProfile["hullTypeId"],`);
    lines.push(`    mass: ${p.mass},`);
    lines.push(`    inertiaModifier: ${p.inertiaModifier},`);
    lines.push(`    baseSpeed: ${p.baseSpeed},`);
    lines.push(`    sigRadius: ${p.sigRadius},`);
    lines.push(`    scanResolution: ${p.scanResolution},`);
    lines.push(`    maxTargetingRange: ${p.maxTargetingRange},`);
    lines.push(`    maxLockedTargets: ${p.maxLockedTargets},`);
    lines.push(`    sensorStrengths: { gravimetric: ${p.sensorStrengths.gravimetric}, ladar: ${p.sensorStrengths.ladar}, magnetometric: ${p.sensorStrengths.magnetometric}, radar: ${p.sensorStrengths.radar} },`);
    lines.push(`    highSlots: ${p.highSlots},`);
    lines.push(`    medSlots: ${p.medSlots},`);
    lines.push(`    lowSlots: ${p.lowSlots},`);
    lines.push(`    rigSlots: ${p.rigSlots},`);
    lines.push(`    powerGrid: ${p.powerGrid},`);
    lines.push(`    cpuOutput: ${p.cpuOutput},`);
    lines.push(`    droneBandwidth: ${p.droneBandwidth},`);
    lines.push(`    droneCapacity: ${p.droneCapacity},`);
    lines.push(`    maxActiveDrones: ${p.maxActiveDrones},`);
    lines.push(`    fighterCapacity: ${p.fighterCapacity},`);
    lines.push(`    fighterTubes: ${p.fighterTubes},`);
    lines.push(`    fighterLightSlots: ${p.fighterLightSlots},`);
    lines.push(`    fighterHeavySlots: ${p.fighterHeavySlots},`);
    lines.push(`    fighterSupportSlots: ${p.fighterSupportSlots},`);
    lines.push(`    shieldHp: ${p.shieldHp},`);
    lines.push(`    shieldRechargeTime: ${p.shieldRechargeTime},`);
    lines.push(`    armorHp: ${p.armorHp},`);
    lines.push(`    hullHp: ${p.hullHp},`);
    lines.push(`    capacitorCapacity: ${p.capacitorCapacity},`);
    lines.push(`    capacitorRechargeTime: ${p.capacitorRechargeTime},`);
    lines.push(`    shieldResists: ${formatResists(p.shieldResists)},`);
    lines.push(`    armorResists: ${formatResists(p.armorResists)},`);
    lines.push(`    hullResists: ${formatResists(p.hullResists)},`);
    lines.push(`    bonuses: ${JSON.stringify(p.bonuses)},`);
    lines.push("  },");
  }

  lines.push("] as const;");
  lines.push("");
  return lines.join("\n");
}

function formatResists(resists: Resists): string {
  return `{ em: ${resists.em}, thermal: ${resists.thermal}, kinetic: ${resists.kinetic}, explosive: ${resists.explosive} }`;
}

async function main(): Promise<void> {
  const file = Bun.file(DATA_PATH);
  const raw = await file.json();
  if (!Array.isArray(raw)) throw new Error(`${DATA_PATH} does not contain an array`);

  const { types, groups, typedogmas, attributeNames } = await loadSdeData();
  const shipNameToType = buildShipNameToType(types, groups);

  const profiles: ShipProfile[] = [];
  const errors: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    try {
      profiles.push(parseProfile(raw[i], i, shipNameToType, typedogmas, attributeNames));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (errors.length > 0) throw new Error(`Ship profile generation failed:\n${errors.join("\n")}`);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, buildSource(profiles));
  console.log(`Generated ${OUTPUT_PATH} with ${profiles.length} profiles.`);
}

export {
  buildAttributeNameMap as _buildAttributeNameMap,
  buildShipNameToType as _buildShipNameToType,
  extractCapacitorData as _extractCapacitorData,
  extractDefenseData as _extractDefenseData,
  parseBonuses as _parseBonuses,
  parseProfile as _parseProfile,
  resolveShipIds as _resolveShipIds,
};

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
