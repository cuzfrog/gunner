import { asClass, type AwilixContainer } from "awilix";
import { ShipsImpl } from "./ships";
import type { ShipsCradle } from "./cradle";

export function registerShipsModule<T extends ShipsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({ ships: asClass(ShipsImpl).singleton() });
}
