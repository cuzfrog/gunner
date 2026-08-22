import { asClass, type AwilixContainer } from "awilix";
import { StaticImageCatalog } from "./imageCatalog";

export function registerIconsModule(cradle: AwilixContainer<object>): void {
  cradle.register({
    imageCatalog: asClass(StaticImageCatalog).singleton(),
  });
}
