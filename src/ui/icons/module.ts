import { asClass, type AwilixContainer } from "awilix";
import { StaticImageCatalog } from "./imageCatalog";
import type { ImageCatalog } from "./imageCatalog";

interface IconsCradle {
  readonly imageCatalog: ImageCatalog;
}

export function registerIconsModule<T extends IconsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    imageCatalog: asClass(StaticImageCatalog).singleton(),
  });
}
