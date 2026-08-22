import type { StatConditions } from "../../ships";
import type { ChargeCatalog, FittingImport, GunFamilies, ImportedFitting } from "../../fitting";
import type { SigResolutionClass, TurretSpec } from "../../sim";
import type { I18n } from "../i18n";
import type { ImageCatalog } from "../icons";
import type { ProfileParamOverrides } from "../settings";
import type { Popup } from "./popupGroup";
import type { TrackingInput } from "./trackingInput";
import type { TurretEls } from "./turretEls";
import type { TurretStateResolver } from "./turretStateResolver";

export interface TurretControllerDeps {
  readonly els: TurretEls;
  readonly popup: Popup;
  readonly chargeCatalog: ChargeCatalog;
  readonly gunFamilies: GunFamilies;
  readonly imageCatalog: ImageCatalog;
  readonly trackingInput: TrackingInput;
  readonly i18n: I18n;
  readonly fittingImport: FittingImport;
  readonly resolver: TurretStateResolver;
  readonly overrides: () => Partial<ProfileParamOverrides>;
  readonly clearTurretOverrides: () => void;
  readonly onConfigChange: (persist: boolean) => void;
}

export interface TurretController {
  ammo(): string;
  applyImported(imported: ImportedFitting): void;
  restore(settings: { fitting?: string; conditions?: StatConditions; ammo?: string }): void;
  restore(fittingText?: string, conditions?: StatConditions, ammo?: string): void;
  clear(): void;
  currentTurretSpec(trackingOverride?: number): TurretSpec;
  currentSigResClass(): SigResolutionClass;
  capture(): { sigRes: SigResolutionClass; optimal: number; falloff: number; ammo: string };
  isAmmoPopupOpen(): boolean;
  openAmmoPopup(): void;
  closeAmmoPopup(): void;
  render(): void;
}
