import { asClass, type AwilixContainer } from "awilix";
import { registerAppstateModule } from "../appstate";
import { registerControlsModule } from "./controls";
import { registerI18nModule } from "./i18n";
import { registerIconsModule } from "./icons";
import { UiEventsImpl } from "./events";
import { RafLoop } from "./loop";
import { CanvasRenderer } from "./renderer";
import { DefaultTimer } from "./timer";

export function registerUiModule(cradle: AwilixContainer<object>): void {
  cradle.register({
    uiEvents: asClass(UiEventsImpl).singleton(),
  });
  registerControlsModule(cradle);
  registerI18nModule(cradle);
  registerAppstateModule(cradle);
  registerIconsModule(cradle);
  cradle.register({
    renderer: asClass(CanvasRenderer).singleton(),
    loop: asClass(RafLoop).singleton(),
    timer: asClass(DefaultTimer).singleton(),
  });
}
