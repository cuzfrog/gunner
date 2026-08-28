import { WeaponSystemSwitchImpl } from "./weaponSystemSwitch";
import type { WeaponSystemSwitch } from "./weaponSystemSwitch";
import type { TurretController } from "../turret";
import type { LauncherController } from "../launcher";
import type { TrackingUnit } from "../../../appstate";
import { UiEventsImpl } from "../../events";
import type { UiEvents } from "../../events";
import type { MissileSpec, SigResolutionClass, TurretSpec } from "../../../sim";
import type { ImportedFitting, ImportedTurret } from "../../../fitting";
import type { ShipProfile, StatConditions } from "../../../ships";
import type { TypeId } from "../../../gamedata/ids";
import type { Popup } from "../popup";
import type { Side } from "../side";
import { fakeDocument, getFake } from "../../testing";

class StubTurretController implements TurretController {
  readonly side: Side;
  popup: Popup = { isOpen: vi.fn(), open: vi.fn(), close: vi.fn(), focusTrigger: vi.fn(), contains: vi.fn() };
  turret = vi.fn(() => undefined as ImportedTurret | undefined);
  ammo = vi.fn(() => "");
  ammoId = vi.fn(() => "12608" as TypeId);
  applyImported = vi.fn();
  restore(settings: { fitting?: string; conditions?: StatConditions; ammo?: string; tracking?: number; sigRes?: SigResolutionClass; optimal?: number; falloff?: number }): void;
  restore(fittingText?: string, conditions?: StatConditions, ammo?: string, tracking?: number, sigRes?: SigResolutionClass, optimal?: number, falloff?: number): void;
  restore(..._args: unknown[]): void {}
  clear = vi.fn();
  currentTurretSpec = vi.fn((): TurretSpec | undefined => undefined);
  currentSigResClass = vi.fn((): SigResolutionClass => "S");
  capture = vi.fn(() => ({ tracking: 0, sigRes: "S" as const, optimal: 0, falloff: 0, ammo: "12608" as TypeId }));
  isAmmoPopupOpen = vi.fn();
  openAmmoPopup = vi.fn();
  closeAmmoPopup = vi.fn();
  setTrackingUnit = vi.fn();
  trackingUnit = vi.fn((): TrackingUnit => "rad");
  setHullProfile = vi.fn((_profile: ShipProfile | undefined) => {});
  render = vi.fn();

  constructor(side: Side) {
    this.side = side;
  }
}

class StubLauncherController implements LauncherController {
  readonly side: Side;
  popup: Popup = { isOpen: vi.fn(), open: vi.fn(), close: vi.fn(), focusTrigger: vi.fn(), contains: vi.fn() };
  launcher = vi.fn(() => undefined);
  ammoId = vi.fn(() => undefined);
  currentMissileSpec = vi.fn((): MissileSpec | undefined => undefined);
  applyImported = vi.fn();
  restore = vi.fn();
  setHullProfile = vi.fn((_profile: ShipProfile | undefined) => {});
  clear = vi.fn();
  capture = vi.fn(() => ({ ammo: undefined }));
  isAmmoPopupOpen = vi.fn();
  openAmmoPopup = vi.fn();
  closeAmmoPopup = vi.fn();
  render = vi.fn();

  constructor(side: Side) {
    this.side = side;
  }
}

function buildSwitch(side: Side = "shipA"): { switch: WeaponSystemSwitch; document: Document; events: UiEvents; turretController: StubTurretController; launcherController: StubLauncherController } {
  const document = fakeDocument();
  globalThis.document = document;
  const events = new UiEventsImpl();
  const turretController = new StubTurretController(side);
  const launcherController = new StubLauncherController(side);
  const prefix = side === "shipA" ? "ship-a" : "ship-b";
  const sw = new WeaponSystemSwitchImpl({
    side,
    container: document.getElementById(`${prefix}-weapon-system`)!,
    turretButton: document.getElementById(`${prefix}-weapon-system-turret`)! as HTMLButtonElement,
    missileButton: document.getElementById(`${prefix}-weapon-system-missile`)! as HTMLButtonElement,
    droneButton: document.getElementById(`${prefix}-weapon-system-drone`)! as HTMLButtonElement,
    turretPanel: document.getElementById(`${prefix}-turret-panel`)!,
    launcherPanel: document.getElementById(`${prefix}-launcher-panel`)!,
    turretController,
    launcherController,
    events,
  });
  return { switch: sw, document, events, turretController, launcherController };
}

