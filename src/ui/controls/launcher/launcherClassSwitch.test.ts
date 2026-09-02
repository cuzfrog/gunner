import { toTypeId, type TypeId } from "../../../gamedata/ids";
import { damageVectorSum } from "../../../sim";
import { buildLauncher, importedLauncherFixture } from "./testSupport";
import { FakeElement, getFake, IMPORTED_RIFTER } from "../testSupport";
import type { ImportedFitting, LauncherClass, LauncherClasses } from "../../../fitting";
import type { ImportedLauncher } from "../../../fitting";
import { EMPTY_DAMAGE_BREAKDOWN } from "../../../fitting";

function importedWithLauncher(launcher: ReturnType<typeof importedLauncherFixture>): ImportedFitting {
  return {
    ...IMPORTED_RIFTER,
    turret: undefined,
    launcher,
    fittingState: {
      ...IMPORTED_RIFTER.fittingState!,
      turretGroups: [],
      launcherGroups: [{ moduleId: launcher.moduleId, chargeId: launcher.chargeId, count: launcher.count }],
    },
  };
}

const ROCKET_MODULE_ID = "10629" as TypeId;
const LIGHT_MODULE_ID = "499" as TypeId;
const SCOURGE_ROCKET_ID = "266" as TypeId;
const LIGHT_AMMO_ID = "206" as TypeId;

function rocketLauncherFixture(count: number): ImportedLauncher {
  return {
    moduleId: ROCKET_MODULE_ID,
    name: "Rocket Launcher I",
    count,
    chargeId: SCOURGE_ROCKET_ID,
    chargeName: "Scourge Rocket",
    damagePerMissile: { em: 0, thermal: 0, kinetic: 45, explosive: 0 },
    cycleTime: 4,
    explosionRadius: 20,
    explosionVelocity: 170,
    damageReductionFactor: 0.5,
    maxVelocity: 4500,
    flightTime: 4,
    damageBreakdown: EMPTY_DAMAGE_BREAKDOWN,
  };
}

function lightLauncherFixture(count: number): ImportedLauncher {
  return {
    moduleId: LIGHT_MODULE_ID,
    name: "Light Missile Launcher I",
    count,
    chargeId: LIGHT_AMMO_ID,
    chargeName: "Scourge Light Missile",
    damagePerMissile: { em: 0, thermal: 0, kinetic: 83, explosive: 0 },
    cycleTime: 16,
    explosionRadius: 50,
    explosionVelocity: 170,
    damageReductionFactor: 0.5,
    maxVelocity: 3750,
    flightTime: 5,
    damageBreakdown: EMPTY_DAMAGE_BREAKDOWN,
  };
}

function clickClassButton(document: Document, side: "ship-a" | "ship-b", cls: LauncherClass): void {
  const classOptions = getFake(document, `${side}-launcher-class-options`);
  for (const button of Array.from(classOptions.children)) {
    if (button.getAttribute("data-value") === cls) {
      (button as unknown as FakeElement).trigger("click");
      return;
    }
  }
  throw new Error(`Class button ${cls} not found`);
}

function classAwareLauncherClasses(): Partial<LauncherClasses> {
  return {
    classOf: vi.fn((moduleId: TypeId): LauncherClass => {
      if (moduleId === ROCKET_MODULE_ID) return "rocket";
      return "light";
    }),
    representativeOf: vi.fn((cls: LauncherClass): TypeId => cls === "rocket" ? ROCKET_MODULE_ID : LIGHT_MODULE_ID),
    classesForTiers: vi.fn(() => ["rocket", "light"] as readonly LauncherClass[]),
    allClasses: vi.fn(() => ["rocket", "light"] as readonly LauncherClass[]),
  };
}

