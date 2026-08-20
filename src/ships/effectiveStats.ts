import { fittedMassFactor } from "./fittedMass";
import type { FittedHull, PropulsionStats, ShipProfile, SkillLevel, StatConditions } from "./types";

export interface ShipStats {
  readonly mass: number;
  readonly inertiaModifier: number;
  readonly maxSpeed: number;
  readonly sigRadius: number;
}

const NAVIGATION_SPEED_BONUS_PER_LEVEL = 0.05;
const ACCELERATION_CONTROL_BONUS_PER_LEVEL = 0.05;
const EVASIVE_MANEUVERING_BONUS_PER_LEVEL = 0.05;
const SPACESHIP_COMMAND_BONUS_PER_LEVEL = 0.02;
const PROPULSION_OVERLOAD_FACTOR = 1.5;

export function fittedStats(
  profile: ShipProfile,
  fitted: FittedHull,
  propulsion?: PropulsionStats,
  conditions?: StatConditions,
): ShipStats {
  const level = conditions?.skillLevel ?? 0;
  const overloaded = conditions?.overloaded ?? false;
  const navFactor = navigationSpeedFactor(level);
  const inertiaFactor = inertiaSkillFactor(level);
  const mass = (fitted.mass + (propulsion ? propulsion.massAddition : 0)) * fitted.massMultiplier;
  const moduleSpeed = propulsion ? propulsionSpeedBonus(propulsion, level, overloaded) : 0;
  const maxSpeed = profile.baseSpeed * fitted.speedMultiplier * navFactor * (propulsion ? 1 + (moduleSpeed * propulsion.thrust) / mass : 1);
  const inertiaModifier = profile.inertiaModifier * fitted.inertiaMultiplier * inertiaFactor;
  const sigRadius = (profile.sigRadius + fitted.sigRadiusAdd) * fitted.sigMultiplier * (1 + (propulsion ? propulsion.sigBloom : 0));

  return {
    mass,
    inertiaModifier,
    maxSpeed,
    sigRadius,
  };
}

export function effectiveStats(
  profile: ShipProfile,
  propulsion?: PropulsionStats,
  conditions?: StatConditions,
): ShipStats {
  return fittedStats(profile, approximateFittedHull(profile), propulsion, conditions);
}

export function maxSpeedForFittedMass(
  profile: ShipProfile,
  fitted: FittedHull,
  mass: number,
  propulsion?: PropulsionStats,
  conditions?: StatConditions,
): number {
  const level = conditions?.skillLevel ?? 0;
  const overloaded = conditions?.overloaded ?? false;
  const navFactor = navigationSpeedFactor(level);

  if (!propulsion) return profile.baseSpeed * fitted.speedMultiplier * navFactor;

  const prePropulsionMass = Math.max(0, mass - propulsion.massAddition);
  const speedMass = prePropulsionMass + propulsion.massAddition;
  const moduleSpeed = propulsionSpeedBonus(propulsion, level, overloaded);
  return profile.baseSpeed * fitted.speedMultiplier * navFactor * (1 + (moduleSpeed * propulsion.thrust) / speedMass);
}

export function maxSpeedForMass(
  profile: ShipProfile,
  mass: number,
  propulsion?: PropulsionStats,
  conditions?: StatConditions,
): number {
  return maxSpeedForFittedMass(profile, approximateFittedHull(profile), mass, propulsion, conditions);
}

function approximateFittedHull(profile: ShipProfile): FittedHull {
  return {
    mass: profile.mass * fittedMassFactor(profile.hullType),
    massMultiplier: 1,
    speedMultiplier: 1,
    inertiaMultiplier: 1,
    sigMultiplier: 1,
    sigRadiusAdd: 0,
  };
}

function navigationSpeedFactor(level: SkillLevel): number {
  return 1 + NAVIGATION_SPEED_BONUS_PER_LEVEL * level;
}

function inertiaSkillFactor(level: SkillLevel): number {
  return (1 - EVASIVE_MANEUVERING_BONUS_PER_LEVEL * level) * (1 - SPACESHIP_COMMAND_BONUS_PER_LEVEL * level);
}

function propulsionSpeedBonus(propulsion: PropulsionStats, level: SkillLevel, overloaded: boolean): number {
  const accFactor = 1 + ACCELERATION_CONTROL_BONUS_PER_LEVEL * level;
  const overloadFactor = overloaded ? PROPULSION_OVERLOAD_FACTOR : 1;
  return propulsion.speedBonus * accFactor * overloadFactor;
}
