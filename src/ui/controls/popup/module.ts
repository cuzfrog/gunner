import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import type { Side } from "../side";
import { DomFittingPreview } from "./fittingPreview";
import { FittingPopupControllerImpl } from "./fittingPopupController";
import { FittingPreviewManagerImpl } from "./fittingPreviewManager";
import { PopupGroupImpl } from "./popupGroup";
import type { FittingPopupEls } from "./fittingPopupEls";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerPopupModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    popupGroup: asClass(PopupGroupImpl).singleton(),
    shipAFittingPreview: asFunction((proxy) => new DomFittingPreview(previewDeps(proxy, "shipA"))).singleton(),
    shipBFittingPreview: asFunction((proxy) => new DomFittingPreview(previewDeps(proxy, "shipB"))).singleton(),
    previewManager: asFunction((proxy) => new FittingPreviewManagerImpl({
      fittingImport: proxy.fittingImport,
      imageCatalog: proxy.imageCatalog,
      i18n: proxy.i18n,
      shipASide: proxy.shipASide,
      shipBSide: proxy.shipBSide,
      previewsBySide: { shipA: proxy.shipAFittingPreview, shipB: proxy.shipBFittingPreview },
      eyeBySide: { shipA: proxy.els.shipA.fittingEye, shipB: proxy.els.shipB.fittingEye },
      events: proxy.uiEvents,
    })).singleton(),
    shipAFittingPopup: asFunction((proxy) => new FittingPopupControllerImpl(popupDeps(proxy, "shipA"))).singleton(),
    shipBFittingPopup: asFunction((proxy) => new FittingPopupControllerImpl(popupDeps(proxy, "shipB"))).singleton(),
  });
}

function previewDeps<T extends ControlsCradle>(proxy: T, side: Side) {
  return {
    container: proxy.els[side].fittingPreview,
    i18n: proxy.i18n,
    imageCatalog: proxy.imageCatalog,
    fittingImport: proxy.fittingImport,
    viewport: () => window,
  };
}

function popupDeps<T extends ControlsCradle>(proxy: T, side: Side) {
  return {
    side,
    popupGroup: proxy.popupGroup,
    savedFittings: proxy.savedFittings,
    presetFittings: proxy.presetFittings,
    fittingImport: proxy.fittingImport,
    i18n: proxy.i18n,
    els: collectFittingPopupEls(proxy.els, side),
    panel: side === "shipA" ? proxy.shipASide : proxy.shipBSide,
    applyFitting: (text: string) => proxy.importController.importEftFitting(side, text, true),
    previews: proxy.previewManager,
    events: proxy.uiEvents,
  };
}

function collectFittingPopupEls(els: ControlsElements, side: Side): FittingPopupEls {
  const combatant = els[side];
  return {
    trigger: combatant.shipSelectTrigger,
    eye: combatant.fittingEye,
    popup: combatant.shipSelectPopup,
    hull: combatant.hull,
    savedList: combatant.fittingSavedList,
    presetList: combatant.fittingPresetList,
    savedLabel: combatant.fittingSavedLabel,
    presetLabel: combatant.fittingPresetLabel,
    empty: combatant.fittingEmpty,
  };
}
