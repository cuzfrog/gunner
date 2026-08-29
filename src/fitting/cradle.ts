import type { GameDataCradle } from "../gamedata";
import type { ChargeCatalog, FittingImport, GunFamilies, LauncherCatalog, LauncherClasses, MissileCatalog, MissileSkillModel, PresetFittings, TurretCatalog } from "./index";
import type { Ships } from "../ships";
import type { StackingPenalty } from "../sim";

export interface FittingCradle extends GameDataCradle {
  readonly chargeCatalog: ChargeCatalog;
  readonly fittingImport: FittingImport;
  readonly gunFamilies: GunFamilies;
  readonly launcherCatalog: LauncherCatalog;
  readonly launcherClasses: LauncherClasses;
  readonly missileCatalog: MissileCatalog;
  readonly missileSkillModel: MissileSkillModel;
  readonly turretCatalog: TurretCatalog;
  readonly presetFittings: PresetFittings;
  readonly ships: Ships;
  readonly stackingPenalty: StackingPenalty;
}
