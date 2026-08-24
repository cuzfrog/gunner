import type { ChargeCatalog, FittingDb, FittingImport, GunFamilies, PresetFittings } from "./index";
import type { ItemNames } from "./itemNames";
import type { Ships } from "../ships";
import type { StackingPenalty } from "../sim";

export interface FittingCradle {
  readonly fittingDb: FittingDb;
  readonly chargeCatalog: ChargeCatalog;
  readonly fittingImport: FittingImport;
  readonly gunFamilies: GunFamilies;
  readonly itemNames: ItemNames;
  readonly presetFittings: PresetFittings;
  readonly ships: Ships;
  readonly stackingPenalty: StackingPenalty;
}
