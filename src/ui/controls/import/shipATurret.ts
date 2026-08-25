import type { ImportedFitting } from "../../../fitting";

export interface ShipATurret {
  applyImported(imported: ImportedFitting): void;
  ammo(): string;
}
