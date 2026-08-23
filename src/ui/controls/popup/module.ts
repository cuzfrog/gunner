import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { FittingImport, ImportedFitting, PresetFittings } from "../../../fitting";
import type { SavedFittings } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { Side, SidePanel } from "../sidePanel";
import type { UiEvents } from "../../events";
import { DomFittingPreview } from "./fittingPreview";
import type { FittingPreview } from "./fittingPreview";
import { FittingPopupControllerImpl } from "./fittingPopupController";
import type { FittingPopupController, FittingPopupEls } from "./fittingPopupController";
import { FittingPreviewManagerImpl } from "./fittingPreviewManager";
import type { FittingPreviewManager } from "./fittingPreviewManager";
import { PopupGroupImpl } from "./popupGroup";
import type { Popup, PopupGroup } from "./popupGroup";

interface FittingPreviewDeps {
  readonly container: HTMLElement;
  readonly i18n: I18n;
  readonly imageCatalog: ImageCatalog;
  readonly viewport: () => { readonly innerWidth: number; readonly innerHeight: number };
}

interface FittingPreviewManagerDeps {
  readonly fittingImport: FittingImport;
  readonly imageCatalog: ImageCatalog;
  readonly i18n: I18n;
  readonly attackerSide: SidePanel;
  readonly targetSide: SidePanel;
  readonly previewsBySide: Readonly<Record<Side, FittingPreview>>;
  readonly shipImageBySide: Readonly<Record<Side, HTMLImageElement>>;
  readonly eyeBySide: Readonly<Record<Side, HTMLButtonElement>>;
  readonly events: UiEvents;
}

interface FittingPopupControllerDeps {
  readonly side: Side;
  readonly popupGroup: PopupGroup;
  readonly savedFittings: SavedFittings;
  readonly presetFittings: PresetFittings;
  readonly fittingImport: FittingImport;
  readonly imageCatalog: ImageCatalog;
  readonly i18n: I18n;
  readonly els: FittingPopupEls;
  readonly panel: SidePanel;
  readonly applyFitting: (text: string) => ImportedFitting | undefined;
  readonly previews: FittingPreviewManager;
  readonly events: UiEvents;
}

export function registerPopupModule(cradle: AwilixContainer<object>): void {
  cradle.register({
    popupGroup: asClass(PopupGroupImpl).singleton(),
    createFittingPreview: asFunction(() => (deps: FittingPreviewDeps): FittingPreview => new DomFittingPreview(deps)),
    createFittingPreviewManager: asFunction(() => (deps: FittingPreviewManagerDeps): FittingPreviewManager => new FittingPreviewManagerImpl(deps)),
    createFittingPopupController: asFunction(() => (deps: FittingPopupControllerDeps): FittingPopupController => new FittingPopupControllerImpl(deps)),
  });
}
