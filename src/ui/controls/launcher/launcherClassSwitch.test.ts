import { toTypeId, type TypeId } from "../../../gamedata/ids";
import { buildLauncher, importedLauncherFixture } from "./testSupport";
import { FakeElement, getFake, IMPORTED_RIFTER } from "../testSupport";
import type { ImportedFitting, LauncherCatalog, LauncherClass, LauncherClasses, MissileCatalog } from "../../../fitting";
import type { ImportedLauncher } from "../../../fitting";

function importedWithLauncher(launcher: ReturnType<typeof importedLauncherFixture>): ImportedFitting {
  return { ...IMPORTED_RIFTER, turret: undefined, launcher };
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
    damagePerMissile: 45,
    cycleTime: 4,
    explosionRadius: 20,
    explosionVelocity: 170,
    damageReductionFactor: 0.5,
    maxVelocity: 4500,
    flightTime: 4,
  };
}

function lightLauncherFixture(count: number): ImportedLauncher {
  return {
    moduleId: LIGHT_MODULE_ID,
    name: "Light Missile Launcher I",
    count,
    chargeId: LIGHT_AMMO_ID,
    chargeName: "Scourge Light Missile",
    damagePerMissile: 83,
    cycleTime: 16,
    explosionRadius: 50,
    explosionVelocity: 170,
    damageReductionFactor: 0.5,
    maxVelocity: 3750,
    flightTime: 5,
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
    representativeOf: vi.fn(() => LIGHT_MODULE_ID),
    classesForTiers: vi.fn(() => ["rocket", "light"] as readonly LauncherClass[]),
    allClasses: vi.fn(() => ["rocket", "light"] as readonly LauncherClass[]),
  };
}

