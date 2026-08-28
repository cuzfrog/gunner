import type { TypeId } from "../../../gamedata/ids";
import type { ImportedFitting } from "../../../fitting";
import type { StatConditions } from "../../../ships";

export interface ShipATurret {
  applyImported(imported: ImportedFitting, conditions: StatConditions): void;
  ammoId(): TypeId;
}
