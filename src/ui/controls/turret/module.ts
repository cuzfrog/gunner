import { asClass, asFunction, type AwilixContainer } from "awilix";
import { TurretControllerImpl } from "./turretController";
import type { TurretController, TurretControllerDeps } from "./turretControllerContract";
import { TurretStateResolver } from "./turretStateResolver";
import { TurretOverridesStore, type TurretOverrides } from "./turretOverrides";

type TurretControllerFactoryDeps = Omit<TurretControllerDeps, "resolver">;

interface TurretCradle {
  readonly turretOverrides: TurretOverrides;
  readonly createTurretController: (deps: TurretControllerFactoryDeps) => TurretController;
}

export function registerTurretModule<T extends TurretCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    turretOverrides: asClass(TurretOverridesStore).singleton(),
    createTurretController: asFunction(() => (deps: TurretControllerFactoryDeps): TurretController => {
      const resolver = new TurretStateResolver({ chargeCatalog: deps.chargeCatalog, fittingImport: deps.fittingImport });
      return new TurretControllerImpl({ ...deps, resolver });
    }),
  });
}
