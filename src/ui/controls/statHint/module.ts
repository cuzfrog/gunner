import { asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { StatHintRendererImpl } from "./statHintRenderer";

export function registerStatHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    statHintRenderer: asFunction(() => new StatHintRendererImpl()).singleton(),
  });
}
