import type { FittingImport, ImportedFitting, PresetFittings } from "../../fitting";
import type { I18n } from "../i18n";
import type { ImageCatalog } from "../imageCatalog";
import type { SavedFittings } from "../savedFittings";
import { FittingPopupController, type FittingPopupEls } from "./fittingPopupController";
import { collectFittingPopupEls } from "./elementSlices";
import type { Els } from "./elements";
import type { FittingPreviewManager } from "./fittingPreviewManager";
import type { PopupGroup } from "./popupGroup";
import type { Side, SidePanel } from "./sidePanel";

export interface FittingPopupFactoryDeps {
  readonly popupGroup: PopupGroup;
  readonly savedFittings: SavedFittings;
  readonly presetFittings: PresetFittings;
  readonly fittingImport: FittingImport;
  readonly imageCatalog: ImageCatalog;
  readonly i18n: I18n;
  readonly panelFor: (side: Side) => SidePanel;
  readonly applyFitting: (text: string) => ImportedFitting | undefined;
  readonly previews: FittingPreviewManager;
}

export function createFittingPopup(side: Side, deps: FittingPopupFactoryDeps, els: Els): FittingPopupController {
  return new FittingPopupController({
    side,
    popupGroup: deps.popupGroup,
    savedFittings: deps.savedFittings,
    presetFittings: deps.presetFittings,
    fittingImport: deps.fittingImport,
    imageCatalog: deps.imageCatalog,
    i18n: deps.i18n,
    els: collectFittingPopupEls(els, side),
    panelFor: deps.panelFor,
    applyFitting: deps.applyFitting,
    previews: deps.previews,
  });
}
