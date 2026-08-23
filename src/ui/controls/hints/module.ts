import { asFunction, type AwilixContainer } from "awilix";
import type { I18n } from "../../i18n";
import type { Timer } from "../../timer";
import { HINT_CANDIDATES, LORES, TIP_TEXT } from "./hints";
import { HintRotatorImpl } from "./hintRotator";
import type { HintRotator } from "./hintRotator";

interface HintRotatorDeps {
  readonly element: HTMLElement;
  readonly i18n: I18n;
  readonly timer: Timer;
  readonly intervalMs?: number;
}

export function registerHintsModule(cradle: AwilixContainer<object>): void {
  cradle.register({
    createHintRotator: asFunction(() => (deps: HintRotatorDeps): HintRotator => new HintRotatorImpl({
      ...deps,
      candidates: HINT_CANDIDATES,
      tipText: TIP_TEXT,
      lores: LORES,
    })),
  });
}
