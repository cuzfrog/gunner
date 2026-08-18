import { asClass, type AwilixContainer } from "awilix";
import { DomControls } from "./controls";
import { I18nImpl } from "./i18n";
import { RafLoop } from "./loop";
import { LocalSettingsStore } from "./settings";
import { CanvasRenderer } from "./renderer";

export function registerUiModule(cradle: AwilixContainer<object>): void {
  cradle.register({
    controls: asClass(DomControls).singleton(),
    i18n: asClass(I18nImpl).singleton(),
    settingsStore: asClass(LocalSettingsStore).singleton(),
    renderer: asClass(CanvasRenderer).singleton(),
    loop: asClass(RafLoop).singleton(),
  });
}
