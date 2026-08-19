import type { PropulsionModule, ShipProfile } from "./types";

export interface ShipStats {
  readonly mass: number;
  readonly inertiaModifier: number;
  readonly maxSpeed: number;
  readonly sigRadius: number;
}

export function effectiveStats(profile: ShipProfile, module?: PropulsionModule): ShipStats {
  if (!module) {
    return {
      mass: profile.mass,
      inertiaModifier: profile.inertiaModifier,
      maxSpeed: profile.baseSpeed,
      sigRadius: profile.sigRadius,
    };
  }

  const speedMass = profile.mass + module.massAddition;
  const maxSpeed = profile.baseSpeed * (1 + (module.speedBonus * module.thrust) / speedMass);
  const mass = profile.mass + module.massAddition * module.activeMassMultiplier;
  const sigRadius = profile.sigRadius * (1 + module.sigBloom);

  return {
    mass,
    inertiaModifier: profile.inertiaModifier,
    maxSpeed,
    sigRadius,
  };
}
