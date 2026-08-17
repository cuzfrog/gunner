import { asClass, type AwilixContainer } from "awilix";
import { AppImpl } from "./app";

export function registerAppModule(cradle: AwilixContainer<object>): void {
  cradle.register({
    app: asClass(AppImpl).singleton(),
  });
}
