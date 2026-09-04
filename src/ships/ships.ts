import {
  alignTime as computeAlignTime,
  fittedStats as computeFittedStats,
  maxSpeedForFittedMass as computeMaxSpeedForFittedMass,
  type ShipStats,
} from "./effectiveStats";
import { fittingOptions as computeFittingOptions } from "./fitting";
import { isPropulsionId, PROPULSION_MODULES } from "./propulsion";
import type { HullTypeId, ShipId } from "../gamedata/ids";
import type { ShipNameLanguage } from "../gamedata/i18n";
import type { NameI18nCatalog } from "../gamedata/nameI18n";
import type { ShipProfileCatalog } from "../gamedata/shipProfiles";
import { hullTierOf } from "./tiers";
import type {
  FittedHull, HullTier, PropulsionId, PropulsionModule, PropulsionStats, ShipProfile, SkillLevel, StatConditions,
} from "./types";

export type { ShipNameLanguage } from "../gamedata/i18n";
export type { ShipStats } from "./effectiveStats";
export type {
  DefenseSkills, FittedHull, HullTier, PropulsionId, PropulsionKind, PropulsionModule, PropulsionStats, ShipProfile, SkillLevel,
  StatConditions, TargetingSkills,
} from "./types";
export { defaultDefenseSkills, defaultTargetingSkills } from "./types";

export interface HullView {
  readonly name: string;
  readonly hullType: string;
  readonly faction: string;
}

export interface Ships {
  hulls(language: ShipNameLanguage): readonly HullView[];
  hullView(profile: ShipProfile, language: ShipNameLanguage): HullView;
  findHull(name: string): ShipProfile | undefined;
  findHullById(id: ShipId): ShipProfile | undefined;
  findHullByName(name: string, language: ShipNameLanguage): ShipProfile | undefined;
  parsePropulsionId(value: unknown): PropulsionId | undefined;
  fittingOptions(profile: ShipProfile): readonly PropulsionModule[];
  allFittingOptions(): readonly PropulsionModule[];
  fittingOption(profile: ShipProfile, id: PropulsionId): PropulsionModule | undefined;
  turretSizeOptions(profile: ShipProfile): readonly HullTier[];
  shipTier(profile: ShipProfile): HullTier | undefined;
  fittedStats(profile: ShipProfile, fitted?: FittedHull, module?: PropulsionStats, conditions?: StatConditions, maxSpeedOverride?: number): ShipStats;
  maxSpeedForFittedMass(
    profile: ShipProfile, fitted: FittedHull | undefined, mass: number, module?: PropulsionStats, conditions?: StatConditions,
  ): number;
  alignTime(mass: number, inertiaModifier: number): number;
}

export class ShipsImpl implements Ships {
  private readonly shipProfileCatalog: ShipProfileCatalog;
  private readonly nameI18nCatalog: NameI18nCatalog;
  private readonly hullById: ReadonlyMap<ShipId, ShipProfile>;
  private readonly hullByName: Record<ShipNameLanguage, ReadonlyMap<string, ShipProfile>>;
  private readonly hullTierById: ReadonlyMap<HullTypeId, HullTier>;

  constructor({ shipProfileCatalog, nameI18nCatalog }: { shipProfileCatalog: ShipProfileCatalog; nameI18nCatalog: NameI18nCatalog }) {
    this.shipProfileCatalog = shipProfileCatalog;
    this.nameI18nCatalog = nameI18nCatalog;
    this.hullById = buildHullById(shipProfileCatalog);
    this.hullByName = buildHullByName(shipProfileCatalog, nameI18nCatalog);
    this.hullTierById = buildHullTierById(shipProfileCatalog, nameI18nCatalog);
  }

  hulls(language: ShipNameLanguage): readonly HullView[] {
    return this.shipProfileCatalog.all().map((profile) => this.hullView(profile, language));
  }

  hullView(profile: ShipProfile, language: ShipNameLanguage): HullView {
    return {
      name: this.nameI18nCatalog.shipName(profile.id, language) ?? profile.name,
      hullType: this.nameI18nCatalog.hullTypeName(profile.hullTypeId, language) ?? profile.hullTypeId,
      faction: this.nameI18nCatalog.factionName(profile.factionId, language) ?? profile.factionId,
    };
  }

