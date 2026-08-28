import { asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { collectSideEls } from "./elements";
import { SidePanelImpl } from "./sidePanel";
import type { Side } from "../side";
import type { SidePanelDeps } from "./sidePanelContract";
import { createPanelOverrides } from "./overrides";
import { createPanelTurretLink } from "./turretLink";

export function registerSidePanelModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shipASide: asFunction((proxy) => new SidePanelImpl(sideDeps(proxy, "shipA"))).singleton(),
    shipBSide: asFunction((proxy) => new SidePanelImpl(sideDeps(proxy, "shipB"))).singleton(),
  });
}

function sideDeps<T extends ControlsCradle>(proxy: T, side: Side): SidePanelDeps {
  return {
    side,
    popupGroup: proxy.popupGroup,
    els: collectSideEls(proxy.els, side),
    i18n: proxy.i18n,
    ships: proxy.ships,
    fittingImport: proxy.fittingImport,
    imageCatalog: proxy.imageCatalog,
    timer: proxy.timer,
    events: proxy.uiEvents,
    overrides: createPanelOverrides(side, proxy.turretOverridesBySide),
    turretLink: createPanelTurretLink(side, proxy.turretControllers, proxy.popupGroup),
    simValueParser: proxy.simValueParser,
  };
}
