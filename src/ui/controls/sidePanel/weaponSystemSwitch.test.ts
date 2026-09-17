import { EMPTY_DAMAGE_BREAKDOWN, type ImportedLauncher, type ImportedTurret } from "../../../fitting";
import type { DroneSpec } from "../../../sim";
import type { TypeId } from "../../../gamedata/ids";
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

  test("autoSelectPrimary switches to missile when only a launcher is fitted", () => {
    const { switch: sw, document } = buildSwitch();
    sw.autoSelectPrimary({ launcher: launcherOf(30, 2, 2) });
    expect(sw.activeKind()).toBe("missile");
    expect(getFake(document, "ship-a-launcher-panel").hidden).toBe(false);
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(true);
  });

  test("autoSelectPrimary switches to turret when only a turret is fitted", () => {
    const { switch: sw, document } = buildSwitch();
    sw.setActiveKind("missile");
    sw.autoSelectPrimary({ turret: turretOf(50, 2, 1) });
    expect(sw.activeKind()).toBe("turret");
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(false);
    expect(getFake(document, "ship-a-launcher-panel").hidden).toBe(true);
  });

  test("autoSelectPrimary switches to drone when only drones are fitted", () => {
    const { switch: sw, document } = buildSwitch();
    sw.autoSelectPrimary({ drones: [droneGroupOf(25, 2, 4)] });
    expect(sw.activeKind()).toBe("drone");
    expect(getFake(document, "ship-a-drone-panel").hidden).toBe(false);
    expect(getFake(document, "ship-a-turret-panel").hidden).toBe(true);
  });

  test("autoSelectPrimary picks the drone system when its dps is the highest", () => {
    const { switch: sw } = buildSwitch();
    sw.autoSelectPrimary({ turret: turretOf(40, 2, 1), drones: [droneGroupOf(30, 2, 4)] });
    expect(sw.activeKind()).toBe("drone");
  });

  test("autoSelectPrimary picks the turret system when its dps is the highest", () => {
    const { switch: sw } = buildSwitch();
    sw.setActiveKind("drone");
    sw.autoSelectPrimary({ turret: turretOf(50, 2, 2), drones: [droneGroupOf(20, 2, 4)] });
    expect(sw.activeKind()).toBe("turret");
  });

  test("autoSelectPrimary picks the missile system when its dps is the highest", () => {
    const { switch: sw } = buildSwitch();
    sw.autoSelectPrimary({ launcher: launcherOf(45, 2, 2), drones: [droneGroupOf(20, 2, 4)] });
    expect(sw.activeKind()).toBe("missile");
  });

  test("autoSelectPrimary sums drone group dps across groups", () => {
    const { switch: sw } = buildSwitch();
    const groups = [droneGroupOf(30, 2, 2), droneGroupOf(30, 2, 4)];
    sw.autoSelectPrimary({ turret: turretOf(40, 2, 1), drones: groups });
    expect(sw.activeKind()).toBe("drone");
  });
  test("autoSelectPrimary keeps the current kind when nothing is fitted", () => {
    const { switch: sw } = buildSwitch();
    sw.setActiveKind("missile");
    sw.autoSelectPrimary({});
    expect(sw.activeKind()).toBe("missile");
  });

  test("autoSelectPrimary keeps the current kind when only zero-damage systems are fitted", () => {
    const { switch: sw } = buildSwitch();
    sw.autoSelectPrimary({ turret: turretOf(0, 2, 1), drones: [droneGroupOf(0, 2, 4)] });
    expect(sw.activeKind()).toBe("turret");
  });

  test("autoSelectPrimary prefers the turret system on a dps tie", () => {
    const { switch: sw } = buildSwitch();
    sw.autoSelectPrimary({ turret: turretOf(50, 2, 1), launcher: launcherOf(50, 2, 1) });
    expect(sw.activeKind()).toBe("turret");
  });

  test("autoSelectPrimary prefers the missile system over drones on a dps tie", () => {
    const { switch: sw } = buildSwitch();
    sw.setActiveKind("drone");
    sw.autoSelectPrimary({ launcher: launcherOf(40, 2, 1), drones: [droneGroupOf(10, 2, 4)] });
    expect(sw.activeKind()).toBe("missile");
  });
});

const NO_DAMAGE = { em: 0, thermal: 0, kinetic: 0, explosive: 0 } as const;

function turretOf(perShot: number, cycleTime: number, turretCount: number): ImportedTurret {
  return {
    tracking: 0, sigResolutionClass: "S", optimal: 0, falloff: 0, chargeSize: 1, chargeId: "1" as TypeId, base: { tracking: 0, optimal: 0, falloff: 0 },
    moduleId: "1" as TypeId, damageMultiplier: 1, damagePerShot: { ...NO_DAMAGE, em: perShot }, cycleTime, capacitorNeed: 0, turretCount, damageBreakdown: EMPTY_DAMAGE_BREAKDOWN,
  };
}

function launcherOf(perMissile: number, cycleTime: number, count: number): ImportedLauncher {
  return {
    moduleId: "1" as TypeId, name: "Launcher", count, chargeId: "1" as TypeId, chargeName: "Missile", damagePerMissile: { ...NO_DAMAGE, em: perMissile },
    cycleTime, explosionRadius: 0, explosionVelocity: 0, damageReductionFactor: 0, maxVelocity: 0, flightTime: 0, damageBreakdown: EMPTY_DAMAGE_BREAKDOWN,
  };
}

function droneGroupOf(perShot: number, cycleTime: number, droneCount: number): DroneSpec {
  return {
    kind: "drone", moduleId: "1" as TypeId, tracking: 0, sigResolution: 0, optimal: 0, falloff: 0, damagePerShot: { ...NO_DAMAGE, em: perShot },
    cycleTime, droneCount, maxVelocity: 0, orbitSpeed: 0, orbitRange: 0, isSentry: false, controlRange: 0,
  };
}
