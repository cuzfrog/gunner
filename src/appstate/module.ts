import { asClass, type AwilixContainer } from "awilix";
import { registerProfileTextModule } from "./profileText";
import { LocalSavedFittings } from "./savedFittings";
import { LocalSettingsStore } from "./localSettingsStore";
import { SettingsParser } from "./settingsParser";
import type { AppstateCradle } from "./cradle";

export function registerAppstateModule<T extends AppstateCradle>(cradle: AwilixContainer<T>): void {
  registerProfileTextModule(cradle);
  cradle.register({
    settingsStore: asClass(LocalSettingsStore).singleton(),
    parser: asClass(SettingsParser).singleton(),
    savedFittings: asClass(LocalSavedFittings).singleton(),
  });
}
