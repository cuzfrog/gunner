import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { InflictedDpsHintProviderImpl } from "./inflictedDpsHintProvider";
import { InflictedDpsHintRendererImpl } from "./inflictedDpsHintRenderer";

export function registerInflictedDpsHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    inflictedDpsHintRenderer: asFunction(({ i18n }) => new InflictedDpsHintRendererImpl({ t: (key) => i18n.t(key) })).singleton(),
    inflictedDpsHintProvider: asClass(InflictedDpsHintProviderImpl).singleton(),
  });
}

export function wireInflictedDpsHintProvider<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  c.hoverHintController.registerContentProvider("inflictedDps", c.inflictedDpsHintProvider);
}
