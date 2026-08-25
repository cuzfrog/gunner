import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import { TurretControllerImpl } from "./turretController";
import { TurretStateResolver } from "./turretStateResolver";
import { TurretOverridesStore } from "./turretOverrides";
import type { TurretEls } from "./turretEls";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerTurretModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    turretOverrides: asClass(TurretOverridesStore).singleton(),
    turretController: asFunction(({
      els, chargeCatalog, gunFamilies, imageCatalog, trackingInput, i18n, fittingImport, turretOverrides, ships, uiEvents, popupGroup,
    }) => {
      const resolver = new TurretStateResolver({ chargeCatalog, fittingImport });
      return new TurretControllerImpl({
        els: collectTurretEls(els),
        chargeCatalog,
        gunFamilies,
        imageCatalog,
        trackingInput,
        i18n,
        fittingImport,
        resolver,
        turretOverrides,
        ships,
        events: uiEvents,
        popupGroup,
      });
    }).singleton(),
  });
}

function collectTurretEls(els: ControlsElements): TurretEls {
  return {
    tracking: els.tracking,
    sigRes: els.sigRes,
    sigResOptions: els.sigResOptions,
    optimal: els.optimal,
    falloff: els.falloff,
    shipAAmmoTrigger: els.shipAAmmoTrigger,
    shipAAmmoSummary: els.shipAAmmoSummary,
    shipAAmmoSummaryIcon: els.shipAAmmoSummaryIcon,
    shipAAmmoPopup: els.shipAAmmoPopup,
    shipAAmmoCargoLabel: els.shipAAmmoCargoLabel,
    shipAAmmoCargoList: els.shipAAmmoCargoList,
    shipAAmmoExpand: els.shipAAmmoExpand,
    shipAAmmoAllSection: els.shipAAmmoAllSection,
    shipAAmmoAllList: els.shipAAmmoAllList,
  };
}
