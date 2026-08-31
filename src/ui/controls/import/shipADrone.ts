import type { ImportedFitting } from "../../../fitting";
import type { StatConditions } from "../../../ships";

export interface ShipADrone {
  applyImported(imported: ImportedFitting, conditions: StatConditions): void;
}
