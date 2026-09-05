import { asClass, type AwilixContainer } from "awilix";
import { registerAppstateModule } from "../appstate";
import { registerControlsModule } from "./controls";
import { registerI18nModule } from "./i18n";
import { registerIconsModule } from "./icons";
import { UiEventsImpl } from "./events";
import { RafLoop } from "./loop";
import { CanvasRenderer } from "./renderer";
import { DefaultTimer } from "./timer";
import { ViewStreamImpl } from "./viewStream";
import type { UiCradle } from "./cradle";

export function registerUiModule<T extends UiCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    uiEvents: asClass(UiEventsImpl).singleton(),
  });
  registerI18nModule(cradle);
  registerIconsModule(cradle);
  registerAppstateModule(cradle);
  cradle.register({
    timer: asClass(DefaultTimer).singleton(),
    viewStream: asClass(ViewStreamImpl).singleton(),
  });
  registerControlsModule(cradle);
  cradle.register({
    renderer: asClass(CanvasRenderer).singleton(),
    loop: asClass(RafLoop).singleton(),
  });
}
