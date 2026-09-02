import type { FactionId, HullTypeId, ShipId, TypeId } from "../gamedata/ids";
import type { DamageResists } from "../sim";

export type HullTier = "small" | "medium" | "large" | "capital";

export type PropulsionKind = "afterburner" | "microwarpdrive";

export type PropulsionId =
  | "ab-1mn"
  | "ab-10mn"
  | "ab-100mn"
  | "ab-10000mn"
  | "mwd-5mn"
  | "mwd-50mn"
  | "mwd-500mn"
  | "mwd-50000mn";

export interface ShipProfile {
  readonly id: ShipId;
  readonly name: string;
  readonly factionId: FactionId;
  readonly hullTypeId: HullTypeId;
  readonly mass: number;
  readonly inertiaModifier: number;
  readonly baseSpeed: number;
  readonly sigRadius: number;
  readonly droneBandwidth: number;
  readonly droneCapacity: number;
  readonly maxActiveDrones: number;
  readonly shieldHp: number;
  readonly shieldRechargeTime: number; // seconds
  readonly armorHp: number;
  readonly hullHp: number;
  readonly shieldResists: DamageResists;
  readonly armorResists: DamageResists;
  readonly hullResists: DamageResists;
}

export type SkillLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface DefenseSkills {
  readonly shieldManagement: SkillLevel;
  readonly shieldOperation: SkillLevel;
  readonly hullUpgrades: SkillLevel;
  readonly mechanics: SkillLevel;
  readonly shieldCompensationEm: SkillLevel;
  readonly shieldCompensationThermal: SkillLevel;
  readonly shieldCompensationKinetic: SkillLevel;
  readonly shieldCompensationExplosive: SkillLevel;
  readonly armorCompensationEm: SkillLevel;
  readonly armorCompensationThermal: SkillLevel;
  readonly armorCompensationKinetic: SkillLevel;
  readonly armorCompensationExplosive: SkillLevel;
  readonly armorResistancePhasing: SkillLevel;
  readonly tacticalShieldManipulation: SkillLevel;
  readonly thermodynamics: SkillLevel;
}

export interface StatConditions {
  readonly skillLevel: SkillLevel;
  readonly overloaded: boolean;
  readonly weaponOverloaded: boolean;
  readonly defenseSkills?: DefenseSkills;
}

export function defaultDefenseSkills(level: SkillLevel): DefenseSkills {
  return {
    shieldManagement: level,
    shieldOperation: level,
    hullUpgrades: level,
    mechanics: level,
    shieldCompensationEm: level,
    shieldCompensationThermal: level,
    shieldCompensationKinetic: level,
    shieldCompensationExplosive: level,
    armorCompensationEm: level,
    armorCompensationThermal: level,
    armorCompensationKinetic: level,
    armorCompensationExplosive: level,
    armorResistancePhasing: level,
    tacticalShieldManipulation: level,
    thermodynamics: level,
  };
}

export interface PropulsionStats {
  readonly thrust: number;
  readonly speedBonus: number;
  readonly massAddition: number;
  readonly sigBloom: number;
}

export interface PropulsionModule extends PropulsionStats {
  readonly id: PropulsionId;
  readonly kind: PropulsionKind;
  readonly sizeTier: HullTier;
  readonly label: string;
  readonly iconId: TypeId;
  readonly defaultModuleId: TypeId;
}

export interface FittedHull {
  readonly mass: number;
  readonly massMultiplier: number;
  readonly speedMultiplier: number;
  readonly inertiaMultiplier: number;
  readonly sigMultiplier: number;
  readonly sigRadiusAdd: number;
}
