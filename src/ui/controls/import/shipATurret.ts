import type { TypeId } from "../../../gamedata/ids";
import type { ImportedFitting } from "../../../fitting";

export interface ShipATurret {
  applyImported(imported: ImportedFitting): void;
  ammoId(): TypeId;
}
