import type { ImportedFitting } from "../../../fitting";
import type { StatConditions } from "../../../ships";

export interface ShipALauncher {
  applyImported(imported: ImportedFitting, conditions: StatConditions): void;
}
