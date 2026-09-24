import { asClass, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { PortraitEffectHintProviderImpl } from "./portraitEffectHintProvider";

export function registerPortraitEffectHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    portraitEffectHintProvider: asClass(PortraitEffectHintProviderImpl).singleton(),
  });
}

export function wirePortraitEffectHintProvider<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  c.hoverHintController.registerContentProvider("portraitEffect", c.portraitEffectHintProvider);
}
