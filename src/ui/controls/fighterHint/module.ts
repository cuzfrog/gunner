import { asClass, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { FighterHintProviderImpl } from "./fighterHintProvider";

export function registerFighterHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    fighterHintProvider: asClass(FighterHintProviderImpl).singleton(),
  });
}

export function wireFighterHintProvider<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  c.hoverHintController.registerContentProvider("fighter", c.fighterHintProvider);
}
