import type {
  ChargeStats,
  DisruptionScriptStats,
  FittingModuleStats,
  FittingPropulsionStats,
  HullBonus,
  StasisGrapplerStats,
  StasisWebStats,
  TrackingComputerStats,
  TrackingDisruptorStats,
  TurretScriptStats,
  TurretStats,
  WarpScramblerStats,
} from "./fittingDb";
import {
  CHARGES,
  DISRUPTION_SCRIPTS,
  DRONES,
  FITTING_MODULES,
  HULL_BONUSES,
  SCRIPTS,
  STASIS_GRAPPLERS,
  STASIS_WEBS,
  TRACKING_COMPUTERS,
  TRACKING_DISRUPTORS,
  TURRETS,
  WARP_SCRAMBLERS,
} from "./fittingDb";

export type {
  ChargeStats,
  DisruptionScriptStats,
  FittingModuleStats,
  FittingPropulsionStats,
  HullBonus,
  StasisGrapplerStats,
  StasisWebStats,
  TrackingComputerStats,
  TrackingDisruptorStats,
  TurretScriptStats,
  TurretStats,
  WarpScramblerStats,
} from "./fittingDb";

export interface FittingDbData {
  readonly modules: Readonly<Record<string, FittingModuleStats>>;
  readonly turrets: Readonly<Record<string, TurretStats>>;
  readonly charges: Readonly<Record<string, ChargeStats>>;
  readonly scripts: Readonly<Record<string, TurretScriptStats>>;
  readonly stasisWebs: Readonly<Record<string, StasisWebStats>>;
  readonly stasisGrapplers: Readonly<Record<string, StasisGrapplerStats>>;
  readonly trackingComputers: Readonly<Record<string, TrackingComputerStats>>;
  readonly trackingDisruptors: Readonly<Record<string, TrackingDisruptorStats>>;
  readonly warpScramblers: Readonly<Record<string, WarpScramblerStats>>;
  readonly disruptionScripts: Readonly<Record<string, DisruptionScriptStats>>;
  readonly hullBonuses: Readonly<Record<string, readonly HullBonus[]>>;
  readonly drones: Readonly<Record<string, true>>;
}

export type FittingDb = FittingDbData;

export const FITTING_DB: FittingDbData = {
  modules: FITTING_MODULES,
  turrets: TURRETS,
  charges: CHARGES,
  scripts: SCRIPTS,
  stasisWebs: STASIS_WEBS,
  stasisGrapplers: STASIS_GRAPPLERS,
  trackingComputers: TRACKING_COMPUTERS,
  trackingDisruptors: TRACKING_DISRUPTORS,
  warpScramblers: WARP_SCRAMBLERS,
  disruptionScripts: DISRUPTION_SCRIPTS,
  hullBonuses: HULL_BONUSES,
  drones: DRONES,
};
