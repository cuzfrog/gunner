import { fittedMassFactor } from "./fittedMass";
import type { PropulsionModule, ShipProfile, SkillLevel, StatConditions } from "./types";

export interface ShipStats {
  readonly mass: number;
  readonly inertiaModifier: number;
  readonly maxSpeed: number;
  readonly sigRadius: number;
}

const NAVIGATION_SPEED_BONUS_PER_LEVEL = 0.05;
const ACCELERATION_CONTROL_BONUS_PER_LEVEL = 0.05;
const EVASIVE_MANEUVERING_INERTIA_BONUS_PER_LEVEL = 0.05;
const SPACESHIP_COMMAND_INERTIA_BONUS_PER_LEVEL = 0.02;
const PROPULSION_OVERLOAD_FACTOR = 1.5;

export function effectiveStats(
  profile: ShipProfile,
  module?: PropulsionModule,
  conditions?: StatConditions,
): ShipStats {
  const level = conditions?.skillLevel ?? 0;
  const overloaded = conditions?.overloaded ?? false;
  const navFactor = skillSpeedFactor(level);
  const inertiaFactor = skillInertiaFactor(level);
  const hullMass = profile.mass * fittedMassFactor(profile.hullType);

  if (!module) {
    return {
      mass: hullMass,
      inertiaModifier: profile.inertiaModifier * inertiaFactor,
      maxSpeed: profile.baseSpeed * navFactor,
      sigRadius: profile.sigRadius,
    };
  }

  const speedMass = hullMass + module.massAddition;
  const moduleSpeed = moduleSpeedBonus(module, level, overloaded);
  const maxSpeed = profile.baseSpeed * navFactor * (1 + (moduleSpeed * module.thrust) / speedMass);
  const mass = hullMass + module.massAddition * module.activeMassMultiplier;
  const sigRadius = profile.sigRadius * (1 + module.sigBloom);

  return {
    mass,
    inertiaModifier: profile.inertiaModifier * inertiaFactor,
    maxSpeed,
    sigRadius,
  };
}

function skillSpeedFactor(level: SkillLevel): number {
  return 1 + NAVIGATION_SPEED_BONUS_PER_LEVEL * level;
}

function skillInertiaFactor(level: SkillLevel): number {
  return (1 - EVASIVE_MANEUVERING_INERTIA_BONUS_PER_LEVEL * level) * (1 - SPACESHIP_COMMAND_INERTIA_BONUS_PER_LEVEL * level);
}

function moduleSpeedBonus(module: PropulsionModule, level: SkillLevel, overloaded: boolean): number {
  const accFactor = 1 + ACCELERATION_CONTROL_BONUS_PER_LEVEL * level;
  const overloadFactor = overloaded ? PROPULSION_OVERLOAD_FACTOR : 1;
  return module.speedBonus * skillSpeedFactor(level) * accFactor * overloadFactor;
}
