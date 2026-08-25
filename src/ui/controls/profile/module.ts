import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { ProfileChangeTrackerImpl } from "./profileChangeTracker";
import { ProfileControllerImpl } from "./profileController";
import type { ProfileEls } from "./profileController";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerProfileModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    profileChangeTracker: asFunction(({ profileEquality }: ControlsCradle) =>
      new ProfileChangeTrackerImpl({ equality: profileEquality })
    ).singleton(),
    profileController: asFunction((proxy: ControlsCradle) =>
      new ProfileControllerImpl({
        els: collectProfileEls(proxy.els),
        settingsStore: proxy.settingsStore,
        timer: proxy.timer,
        i18n: proxy.i18n,
        events: proxy.uiEvents,
        confirmController: proxy.confirmController,
        popupGroup: proxy.popupGroup,
        changeTracker: proxy.profileChangeTracker,
        snapshotSource: () => proxy.sessionCodec.captureProfile(),
      })
    ).singleton(),
  });
}

function collectProfileEls(els: ControlsElements): ProfileEls {
  return {
    profileSave: els.profileSave,
    profileSelectTrigger: els.profileSelectTrigger,
    profileSelectLabel: els.profileSelectLabel,
    profilePopup: els.profilePopup,
    profileDelete: els.profileDelete,
    profileNew: els.profileNew,
    newProfilePopup: els.newProfilePopup,
    newProfileName: els.newProfileName,
    newProfileConfirm: els.newProfileConfirm,
    newProfileCancel: els.newProfileCancel,
    shareStatus: els.shareStatus,
  };
}
