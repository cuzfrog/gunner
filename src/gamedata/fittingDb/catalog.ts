import type { ShipId, TypeId } from "../ids";
import {
  type ChargeStats,
  type DisruptionScriptStats,
  type FittingModuleStats,
  type FittingPropulsionStats,
  type HullBonus,
  type HullBonusAttribute,
  type LauncherStats,
  type MissileGuidanceComputerStats,
  type MissileGuidanceEnhancerStats,
  type MissileScriptStats,
  type MissileStats,
  type SkillBonus,
  type SkillBonusType,
  type StasisGrapplerStats,
  type StasisWebStats,
  type TargetPainterStats,
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
  MISSILE_GUIDANCE_COMPUTERS,
  MISSILE_GUIDANCE_ENHANCERS,
  MISSILE_SCRIPTS,
  SCRIPTS,
  SKILL_BONUSES,
  STASIS_GRAPPLERS,
  STASIS_WEBS,
  TARGET_PAINTERS,
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
  MissileGuidanceComputerStats,
  MissileGuidanceEnhancerStats,
  MissileScriptStats,
  MissileStats,
  SkillBonus,
  SkillBonusType,
  StasisGrapplerStats,
  StasisWebStats,
  TargetPainterStats,
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
  readonly targetPainters: Readonly<Record<string, Row<TargetPainterStats>>>;
  readonly missileGuidanceComputers: Readonly<Record<string, Row<MissileGuidanceComputerStats>>>;
  readonly missileGuidanceEnhancers: Readonly<Record<string, Row<MissileGuidanceEnhancerStats>>>;
  readonly missileScripts: Readonly<Record<string, Row<MissileScriptStats>>>;
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
  targetPainters: TARGET_PAINTERS,
  missileGuidanceComputers: MISSILE_GUIDANCE_COMPUTERS,
  missileGuidanceEnhancers: MISSILE_GUIDANCE_ENHANCERS,
  missileScripts: MISSILE_SCRIPTS,
  hullBonuses: HULL_BONUSES,
  skillBonuses: SKILL_BONUSES,
  drones: DRONES,
};
