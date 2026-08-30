import { asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { registerDpsHintProvider } from "./dpsHintProvider";

export function registerDpsHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    dpsHintProvider: asFunction(({ i18n, turretControllers, launcherControllers, itemNameCatalog, hoverHintController }) => {
      registerDpsHintProvider(hoverHintController, { i18n, turretControllers, launcherControllers, itemNameCatalog });
      return { registered: true };
    }).singleton(),
  });
}
