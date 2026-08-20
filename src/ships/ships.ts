import { effectiveStats as computeEffectiveStats, type ShipStats } from "./effectiveStats";
import { fittingOptions as computeFittingOptions } from "./fitting";
import { fittedMassFactor } from "./fittedMass";
import { SHIP_PROFILES } from "./profiles";
import { isPropulsionId } from "./propulsion";
import { factionDisplayName, findShipProfileByName, hullTypeDisplayName, shipDisplayName, type ShipNameLanguage } from "./shipNames";
import type { PropulsionId, PropulsionModule, ShipProfile, SkillLevel, StatConditions } from "./types";

export type { ShipNameLanguage } from "./shipNames";
export type { ShipStats } from "./effectiveStats";
export type { PropulsionId, PropulsionModule, ShipProfile, SkillLevel, StatConditions } from "./types";

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
  effectiveStats(profile: ShipProfile, module?: PropulsionModule, conditions?: StatConditions): ShipStats;
  maxSpeedForMass(profile: ShipProfile, mass: number, module?: PropulsionModule, conditions?: StatConditions): number;
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

  effectiveStats(profile: ShipProfile, module?: PropulsionModule, conditions?: StatConditions): ShipStats {
    return computeEffectiveStats(profile, module, conditions);
  }

  maxSpeedForMass(profile: ShipProfile, mass: number, module?: PropulsionModule, conditions?: StatConditions): number {
    if (!module) return computeEffectiveStats(profile, undefined, conditions).maxSpeed;
    const factor = fittedMassFactor(profile.hullType);
    const shipMass = Math.max(0, (mass - module.massAddition * module.activeMassMultiplier) / factor);
    return computeEffectiveStats({ ...profile, mass: shipMass }, module, conditions).maxSpeed;
  }
}
