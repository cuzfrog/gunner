import { asClass, type AwilixContainer } from "awilix";
import { registerControlsModule } from "./controls";
import { registerI18nModule } from "./i18n";
import { registerIconsModule } from "./icons";
import { registerSettingsModule } from "./settings";
import { RafLoop } from "./loop";
import { CanvasRenderer } from "./renderer";
import { DefaultTimer } from "./timer";

export function registerUiModule(cradle: AwilixContainer<object>): void {
  registerControlsModule(cradle);
  registerI18nModule(cradle);
  registerSettingsModule(cradle);
  registerIconsModule(cradle);
  cradle.register({
    renderer: asClass(CanvasRenderer).singleton(),
    loop: asClass(RafLoop).singleton(),
    timer: asClass(DefaultTimer).singleton(),
  });
}
