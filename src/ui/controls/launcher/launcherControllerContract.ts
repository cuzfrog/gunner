import type { FittingDb, FittingImport, MissileCatalog, MissileOption } from "../../../fitting";
import type { ImportedFitting, ImportedLauncher } from "../../../fitting";
import type { HullBonus } from "../../../gamedata/fittingDb";
import type { TypeId } from "../../../gamedata/ids";
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
  readonly panel: HTMLElement;
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
  ammoId(): TypeId;
  applyImported(imported: ImportedFitting, conditions: StatConditions, hullBonuses: readonly HullBonus[]): void;
  restore(fitting?: string, conditions?: StatConditions, ammo?: string, hullBonuses?: readonly HullBonus[]): void;
  clear(): void;
  capture(): { ammo: TypeId };
  isAmmoPopupOpen(): boolean;
  openAmmoPopup(): void;
  closeAmmoPopup(): void;
  render(): void;
}
