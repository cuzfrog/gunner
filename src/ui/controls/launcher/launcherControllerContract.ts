import type { FittingDb, FittingImport, ImportedFitting, ImportedLauncher, MissileCatalog } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { MissileSpec } from "../../../sim";
import type { SkillLevel, StatConditions } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import type { Popup } from "../popup";
import type { PopupGroup } from "../popup";
import type { Side } from "../side";

export interface LauncherControllerDeps {
  readonly side: Side;
  readonly els: LauncherEls;
  readonly fittingDb: FittingDb;
  readonly fittingImport: FittingImport;
  readonly missileCatalog: MissileCatalog;
  readonly imageCatalog: ImageCatalog;
  readonly i18n: I18n;
  readonly events: UiEvents;
  readonly popupGroup: PopupGroup;
}

export interface LauncherEls {
  readonly ammoTrigger: HTMLButtonElement;
  readonly ammoSummary: HTMLElement;
  readonly ammoPopup: HTMLElement;
  readonly ammoList: HTMLElement;
  readonly volleyDamage: HTMLElement;
  readonly rateOfFire: HTMLElement;
  readonly explosionRadius: HTMLElement;
  readonly explosionVelocity: HTMLElement;
  readonly missileVelocity: HTMLElement;
  readonly flightTime: HTMLElement;
  readonly flightRange: HTMLElement;
}

export interface LauncherController {
  readonly side: Side;
  readonly popup: Popup;
  launcher(): ImportedLauncher | undefined;
  ammoId(): TypeId | undefined;
  currentMissileSpec(): MissileSpec | undefined;
  applyImported(imported: ImportedFitting, conditions: StatConditions): void;
  restore(fitting?: string, conditions?: StatConditions, ammoId?: TypeId): void;
  clear(): void;
  capture(): { ammo: TypeId | undefined };
  isAmmoPopupOpen(): boolean;
  openAmmoPopup(): void;
  closeAmmoPopup(): void;
  render(): void;
}
