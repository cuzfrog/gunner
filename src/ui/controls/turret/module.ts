import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { TrackingInputImpl } from "../trackingInput";
import type { Side } from "../side";
import type { TurretController } from "./turretControllerContract";
import { TurretControllerImpl } from "./turretController";
import { TurretStateResolver } from "./turretStateResolver";
import { TurretOverridesStore } from "./turretOverrides";
import { collectTurretEls, type TurretEls } from "./turretEls";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerTurretModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shipATurretOverrides: asClass(TurretOverridesStore).singleton(),
    shipBTurretOverrides: asClass(TurretOverridesStore).singleton(),
    turretOverridesBySide: asFunction(({ shipATurretOverrides, shipBTurretOverrides }) => ({
      shipA: shipATurretOverrides,
      shipB: shipBTurretOverrides,
    })).singleton(),
    shipATurretController: asFunction((cradle) => createTurretController("shipA", cradle as unknown as ControlsCradle)).singleton(),
    shipBTurretController: asFunction((cradle) => createTurretController("shipB", cradle as unknown as ControlsCradle)).singleton(),
    turretControllers: asFunction(({ shipATurretController, shipBTurretController }): Record<Side, TurretController> => ({
      shipA: shipATurretController,
      shipB: shipBTurretController,
    })).singleton(),
  });
}

function createTurretController(side: Side, cradle: ControlsCradle): TurretControllerImpl {
  const overrides = side === "shipA" ? cradle.shipATurretOverrides : cradle.shipBTurretOverrides;
  const resolver = new TurretStateResolver({ chargeCatalog: cradle.chargeCatalog, fittingImport: cradle.fittingImport });
  return new TurretControllerImpl({
    side,
    els: collectTurretEls(cradle.els, side),
    chargeCatalog: cradle.chargeCatalog,
    gunFamilies: cradle.gunFamilies,
    imageCatalog: cradle.imageCatalog,
    trackingInput: new TrackingInputImpl(),
    i18n: cradle.i18n,
    fittingImport: cradle.fittingImport,
    resolver,
    turretOverrides: overrides,
    ships: cradle.ships,
    events: cradle.uiEvents,
    popupGroup: cradle.popupGroup,
  });
}
