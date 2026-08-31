import type { GameDataCradle } from "../gamedata";
import type { ChargeCatalog, DroneCatalog, DroneLoadoutResolver, DroneLoadoutValidator, DroneSkillModel, FittingCalculator, FittingImport, GunFamilies, LauncherClasses, MissileCatalog, MissileSkillModel, PresetFittings } from "./index";
import type { Ships } from "../ships";
import type { StackingPenalty } from "../sim";

export interface FittingCradle extends GameDataCradle {
  readonly chargeCatalog: ChargeCatalog;
  readonly droneCatalog: DroneCatalog;
  readonly droneLoadoutResolver: DroneLoadoutResolver;
  readonly droneLoadoutValidator: DroneLoadoutValidator;
  readonly droneSkillModel: DroneSkillModel;
  readonly fittingCalculator: FittingCalculator;
  readonly fittingImport: FittingImport;
  readonly gunFamilies: GunFamilies;
  readonly launcherClasses: LauncherClasses;
  readonly missileCatalog: MissileCatalog;
  readonly missileSkillModel: MissileSkillModel;
  readonly presetFittings: PresetFittings;
  readonly ships: Ships;
  readonly stackingPenalty: StackingPenalty;
}
