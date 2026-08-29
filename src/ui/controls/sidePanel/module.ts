import { asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { collectSideEls } from "./elements";
import { SidePanelImpl } from "./sidePanel";
import type { Side } from "../side";
import type { SidePanelDeps } from "./sidePanelContract";
import { createPanelOverrides } from "./overrides";
import { createPanelTurretLink } from "./turretLink";
import { createPanelLauncherLink } from "./launcherLink";
import { WeaponSystemSwitchImpl } from "./weaponSystemSwitch";

export function registerSidePanelModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shipASide: asFunction((proxy) => new SidePanelImpl(sideDeps(proxy, "shipA"))).singleton(),
    shipBSide: asFunction((proxy) => new SidePanelImpl(sideDeps(proxy, "shipB"))).singleton(),
    shipAWeaponSystemSwitch: asFunction((proxy) => createWeaponSystemSwitch("shipA", proxy)).singleton(),
    shipBWeaponSystemSwitch: asFunction((proxy) => createWeaponSystemSwitch("shipB", proxy)).singleton(),
    weaponSystemSwitches: asFunction(({ shipAWeaponSystemSwitch, shipBWeaponSystemSwitch }): Record<Side, WeaponSystemSwitchImpl> => ({
      shipA: shipAWeaponSystemSwitch,
      shipB: shipBWeaponSystemSwitch,
    })).singleton(),
  });
}

function createWeaponSystemSwitch(side: Side, deps: ControlsCradle): WeaponSystemSwitchImpl {
  return new WeaponSystemSwitchImpl({
    side,
    turretButton: deps.els[side].weaponSystemTurret,
    missileButton: deps.els[side].weaponSystemMissile,
    droneButton: deps.els[side].weaponSystemDrone,
    turretPanel: deps.els[side].turretPanel,
    launcherPanel: deps.els[side].launcherPanel,
    events: deps.uiEvents,
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
    launcherLink: createPanelLauncherLink(side, proxy.launcherControllers, proxy.popupGroup),
    simValueParser: proxy.simValueParser,
  };
}
