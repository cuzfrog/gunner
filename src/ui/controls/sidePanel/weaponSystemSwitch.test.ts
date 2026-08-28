import { WeaponSystemSwitchImpl } from "./weaponSystemSwitch";
import type { WeaponSystemSwitch } from "./weaponSystemSwitch";
import type { TurretController } from "../turret";
import type { LauncherController } from "../launcher";
import type { UiEvents } from "../../events";
import type { Side } from "../side";
import { FakeElement, fakeDocument, getFake } from "../../testing";

function buildSwitch(side: Side = "shipA"): { switch: WeaponSystemSwitch; document: Document } {
  const document = fakeDocument();
  globalThis.document = document;
  const events = vi.mocked<UiEvents>({ emitConfigInvalidated: vi.fn(), onLanguageChanged: vi.fn() });
  const turretController = vi.mocked<TurretController>({
    side,
    popup: {} as never,
    turret: vi.fn(() => undefined),
    ammo: vi.fn(() => ""),
    ammoId: vi.fn(() => "12608" as never),
    applyImported: vi.fn(),
    restore: vi.fn(),
    clear: vi.fn(),
    currentTurretSpec: vi.fn(() => undefined),
    currentSigResClass: vi.fn(() => "S" as never),
    capture: vi.fn(() => ({ tracking: 0, sigRes: "S" as never, optimal: 0, falloff: 0, ammo: "12608" as never })),
    isAmmoPopupOpen: vi.fn(),
    openAmmoPopup: vi.fn(),
    closeAmmoPopup: vi.fn(),
    setTrackingUnit: vi.fn(),
    trackingUnit: vi.fn(() => "rad" as never),
    setHullProfile: vi.fn(),
    render: vi.fn(),
  });
  const launcherController = vi.mocked<LauncherController>({
    side,
    popup: {} as never,
    launcher: vi.fn(() => undefined),
    ammoId: vi.fn(() => undefined),
    currentMissileSpec: vi.fn(() => undefined),
    applyImported: vi.fn(),
    restore: vi.fn(),
    clear: vi.fn(),
    capture: vi.fn(() => ({ ammo: undefined })),
    isAmmoPopupOpen: vi.fn(),
    openAmmoPopup: vi.fn(),
    closeAmmoPopup: vi.fn(),
    render: vi.fn(),
  });
  const prefix = side === "shipA" ? "ship-a" : "ship-b";
  const sw = new WeaponSystemSwitchImpl({
    side,
    container: getFake(document, `${prefix}-weapon-system`),
    turretButton: getFake(document, `${prefix}-weapon-system-turret`) as unknown as HTMLButtonElement,
    missileButton: getFake(document, `${prefix}-weapon-system-missile`) as unknown as HTMLButtonElement,
    turretController,
    launcherController,
    events,
  });
  return { switch: sw, document };
}

describe("WeaponSystemSwitchImpl", () => {
  test("initial state is hidden when neither weapon is fitted", () => {
    const { switch: sw, document } = buildSwitch();
    expect(sw.activeKind()).toBe("turret");
    expect(getFake(document, "ship-a-weapon-system").classList.toggle).toHaveBeenCalledWith("is-hidden", true);
  });

  test("refresh shows the switch when both turret and launcher are fitted", () => {
    const { switch: sw, document } = buildSwitch();
    const turretButton = getFake(document, "ship-a-weapon-system-turret");
    const missileButton = getFake(document, "ship-a-weapon-system-missile");
    (sw as unknown as { turretController: { turret: () => unknown } }).turretController.turret = vi.fn(() => ({}));
    (sw as unknown as { launcherController: { launcher: () => unknown } }).launcherController.launcher = vi.fn(() => ({}));
    sw.refresh();
    expect(getFake(document, "ship-a-weapon-system").classList.toggle).toHaveBeenCalledWith("is-hidden", false);
    expect(turretButton.getAttribute("aria-pressed")).toBe("true");
    expect(missileButton.getAttribute("aria-pressed")).toBe("false");
  });

  test("setActiveKind updates the kind and aria-pressed", () => {
    const { switch: sw, document } = buildSwitch();
    const missileButton = getFake(document, "ship-a-weapon-system-missile");
    sw.setActiveKind("missile");
    expect(sw.activeKind()).toBe("missile");
    expect(missileButton.getAttribute("aria-pressed")).toBe("true");
  });

  test("clicking the missile button switches kind and emits configInvalidated", () => {
    const { switch: sw, document } = buildSwitch();
    const missileButton = getFake(document, "ship-a-weapon-system-missile");
    missileButton.trigger("click");
    expect(sw.activeKind()).toBe("missile");
  });

  test("clear resets to turret kind", () => {
    const { switch: sw } = buildSwitch();
    sw.setActiveKind("missile");
    sw.clear();
    expect(sw.activeKind()).toBe("turret");
  });
});
