import { asClass, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { ShipHintProviderImpl } from "./shipHintProvider";

export function registerShipHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shipHintProvider: asClass(ShipHintProviderImpl).singleton(),
  });
}

export function wireShipHintProvider<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  c.hoverHintController.registerContentProvider("shipProfile", c.shipHintProvider);
}
