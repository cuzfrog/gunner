import type { SimConfig, Side, WeaponSpec } from "./types";
import type { DefenseSimConfig } from "./defenseSimulator";

export interface EngineConfig {
  readonly sim: SimConfig;
  readonly weapons: Record<Side, readonly WeaponSpec[]>;
  readonly sigRadii: Record<Side, number>;
  readonly defense: DefenseSimConfig;
  readonly overloaded: Record<Side, boolean>;
}
