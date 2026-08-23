import { asClass, type AwilixContainer } from "awilix";
import { I18nImpl } from "./i18nImpl";
import type { I18n } from "./i18nImpl";

interface I18nCradle {
  readonly i18n: I18n;
}

export function registerI18nModule<T extends I18nCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    i18n: asClass(I18nImpl).singleton(),
  });
}
