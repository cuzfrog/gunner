import type { GameDataCradle } from "../gamedata";
import type { ChargeCatalog, FittingImport, GunFamilies, PresetFittings, TurretCatalog } from "./index";
import type { Ships } from "../ships";
import type { StackingPenalty } from "../sim";

export interface FittingCradle extends GameDataCradle {
  readonly chargeCatalog: ChargeCatalog;
  readonly fittingImport: FittingImport;
  readonly gunFamilies: GunFamilies;
  readonly turretCatalog: TurretCatalog;
  readonly presetFittings: PresetFittings;
  readonly ships: Ships;
  readonly stackingPenalty: StackingPenalty;
}
