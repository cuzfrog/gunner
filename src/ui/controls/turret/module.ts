import { asFunction, type AwilixContainer } from "awilix";
import { TurretControllerImpl } from "./turretController";
import type { TurretController, TurretControllerDeps } from "./turretControllerContract";
import { TurretStateResolver } from "./turretStateResolver";

type TurretControllerFactoryDeps = Omit<TurretControllerDeps, "resolver">;

export function registerTurretModule(_cradle: AwilixContainer<object>): void {
  _cradle.register({
    createTurretController: asFunction(() => (deps: TurretControllerFactoryDeps): TurretController => {
      const resolver = new TurretStateResolver({ chargeCatalog: deps.chargeCatalog, fittingImport: deps.fittingImport });
      return new TurretControllerImpl({ ...deps, resolver });
    }),
  });
}
