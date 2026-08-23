import { asClass, type AwilixContainer } from "awilix";
import { AppImpl } from "./app";
import type { AppCradle } from "./cradle";

export function registerAppModule<T extends AppCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    app: asClass(AppImpl).singleton(),
  });
}
