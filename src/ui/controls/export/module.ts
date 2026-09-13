import { asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { ExportControllerImpl } from "./exportController";

export function registerExportModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    exportController: asFunction(({ clipboard, shipASide, shipBSide }: ControlsCradle) => new ExportControllerImpl({
      clipboard,
      shipASide,
      shipBSide,
    })).singleton(),
  });
}
