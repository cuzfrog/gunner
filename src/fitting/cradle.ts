import type { ChargeCatalog, FittingDb, FittingImport, GunFamilies, PresetFittings } from "./index";
import type { Ships } from "../ships";

export interface FittingCradle {
  readonly fittingDb: FittingDb;
  readonly chargeCatalog: ChargeCatalog;
  readonly fittingImport: FittingImport;
  readonly gunFamilies: GunFamilies;
  readonly presetFittings: PresetFittings;
  readonly ships: Ships;
}
