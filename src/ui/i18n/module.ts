import { asClass, type AwilixContainer } from "awilix";
import { I18nImpl } from "./i18nImpl";

export function registerI18nModule(cradle: AwilixContainer<object>): void {
  cradle.register({
    i18n: asClass(I18nImpl).singleton(),
  });
}
