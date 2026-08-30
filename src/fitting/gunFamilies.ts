import { FITTING_DB, type FittingDb, type TurretStats } from "../gamedata/fittingDb";
import { toTypeId, type TypeId } from "../gamedata/ids";
import type { SigResolutionClass } from "../sim";

export type GunFamily = "pulseLaser" | "beamLaser" | "railgun" | "blaster" | "autocannon" | "artillery";

export interface GunFamilies {
  familyOf(moduleId: TypeId): GunFamily;
  representativeOf(family: GunFamily, sigResolutionClass: SigResolutionClass): TypeId;
  variantsForFamily(family: GunFamily, chargeSize: number): readonly TurretStats[];
}

export class GunFamiliesImpl implements GunFamilies {
  private readonly turretLookup: (id: TypeId) => TurretStats | undefined;
  private readonly allTurrets: readonly TurretStats[];

  constructor({ fittingDb }: { fittingDb: FittingDb }) {
    this.turretLookup = (id) => fittingDb.turrets[id] ?? fittingDb.modules[id];
    this.allTurrets = Object.values(fittingDb.turrets);
    if (fittingDb.turrets === FITTING_DB.turrets || fittingDb.modules === FITTING_DB.modules) assertOverridesExist(fittingDb);
  }

  familyOf(moduleId: TypeId): GunFamily {
    const name = this.turretLookup(moduleId)?.name ?? "";
    return gunFamilyOf(name);
  }

  representativeOf(family: GunFamily, sigResolutionClass: SigResolutionClass): TypeId {
    return GUN_FAMILY_REPRESENTATIVES[family][sigResolutionClass];
  }

  variantsForFamily(family: GunFamily, chargeSize: number): readonly TurretStats[] {
    return this.allTurrets
      .filter((stats) => stats.chargeSize === chargeSize && gunFamilyOf(stats.name) === family)
      .sort(sortByMetaThenName);
  }
}

function gunFamilyOf(moduleName: string): GunFamily {
  const override = FAMILY_OVERRIDES[moduleName];
  if (override) return override;

  const normalized = normalize(moduleName);

  if (hasArtilleryHint(normalized)) return "artillery";
  if (hasAutocannonHint(normalized)) return "autocannon";
  if (hasRailgunHint(normalized)) return "railgun";
  if (hasBlasterHint(normalized)) return "blaster";

  return disambiguateEnergy(normalized, moduleName);
}

const GUN_FAMILY_REPRESENTATIVES: Readonly<Record<GunFamily, Readonly<Record<SigResolutionClass, TypeId>>>> = {
  pulseLaser: {
    S: toTypeId("450"),
    M: toTypeId("458"),
    L: toTypeId("462"),
    XL: toTypeId("20444"),
  },
  beamLaser: {
    S: toTypeId("454"),
    M: toTypeId("459"),
    L: toTypeId("464"),
    XL: toTypeId("20446"),
  },
  blaster: {
    S: toTypeId("564"),
    M: toTypeId("568"),
    L: toTypeId("573"),
    XL: toTypeId("20450"),
  },
  railgun: {
    S: toTypeId("565"),
    M: toTypeId("570"),
    L: toTypeId("574"),
    XL: toTypeId("20448"),
  },
  autocannon: {
    S: toTypeId("486"),
    M: toTypeId("491"),
    L: toTypeId("496"),
    XL: toTypeId("37289"),
  },
  artillery: {
    S: toTypeId("488"),
    M: toTypeId("493"),
    L: toTypeId("498"),
    XL: toTypeId("20454"),
  },
} as const;

const FAMILY_OVERRIDES: Readonly<Record<string, GunFamily>> = {
  "250mm Light Gallium Cannon": "artillery",
  "650mm Medium Gallium Cannon": "artillery",
  "1200mm Heavy Gallium Cannon": "artillery",
  "280mm Gallium Cannon": "artillery",
  "720mm Gallium Cannon": "artillery",
  "1400mm Gallium Cannon": "artillery",
  "Gatling Modulated Energy Beam I": "pulseLaser",
} as const;

const FACTION_PREFIXES = [
  "dark blood ",
  "true sansha ",
  "shadow serpentis ",
  "dread guristas ",
  "domination ",
  "republic fleet ",
  "federation navy ",
  "caldari navy ",
  "imperial navy ",
  "ammatar navy ",
  "concord ",
] as const;