describe("LauncherController class switch", () => {
  test("switching from light to rocket updates currentMissileSpec and emits configInvalidated", () => {
    const rocketLauncher = rocketLauncherFixture(2);
    const launcherCatalog: Partial<LauncherCatalog> = {
      switchClass: vi.fn(() => rocketLauncher),
    };
    const { document, controller, events } = buildLauncher({ launcherCatalog });
    controller.applyImported(importedWithLauncher(importedLauncherFixture()), { skillLevel: 5, overloaded: false });

    const specBefore = controller.currentMissileSpec()!;
    expect(specBefore).toBeDefined();
    const dpsBefore = specBefore.damagePerMissile * specBefore.launcherCount / specBefore.cycleTime;

    let configInvalidated = false;
    events.onConfigInvalidated(() => { configInvalidated = true; });

    clickClassButton(document, "ship-a", "rocket");

    const specAfter = controller.currentMissileSpec()!;
    expect(configInvalidated).toBe(true);
    const dpsAfter = specAfter.damagePerMissile * specAfter.launcherCount / specAfter.cycleTime;
    expect(dpsAfter).toBeGreaterThan(dpsBefore);
    expect(specAfter.damagePerMissile).toBe(45);
    expect(specAfter.cycleTime).toBe(4);
  });

  test("rocket -> light -> rocket restores the original launcher module and ammo", () => {
    const rocketLauncher = rocketLauncherFixture(2);
    const lightLauncher = lightLauncherFixture(2);
    const switchClassMock = vi.fn<(launcher: ImportedLauncher, target: LauncherClass, bonuses: readonly unknown[], skill: number, preferred: TypeId | undefined) => ImportedLauncher | undefined>(
      (_launcher, target) => target === "light" ? lightLauncher : rocketLauncher,
    );
    const launcherCatalog: Partial<LauncherCatalog> = { switchClass: switchClassMock };
    const missileCatalog: Partial<MissileCatalog> = {
      withCharge: vi.fn((launcher: ImportedLauncher, missileId: TypeId) => ({ ...launcher, chargeId: missileId, chargeName: `missile-${missileId}` })),
      has: vi.fn(() => true),
    };
    const { document, controller } = buildLauncher({
      launcherCatalog,
      missileCatalog,
      launcherClasses: classAwareLauncherClasses(),
    });
    controller.applyImported(importedWithLauncher(rocketLauncher), { skillLevel: 5, overloaded: false });

    clickClassButton(document, "ship-a", "light");
    expect(switchClassMock).toHaveBeenNthCalledWith(1, rocketLauncher, "light", [], 5, undefined);

    clickClassButton(document, "ship-a", "rocket");
    expect(switchClassMock).toHaveBeenNthCalledWith(2, lightLauncher, "rocket", [], 5, ROCKET_MODULE_ID);

    const spec = controller.currentMissileSpec()!;
    expect(spec.damagePerMissile).toBe(45);
    expect(controller.ammoId()).toBe(SCOURGE_ROCKET_ID);
  });

  test("user-changed ammo is remembered when switching back to the original class", () => {
    const rocketLauncher = rocketLauncherFixture(2);
    const lightLauncher = lightLauncherFixture(2);
    const userRocketAmmoId = "267" as TypeId;
    const switchClassMock = vi.fn<(launcher: ImportedLauncher, target: LauncherClass, bonuses: readonly unknown[], skill: number, preferred: TypeId | undefined) => ImportedLauncher | undefined>(
      (_launcher, target) => target === "light" ? lightLauncher : rocketLauncher,
    );
    const launcherCatalog: Partial<LauncherCatalog> = { switchClass: switchClassMock };
    const missileCatalog: Partial<MissileCatalog> = {
      withCharge: vi.fn((launcher: ImportedLauncher, missileId: TypeId) => ({ ...launcher, chargeId: missileId, chargeName: `missile-${missileId}` })),
      has: vi.fn(() => true),
    };
    const { document, controller } = buildLauncher({
      launcherCatalog,
      missileCatalog,
      launcherClasses: classAwareLauncherClasses(),
    });
    controller.applyImported(importedWithLauncher(rocketLauncher), { skillLevel: 5, overloaded: false });

    clickClassButton(document, "ship-a", "light");
    clickClassButton(document, "ship-a", "rocket");
    expect(controller.ammoId()).toBe(SCOURGE_ROCKET_ID);

    controller["onAmmoSelect"](userRocketAmmoId);
    expect(controller.ammoId()).toBe(userRocketAmmoId);

    clickClassButton(document, "ship-a", "light");
    clickClassButton(document, "ship-a", "rocket");
    expect(switchClassMock).toHaveBeenLastCalledWith(expect.anything(), "rocket", [], 5, ROCKET_MODULE_ID);
    expect(controller.ammoId()).toBe(userRocketAmmoId);
  });

  test("clear resets the remembered launcher and ammo state", () => {
    const rocketLauncher = rocketLauncherFixture(2);
    const lightLauncher = lightLauncherFixture(2);
    const switchClassMock = vi.fn<(launcher: ImportedLauncher, target: LauncherClass, bonuses: readonly unknown[], skill: number, preferred: TypeId | undefined) => ImportedLauncher | undefined>(
      (_launcher, target) => target === "light" ? lightLauncher : rocketLauncher,
    );
    const launcherCatalog: Partial<LauncherCatalog> = { switchClass: switchClassMock };
    const missileCatalog: Partial<MissileCatalog> = {
      withCharge: vi.fn((launcher: ImportedLauncher, missileId: TypeId) => ({ ...launcher, chargeId: missileId, chargeName: `missile-${missileId}` })),
      has: vi.fn(() => true),
    };
    const { document, controller } = buildLauncher({
      launcherCatalog,
      missileCatalog,
      launcherClasses: classAwareLauncherClasses(),
    });
    controller.applyImported(importedWithLauncher(rocketLauncher), { skillLevel: 5, overloaded: false });
    clickClassButton(document, "ship-a", "light");
    clickClassButton(document, "ship-a", "rocket");
    expect(switchClassMock).toHaveBeenNthCalledWith(2, expect.anything(), "rocket", [], 5, ROCKET_MODULE_ID);

    controller.clear();
    controller.applyImported(importedWithLauncher(rocketLauncher), { skillLevel: 5, overloaded: false });
    clickClassButton(document, "ship-a", "light");
    const lastCall = switchClassMock.mock.calls.at(-1)!;
    expect(lastCall[1]).toBe("light");
    expect(lastCall[4]).toBeUndefined();
  });
});
