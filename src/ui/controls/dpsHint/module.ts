import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { DpsHintProviderImpl } from "./dpsHintProvider";
import { DpsHintRendererImpl } from "./dpsHintRenderer";

export function registerDpsHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    dpsHintRenderer: asFunction(({ i18n }) => new DpsHintRendererImpl({ t: (key) => i18n.t(key) })).singleton(),
    dpsHintProvider: asClass(DpsHintProviderImpl).singleton(),
  });
}

export function wireDpsHintProvider<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  c.hoverHintController.registerContentProvider("dps", c.dpsHintProvider);
}
