import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { collectFittingPopupEls } from "../elements";
import type { Side } from "../sidePanel";
import { DomFittingPreview } from "./fittingPreview";
import { FittingPopupControllerImpl } from "./fittingPopupController";
import { FittingPreviewManagerImpl } from "./fittingPreviewManager";
import { PopupGroupImpl } from "./popupGroup";

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
