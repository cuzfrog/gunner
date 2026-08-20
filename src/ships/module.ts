import { asClass, type AwilixContainer } from "awilix";
import { ShipsImpl } from "./ships";

export function registerShipsModule(cradle: AwilixContainer<object>): void {
  cradle.register({ ships: asClass(ShipsImpl).singleton() });
}
