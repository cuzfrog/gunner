import { asClass, asFunction, type AwilixContainer } from "awilix";
import { TrackingInputImpl } from "../trackingInput";
import type { ControlsCradle } from "../cradle";
import type { Side } from "../side";
import type { TurretController } from "./turretControllerContract";
import { TurretControllerImpl } from "./turretController";
import { TurretStateResolver } from "./turretStateResolver";
import { TurretOverridesStore } from "./turretOverrides";
import { collectTurretEls } from "./turretEls";

type TurretControllerFactoryDeps = Pick<
  ControlsCradle,
  | "els"
  | "chargeCatalog"
  | "fittingImport"
  | "gunFamilies"
  | "turretCatalog"
  | "imageCatalog"
  | "i18n"
  | "ships"
  | "uiEvents"
  | "popupGroup"
  | "turretOverridesBySide"
  | "simValueParser"
>;

export function registerTurretModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shipATurretOverrides: asClass(TurretOverridesStore).singleton(),
    shipBTurretOverrides: asClass(TurretOverridesStore).singleton(),
    turretOverridesBySide: asFunction(({ shipATurretOverrides, shipBTurretOverrides }) => ({
      shipA: shipATurretOverrides,
      shipB: shipBTurretOverrides,
    })).singleton(),
    shipATurretController: asFunction((deps: TurretControllerFactoryDeps) => createTurretController("shipA", deps)).singleton(),
    shipBTurretController: asFunction((deps: TurretControllerFactoryDeps) => createTurretController("shipB", deps)).singleton(),
    turretControllers: asFunction(({ shipATurretController, shipBTurretController }): Record<Side, TurretController> => ({
      shipA: shipATurretController,
      shipB: shipBTurretController,
    })).singleton(),
  });
}

function createTurretController(side: Side, deps: TurretControllerFactoryDeps): TurretControllerImpl {
  const resolver = new TurretStateResolver({ chargeCatalog: deps.chargeCatalog, fittingImport: deps.fittingImport });
  return new TurretControllerImpl({
    side,
    els: collectTurretEls(deps.els, side),
    chargeCatalog: deps.chargeCatalog,
    gunFamilies: deps.gunFamilies,
    turretCatalog: deps.turretCatalog,
    imageCatalog: deps.imageCatalog,
    trackingInput: new TrackingInputImpl(),
    i18n: deps.i18n,
    fittingImport: deps.fittingImport,
    resolver,
    turretOverrides: deps.turretOverridesBySide[side],
    ships: deps.ships,
    events: deps.uiEvents,
    popupGroup: deps.popupGroup,
    simValueParser: deps.simValueParser,
  });
}
