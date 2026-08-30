import type { ShipId, TypeId } from "../ids";
import {
  type ChargeStats,
  type DisruptionScriptStats,
  type FittingModuleStats,
  type FittingPropulsionStats,
  type HullBonus,
  type HullBonusAttribute,
  type LauncherStats,
  type MissileStats,
  type SkillBonus,
  type SkillBonusType,
  type StasisGrapplerStats,
  type StasisWebStats,
  type TrackingComputerStats,
  type TrackingDisruptorStats,
  type TurretScriptStats,
  type TurretStats,
  type TurretWeaponGroup,
  type WarpScramblerStats,
  CHARGES,
  DISRUPTION_SCRIPTS,
  DRONES,
  FITTING_MODULES,
  HULL_BONUSES,
  LAUNCHERS,
  MISSILES,
  SCRIPTS,
  SKILL_BONUSES,
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
  HullBonusAttribute,
  LauncherStats,
  MissileStats,
  SkillBonus,
  SkillBonusType,
  StasisGrapplerStats,
  StasisWebStats,
  TrackingComputerStats,
  TrackingDisruptorStats,
  TurretScriptStats,
  TurretStats,
  TurretWeaponGroup,
  WarpScramblerStats,
} from "./fittingDb";

type Row<T> = T & { readonly id: TypeId; readonly name: string };
type DroneEntry = (typeof DRONES)[string];

export interface FittingDbData {
  readonly modules: Readonly<Record<string, Row<FittingModuleStats>>>;
  readonly turrets: Readonly<Record<string, Row<TurretStats>>>;
  readonly charges: Readonly<Record<string, Row<ChargeStats>>>;
  readonly launchers: Readonly<Record<string, Row<LauncherStats>>>;
  readonly missiles: Readonly<Record<string, Row<MissileStats>>>;
  readonly scripts: Readonly<Record<string, Row<TurretScriptStats>>>;
  readonly stasisWebs: Readonly<Record<string, Row<StasisWebStats>>>;
  readonly stasisGrapplers: Readonly<Record<string, Row<StasisGrapplerStats>>>;
  readonly trackingComputers: Readonly<Record<string, Row<TrackingComputerStats>>>;
  readonly trackingDisruptors: Readonly<Record<string, Row<TrackingDisruptorStats>>>;
  readonly warpScramblers: Readonly<Record<string, Row<WarpScramblerStats>>>;
  readonly disruptionScripts: Readonly<Record<string, Row<DisruptionScriptStats>>>;
  readonly hullBonuses: Readonly<Record<ShipId, readonly HullBonus[]>>;
  readonly skillBonuses: readonly SkillBonus[];
  readonly drones: Readonly<Record<string, DroneEntry>>;
}

export type FittingDb = FittingDbData;

export const FITTING_DB: FittingDbData = {
  modules: FITTING_MODULES,
  turrets: TURRETS,
  charges: CHARGES,
  launchers: LAUNCHERS,
  missiles: MISSILES,
  scripts: SCRIPTS,
  stasisWebs: STASIS_WEBS,
  stasisGrapplers: STASIS_GRAPPLERS,
  trackingComputers: TRACKING_COMPUTERS,
  trackingDisruptors: TRACKING_DISRUPTORS,
  warpScramblers: WARP_SCRAMBLERS,
  disruptionScripts: DISRUPTION_SCRIPTS,
  hullBonuses: HULL_BONUSES,
  skillBonuses: SKILL_BONUSES,
  drones: DRONES,
};
