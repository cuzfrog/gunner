import { asClass, type AwilixContainer } from "awilix";
import type { AppstateCradle } from "..";
import { LocalProfileTextCodec } from "./profileTextCodec";

export function registerProfileTextModule<T extends AppstateCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({ profileTextCodec: asClass(LocalProfileTextCodec).singleton() });
}
