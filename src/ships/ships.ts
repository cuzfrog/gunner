import {
  fittedStats as computeFittedStats,
  maxSpeedForFittedMass as computeMaxSpeedForFittedMass,
  type ShipStats,
} from "./effectiveStats";
import { fittingOptions as computeFittingOptions } from "./fitting";
import { SHIP_PROFILES } from "./profiles";
import { isPropulsionId } from "./propulsion";
import { factionDisplayName, findShipProfileByName, hullTypeDisplayName, shipDisplayName, type ShipNameLanguage } from "./shipNames";
import type { FittedHull, PropulsionId, PropulsionModule, PropulsionStats, ShipProfile, SkillLevel, StatConditions } from "./types";

export type { ShipNameLanguage } from "./shipNames";
export type { ShipStats } from "./effectiveStats";
export type { FittedHull, HullTier, PropulsionId, PropulsionKind, PropulsionModule, PropulsionStats, ShipProfile, SkillLevel, StatConditions } from "./types";

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
  fittingOption(profile: ShipProfile, id: PropulsionId): PropulsionModule | undefined;
  fittedStats(profile: ShipProfile, fitted?: FittedHull, module?: PropulsionStats, conditions?: StatConditions): ShipStats;
  maxSpeedForFittedMass(profile: ShipProfile, fitted: FittedHull | undefined, mass: number, module?: PropulsionStats, conditions?: StatConditions): number;
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

  fittingOption(profile: ShipProfile, id: PropulsionId): PropulsionModule | undefined {
    return computeFittingOptions(profile).find((module) => module.id === id);
  }

  fittedStats(profile: ShipProfile, fitted?: FittedHull, module?: PropulsionStats, conditions?: StatConditions): ShipStats {
    return computeFittedStats(profile, fitted, module, conditions);
  }

  maxSpeedForFittedMass(profile: ShipProfile, fitted: FittedHull | undefined, mass: number, module?: PropulsionStats, conditions?: StatConditions): number {
    return computeMaxSpeedForFittedMass(profile, fitted, mass, module, conditions);
  }
}
