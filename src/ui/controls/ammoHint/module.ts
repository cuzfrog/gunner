import { asClass, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { AmmoHintProviderImpl } from "./ammoHintProvider";

export function registerAmmoHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    ammoHintProvider: asClass(AmmoHintProviderImpl).singleton(),
  });
}

export function wireAmmoHintProvider<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  c.hoverHintController.registerContentProvider("ammo-hint", c.ammoHintProvider);
}
