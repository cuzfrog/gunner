import { asClass, type AwilixContainer } from "awilix";
import { DomControls } from "./domControls";

export function registerControlsModule(cradle: AwilixContainer<object>): void {
  cradle.register({
    controls: asClass(DomControls).singleton(),
  });
}
