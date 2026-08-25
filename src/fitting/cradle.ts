import type { GameDataCradle } from "../gamedata";
import type { ChargeCatalog, FittingImport, GunFamilies, PresetFittings } from "./index";
import type { Ships } from "../ships";
import type { StackingPenalty } from "../sim";

export interface FittingCradle extends GameDataCradle {
  readonly chargeCatalog: ChargeCatalog;
  readonly fittingImport: FittingImport;
  readonly gunFamilies: GunFamilies;
  readonly presetFittings: PresetFittings;
  readonly ships: Ships;
  readonly stackingPenalty: StackingPenalty;
}
