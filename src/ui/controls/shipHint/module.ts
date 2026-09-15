import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { ShipHintProviderImpl } from "./shipHintProvider";
import { ShipHintRendererImpl } from "./shipHintRenderer";

export function registerShipHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shipHintRenderer: asFunction(() => new ShipHintRendererImpl()).singleton(),
    shipHintProvider: asClass(ShipHintProviderImpl).singleton(),
  });
}

export function wireShipHintProvider<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  c.hoverHintController.registerContentProvider("shipProfile", c.shipHintProvider);
}
