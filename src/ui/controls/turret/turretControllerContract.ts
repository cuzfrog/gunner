import type { ShipProfile, Ships, SkillLevel, StatConditions } from "../../../ships";
import type { TypeId } from "../../../gamedata/ids";
import type { ChargeCatalog, FittingCalculator, FittingImport, FittingOverridesStore, GunFamilies, ImportedFitting, ImportedTurret } from "../../../fitting";
import type { SigResolutionClass, SimValueParser, TurretSpec } from "../../../sim";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { TrackingUnit } from "../../../appstate";
import type { Popup } from "../popup";
import type { TurretEls } from "./turretEls";
import type { TurretOverrides } from "./turretOverrides";
import type { TurretStateResolver } from "./turretStateResolver";
import type { UiEvents } from "../../events";
import type { PopupGroup } from "../popup";
import type { Side } from "../side";
import type { TrackingInput } from "../trackingInput";
import type { DimensionedSelection, TurretDimension } from "../../selectionSession";

export interface TurretControllerDeps {
  readonly side: Side;
  readonly els: TurretEls;
  readonly chargeCatalog: ChargeCatalog;
  readonly gunFamilies: GunFamilies;
  readonly imageCatalog: ImageCatalog;
  readonly trackingInput: TrackingInput;
  readonly i18n: I18n;
  readonly fittingImport: FittingImport;
  readonly resolver: TurretStateResolver;
  readonly turretOverrides: TurretOverrides;
  readonly ships: Ships;
  readonly events: UiEvents;
  readonly popupGroup: PopupGroup;
  readonly simValueParser: SimValueParser;
  readonly fittingCalculator: FittingCalculator;
  readonly fittingOverrides: FittingOverridesStore;
  readonly turretSelection: DimensionedSelection<TurretDimension>;
}

export interface TurretController {
  readonly side: Side;
  readonly popup: Popup;
  turret(): ImportedTurret | undefined;
  ammo(): string;
  ammoId(): TypeId;
  applyImported(imported: ImportedFitting, conditions: StatConditions): void;
  restore(
    fitting?: string,
    conditions?: StatConditions,
    ammo?: string,
    tracking?: number,
    sigRes?: SigResolutionClass,
    optimal?: number,
    falloff?: number,
  ): void;
  restore(settings: {
    fitting?: string;
    conditions?: StatConditions;
    ammo?: string;
    tracking?: number;
    sigRes?: SigResolutionClass;
    optimal?: number;
    falloff?: number;
  }): void;
  clear(): void;
  currentTurretSpec(trackingOverride?: number): TurretSpec | undefined;
  currentTurretSpecs(trackingOverride?: number): readonly TurretSpec[];
  currentSigResClass(): SigResolutionClass;
  capture(): { tracking: number; sigRes: SigResolutionClass; optimal: number; falloff: number; ammo: TypeId };
  isAmmoPopupOpen(): boolean;
  openAmmoPopup(): void;
  closeAmmoPopup(): void;
  setTrackingUnit(unit: TrackingUnit): void;
  trackingUnit(): TrackingUnit;
  setHullProfile(profile: ShipProfile | undefined): void;
  render(): void;
}
