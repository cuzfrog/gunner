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
  readonly name: string;
  readonly faction: string;
  readonly hullType: string;
  readonly mass: number;
  readonly inertiaModifier: number;
  readonly baseSpeed: number;
  readonly sigRadius: number;
}

export type SkillLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface StatConditions {
  readonly skillLevel: SkillLevel;
  readonly overloaded: boolean;
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
}

export interface FittedHull {
  readonly mass: number;
  readonly massMultiplier: number;
  readonly speedMultiplier: number;
  readonly inertiaMultiplier: number;
  readonly sigMultiplier: number;
  readonly sigRadiusAdd: number;
}
