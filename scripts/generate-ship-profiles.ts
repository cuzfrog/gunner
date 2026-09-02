import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { ShipProfile } from "../src/ships";
import type { FactionId, HullTypeId, ShipId } from "../src/gamedata/ids";

interface ShipIdentity {
  readonly name: string;
  readonly faction: string;
  readonly hullType: string;
}

interface RawProfile extends ShipIdentity {
  readonly navigation: Readonly<Record<string, string>>;
  readonly structure: Readonly<Record<string, string>>;
  readonly targeting: Readonly<Record<string, string>>;
  readonly drones?: Readonly<Record<string, string>>;
}

export interface SdeType {
  typeID: number;
  "typeName_en-us": string;
  typeName_zh?: string;
  typeName_ja?: string;
  groupID: number;
  published: number;
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
const SDE_DIR = process.argv[2] ?? join(homedir(), "workspace", "Pyfa", "staticdata", "fsd_built");
const OUTPUT_PATH = "src/gamedata/shipProfiles/profiles.ts";
const SHIP_CATEGORY_ID = 6;
const LEGACY_PREFIX = "legacy";
const DEFAULT_MAX_ACTIVE_DRONES = 5;
const SHIELD_RECHARGE_RATE_MS = 1_000_000; // SDE stores shieldRechargeRate in microseconds

const DEFENSE_ATTRIBUTE_NAMES = ["shieldCapacity", "shieldRechargeRate", "armorHP", "hp", "armorEmDamageResonance", "armorThermalDamageResonance", "armorKineticDamageResonance", "armorExplosiveDamageResonance", "shieldEmDamageResonance", "shieldThermalDamageResonance", "shieldKineticDamageResonance", "shieldExplosiveDamageResonance", "emDamageResonance", "thermalDamageResonance", "kineticDamageResonance", "explosiveDamageResonance"] as const;

function parseNumber(input: string): number {
  const match = input.match(/[\d,.]+(?:\.\d+)?/);
  if (!match) throw new Error(`Cannot parse number from "${input}"`);
  const cleaned = match[0].replaceAll(",", "");
  const value = Number(cleaned);
  if (Number.isNaN(value)) throw new Error(`Cannot parse number from "${input}"`);
  return value;
}

function hasObject(value: unknown, key: string): Record<string, unknown> {
  if (!value || typeof value !== "object") throw new Error(`Entry is not an object`);
  const record = value as Record<string, unknown>;
  const child = record[key];
  if (!child || typeof child !== "object") throw new Error(`Missing ${key}`);
  return child as Record<string, unknown>;
}

function hasString(value: Record<string, unknown>, key: string, context: string): string {
  const field = value[key];
  if (typeof field !== "string") throw new Error(`${context}: missing or invalid ${key}`);
  return field;
}

interface DroneLimits {
  readonly bandwidth: number;
  readonly capacity: number;
  readonly maxActive: number;
}

function parseDroneLimits(dronesBlock: unknown, shipName: string): DroneLimits {
  if (!dronesBlock || typeof dronesBlock !== "object") return { bandwidth: 0, capacity: 0, maxActive: 0 };
  const drones = dronesBlock as Record<string, unknown>;
  const bandwidthRaw = hasString(drones, "droneBandwidth", `${shipName} drones`);
  const capacityRaw = hasString(drones, "droneCapacity", `${shipName} drones`);
  const bandwidth = bandwidthRaw.trim() === "" ? 0 : parseRangeValue(bandwidthRaw);
  const capacity = capacityRaw.trim() === "" ? 0 : parseRangeValue(capacityRaw);
  if (bandwidth <= 0 && capacity <= 0) return { bandwidth: 0, capacity: 0, maxActive: 0 };
  return { bandwidth, capacity, maxActive: DEFAULT_MAX_ACTIVE_DRONES };
}

function parseRangeValue(input: string): number {
  const matches = input.match(/[\d,.]+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) throw new Error(`Cannot parse number from "${input}"`);
  const values = matches.map((m) => Number(m.replaceAll(",", "")));
  return Math.max(...values);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replaceAll("'", "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeLegacyShipId(name: string): ShipId {
  return `${LEGACY_PREFIX}-${slugify(name)}` as ShipId;
}

function makeLegacyHullTypeId(hullType: string): HullTypeId {
  return `${LEGACY_PREFIX}-${slugify(hullType)}` as HullTypeId;
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

async function loadSdeData(sdeDir = SDE_DIR): Promise<{ types: Record<string, SdeType>; groups: Record<string, SdeGroup>; typedogmas: Record<string, SdeTypeDogma>; attributeNames: Map<number, string> }> {
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

interface DefenseData {
  readonly shieldHp: number;
  readonly shieldRechargeTime: number;
  readonly armorHp: number;
  readonly hullHp: number;
  readonly shieldResists: { readonly em: number; readonly thermal: number; readonly kinetic: number; readonly explosive: number };
  readonly armorResists: { readonly em: number; readonly thermal: number; readonly kinetic: number; readonly explosive: number };
  readonly hullResists: { readonly em: number; readonly thermal: number; readonly kinetic: number; readonly explosive: number };
}

function extractDefenseData(typeId: string, typedogmas: Record<string, SdeTypeDogma>, attributeNames: Map<number, string>): DefenseData {
  const typeDogma = typedogmas[typeId];
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

function resistsFromResonances(values: Map<string, number>, prefix: string): { readonly em: number; readonly thermal: number; readonly kinetic: number; readonly explosive: number } {
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

function resolveShipIds(
  profile: ShipIdentity,
  shipNameToType: ReadonlyMap<string, SdeType>,
): { id: ShipId; factionId: FactionId; hullTypeId: HullTypeId; matched: boolean } {
  const ship = shipNameToType.get(profile.name);
  if (ship) {
    return {
      id: String(ship.typeID) as ShipId,
      factionId: slugify(profile.faction) as FactionId,
      hullTypeId: String(ship.groupID) as HullTypeId,
      matched: true,
    };
  }
  return {
    id: makeLegacyShipId(profile.name),
    factionId: slugify(profile.faction) as FactionId,
    hullTypeId: makeLegacyHullTypeId(profile.hullType),
    matched: false,
  };
}

function parseProfile(raw: unknown, index: number, shipNameToType: ReadonlyMap<string, SdeType>, typedogmas: Record<string, SdeTypeDogma>, attributeNames: Map<number, string>): ShipProfile {
  if (!raw || typeof raw !== "object") throw new Error(`Entry ${index} is not an object`);
  const record = raw as Record<string, unknown>;

  const name = hasString(record, "name", `Entry ${index}`);
  if (name.length === 0) throw new Error(`Entry ${index} has an empty name`);
  const faction = hasString(record, "faction", name);
  const hullType = hasString(record, "hullType", name);

  const navigation = hasObject(raw, "navigation");
  const structure = hasObject(raw, "structure");
  const targeting = hasObject(raw, "targeting");

  const { id, factionId, hullTypeId } = resolveShipIds({ name, faction, hullType }, shipNameToType);

  const droneLimits = parseDroneLimits(record["drones"], name);
  const defense = extractDefenseData(String(id), typedogmas, attributeNames);

  return {
    id,
    name,
    factionId,
    hullTypeId,
    mass: parseNumber(hasString(structure, "mass", name)),
    inertiaModifier: parseNumber(hasString(navigation, "inertiaModifier", name)),
    baseSpeed: parseNumber(hasString(navigation, "maxVelocity", name)),
    sigRadius: parseNumber(hasString(targeting, "sigRadius", name)),
    droneBandwidth: droneLimits.bandwidth,
    droneCapacity: droneLimits.capacity,
    maxActiveDrones: droneLimits.maxActive,
    shieldHp: defense.shieldHp,
    shieldRechargeTime: defense.shieldRechargeTime,
    armorHp: defense.armorHp,
    hullHp: defense.hullHp,
    shieldResists: defense.shieldResists,
    armorResists: defense.armorResists,
    hullResists: defense.hullResists,
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
    lines.push(`    droneBandwidth: ${p.droneBandwidth},`);
    lines.push(`    droneCapacity: ${p.droneCapacity},`);
    lines.push(`    maxActiveDrones: ${p.maxActiveDrones},`);
    lines.push(`    shieldHp: ${p.shieldHp},`);
    lines.push(`    shieldRechargeTime: ${p.shieldRechargeTime},`);
    lines.push(`    armorHp: ${p.armorHp},`);
    lines.push(`    hullHp: ${p.hullHp},`);
    lines.push(`    shieldResists: ${formatResists(p.shieldResists)},`);
    lines.push(`    armorResists: ${formatResists(p.armorResists)},`);
    lines.push(`    hullResists: ${formatResists(p.hullResists)},`);
    lines.push("  },");
  }

  lines.push("] as const;");
  lines.push("");
  return lines.join("\n");
}

function formatResists(resists: { readonly em: number; readonly thermal: number; readonly kinetic: number; readonly explosive: number }): string {
  return `{ em: ${resists.em}, thermal: ${resists.thermal}, kinetic: ${resists.kinetic}, explosive: ${resists.explosive} }`;
}

async function main(): Promise<void> {
  const file = Bun.file(DATA_PATH);
  const raw = await file.json();
  if (!Array.isArray(raw)) throw new Error(`${DATA_PATH} does not contain an array`);

  const { types, groups, typedogmas, attributeNames } = await loadSdeData();
  const shipNameToType = buildShipNameToType(types, groups);

  const profiles: ShipProfile[] = [];
  for (let i = 0; i < raw.length; i++) {
    profiles.push(parseProfile(raw[i], i, shipNameToType, typedogmas, attributeNames));
  }

  for (const profile of profiles) {
    if (!shipNameToType.has(profile.name)) {
      console.warn(`No SDE match for ship "${profile.name}"; using legacy id.`);
    }
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, buildSource(profiles));
  console.log(`Generated ${OUTPUT_PATH} with ${profiles.length} profiles.`);
}

export { buildAttributeNameMap as _buildAttributeNameMap, buildShipNameToType as _buildShipNameToType, extractDefenseData as _extractDefenseData, parseDroneLimits as _parseDroneLimits, parseProfile as _parseProfile, resolveShipIds as _resolveShipIds, slugify as _slugify };

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
