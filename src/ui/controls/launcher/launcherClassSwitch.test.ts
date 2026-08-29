import { toTypeId, type TypeId } from "../../../gamedata/ids";
import { buildLauncher, importedLauncherFixture } from "./testSupport";
import { FakeElement, getFake, IMPORTED_RIFTER } from "../testSupport";
import type { ImportedFitting, LauncherCatalog, LauncherClass } from "../../../fitting";
import type { ImportedLauncher } from "../../../fitting";

function importedWithLauncher(launcher: ReturnType<typeof importedLauncherFixture>): ImportedFitting {
  return { ...IMPORTED_RIFTER, turret: undefined, launcher };
}

const ROCKET_MODULE_ID = "10629" as TypeId;
const SCOURGE_ROCKET_ID = "266" as TypeId;

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
});
