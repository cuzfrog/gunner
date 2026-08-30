import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { AmmoHintProviderImpl } from "./ammoHintProvider";
import { AmmoHintRendererImpl } from "./ammoHintRenderer";

export function registerAmmoHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    ammoHintRenderer: asFunction(({ i18n }) => new AmmoHintRendererImpl({ t: (key) => i18n.t(key) })).singleton(),
    ammoHintProvider: asClass(AmmoHintProviderImpl).singleton(),
  });
}

export function wireAmmoHintProvider<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  c.hoverHintController.registerContentProvider("ammo-hint", c.ammoHintProvider);
}
