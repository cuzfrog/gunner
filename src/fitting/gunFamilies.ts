import type { FittingDb, TurretStats } from "../gamedata/fittingDb";
import type { TypeId } from "../gamedata/ids";
import type { SigResolutionClass } from "../sim";

export type GunFamily = "pulseLaser" | "beamLaser" | "railgun" | "blaster" | "autocannon" | "artillery";

export interface GunFamilies {
  familyOf(moduleId: TypeId): GunFamily;
  representativeOf(family: GunFamily, sigResolutionClass: SigResolutionClass): string;
}

export class GunFamiliesImpl implements GunFamilies {
  private readonly turretLookup: (id: TypeId) => TurretStats | undefined;

  constructor({ fittingDb }: { fittingDb: FittingDb }) {
    this.turretLookup = (id) => fittingDb.turrets[id] ?? fittingDb.modules[id];
  }

  familyOf(moduleId: TypeId): GunFamily {
    const name = this.turretLookup(moduleId)?.name ?? "";
    return gunFamilyOf(name);
  }

  representativeOf(family: GunFamily, sigResolutionClass: SigResolutionClass): string {
    return gunIconNames(family)[sigResolutionClass];
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

function gunIconNames(family: GunFamily): Readonly<Record<SigResolutionClass, string>> {
  return GUN_FAMILY_REPRESENTATIVES[family];
}

const GUN_FAMILY_REPRESENTATIVES: Readonly<Record<GunFamily, Readonly<Record<SigResolutionClass, string>>>> = {
  pulseLaser: {
    S: "Gatling Pulse Laser I",
    M: "Heavy Pulse Laser I",
    L: "Mega Pulse Laser I",
    XL: "Dual Giga Pulse Laser I",
  },
  beamLaser: {
    S: "Small Focused Beam Laser I",
    M: "Heavy Beam Laser I",
    L: "Tachyon Beam Laser I",
    XL: "Dual Giga Beam Laser I",
  },
  blaster: {
    S: "Light Neutron Blaster I",
    M: "Heavy Neutron Blaster I",
    L: "Neutron Blaster Cannon I",
    XL: "Ion Siege Blaster I",
  },
  railgun: {
    S: "150mm Railgun I",
    M: "250mm Railgun I",
    L: "425mm Railgun I",
    XL: "Dual 1000mm Railgun I",
  },
  autocannon: {
    S: "200mm AutoCannon I",
    M: "425mm AutoCannon I",
    L: "800mm Repeating Cannon I",
    XL: "Quad 800mm Repeating Cannon I",
  },
  artillery: {
    S: "280mm Howitzer Artillery I",
    M: "720mm Howitzer Artillery I",
    L: "1400mm Howitzer Artillery I",
    XL: "Quad 3500mm Siege Artillery I",
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