describe("WeaponSystemSwitchImpl", () => {
  test("initial state defaults to turret kind with both panels hidden when no weapon is fitted", () => {
    const { switch: sw, document } = buildSwitch();
    expect(sw.activeKind()).toBe("turret");
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(true);
    expect(getFake(document, "ship-a-launcher-panel").hidden).toBe(true);
  });

  test("refresh enables turret button and disables missile button when only turret is fitted", () => {
    const { switch: sw, document, turretController } = buildSwitch();
    turretController.turret.mockReturnValue({} as ImportedTurret);
    sw.refresh();
    expect(getFake(document, "ship-a-weapon-system-turret").disabled).toBe(false);
    expect(getFake(document, "ship-a-weapon-system-missile").disabled).toBe(true);
    expect(getFake(document, "ship-a-weapon-system-turret").getAttribute("aria-pressed")).toBe("true");
    expect(getFake(document, "ship-a-weapon-system-missile").getAttribute("aria-pressed")).toBe("false");
  });

  test("setActiveKind updates the kind and aria-pressed", () => {
    const { switch: sw, document, turretController, launcherController } = buildSwitch();
    turretController.turret.mockReturnValue({} as ImportedTurret);
    launcherController.launcher.mockReturnValue({} as never);
    sw.setActiveKind("missile");
    expect(sw.activeKind()).toBe("missile");
    expect(getFake(document, "ship-a-weapon-system-missile").getAttribute("aria-pressed")).toBe("true");
  });

  test("clicking the missile button switches kind and emits configInvalidated", () => {
    const { switch: sw, document, events, turretController, launcherController } = buildSwitch();
    turretController.turret.mockReturnValue({} as ImportedTurret);
    launcherController.launcher.mockReturnValue({} as never);
    sw.refresh();
    const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
    getFake(document, "ship-a-weapon-system-missile").trigger("click");
    expect(sw.activeKind()).toBe("missile");
    expect(emitConfigInvalidated).toHaveBeenCalled();
  });

  test("clear resets to turret kind", () => {
    const { switch: sw, turretController, launcherController } = buildSwitch();
    turretController.turret.mockReturnValue({} as ImportedTurret);
    launcherController.launcher.mockReturnValue({} as never);
    sw.setActiveKind("missile");
    sw.clear();
    expect(sw.activeKind()).toBe("turret");
  });

  test("falls back to missile when turret becomes unavailable and only launcher is fitted", () => {
    const { switch: sw, turretController, launcherController } = buildSwitch();
    turretController.turret.mockReturnValue(undefined);
    launcherController.launcher.mockReturnValue({} as never);
    sw.setActiveKind("turret");
    sw.refresh();
    expect(sw.activeKind()).toBe("missile");
  });

  test("turret-only fit shows turret panel, hides launcher panel", () => {
    const { switch: sw, document, turretController } = buildSwitch();
    turretController.turret.mockReturnValue({} as ImportedTurret);
    sw.refresh();
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(false);
    expect(getFake(document, "ship-a-launcher-panel").hidden).toBe(true);
  });

  test("launcher-only fit shows launcher panel, hides turret panel", () => {
    const { switch: sw, document, turretController, launcherController } = buildSwitch();
    turretController.turret.mockReturnValue(undefined);
    launcherController.launcher.mockReturnValue({} as never);
    sw.refresh();
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(true);
    expect(getFake(document, "ship-a-launcher-panel").hidden).toBe(false);
    expect(sw.activeKind()).toBe("missile");
  });

  test("mixed fit shows only the active kind panel", () => {
    const { switch: sw, document, turretController, launcherController } = buildSwitch();
    turretController.turret.mockReturnValue({} as ImportedTurret);
    launcherController.launcher.mockReturnValue({} as never);
    sw.setActiveKind("missile");
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(true);
    expect(getFake(document, "ship-a-launcher-panel").hidden).toBe(false);
    sw.setActiveKind("turret");
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(false);
    expect(getFake(document, "ship-a-launcher-panel").hidden).toBe(true);
  });

  test("drone button is always disabled", () => {
    const { document } = buildSwitch();
    expect(getFake(document, "ship-a-weapon-system-drone").disabled).toBe(true);
  });
});
