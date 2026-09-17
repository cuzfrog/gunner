import { asClass, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { DroneHintProviderImpl } from "./droneHintProvider";

export function registerDroneHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    droneHintProvider: asClass(DroneHintProviderImpl).singleton(),
  });
}

export function wireDroneHintProvider<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  c.hoverHintController.registerContentProvider("drone", c.droneHintProvider);
}
