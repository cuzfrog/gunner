import {
  alignTime as computeAlignTime,
  fittedStats as computeFittedStats,
  maxSpeedForFittedMass as computeMaxSpeedForFittedMass,
  type ShipStats,
} from "./effectiveStats";
import { fittingOptions as computeFittingOptions } from "./fitting";
import { SHIP_PROFILES } from "./profiles";
import { isPropulsionId, PROPULSION_MODULES } from "./propulsion";
import { factionDisplayName, findShipProfileByName, hullTypeDisplayName, shipDisplayName, type ShipNameLanguage } from "./shipNames";
import { hullTierOf } from "./tiers";
import type {
  FittedHull, HullTier, PropulsionId, PropulsionModule, PropulsionStats, ShipProfile, SkillLevel, StatConditions,
} from "./types";

export type { ShipNameLanguage } from "./shipNames";
export type { ShipStats } from "./effectiveStats";
export type {
  FittedHull, HullTier, PropulsionId, PropulsionKind, PropulsionModule, PropulsionStats, ShipProfile, SkillLevel,
  StatConditions,
} from "./types";

export interface HullView {
  readonly name: string;
  readonly hullType: string;
  readonly faction: string;
}

export interface Ships {
  hulls(language: ShipNameLanguage): readonly HullView[];
  hullView(profile: ShipProfile, language: ShipNameLanguage): HullView;
  findHull(name: string): ShipProfile | undefined;
  parsePropulsionId(value: unknown): PropulsionId | undefined;
  fittingOptions(profile: ShipProfile): readonly PropulsionModule[];
  allFittingOptions(): readonly PropulsionModule[];
  fittingOption(profile: ShipProfile, id: PropulsionId): PropulsionModule | undefined;
  turretSizeOptions(profile: ShipProfile): readonly HullTier[];
  fittedStats(profile: ShipProfile, fitted?: FittedHull, module?: PropulsionStats, conditions?: StatConditions, maxSpeedOverride?: number): ShipStats;
  maxSpeedForFittedMass(
    profile: ShipProfile, fitted: FittedHull | undefined, mass: number, module?: PropulsionStats, conditions?: StatConditions,
  ): number;
  alignTime(mass: number, inertiaModifier: number): number;
}

export class ShipsImpl implements Ships {
  hulls(language: ShipNameLanguage): readonly HullView[] {
    return SHIP_PROFILES.map((profile) => this.hullView(profile, language));
  }

  hullView(profile: ShipProfile, language: ShipNameLanguage): HullView {
    return {
      name: shipDisplayName(profile.name, language),
      hullType: hullTypeDisplayName(profile.hullType, language),
      faction: factionDisplayName(profile.faction, language),
    };
  }

  findHull(name: string): ShipProfile | undefined {
    return findShipProfileByName(name);
  }

  parsePropulsionId(value: unknown): PropulsionId | undefined {
    if (isPropulsionId(value)) return value;
    return undefined;
  }

  fittingOptions(profile: ShipProfile): readonly PropulsionModule[] {
    return computeFittingOptions(profile);
  }

  allFittingOptions(): readonly PropulsionModule[] {
    return PROPULSION_MODULES;
  }

  fittingOption(profile: ShipProfile, id: PropulsionId): PropulsionModule | undefined {
    return computeFittingOptions(profile).find((module) => module.id === id);
  }

  turretSizeOptions(profile: ShipProfile): readonly HullTier[] {
    return turretSizeOptionsFor(profile);
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
}

const HULL_TIER_ORDER: readonly HullTier[] = ["small", "medium", "large", "capital"] as const;

function turretSizeOptionsFor(profile: ShipProfile): readonly HullTier[] {
  const hullTier = hullTierOf(profile.hullType);
  if (!hullTier) return [];
  const hullRank = HULL_TIER_ORDER.indexOf(hullTier);
  return HULL_TIER_ORDER.filter((tier, rank) => rank <= hullRank || (rank === hullRank + 1 && tier !== "capital"));
}
