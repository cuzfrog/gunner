import type { FittingImport, ImportedFitting, PresetFittings } from "../../fitting";
import type { SavedFittings } from "../settings";
import type { I18n } from "../i18n";
import type { ImageCatalog } from "../icons";
import { FittingPopupController } from "./fittingPopupController";
import type { FittingPreviewManager } from "./fittingPreviewManager";
import { PopupGroup } from "./popupGroup";
import type { Side, SidePanel } from "./sidePanel";
import type { Els } from "./elementsContract";
import { collectFittingPopupEls } from "./elements";

export interface FittingPopupBuilderDeps {
  popupGroup: PopupGroup;
  savedFittings: SavedFittings;
  presetFittings: PresetFittings;
  fittingImport: FittingImport;
  imageCatalog: ImageCatalog;
  i18n: I18n;
  panelFor: (side: Side) => SidePanel;
  previews: FittingPreviewManager;
}

export class FittingPopupBuilder {
  private readonly deps: FittingPopupBuilderDeps;

  constructor(deps: FittingPopupBuilderDeps) {
    this.deps = deps;
  }

  create(
    side: Side,
    els: Els,
    applyFitting: (text: string) => ImportedFitting | undefined,
  ): FittingPopupController {
    return new FittingPopupController({
      side,
      ...this.deps,
      els: collectFittingPopupEls(els, side),
      applyFitting,
    });
  }
}
