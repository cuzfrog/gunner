import { asClass, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { ModuleHintProviderImpl } from "./moduleHintProvider";

export function registerModuleHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    moduleHintProvider: asClass(ModuleHintProviderImpl).singleton(),
  });
}

export function wireModuleHintProvider<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  c.hoverHintController.registerContentProvider("module", c.moduleHintProvider);
}
