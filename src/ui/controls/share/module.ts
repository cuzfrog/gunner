import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { ShareControllerImpl } from "./shareController";
import type { ShareEls } from "./shareControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerShareModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shareController: asFunction(({ els, clipboard, settingsStore, sessionCodec, popupGroup, profileController, profileTextCodec }: ControlsCradle) => new ShareControllerImpl({
      clipboard,
      settingsStore,
      sessionCodec,
      popupGroup,
      els: collectShareEls(els),
      profileController,
      profileTextCodec,
    })).singleton(),
  });
}

function collectShareEls(els: ControlsElements): ShareEls {
  return {
    shareLink: els.shareLink,
    sharePopup: els.sharePopup,
    shareCopyUrl: els.shareCopyUrl,
    shareCopyText: els.shareCopyText,
  };
}
