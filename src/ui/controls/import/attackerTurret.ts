import type { ImportedFitting } from "../../../fitting";

export interface AttackerTurret {
  applyImported(imported: ImportedFitting): void;
  ammo(): string;
}
