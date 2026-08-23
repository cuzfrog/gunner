import { asFunction, type AwilixContainer } from "awilix";
import { HINT_CANDIDATES, LORES, TIP_TEXT } from "../../i18n";
import type { ControlsCradle } from "../cradle";
import { HintRotatorImpl } from "./hintRotator";

export function registerHintsModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    hintRotator: asFunction(({ hintElement, i18n, timer, uiEvents }) => new HintRotatorImpl({
      element: hintElement,
      i18n,
      timer,
      events: uiEvents,
      candidates: HINT_CANDIDATES,
      tipText: TIP_TEXT,
      lores: LORES,
    })).singleton(),
  });
}
