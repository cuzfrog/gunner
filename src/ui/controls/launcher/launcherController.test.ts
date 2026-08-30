import { buildLauncher, importedLauncherFixture } from "./testSupport";
import { FakeElement, getFake, IMPORTED_RIFTER } from "../testSupport";
import type { ImportedFitting } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";

const SCOURGE_LIGHT_ID = "206" as TypeId;
const NOVA_LIGHT_ID = "202" as TypeId;

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

describe("LauncherController", () => {
  test("initial state has no launcher", () => {
    const { controller } = buildLauncher();
    expect(controller.launcher()).toBeUndefined();
    expect(controller.ammoId()).toBeUndefined();
  });

  test("applyImported with a launcher renders telemetry", () => {
    const { document, controller } = buildLauncher();
    const launcher = importedLauncherFixture();
    controller.applyImported(importedWithLauncher(launcher), { skillLevel: 5, overloaded: false });
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

  test("applyImported without a launcher leaves no launcher", () => {
    const { controller } = buildLauncher();
    controller.applyImported({ ...IMPORTED_RIFTER, turret: undefined, launcher: undefined }, { skillLevel: 5, overloaded: false });
    expect(controller.launcher()).toBeUndefined();
  });

  test("triggers are disabled when no launcher is fitted", () => {
    const { document, controller } = buildLauncher();
    controller.applyImported({ ...IMPORTED_RIFTER, turret: undefined, launcher: undefined }, { skillLevel: 5, overloaded: false });
    expect(getFake(document, "ship-a-launcher-attributes-trigger").disabled).toBe(true);
    expect(getFake(document, "ship-a-launcher-ammo-trigger").disabled).toBe(true);
  });

  test("triggers are enabled when a launcher is fitted", () => {
    const { document, controller } = buildLauncher();
    controller.applyImported(importedWithLauncher(importedLauncherFixture()), { skillLevel: 5, overloaded: false });
    expect(getFake(document, "ship-a-launcher-attributes-trigger").disabled).toBe(false);
    expect(getFake(document, "ship-a-launcher-ammo-trigger").disabled).toBe(false);
  });

  test("clear resets the launcher", () => {
    const { controller, popupGroup } = buildLauncher();
    controller.applyImported(importedWithLauncher(importedLauncherFixture()), { skillLevel: 5, overloaded: false });
    controller.clear();
    expect(controller.launcher()).toBeUndefined();
    expect(popupGroup.close).toHaveBeenCalled();
  });

  test("restore imports the fitting and applies the stored ammo", () => {
    const { controller, fittingImport, fittingOverrides } = buildLauncher({
      fittingImport: { importFitting: vi.fn(() => importedWithLauncher(importedLauncherFixture())) },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true }, NOVA_LIGHT_ID);
    expect(fittingImport.importFitting).toHaveBeenCalledWith("[Rifter, Brawler]", { skillLevel: 5, overloaded: true });
    expect(controller.ammoId()).toBe(NOVA_LIGHT_ID);
    expect(fittingOverrides.get().launcherChargeReplacements.get(importedLauncherFixture().moduleId)).toBe(NOVA_LIGHT_ID);
  });

  test("restore with no fitting text clears the launcher", () => {
    const { controller, fittingImport } = buildLauncher();
    controller.restore(undefined, { skillLevel: 5, overloaded: true });
    expect(fittingImport.importFitting).not.toHaveBeenCalled();
    expect(controller.launcher()).toBeUndefined();
  });

  test("selecting a different missile updates the launcher and closes the popup", () => {
    const { document, controller, popupGroup } = buildLauncher();
    controller.applyImported(importedWithLauncher(importedLauncherFixture()), { skillLevel: 5, overloaded: false });
    controller.openAmmoPopup();
    const list = getFake(document, "ship-a-launcher-ammo-list");
    expect(list.children.length).toBe(2);
    (list.children[1].firstElementChild as unknown as FakeElement).trigger("click");
    expect(controller.ammoId()).toBe(NOVA_LIGHT_ID);
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

  test("ammo popup contains() returns true for the ammo trigger and popup", () => {
    const { document, controller } = buildLauncher();
    const trigger = getFake(document, "ship-a-launcher-ammo-trigger") as unknown as EventTarget;
    const popup = getFake(document, "ship-a-launcher-ammo-popup") as unknown as EventTarget;
    expect(controller.popup.contains(trigger)).toBe(true);
    expect(controller.popup.contains(popup)).toBe(true);
  });

  test("ammo popup contains() returns false for an outside element", () => {
    const { document, controller } = buildLauncher();
    const outside = getFake(document, "ship-a-hull") as unknown as EventTarget;
    expect(controller.popup.contains(outside)).toBe(false);
  });

  test("icons are hidden when no launcher is fitted", () => {
    const { document, controller } = buildLauncher();
    controller.applyImported({ ...IMPORTED_RIFTER, turret: undefined, launcher: undefined }, { skillLevel: 5, overloaded: false });
    expect(getFake(document, "ship-a-launcher-ammo-summary-icon").hidden).toBe(true);
  });

  test("icons are shown when a launcher is fitted and imageCatalog returns a url", () => {
    const { document, controller } = buildLauncher({
      imageCatalog: { itemIconUrl: vi.fn(() => "images/launcher.png") },
    });
    controller.applyImported(importedWithLauncher(importedLauncherFixture()), { skillLevel: 5, overloaded: false });
    const ammoIcon = getFake(document, "ship-a-launcher-ammo-summary-icon");
    expect(ammoIcon.hidden).toBe(false);
    expect(ammoIcon.src).toBe("images/launcher.png");
  });

  test("icons are hidden when imageCatalog returns no url", () => {
    const { document, controller } = buildLauncher({
      imageCatalog: { itemIconUrl: vi.fn(() => undefined) },
    });
    controller.applyImported(importedWithLauncher(importedLauncherFixture()), { skillLevel: 5, overloaded: false });
    expect(getFake(document, "ship-a-launcher-ammo-summary-icon").hidden).toBe(true);
  });

  test("openAmmoPopup sets aria-expanded to true on the ammo trigger", () => {
    const { document, controller } = buildLauncher();
    controller.openAmmoPopup();
    expect(getFake(document, "ship-a-launcher-ammo-trigger").getAttribute("aria-expanded")).toBe("true");
  });

  test("closeAmmoPopup sets aria-expanded to false on the ammo trigger", () => {
    const { document, controller } = buildLauncher();
    controller.openAmmoPopup();
    controller.closeAmmoPopup();
    expect(getFake(document, "ship-a-launcher-ammo-trigger").getAttribute("aria-expanded")).toBe("false");
  });

  test("class selector renders translated launcher class labels with explosion radius values", () => {
    const { document, controller, i18n } = buildLauncher();
    controller.applyImported(importedWithLauncher(importedLauncherFixture()), { skillLevel: 5, overloaded: false });
    const classOptions = getFake(document, "ship-a-launcher-class-options");
    const buttons = classOptions.children as unknown as FakeElement[];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      const labelSpan = button.children.find((c) => c.className === "truncate");
      expect(labelSpan).toBeDefined();
      expect(labelSpan!.textContent).toMatch(/^label\.launcherClass\./);
      const valueSpan = button.children.find((c) => c.className === "choice-value mono");
      expect(valueSpan).toBeDefined();
      expect(valueSpan!.textContent).toMatch(/^\(\d+ unit\.meter\)$/);
    }
    expect(i18n.t).toHaveBeenCalledWith("label.launcherClass.light");
  });

  test("class selector renders launcher icons when imageCatalog returns a url", () => {
    const { document, controller } = buildLauncher({
      imageCatalog: { itemIconUrl: vi.fn(() => "images/launcher-light.png") },
    });
    controller.applyImported(importedWithLauncher(importedLauncherFixture()), { skillLevel: 5, overloaded: false });
    const classOptions = getFake(document, "ship-a-launcher-class-options");
    const buttons = classOptions.children as unknown as FakeElement[];
    for (const button of buttons) {
      const icon = button.children.find((c) => c.className === "choice-icon");
      expect(icon).toBeDefined();
      expect(icon!.src).toBe("images/launcher-light.png");
    }
  });

  test("class selector does not render icons when no launcher is fitted", () => {
    const { document, controller } = buildLauncher();
    controller.applyImported({ ...IMPORTED_RIFTER, turret: undefined, launcher: undefined }, { skillLevel: 5, overloaded: false });
    const classOptions = getFake(document, "ship-a-launcher-class-options");
    const buttons = classOptions.children as unknown as FakeElement[];
    for (const button of buttons) {
      const icon = button.children.find((c) => c.className === "choice-icon");
      expect(icon).toBeUndefined();
    }
  });

  test("variant gear is disabled when no launcher is fitted", () => {
    const { document, controller } = buildLauncher();
    controller.applyImported({ ...IMPORTED_RIFTER, turret: undefined, launcher: undefined }, { skillLevel: 5, overloaded: false });
    expect(getFake(document, "ship-a-launcher-variant-gear").disabled).toBe(true);
  });

  test("variant gear is enabled when a launcher is fitted", () => {
    const { document, controller } = buildLauncher();
    controller.applyImported(importedWithLauncher(importedLauncherFixture()), { skillLevel: 5, overloaded: false });
    expect(getFake(document, "ship-a-launcher-variant-gear").disabled).toBe(false);
  });

  test("clicking variant gear toggles the popup via popupGroup", () => {
    const { document, controller, popupGroup } = buildLauncher();
    controller.applyImported(importedWithLauncher(importedLauncherFixture()), { skillLevel: 5, overloaded: false });
    getFake(document, "ship-a-launcher-variant-gear").trigger("click");
    expect(popupGroup.toggle).toHaveBeenCalled();
  });

  test("selecting a launcher variant sets the module override, updates the launcher, closes the popup, and emits configInvalidated", () => {
    const baseLauncher = importedLauncherFixture();
    const variantLauncher = { ...baseLauncher, moduleId: "2404" as TypeId, name: "Light Missile Launcher II" };
    const { document, controller, launcherClasses, fittingOverrides, events, popupGroup } = buildLauncher({
      launchersByModuleId: { "2404": variantLauncher },
    });
    vi.mocked(launcherClasses.variantsForClass).mockReturnValue([
      { id: "499" as TypeId, name: "Light Missile Launcher I", launcherGroup: 509, chargeGroups: [384, 394], rateOfFire: 16, metaLevel: 0, metaGroupID: 1 } as never,
      { id: "2404" as TypeId, name: "Light Missile Launcher II", launcherGroup: 509, chargeGroups: [384, 394, 653], rateOfFire: 12.8, metaLevel: 5, metaGroupID: 2 } as never,
    ]);
    const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
    controller.applyImported(importedWithLauncher(baseLauncher), { skillLevel: 5, overloaded: false });
    const list = getFake(document, "ship-a-launcher-variants");
    const buttons = Array.from(list.children).filter((c) => c.getAttribute("data-value") === "2404");
    expect(buttons.length).toBe(1);
    (buttons[0] as unknown as FakeElement).trigger("click");
    expect(fittingOverrides.get().launcherModuleReplacements.get(baseLauncher.moduleId)).toBe("2404" as TypeId);
    expect(controller.launcher()?.moduleId).toBe("2404" as TypeId);
    expect(popupGroup.close).toHaveBeenCalled();
    expect(emitConfigInvalidated).toHaveBeenCalled();
  });
});
