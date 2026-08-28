import { asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import type { createControlsEls } from "../elements";
import type { Side } from "../side";
import { LauncherControllerImpl } from "./launcherController";
import type { LauncherController, LauncherEls } from "./launcherControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerLauncherModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shipALauncherController: asFunction((deps: ControlsCradle) => createLauncherController("shipA", deps)).singleton(),
    shipBLauncherController: asFunction((deps: ControlsCradle) => createLauncherController("shipB", deps)).singleton(),
    launcherControllers: asFunction(({ shipALauncherController, shipBLauncherController }): Record<Side, LauncherController> => ({
      shipA: shipALauncherController,
      shipB: shipBLauncherController,
    })).singleton(),
  });
}

function createLauncherController(side: Side, deps: ControlsCradle): LauncherControllerImpl {
  return new LauncherControllerImpl({
    side,
    els: collectLauncherEls(deps.els, side),
    fittingDb: deps.fittingDb,
    fittingImport: deps.fittingImport,
    missileCatalog: deps.missileCatalog,
    launcherCatalog: deps.launcherCatalog,
    launcherClasses: deps.launcherClasses,
    ships: deps.ships,
    imageCatalog: deps.imageCatalog,
    i18n: deps.i18n,
    events: deps.uiEvents,
    popupGroup: deps.popupGroup,
  });
}

function collectLauncherEls(els: ControlsElements, side: Side): LauncherEls {
  const s = els[side];
  return {
    ammoTrigger: s.launcherAmmoTrigger,
    ammoSummary: s.launcherAmmoSummary,
    ammoPopup: s.launcherAmmoPopup,
    ammoList: s.launcherAmmoList,
    classOptions: s.launcherClassOptions,
    attributesTrigger: s.launcherAttributesTrigger,
    attributesSummary: s.launcherAttributesSummary,
    attributesPopup: s.launcherAttributesPopup,
    volleyDamage: s.launcherVolleyDamage,
    rateOfFire: s.launcherRateOfFire,
    explosionRadius: s.launcherExplosionRadius,
    explosionVelocity: s.launcherExplosionVelocity,
    missileVelocity: s.launcherMissileVelocity,
    flightTime: s.launcherFlightTime,
    flightRange: s.launcherFlightRange,
    damageReductionFactor: s.launcherDamageReductionFactor,
  };
}
