import { buildLauncher, importedLauncherFixture } from "./testSupport";
import { getFake, IMPORTED_RIFTER } from "../testSupport";
import type { ImportedFitting } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";

const SCOURGE_LIGHT_ID = "206" as TypeId;
const NOVA_LIGHT_ID = "202" as TypeId;

function importedWithLauncher(launcher: ReturnType<typeof importedLauncherFixture>): ImportedFitting {
  return { ...IMPORTED_RIFTER, turret: undefined, launcher };
}

describe("LauncherController", () => {
  test("initial state hides the panel and has no launcher", () => {
    const { document, controller } = buildLauncher();
    expect(getFake(document, "ship-a-launcher-panel").classList.toggle).toHaveBeenCalledWith("is-hidden", true);
    expect(controller.launcher()).toBeUndefined();
    expect(controller.ammoId()).toBeUndefined();
  });

  test("applyImported with a launcher shows the panel and renders telemetry", () => {
    const { document, controller } = buildLauncher();
    const launcher = importedLauncherFixture();
    controller.applyImported(importedWithLauncher(launcher), { skillLevel: 5, overloaded: false });
    expect(getFake(document, "ship-a-launcher-panel").classList.toggle).toHaveBeenCalledWith("is-hidden", false);
    expect(controller.launcher()).toBeDefined();
    expect(controller.ammoId()).toBe(SCOURGE_LIGHT_ID);
    expect(getFake(document, "ship-a-launcher-ammo-summary").textContent).toBe("Scourge Light Missile");
    expect(getFake(document, "ship-a-launcher-volley-damage").textContent).toContain("166");
    expect(getFake(document, "ship-a-launcher-rate-of-fire").textContent).toContain("16");
    expect(getFake(document, "ship-a-launcher-explosion-radius").textContent).toContain("50");
    expect(getFake(document, "ship-a-launcher-explosion-velocity").textContent).toContain("170");
    expect(getFake(document, "ship-a-launcher-missile-velocity").textContent).toContain("3,750");
    expect(getFake(document, "ship-a-launcher-flight-time").textContent).toContain("5");
  });

  test("applyImported without a launcher hides the panel", () => {
    const { document, controller } = buildLauncher();
    controller.applyImported({ ...IMPORTED_RIFTER, turret: undefined, launcher: undefined }, { skillLevel: 5, overloaded: false });
    expect(getFake(document, "ship-a-launcher-panel").classList.toggle).toHaveBeenCalledWith("is-hidden", true);
    expect(controller.launcher()).toBeUndefined();
  });

  test("clear resets the launcher and hides the panel", () => {
    const { document, controller, popupGroup } = buildLauncher();
    controller.applyImported(importedWithLauncher(importedLauncherFixture()), { skillLevel: 5, overloaded: false });
    controller.clear();
    expect(getFake(document, "ship-a-launcher-panel").classList.toggle).toHaveBeenLastCalledWith("is-hidden", true);
    expect(controller.launcher()).toBeUndefined();
    expect(popupGroup.close).toHaveBeenCalled();
  });

  test("restore imports the fitting and applies the stored ammo", () => {
    const { controller, fittingImport, missileCatalog } = buildLauncher({
      fittingImport: { importFitting: vi.fn(() => importedWithLauncher(importedLauncherFixture())) },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true }, NOVA_LIGHT_ID);
    expect(fittingImport.importFitting).toHaveBeenCalledWith("[Rifter, Brawler]", { skillLevel: 5, overloaded: true });
    expect(controller.ammoId()).toBe(NOVA_LIGHT_ID);
    expect(missileCatalog.withCharge).toHaveBeenCalledWith(expect.anything(), NOVA_LIGHT_ID, [], 5);
  });

  test("restore with no fitting text clears the launcher", () => {
    const { controller, fittingImport } = buildLauncher();
    controller.restore(undefined, { skillLevel: 5, overloaded: true });
    expect(fittingImport.importFitting).not.toHaveBeenCalled();
    expect(controller.launcher()).toBeUndefined();
  });

  test("selecting a different missile updates the launcher and closes the popup", () => {
    const { document, controller, missileCatalog, popupGroup } = buildLauncher();
    controller.applyImported(importedWithLauncher(importedLauncherFixture()), { skillLevel: 5, overloaded: false });
    controller.openAmmoPopup();
    const list = getFake(document, "ship-a-launcher-ammo-list");
    expect(list.children.length).toBe(2);
    list.children[1].trigger("click");
    expect(controller.ammoId()).toBe(NOVA_LIGHT_ID);
    expect(missileCatalog.withCharge).toHaveBeenCalledWith(expect.anything(), NOVA_LIGHT_ID, [], 5);
    expect(popupGroup.close).toHaveBeenCalled();
  });

  test("capture returns the current ammo id", () => {
    const { controller } = buildLauncher();
    controller.applyImported(importedWithLauncher(importedLauncherFixture()), { skillLevel: 5, overloaded: false });
    expect(controller.capture().ammo).toBe(SCOURGE_LIGHT_ID);
  });

  test("currentMissileSpec returns undefined when no launcher is fitted", () => {
    const { controller } = buildLauncher();
    expect(controller.currentMissileSpec()).toBeUndefined();
  });

  test("currentMissileSpec returns a MissileSpec with flightRange when a launcher is fitted", () => {
    const { controller } = buildLauncher();
    const launcher = importedLauncherFixture();
    controller.applyImported(importedWithLauncher(launcher), { skillLevel: 5, overloaded: false });
    const spec = controller.currentMissileSpec();
    expect(spec).toBeDefined();
    expect(spec!.kind).toBe("missile");
    expect(spec!.damagePerMissile).toBe(83);
    expect(spec!.launcherCount).toBe(2);
    expect(spec!.flightRange).toBe(3750 * 5);
  });

  test("ammo popup toggle opens and closes", () => {
    const { controller } = buildLauncher();
    controller.openAmmoPopup();
    expect(controller.isAmmoPopupOpen()).toBe(true);
    controller.closeAmmoPopup();
    expect(controller.isAmmoPopupOpen()).toBe(false);
  });
});
