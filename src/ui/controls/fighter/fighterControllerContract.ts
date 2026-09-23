import type { FighterCatalog, FighterGroup, FighterLoadoutContext, FighterLoadoutResolver, FighterLoadoutValidation, FighterLoadoutValidator, FittingImport, ImportedFighter, ImportedFitting } from "../../../fitting";
import type { FighterSpec } from "../../../sim";
import type { StatConditions } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { UiEvents } from "../../events";
import type { Popup, PopupGroup } from "../popup";
import type { Side } from "../side";

export interface FighterControllerDeps {
  readonly side: Side;
  readonly els: FighterEls;
  readonly fittingImport: FittingImport;
  readonly fighterCatalog: FighterCatalog;
  readonly fighterLoadoutResolver: FighterLoadoutResolver;
  readonly fighterLoadoutValidator: FighterLoadoutValidator;
  readonly imageCatalog: ImageCatalog;
  readonly i18n: I18n;
  readonly events: UiEvents;
  readonly popupGroup: PopupGroup;
}

export interface FighterEls {
  readonly trigger: HTMLButtonElement;
  readonly summary: HTMLElement;
  readonly summaryIcon: HTMLImageElement;
  readonly popup: HTMLElement;
  readonly field: HTMLElement;
  readonly optimal: HTMLElement;
  readonly falloff: HTMLElement;
  readonly damage: HTMLElement;
  readonly cycleTime: HTMLElement;
  readonly maxVelocity: HTMLElement;
  readonly count: HTMLElement;
  readonly loadoutSection: HTMLElement;
  readonly loadoutList: HTMLElement;
  readonly summaryBar: HTMLElement;
  readonly summarySquadrons: HTMLElement;
  readonly summaryCount: HTMLElement;
  readonly summaryHangar: HTMLElement;
  readonly catalogSection: HTMLElement;
  readonly catalogLight: HTMLElement;
  readonly catalogHeavy: HTMLElement;
  readonly catalogSupport: HTMLElement;
}

export interface FighterController {
  readonly side: Side;
  readonly popup: Popup;
  fighters(): readonly ImportedFighter[];
  currentFighterSpecs(): readonly FighterSpec[];
  validation(): FighterLoadoutValidation | undefined;
  applyImported(imported: ImportedFitting, conditions: StatConditions): void;
  restore(fitting?: string, conditions?: StatConditions, fighterGroups?: readonly FighterGroup[]): void;
  updateConditions(conditions: StatConditions): void;
  clear(): void;
  capture(): { fighterGroups: readonly FighterGroup[] };
  isPopupOpen(): boolean;
  openPopup(): void;
  closePopup(): void;
  render(): void;
}
