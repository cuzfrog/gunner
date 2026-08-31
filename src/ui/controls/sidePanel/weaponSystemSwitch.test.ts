import { WeaponSystemSwitchImpl } from "./weaponSystemSwitch";
import type { WeaponSystemSwitch } from "./weaponSystemSwitch";
import { UiEventsImpl } from "../../events";
import type { UiEvents } from "../../events";
import type { Side } from "../side";
import { fakeDocument, getFake } from "../../testing";

function buildSwitch(side: Side = "shipA"): { switch: WeaponSystemSwitch; document: Document; events: UiEvents } {
  const document = fakeDocument();
  globalThis.document = document;
  const events = new UiEventsImpl();
  const prefix = side === "shipA" ? "ship-a" : "ship-b";
  const sw = new WeaponSystemSwitchImpl({
    side,
    turretButton: document.getElementById(`${prefix}-weapon-system-turret`)! as HTMLButtonElement,
    missileButton: document.getElementById(`${prefix}-weapon-system-missile`)! as HTMLButtonElement,
    droneButton: document.getElementById(`${prefix}-weapon-system-drone`)! as HTMLButtonElement,
    turretPanel: document.getElementById(`${prefix}-turret-panel`)!,
    launcherPanel: document.getElementById(`${prefix}-launcher-panel`)!,
    dronePanel: document.getElementById(`${prefix}-drone-panel`)!,
    events,
  });
  return { switch: sw, document, events };
}

describe("WeaponSystemSwitchImpl", () => {
  test("initial state defaults to turret kind, shows turret panel", () => {
    const { switch: sw, document } = buildSwitch();
    expect(sw.activeKind()).toBe("turret");
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(false);
    expect(getFake(document, "ship-a-launcher-panel").hidden).toBe(true);
  });

  test("turret and missile buttons are always enabled regardless of equipment", () => {
    const { document } = buildSwitch();
    expect(getFake(document, "ship-a-weapon-system-turret").disabled).toBe(false);
    expect(getFake(document, "ship-a-weapon-system-missile").disabled).toBe(false);
  });

  test("drone button is enabled alongside turret and missile", () => {
    const { document } = buildSwitch();
    expect(getFake(document, "ship-a-weapon-system-drone").disabled).toBe(false);
  });

  test("setActiveKind updates the kind, panel visibility, and aria-pressed", () => {
    const { switch: sw, document } = buildSwitch();
    sw.setActiveKind("missile");
    expect(sw.activeKind()).toBe("missile");
    expect(getFake(document, "ship-a-weapon-system-missile").getAttribute("aria-pressed")).toBe("true");
    expect(getFake(document, "ship-a-weapon-system-turret").getAttribute("aria-pressed")).toBe("false");
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(true);
    expect(getFake(document, "ship-a-launcher-panel").hidden).toBe(false);
  });

  test("clicking the missile button switches kind and emits configInvalidated", () => {
    const { switch: sw, document, events } = buildSwitch();
    const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
    getFake(document, "ship-a-weapon-system-missile").trigger("click");
    expect(sw.activeKind()).toBe("missile");
    expect(emitConfigInvalidated).toHaveBeenCalled();
  });

  test("clicking the active kind button again does not emit configInvalidated", () => {
    const { switch: sw, document, events } = buildSwitch();
    const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
    getFake(document, "ship-a-weapon-system-turret").trigger("click");
    expect(sw.activeKind()).toBe("turret");
    expect(emitConfigInvalidated).not.toHaveBeenCalled();
  });

  test("clear resets to turret kind", () => {
    const { switch: sw, document } = buildSwitch();
    sw.setActiveKind("missile");
    sw.clear();
    expect(sw.activeKind()).toBe("turret");
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(false);
    expect(getFake(document, "ship-a-launcher-panel").hidden).toBe(true);
  });

  test("switching between turret and missile toggles panel visibility", () => {
    const { switch: sw, document } = buildSwitch();
    sw.setActiveKind("missile");
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(true);
    expect(getFake(document, "ship-a-launcher-panel").hidden).toBe(false);
    sw.setActiveKind("turret");
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(false);
    expect(getFake(document, "ship-a-launcher-panel").hidden).toBe(true);
  });

  test("autoToggle switches to missile when only launcher is available", () => {
    const { switch: sw, document } = buildSwitch();
    sw.autoToggle(false, true, false);
    expect(sw.activeKind()).toBe("missile");
    expect(getFake(document, "ship-a-launcher-panel").hidden).toBe(false);
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(true);
  });

  test("autoToggle switches to turret when only turret is available", () => {
    const { switch: sw, document } = buildSwitch();
    sw.setActiveKind("missile");
    sw.autoToggle(true, false, false);
    expect(sw.activeKind()).toBe("turret");
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(false);
    expect(getFake(document, "ship-a-launcher-panel").hidden).toBe(true);
  });

  test("autoToggle keeps current kind when both weapon types are available", () => {
    const { switch: sw } = buildSwitch();
    sw.setActiveKind("missile");
    sw.autoToggle(true, true, false);
    expect(sw.activeKind()).toBe("missile");
  });

  test("autoToggle keeps current kind when neither weapon type is available", () => {
    const { switch: sw } = buildSwitch();
    sw.autoToggle(false, false, false);
    expect(sw.activeKind()).toBe("turret");
  });

  test("autoToggle switches to drone when only drone is available", () => {
    const { switch: sw, document } = buildSwitch();
    sw.autoToggle(false, false, true);
    expect(sw.activeKind()).toBe("drone");
    expect(getFake(document, "ship-a-drone-panel").hidden).toBe(false);
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(true);
  });

  test("autoToggle keeps current kind when turret and drone are available", () => {
    const { switch: sw } = buildSwitch();
    sw.setActiveKind("drone");
    sw.autoToggle(true, false, true);
    expect(sw.activeKind()).toBe("drone");
  });

  test("autoToggle keeps current kind when launcher and drone are available", () => {
    const { switch: sw } = buildSwitch();
    sw.setActiveKind("drone");
    sw.autoToggle(false, true, true);
    expect(sw.activeKind()).toBe("drone");
  });

  test("autoToggle keeps current kind when all weapon types are available", () => {
    const { switch: sw } = buildSwitch();
    sw.setActiveKind("drone");
    sw.autoToggle(true, true, true);
    expect(sw.activeKind()).toBe("drone");
  });
});