const META_ADJECTIVES = [
  "afocal",
  "modal",
  "anode",
  "modulated",
  "enduring",
  "scoped",
  "compact",
  "ample",
  "precise",
  "prototype",
  "limited",
  "regulated",
  "polarized",
  "carbine",
  "gallium",
  "carbide",
  "compressed",
  "scout",
  "jolt",
] as const;

const TECH_SUFFIX_PATTERN = /\s+(i|ii)$/gi;
const QUOTED_TOKEN_PATTERN = /'[^']*'\s*/g;
const POSSESSIVE_MODIFIED_PATTERN = /^[a-z0-9_'’]+ modified\s+/i;
const WHITESPACE_PATTERN = /\s+/g;

function normalize(moduleName: string): string {
  let result = moduleName.toLowerCase();

  result = result.replace(QUOTED_TOKEN_PATTERN, "");

  for (const prefix of FACTION_PREFIXES) {
    if (result.startsWith(prefix)) result = result.slice(prefix.length);
  }

  result = result.replace(POSSESSIVE_MODIFIED_PATTERN, "");
  result = result.replace(TECH_SUFFIX_PATTERN, "");

  for (const adjective of META_ADJECTIVES) {
    result = result.replace(new RegExp(`\\b${adjective}\\b\\s*`, "g"), "");
  }

  return result.replace(WHITESPACE_PATTERN, " ").trim();
}

function hasArtilleryHint(normalized: string): boolean {
  return (
    normalized.includes("artillery") ||
    normalized.includes("howitzer") ||
    normalized.includes("siege cannon")
  );
}

function hasAutocannonHint(normalized: string): boolean {
  return (
    normalized.includes("autocannon") ||
    normalized.includes("repeating cannon") ||
    normalized.includes("automatic cannon") ||
    normalized.includes("machine gun")
  );
}

function hasRailgunHint(normalized: string): boolean {
  return (
    normalized.includes("railgun") ||
    normalized.includes("rail") ||
    normalized.includes("gauss gun") ||
    normalized.includes("accelerator cannon") ||
    normalized.includes("coil gun")
  );
}

function hasBlasterHint(normalized: string): boolean {
  return (
    normalized.includes("blaster") ||
    normalized.includes("particle accelerator") ||
    normalized.includes("phase cannon") ||
    normalized.includes("particle cannon")
  );
}

function disambiguateEnergy(normalized: string, originalName: string): GunFamily {
  if (normalized.includes("pulse")) return "pulseLaser";
  if (normalized.includes("beam")) return "beamLaser";

  const stem = resolveEnergyStem(normalized);
  if (stem) return stem;

  throw new Error(`Unable to determine gun family for "${originalName}"`);
}

function resolveEnergyStem(normalized: string): GunFamily | undefined {
  if (normalized.includes("gatling")) return "pulseLaser";
  if (normalized.includes("small focused")) return "beamLaser";
  if (
    normalized.includes("quad light") ||
    normalized.includes("dual light") ||
    normalized.includes("quad beam") ||
    normalized.includes("dual heavy") ||
    normalized.includes("tachyon")
  ) {
    return "beamLaser";
  }
  if (
    normalized.includes("focused medium") ||
    normalized.includes("heavy laser") ||
    normalized.includes("mega beam")
  ) {
    return "beamLaser";
  }
  if (normalized.includes("mega")) return "beamLaser";
  if (normalized.includes("heavy")) return "beamLaser";
  return undefined;
}

function assertOverridesExist(fittingDb: FittingDb): void {
  const names = new Set<string>();
  for (const stats of Object.values(fittingDb.turrets)) names.add(stats.name);
  for (const stats of Object.values(fittingDb.modules)) names.add(stats.name);
  const missing = Object.keys(FAMILY_OVERRIDES).filter((name) => !names.has(name));
  if (missing.length > 0) throw new Error(`FAMILY_OVERRIDES keys have no matching turret/module: ${missing.join(", ")}`);
}

function sortByMetaThenName(a: TurretStats, b: TurretStats): number {
  if (a.metaGroupID !== b.metaGroupID) return a.metaGroupID - b.metaGroupID;
  if (a.metaLevel !== b.metaLevel) return a.metaLevel - b.metaLevel;
  return a.name.localeCompare(b.name);
}
