import { asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import type { createControlsEls } from "../elements";
import type { Side } from "../side";
import { DroneControllerImpl } from "./droneController";
import type { DroneController, DroneEls } from "./droneControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerDroneModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shipADroneController: asFunction((deps: ControlsCradle) => createDroneController("shipA", deps)).singleton(),
    shipBDroneController: asFunction((deps: ControlsCradle) => createDroneController("shipB", deps)).singleton(),
    droneControllers: asFunction(({ shipADroneController, shipBDroneController }): Record<Side, DroneController> => ({
      shipA: shipADroneController,
      shipB: shipBDroneController,
    })).singleton(),
  });
}

function createDroneController(side: Side, deps: ControlsCradle): DroneControllerImpl {
  return new DroneControllerImpl({
    side,
    els: collectDroneEls(deps.els, side),
    fittingDb: deps.fittingDb,
    fittingImport: deps.fittingImport,
    droneCatalog: deps.droneCatalog,
    ships: deps.ships,
    imageCatalog: deps.imageCatalog,
    i18n: deps.i18n,
    events: deps.uiEvents,
    popupGroup: deps.popupGroup,
    fittingCalculator: deps.fittingCalculator,
  });
}

function collectDroneEls(els: ControlsElements, side: Side): DroneEls {
  const s = els[side];
  return {
    trigger: s.droneTrigger,
    summary: s.droneSummary,
    summaryIcon: s.droneSummaryIcon,
    popup: s.dronePopup,
    list: s.droneList,
    field: s.droneField,
    tracking: s.droneTracking,
    optimal: s.droneOptimal,
    falloff: s.droneFalloff,
    damage: s.droneDamage,
    cycleTime: s.droneCycleTime,
    orbitSpeed: s.droneOrbitSpeed,
    maxVelocity: s.droneMaxVelocity,
    count: s.droneCount,
  };
}
