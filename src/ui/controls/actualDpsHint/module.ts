import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { ActualDpsHintProviderImpl } from "./actualDpsHintProvider";
import { ActualDpsHintRendererImpl } from "./actualDpsHintRenderer";

export function registerActualDpsHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    actualDpsHintRenderer: asFunction(({ i18n }) => new ActualDpsHintRendererImpl({ t: (key) => i18n.t(key) })).singleton(),
    actualDpsHintProvider: asClass(ActualDpsHintProviderImpl).singleton(),
  });
}

export function wireActualDpsHintProvider<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  c.hoverHintController.registerContentProvider("actualDps", c.actualDpsHintProvider);
}
