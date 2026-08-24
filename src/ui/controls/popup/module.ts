import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import type { Side } from "../sidePanel";
import { DomFittingPreview } from "./fittingPreview";
import { FittingPopupControllerImpl } from "./fittingPopupController";
import { FittingPreviewManagerImpl } from "./fittingPreviewManager";
import { PopupGroupImpl } from "./popupGroup";
import type { FittingPopupEls } from "./fittingPopupEls";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerPopupModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    popupGroup: asClass(PopupGroupImpl).singleton(),
    attackerFittingPreview: asFunction((proxy) => new DomFittingPreview(previewDeps(proxy, "attacker"))).singleton(),
    targetFittingPreview: asFunction((proxy) => new DomFittingPreview(previewDeps(proxy, "target"))).singleton(),
    previewManager: asFunction((proxy) => new FittingPreviewManagerImpl({
      fittingImport: proxy.fittingImport,
      imageCatalog: proxy.imageCatalog,
      i18n: proxy.i18n,
      attackerSide: proxy.attackerSide,
      targetSide: proxy.targetSide,
      previewsBySide: { attacker: proxy.attackerFittingPreview, target: proxy.targetFittingPreview },
      shipImageBySide: { attacker: proxy.els.attackerShipImage, target: proxy.els.targetShipImage },
      eyeBySide: { attacker: proxy.els.attackerFittingEye, target: proxy.els.targetFittingEye },
      events: proxy.uiEvents,
    })).singleton(),
    attackerFittingPopup: asFunction((proxy) => new FittingPopupControllerImpl(popupDeps(proxy, "attacker"))).singleton(),
    targetFittingPopup: asFunction((proxy) => new FittingPopupControllerImpl(popupDeps(proxy, "target"))).singleton(),
  });
}

function previewDeps<T extends ControlsCradle>(proxy: T, side: Side) {
  return {
    container: side === "attacker" ? proxy.els.attackerFittingPreview : proxy.els.targetFittingPreview,
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
    imageCatalog: proxy.imageCatalog,
    i18n: proxy.i18n,
    els: collectFittingPopupEls(proxy.els, side),
    panel: side === "attacker" ? proxy.attackerSide : proxy.targetSide,
    applyFitting: (text: string) => proxy.importController.importEftFitting(side, text, true),
    previews: proxy.previewManager,
    events: proxy.uiEvents,
  };
}

function collectFittingPopupEls(els: ControlsElements, side: Side): FittingPopupEls {
  if (side === "attacker") {
    return {
      trigger: els.attackerFittingTrigger,
      eye: els.attackerFittingEye,
      popup: els.attackerFittingPopup,
      savedList: els.attackerFittingSavedList,
      presetList: els.attackerFittingPresetList,
      savedLabel: els.attackerFittingSavedLabel,
      presetLabel: els.attackerFittingPresetLabel,
      empty: els.attackerFittingEmpty,
      shipImage: els.attackerShipImage,
    };
  }
  return {
    trigger: els.targetFittingTrigger,
    eye: els.targetFittingEye,
    popup: els.targetFittingPopup,
    savedList: els.targetFittingSavedList,
    presetList: els.targetFittingPresetList,
    savedLabel: els.targetFittingSavedLabel,
    presetLabel: els.targetFittingPresetLabel,
    empty: els.targetFittingEmpty,
    shipImage: els.targetShipImage,
  };
}
