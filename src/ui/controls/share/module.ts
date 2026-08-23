import { asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import type { Els } from "../elementsContract";
import { ShareControllerImpl } from "./shareController";
import type { ShareEls } from "./shareControllerContract";

export function registerShareModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shareController: asFunction(({ els, clipboard, settingsStore, sessionCodec, popupGroup, profileController }: ControlsCradle) => new ShareControllerImpl({
      clipboard,
      settingsStore,
      sessionCodec,
      popupGroup,
      els: collectShareEls(els),
      profileController,
    })).singleton(),
  });
}

function collectShareEls(els: Els): ShareEls {
  return {
    shareLink: els.shareLink,
    sharePopup: els.sharePopup,
    shareCopyUrl: els.shareCopyUrl,
    shareCopyText: els.shareCopyText,
  };
}
