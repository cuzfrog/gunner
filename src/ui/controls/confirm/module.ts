import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { ConfirmControllerImpl } from "./confirmController";
import type { ConfirmEls } from "./confirmController";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerConfirmModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    confirmController: asFunction(({ els, popupGroup, i18n }: ControlsCradle) =>
      new ConfirmControllerImpl({ popupGroup, i18n, els: collectConfirmEls(els) })
    ).singleton(),
  });
}

function collectConfirmEls(els: ControlsElements): ConfirmEls {
  return {
    confirmPopup: els.confirmPopup,
    confirmMessage: els.confirmMessage,
    confirmOk: els.confirmOk,
    confirmCancel: els.confirmCancel,
  };
}
