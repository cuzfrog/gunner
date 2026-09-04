import { asClass, asFunction, type AwilixContainer } from "awilix";
import { TrackingInputImpl } from "../trackingInput";
import type { ControlsCradle } from "../cradle";
import type { Side } from "../side";
import type { TurretController } from "./turretControllerContract";
import { TurretControllerImpl } from "./turretController";
import { TurretStateResolver } from "./turretStateResolver";
import { TurretOverridesStore } from "./turretOverrides";
import { collectTurretEls } from "./turretEls";
import { FittingOverridesStoreImpl } from "../../../fitting";
import { createTurretSelection } from "../../selectionSession";

type TurretControllerFactoryDeps = Pick<
  ControlsCradle,
  | "els"
  | "chargeCatalog"
  | "fittingImport"
  | "gunFamilies"
  | "imageCatalog"
  | "i18n"
  | "ships"
  | "uiEvents"
  | "popupGroup"
  | "turretOverridesBySide"
  | "simValueParser"
  | "fittingCalculator"
  | "fittingOverridesBySide"
  | "selectionSessionBySide"
>;

export function registerTurretModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shipATurretOverrides: asClass(TurretOverridesStore).singleton(),
    shipBTurretOverrides: asClass(TurretOverridesStore).singleton(),
    turretOverridesBySide: asFunction(({ shipATurretOverrides, shipBTurretOverrides }) => ({
      shipA: shipATurretOverrides,
      shipB: shipBTurretOverrides,
    })).singleton(),
    shipAFittingOverrides: asClass(FittingOverridesStoreImpl).singleton(),
    shipBFittingOverrides: asClass(FittingOverridesStoreImpl).singleton(),
    fittingOverridesBySide: asFunction(({ shipAFittingOverrides, shipBFittingOverrides }) => ({
      shipA: shipAFittingOverrides,
      shipB: shipBFittingOverrides,
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
  const session = deps.selectionSessionBySide[side];
  return new TurretControllerImpl({
    side,
    els: collectTurretEls(deps.els, side),
    chargeCatalog: deps.chargeCatalog,
    gunFamilies: deps.gunFamilies,
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
    fittingCalculator: deps.fittingCalculator,
    fittingOverrides: deps.fittingOverridesBySide[side],
    turretSelection: createTurretSelection(session, deps.gunFamilies),
  });
}
