import { asClass, type AwilixContainer } from "awilix";
import { DomControls } from "./controls";
import { I18nImpl } from "./i18n";
import { StaticImageCatalog } from "./icons";
import { RafLoop } from "./loop";
import { LocalSavedFittings, LocalSettingsStore } from "./settings";
import { CanvasRenderer } from "./renderer";
import { DefaultTimer } from "./timer";

export function registerUiModule(cradle: AwilixContainer<object>): void {
  cradle.register({
    controls: asClass(DomControls).singleton(),
    i18n: asClass(I18nImpl).singleton(),
    settingsStore: asClass(LocalSettingsStore).singleton(),
    savedFittings: asClass(LocalSavedFittings).singleton(),
    renderer: asClass(CanvasRenderer).singleton(),
    loop: asClass(RafLoop).singleton(),
    timer: asClass(DefaultTimer).singleton(),
    imageCatalog: asClass(StaticImageCatalog).singleton(),
  });
}
