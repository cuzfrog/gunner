import { asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { HoverHintControllerImpl } from "./hoverHintController";

export function registerHoverHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    hoverHintController: asFunction(({ els, timer, viewStream }) => new HoverHintControllerImpl({
      hintEl: els.hoverHint,
      timer,
      viewStream,
    })).singleton(),
  });
}