describe("LauncherController class switch", () => {
  test("switching from light to rocket updates currentMissileSpec and emits configInvalidated", () => {
    const rocketLauncher = rocketLauncherFixture(2);
    const { document, controller, events } = buildLauncher({
      launcherClasses: classAwareLauncherClasses(),
      launchersByModuleId: { [String(ROCKET_MODULE_ID)]: rocketLauncher },
    });
    controller.applyImported(importedWithLauncher(importedLauncherFixture()), { skillLevel: 5, overloaded: false, weaponOverloaded: false });

    const specBefore = controller.currentMissileSpec()!;
    expect(specBefore).toBeDefined();
    const dpsBefore = damageVectorSum(specBefore.damagePerMissile) * specBefore.launcherCount / specBefore.cycleTime;

    let configInvalidated = false;
    events.onConfigInvalidated(() => { configInvalidated = true; });

    clickClassButton(document, "ship-a", "rocket");

    const specAfter = controller.currentMissileSpec()!;
    expect(configInvalidated).toBe(true);
    const dpsAfter = damageVectorSum(specAfter.damagePerMissile) * specAfter.launcherCount / specAfter.cycleTime;
    expect(dpsAfter).toBeGreaterThan(dpsBefore);
    expect(damageVectorSum(specAfter.damagePerMissile)).toBe(45);
    expect(specAfter.cycleTime).toBe(4);
  });

  test("rocket -> light -> rocket restores the original launcher module and ammo", () => {
    const rocketLauncher = rocketLauncherFixture(2);
    const lightLauncher = lightLauncherFixture(2);
    const { document, controller, panelMemory } = buildLauncher({
      launcherClasses: classAwareLauncherClasses(),
      launchersByModuleId: { [String(ROCKET_MODULE_ID)]: rocketLauncher, [String(LIGHT_MODULE_ID)]: lightLauncher },
    });
    controller.applyImported(importedWithLauncher(rocketLauncher), { skillLevel: 5, overloaded: false, weaponOverloaded: false });

    clickClassButton(document, "ship-a", "light");
    expect(controller.launcher()?.moduleId).toBe(LIGHT_MODULE_ID);

    clickClassButton(document, "ship-a", "rocket");
    expect(controller.launcher()?.moduleId).toBe(ROCKET_MODULE_ID);

    const spec = controller.currentMissileSpec()!;
    expect(damageVectorSum(spec.damagePerMissile)).toBe(45);
    expect(controller.ammoId()).toBe(SCOURGE_ROCKET_ID);
    expect(panelMemory.recallLauncher("rocket")?.moduleId).toBe(ROCKET_MODULE_ID);
  });

  test("user-changed ammo is remembered when switching back to the original class", () => {
    const rocketLauncher = rocketLauncherFixture(2);
    const lightLauncher = lightLauncherFixture(2);
    const userRocketAmmoId = "267" as TypeId;
    const { document, controller, panelMemory } = buildLauncher({
      launcherClasses: classAwareLauncherClasses(),
      launchersByModuleId: { [String(ROCKET_MODULE_ID)]: rocketLauncher, [String(LIGHT_MODULE_ID)]: lightLauncher },
    });
    controller.applyImported(importedWithLauncher(rocketLauncher), { skillLevel: 5, overloaded: false, weaponOverloaded: false });

    clickClassButton(document, "ship-a", "light");
    clickClassButton(document, "ship-a", "rocket");
    expect(controller.ammoId()).toBe(SCOURGE_ROCKET_ID);

    controller["onAmmoSelect"](userRocketAmmoId);
    expect(controller.ammoId()).toBe(userRocketAmmoId);
    expect(panelMemory.recallLauncher("rocket")?.ammoId).toBe(userRocketAmmoId);

    clickClassButton(document, "ship-a", "light");
    clickClassButton(document, "ship-a", "rocket");
    expect(controller.ammoId()).toBe(userRocketAmmoId);
  });

  test("clear resets the remembered launcher and ammo state", () => {
    const rocketLauncher = rocketLauncherFixture(2);
    const lightLauncher = lightLauncherFixture(2);
    const userRocketAmmoId = "267" as TypeId;
    const { document, controller, panelMemory } = buildLauncher({
      launcherClasses: classAwareLauncherClasses(),
      launchersByModuleId: { [String(ROCKET_MODULE_ID)]: rocketLauncher, [String(LIGHT_MODULE_ID)]: lightLauncher },
    });
    controller.applyImported(importedWithLauncher(rocketLauncher), { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    controller["onAmmoSelect"](userRocketAmmoId);
    expect(panelMemory.recallLauncher("rocket")?.ammoId).toBe(userRocketAmmoId);

    controller.clear();
    expect(panelMemory.recallLauncher("rocket")).toBeUndefined();
    controller.applyImported(importedWithLauncher(rocketLauncher), { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    expect(panelMemory.recallLauncher("rocket")?.ammoId).toBe(SCOURGE_ROCKET_ID);
  });
});