  findHull(name: string): ShipProfile | undefined {
    const normalized = normalize(name);
    for (const language of HULL_LANGUAGE_ORDER) {
      const profile = this.hullByName[language].get(normalized);
      if (profile) return profile;
    }
    return undefined;
  }

  findHullById(id: ShipId): ShipProfile | undefined {
    return this.hullById.get(id);
  }

  findHullByName(name: string, language: ShipNameLanguage): ShipProfile | undefined {
    return this.hullByName[language].get(normalize(name));
  }

  parsePropulsionId(value: unknown): PropulsionId | undefined {
    if (isPropulsionId(value)) return value;
    return undefined;
  }

  fittingOptions(profile: ShipProfile): readonly PropulsionModule[] {
    const tier = this.shipTierFor(profile);
    if (!tier) return [];
    return computeFittingOptions(tier);
  }

  allFittingOptions(): readonly PropulsionModule[] {
    return PROPULSION_MODULES;
  }

  fittingOption(profile: ShipProfile, id: PropulsionId): PropulsionModule | undefined {
    const tier = this.shipTierFor(profile);
    if (!tier) return undefined;
    return computeFittingOptions(tier).find((module) => module.id === id);
  }

  turretSizeOptions(profile: ShipProfile): readonly HullTier[] {
    const tier = this.shipTierFor(profile);
    if (!tier) return [];
    return turretSizeOptionsFor(tier);
  }

  shipTier(profile: ShipProfile): HullTier | undefined {
    return this.shipTierFor(profile) ?? undefined;
  }

  fittedStats(profile: ShipProfile, fitted?: FittedHull, module?: PropulsionStats, conditions?: StatConditions, maxSpeedOverride?: number): ShipStats {
    return computeFittedStats(profile, fitted, module, conditions, maxSpeedOverride);
  }

  maxSpeedForFittedMass(
    profile: ShipProfile, fitted: FittedHull | undefined, mass: number, module?: PropulsionStats, conditions?: StatConditions,
  ): number {
    return computeMaxSpeedForFittedMass(profile, fitted, mass, module, conditions);
  }

  alignTime(mass: number, inertiaModifier: number): number {
    return computeAlignTime(mass, inertiaModifier);
  }

  private shipTierFor(profile: ShipProfile): HullTier | null {
    return this.hullTierById.get(profile.hullTypeId) ?? null;
  }
}

const HULL_TIER_ORDER: readonly HullTier[] = ["small", "medium", "large", "capital"] as const;
const HULL_LANGUAGE_ORDER: readonly ShipNameLanguage[] = ["en", "zh", "ja"] as const;

function buildHullById(catalog: ShipProfileCatalog): ReadonlyMap<ShipId, ShipProfile> {
  const map = new Map<ShipId, ShipProfile>();
  for (const profile of catalog.all()) {
    map.set(profile.id, profile);
  }
  return map;
}

function buildHullByName(catalog: ShipProfileCatalog, i18n: NameI18nCatalog): Record<ShipNameLanguage, ReadonlyMap<string, ShipProfile>> {
  const maps: Record<ShipNameLanguage, Map<string, ShipProfile>> = { en: new Map(), zh: new Map(), ja: new Map() };
  for (const profile of catalog.all()) {
    for (const language of HULL_LANGUAGE_ORDER) {
      const name = i18n.shipName(profile.id, language);
      if (name === undefined) continue;
      const key = normalize(name);
      if (maps[language].has(key)) continue;
      maps[language].set(key, profile);
    }
  }
  return { en: maps.en, zh: maps.zh, ja: maps.ja };
}

function normalize(input: string): string {
  return input.trim().toLowerCase();
}

function buildHullTierById(catalog: ShipProfileCatalog, i18n: NameI18nCatalog): ReadonlyMap<HullTypeId, HullTier> {
  const map = new Map<HullTypeId, HullTier>();
  for (const profile of catalog.all()) {
    if (map.has(profile.hullTypeId)) continue;
    const hullType = i18n.hullTypeName(profile.hullTypeId, "en");
    if (hullType === undefined) continue;
    const tier = hullTierOf(hullType);
    if (tier) map.set(profile.hullTypeId, tier);
  }
  return map;
}

function turretSizeOptionsFor(tier: HullTier): readonly HullTier[] {
  const hullRank = HULL_TIER_ORDER.indexOf(tier);
  return HULL_TIER_ORDER.filter((candidate, rank) => rank <= hullRank || (rank === hullRank + 1 && candidate !== "capital"));
}
