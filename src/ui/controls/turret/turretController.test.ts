import { buildTurret } from "./testSupport";
import { CHARGE_OPTIONS, FakeElement, getFake, IMPORTED_RIFTER, IMPORTED_RIFTER_WITH_CARGO, RIFTER, TURRET } from "../testSupport";
import { TurretControllerImpl } from "./turretController";
import { damageVectorSum } from "../../../sim";
import { toTypeId } from "../../../gamedata/ids";
import type { ShipProfile } from "../../../ships";
import type { FactionId, HullTypeId, ShipId, TypeId } from "../../../gamedata/ids";
import type { Language } from "../../../ui/i18n";

describe("TurretController", () => {
  test("initial state disables the trigger, inputs, and hides the summary icon", () => {
    const { document, controller } = buildTurret();
    expect(getFake(document, "ship-a-ammo-trigger").disabled).toBe(true);
    expect(getFake(document, "ship-a-ammo-summary").textContent).toBe("—");
    expect(getFake(document, "ship-a-ammo-summary-icon").hidden).toBe(true);
    expect(getFake(document, "ship-a-ammo-all-section").hidden).toBe(true);
    expect(controller.ammo()).toBe("Hail S");
    expect(controller.turret()).toBeUndefined();
    expect(getFake(document, "ship-a-tracking").disabled).toBe(true);
    expect(getFake(document, "ship-a-sigRes").disabled).toBe(true);
    expect(getFake(document, "ship-a-optimal").disabled).toBe(true);
    expect(getFake(document, "ship-a-falloff").disabled).toBe(true);
  });

  test("applyImported with a turret sets inputs, renders lists and sig-res icons", () => {
    const nameForId: Record<string, string> = { "486": "200mm AutoCannon I", "491": "220mm Vulcan AutoCannon I", "496": "Dual 180mm AutoCannon I", "37289": "Dual 425mm AutoCannon I", "12608": "Hail S", "21898": "Republic Fleet EMP S" };
    const { document, controller, imageCatalog, chargeCatalog } = buildTurret({
      imageCatalog: { itemIconUrl: vi.fn((id: TypeId) => `images/icons/${nameForId[id]!.replaceAll(" ", "_")}.png`) },
      chargeCatalog: { chargesForTurret: vi.fn(() => CHARGE_OPTIONS) },
    });
    controller.applyImported(IMPORTED_RIFTER_WITH_CARGO, { skillLevel: 5, overloaded: false, weaponOverloaded: false });

    expect(controller.turret()).toBeDefined();
    expect(controller.ammo()).toBe("Hail S");
    expect(getFake(document, "ship-a-ammo-trigger").disabled).toBe(false);
    expect(getFake(document, "ship-a-ammo-summary").textContent).toBe("Hail S");
    expect(getFake(document, "ship-a-ammo-summary-icon").src).toBe("images/icons/Hail_S.png");
    expect(getFake(document, "ship-a-tracking").value).toBe("0.315");
    expect(getFake(document, "ship-a-sigRes").value).toBe("S");
    expect(getFake(document, "ship-a-optimal").value).toBe("600");
    expect(getFake(document, "ship-a-falloff").value).toBe("3000");
    expect(getFake(document, "ship-a-ammo-cargo-list").children.length).toBe(2);
    expect(getFake(document, "ship-a-ammo-all-list").children.length).toBe(2);
    expect(imageCatalog.itemIconUrl).toHaveBeenCalledWith(toTypeId("486"));
    expect(getFake(document, "ship-a-sig-res-options").children[0].getAttribute("data-hint")).toContain("Original S");
    expect(getFake(document, "ship-a-tracking").disabled).toBe(false);
    expect(getFake(document, "ship-a-sigRes").disabled).toBe(false);
    expect(getFake(document, "ship-a-optimal").disabled).toBe(false);
    expect(getFake(document, "ship-a-falloff").disabled).toBe(false);
  });

  test("applyImported without a turret leaves the trigger and inputs disabled", () => {
    const { document, controller } = buildTurret({ fittingImport: {} });
    controller.applyImported({ ...IMPORTED_RIFTER, turret: undefined }, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    expect(getFake(document, "ship-a-ammo-trigger").disabled).toBe(true);
    expect(controller.ammo()).toBe("Hail S");
    expect(getFake(document, "ship-a-tracking").disabled).toBe(true);
    expect(getFake(document, "ship-a-sigRes").disabled).toBe(true);
    expect(getFake(document, "ship-a-optimal").disabled).toBe(true);
    expect(getFake(document, "ship-a-falloff").disabled).toBe(true);
  });

  test("restore imports the fitting and applies the stored ammo", () => {
    const { controller, fittingImport, chargeCatalog } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
      chargeCatalog: { withCharge: vi.fn((turret, chargeId) => ({ ...turret, chargeId, tracking: turret.base.tracking, optimal: turret.base.optimal, falloff: turret.base.falloff })) },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false }, "Republic Fleet EMP S");

    expect(fittingImport.importFitting).toHaveBeenCalledWith("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });
    expect(controller.ammo()).toBe("Republic Fleet EMP S");
    expect(chargeCatalog.withCharge).toHaveBeenCalledWith(TURRET, CHARGE_OPTIONS[1].id);
  });

  test("restore with no fitting text resets to the default charge", () => {
    const { controller, fittingImport } = buildTurret({ fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) } });
    controller.restore(undefined, { skillLevel: 5, overloaded: true, weaponOverloaded: false }, "Republic Fleet EMP S");
    expect(fittingImport.importFitting).not.toHaveBeenCalled();
    expect(controller.ammo()).toBe("Hail S");
    expect(controller.turret()).toBeUndefined();
  });

  test("clear resets turret, cargo and expand state", () => {
    const { document, controller, chargeCatalog, selectionSession } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER_WITH_CARGO) },
      chargeCatalog: { chargesForTurret: vi.fn(() => CHARGE_OPTIONS) },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });
    getFake(document, "ship-a-ammo-expand").trigger("click");
    controller.clear();

    expect(controller.turret()).toBeUndefined();
    expect(controller.ammo()).toBe("Hail S");
    expect(getFake(document, "ship-a-ammo-trigger").disabled).toBe(true);
    expect(getFake(document, "ship-a-ammo-all-section").hidden).toBe(true);
    expect(selectionSession.recall("turret:autocannon:S")).toBeUndefined();
  });

  test("expand toggle reveals and hides the all charges section", () => {
    const { document, controller, chargeCatalog } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
      chargeCatalog: { chargesForTurret: vi.fn(() => CHARGE_OPTIONS) },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });
    const allSection = getFake(document, "ship-a-ammo-all-section");
    const expand = getFake(document, "ship-a-ammo-expand");

    expect(allSection.hidden).toBe(true);
    expand.trigger("click");
    expect(allSection.hidden).toBe(false);
    expect(expand.textContent).toBe("ammo.hideAll");
    expand.trigger("click");
    expect(allSection.hidden).toBe(true);
    expect(expand.textContent).toBe("ammo.showAll");
  });

  test("cargo list prepends the loaded charge when it is not in cargo", () => {
    const { document, controller, chargeCatalog } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER_WITH_CARGO) },
      chargeCatalog: { chargesForTurret: vi.fn(() => CHARGE_OPTIONS) },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });
    controller.openAmmoPopup();

    const cargoList = getFake(document, "ship-a-ammo-cargo-list");
    expect(cargoList.children.length).toBe(2);
    const firstButton = cargoList.children[0].firstElementChild as unknown as FakeElement;
    expect(firstButton.getAttribute("aria-current")).toBe("true");
    expect(firstButton.children[0].textContent).toBe("Hail S");
    const secondButton = cargoList.children[1].firstElementChild as unknown as FakeElement;
    expect(secondButton.children[0].textContent).toBe("Republic Fleet EMP S");
    expect(secondButton.children[1].textContent).toBe("x2000");
  });

  test("selecting a different charge updates turret inputs and clears overrides", () => {
    const { document, controller, fittingOverrides, turretOverrides, events } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
      chargeCatalog: {
        chargesForTurret: vi.fn(() => CHARGE_OPTIONS),
      },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });
    turretOverrides.set({ shipAMass: 1234 });
    getFake(document, "ship-a-optimal").value = "12345";
    const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
    controller.openAmmoPopup();
    (getFake(document, "ship-a-ammo-all-list").children[1].firstElementChild as unknown as FakeElement).trigger("click");

    expect(controller.ammo()).toBe("Republic Fleet EMP S");
    expect(getFake(document, "ship-a-ammo-summary").textContent).toBe("Republic Fleet EMP S");
    expect(fittingOverrides.get().turretChargeReplacements.get("486" as TypeId)).toBe(CHARGE_OPTIONS[1].id);
    expect(turretOverrides.get()).toEqual({ shipAMass: 1234 });
    expect(emitConfigInvalidated).toHaveBeenCalled();
    expect(getFake(document, "ship-a-tracking").value).toBe("0.42");
    expect(getFake(document, "ship-a-optimal").value).toBe("600");
    expect(getFake(document, "ship-a-falloff").value).toBe("3000");
  });

  test("icon URL fallback hides the icon", () => {
    const { document, controller } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
      imageCatalog: { itemIconUrl: vi.fn(() => undefined) },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });

    const icon = getFake(document, "ship-a-ammo-summary-icon");
    expect(icon.hidden).toBe(true);
    expect(icon.src).toBe("");
    for (const button of getFake(document, "ship-a-sig-res-options").children) {
      expect(button.children[0].hidden).toBe(true);
    }
  });

  test("sig-res title is cached and restored when icons are hidden", () => {
    const { document, controller } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
      imageCatalog: { itemIconUrl: vi.fn((name: string) => `images/icons/${name.replaceAll(" ", "_")}.png`) },
    });
    const button = getFake(document, "ship-a-sig-res-options").children[0];
    const original = button.getAttribute("data-hint");
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });

    expect(button.getAttribute("data-hint")).not.toBe(original);
    controller.clear();
    expect(button.getAttribute("data-hint")).toBe(original);
    expect(button.children[0].hidden).toBe(true);
  });

  test("currentTurretSpec reads inputs and uses the provided tracking override", () => {
    const { controller, trackingInput } = buildTurret({ fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) } });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });
    const spec = controller.currentTurretSpec(0.5)!;
    expect(spec.tracking).toBe(0.5);
    expect(spec.sigResolution).toBe(40);
    expect(spec.optimal).toBe(600);
    expect(spec.falloff).toBe(3000);
    expect(controller.currentTurretSpec()!.tracking).toBe(trackingInput.rad);
  });

  test("currentTurretSpec returns undefined when no turret is fitted", () => {
    const { controller } = buildTurret({ fittingImport: { importFitting: vi.fn(() => ({ ...IMPORTED_RIFTER, turret: undefined })) } });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });
    expect(controller.currentTurretSpec()).toBeUndefined();
  });

  test("currentTurretSpecs returns single-element array for single turret", () => {
    const { controller } = buildTurret({ fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) } });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });
    const specs = controller.currentTurretSpecs();
    expect(specs.length).toBe(1);
    expect(specs[0].kind).toBe("turret");
  });

  test("currentTurretSpecs returns all imported turret groups", () => {
    const multiTurretImport = {
      ...IMPORTED_RIFTER,
      turrets: [
        IMPORTED_RIFTER.turret!,
        { ...IMPORTED_RIFTER.turret!, moduleId: "21076" as TypeId, damagePerShot: { em: 0, thermal: 0, kinetic: 20, explosive: 0 }, cycleTime: 4, turretCount: 2 },
      ],
    };
    const { controller } = buildTurret({ fittingImport: { importFitting: vi.fn(() => multiTurretImport) } });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });
    const specs = controller.currentTurretSpecs();
    expect(specs.length).toBe(2);
    expect(damageVectorSum(specs[0].damagePerShot)).toBe(damageVectorSum(IMPORTED_RIFTER.turret!.damagePerShot));
    expect(damageVectorSum(specs[1].damagePerShot)).toBe(20);
    expect(specs[1].cycleTime).toBe(4);
    expect(specs[1].turretCount).toBe(2);
  });

  test("currentTurretSpecs primary reflects ammo change for multi-turret fits", () => {
    const multiTurretImport = {
      ...IMPORTED_RIFTER,
      turrets: [
        IMPORTED_RIFTER.turret!,
        { ...IMPORTED_RIFTER.turret!, moduleId: "21076" as TypeId, damagePerShot: { em: 0, thermal: 0, kinetic: 20, explosive: 0 }, cycleTime: 4, turretCount: 2 },
      ],
      fittingState: {
        ...IMPORTED_RIFTER.fittingState!,
        turretGroups: [
          { moduleId: "486" as TypeId, chargeId: "12608" as TypeId, count: 1 },
          { moduleId: "21076" as TypeId, chargeId: "12608" as TypeId, count: 2 },
        ],
      },
    };
    const { document, controller } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => multiTurretImport) },
      chargeCatalog: {
        chargesForTurret: vi.fn(() => CHARGE_OPTIONS),
        withCharge: vi.fn((turret, chargeId) => ({ ...turret, chargeId, damagePerShot: { em: 0, thermal: 0, kinetic: 999, explosive: 0 } })),
      },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });
    controller.openAmmoPopup();
    (getFake(document, "ship-a-ammo-all-list").children[1].firstElementChild as unknown as FakeElement).trigger("click");
    const specs = controller.currentTurretSpecs();
    expect(specs.length).toBe(2);
    expect(damageVectorSum(specs[0].damagePerShot)).toBe(60);
    expect(damageVectorSum(specs[1].damagePerShot)).toBe(60);
  });

  test("currentTurretSpecs returns empty array when no turret is fitted", () => {
    const { controller } = buildTurret({ fittingImport: { importFitting: vi.fn(() => ({ ...IMPORTED_RIFTER, turret: undefined, turrets: undefined })) } });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });
    expect(controller.currentTurretSpecs()).toEqual([]);
  });

  test("capture returns the current turret inputs and ammo", () => {
    const { document, controller } = buildTurret({ fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) } });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });
    getFake(document, "ship-a-optimal").value = "5000";
    getFake(document, "ship-a-falloff").value = "4000";
    getFake(document, "ship-a-sigRes").value = "M";
    const captured = controller.capture();
    expect(captured.sigRes).toBe("M");
    expect(captured.optimal).toBe(5000);
    expect(captured.falloff).toBe(4000);
    expect(captured.ammo).toBe("12608" as TypeId);
  });

  test("language change re-renders", () => {
    const { controller, events } = buildTurret({ fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) } });
    const render = vi.spyOn(controller, "render");
    events.emitLanguageChanged();
    expect(render).toHaveBeenCalled();
  });

  test("ammo labels use itemName while the stored ammo value stays canonical", () => {
    const { document, controller, imageCatalog } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER_WITH_CARGO) },
      chargeCatalog: { chargesForTurret: vi.fn(() => CHARGE_OPTIONS) },
      imageCatalog: { itemIconUrl: vi.fn((name: string) => `images/icons/${name.replaceAll(" ", "_")}.png`) },
      i18n: { current: vi.fn((): Language => "zh") },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });
    controller.openAmmoPopup();

    expect(getFake(document, "ship-a-ammo-summary").textContent).toBe("海怪 S");
    expect(imageCatalog.itemIconUrl).toHaveBeenCalledWith(toTypeId("12608"));

    const cargoList = getFake(document, "ship-a-ammo-cargo-list");
    expect(cargoList.children.length).toBe(2);
    const firstButton = cargoList.children[0].firstElementChild as unknown as FakeElement;
    expect(firstButton.children[1].textContent).toBe("海怪 S");
    const secondButton = cargoList.children[1].firstElementChild as unknown as FakeElement;
    expect(secondButton.children[1].textContent).toBe("Republic Fleet EMP S");
    expect(controller.ammo()).toBe("Hail S");
  });

  test("setHullProfile with no profile disables every sig-res button and option", () => {
    const { document, controller } = buildTurret({ ships: { turretSizeOptions: vi.fn(() => [] as const) } });
    controller.setHullProfile(undefined);
    const buttons = Array.from(getFake(document, "ship-a-sig-res-options").children);
    for (const button of buttons) {
      expect(button.disabled).toBe(true);
      expect(button.getAttribute("data-hint")).not.toBe("turret.notFittable");
    }
    for (const option of getFake(document, "ship-a-sigRes").options) {
      expect(option.disabled).toBe(true);
    }
    expect(getFake(document, "ship-a-tracking").disabled).toBe(true);
    expect(getFake(document, "ship-a-ammo-trigger").disabled).toBe(true);
  });

  test("setHullProfile enables only the turret classes that fit the hull", () => {
    const { document, controller } = buildTurret({
      ships: { turretSizeOptions: vi.fn(() => ["small", "medium"] as const) },
    });
    controller.applyImported(IMPORTED_RIFTER, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    controller.setHullProfile(RIFTER);
    expect(buttonFor(document, "S").disabled).toBe(false);
    expect(buttonFor(document, "M").disabled).toBe(false);
    expect(buttonFor(document, "L").disabled).toBe(true);
    expect(buttonFor(document, "XL").disabled).toBe(true);
    expect(buttonFor(document, "L").getAttribute("data-hint")).toBe("turret.notFittable");
    expect(optionFor(document, "S").disabled).toBe(false);
    expect(optionFor(document, "XL").disabled).toBe(true);
    expect(getFake(document, "ship-a-tracking").disabled).toBe(false);
  });

  test("setHullProfile clamps an invalid current class to the fitted turret's class when it fits", () => {
    const { document, controller } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
      ships: { turretSizeOptions: vi.fn(() => ["small", "medium"] as const) },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true, weaponOverloaded: false });
    getFake(document, "ship-a-sigRes").value = "L";
    controller.setHullProfile(RIFTER);
    expect(getFake(document, "ship-a-sigRes").value).toBe("S");
    expect(buttonFor(document, "S").getAttribute("aria-pressed")).toBe("true");
  });

  test("setHullProfile clamps an invalid current class to the highest allowed class when no turret is fitted", () => {
    const { document, controller } = buildTurret({ ships: { turretSizeOptions: mockTurretSizeOptions() } });
    getFake(document, "ship-a-sigRes").value = "XL";
    const mediumProfile: ShipProfile = { ...RIFTER, id: "621" as ShipId, name: "Caracal", factionId: "caldari-state" as FactionId, hullTypeId: "26" as HullTypeId };
    controller.setHullProfile(mediumProfile);
    expect(getFake(document, "ship-a-sigRes").value).toBe("L");
    expect(buttonFor(document, "L").getAttribute("aria-pressed")).toBe("true");
    expect(buttonFor(document, "XL").disabled).toBe(true);
  });

  test("setHullProfile re-enables larger classes when a bigger hull is selected", () => {
    const { document, controller } = buildTurret({ ships: { turretSizeOptions: mockTurretSizeOptions() } });
    const mediumProfile: ShipProfile = { ...RIFTER, id: "621" as ShipId, name: "Caracal", factionId: "caldari-state" as FactionId, hullTypeId: "26" as HullTypeId };
    controller.applyImported(IMPORTED_RIFTER, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    controller.setHullProfile(RIFTER);
    expect(buttonFor(document, "L").disabled).toBe(true);
    controller.setHullProfile(mediumProfile);
    expect(buttonFor(document, "L").disabled).toBe(false);
    expect(buttonFor(document, "XL").disabled).toBe(true);
  });

  test("tracking input updates the tracking override and emits displayInvalidated", () => {
    const { document, turretOverrides, events } = buildTurret();
    const emitDisplayInvalidated = vi.spyOn(events, "emitDisplayInvalidated");
    getFake(document, "ship-a-tracking").value = "0.5";
    getFake(document, "ship-a-tracking").trigger("input");
    expect(turretOverrides.get().tracking).toBe(0.5);
    expect(emitDisplayInvalidated).toHaveBeenCalled();
  });

  test("sigRes input updates the sigRes override and emits displayInvalidated", () => {
    const { document, turretOverrides, events } = buildTurret();
    const emitDisplayInvalidated = vi.spyOn(events, "emitDisplayInvalidated");
    getFake(document, "ship-a-sigRes").value = "M";
    getFake(document, "ship-a-sigRes").trigger("input");
    expect(turretOverrides.get().sigRes).toBe("M");
    expect(emitDisplayInvalidated).toHaveBeenCalled();
  });

  test("clicking a sig-res button with a fitted turret switches module and emits configInvalidated", () => {
    const { document, controller, events } = buildTurret({ fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) } });
    const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
    controller.applyImported(IMPORTED_RIFTER, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    buttonFor(document, "M").trigger("click");
    expect(getFake(document, "ship-a-sigRes").value).toBe("M");
    expect(emitConfigInvalidated).toHaveBeenCalled();
    expect(buttonFor(document, "M").getAttribute("aria-pressed")).toBe("true");
    expect(buttonFor(document, "S").getAttribute("aria-pressed")).toBe("false");
  });

  test("clicking a sig-res button with a fitted turret resizes the turret and emits configInvalidated", () => {
    const { document, controller, fittingOverrides, events } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
    });
    const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
    controller.applyImported(IMPORTED_RIFTER, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    buttonFor(document, "M").trigger("click");
    expect(controller.turret()?.moduleId).toBe("491" as TypeId);
    expect(controller.turret()?.sigResolutionClass).toBe("M");
    expect(fittingOverrides.get().turretModuleReplacements.get("486" as TypeId)).toBe("491" as TypeId);
    expect(emitConfigInvalidated).toHaveBeenCalled();
  });

  test("clicking a sig-res button with a fitted turret clears turret overrides on resize", () => {
    const { document, controller, turretOverrides, events } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
    });
    controller.applyImported(IMPORTED_RIFTER, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    getFake(document, "ship-a-tracking").value = "0.5";
    getFake(document, "ship-a-tracking").trigger("input");
    expect(turretOverrides.get().tracking).toBe(0.5);
    const emitDisplayInvalidated = vi.spyOn(events, "emitDisplayInvalidated");
    buttonFor(document, "M").trigger("click");
    expect(turretOverrides.get().tracking).toBeUndefined();
    expect(turretOverrides.get().sigRes).toBeUndefined();
    expect(emitDisplayInvalidated).not.toHaveBeenCalled();
  });

  test("clicking a sig-res button with a fitted turret clears cargo charges on resize", () => {
    const { document, controller, chargeCatalog } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER_WITH_CARGO) },
      chargeCatalog: { chargesForTurret: vi.fn(() => CHARGE_OPTIONS), chargesForSize: vi.fn(() => CHARGE_OPTIONS) },
    });
    controller.applyImported(IMPORTED_RIFTER_WITH_CARGO, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    controller.openAmmoPopup();
    const cargoList = getFake(document, "ship-a-ammo-cargo-list");
    expect(cargoList.children.length).toBe(2);
    buttonFor(document, "M").trigger("click");
    expect(cargoList.children.length).toBe(1);
  });

  test("clicking a sig-res button without a fitted turret sets the label only", () => {
    const { document, controller, turretOverrides, events } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => ({ ...IMPORTED_RIFTER, turret: undefined })) },
    });
    const emitDisplayInvalidated = vi.spyOn(events, "emitDisplayInvalidated");
    controller.applyImported({ ...IMPORTED_RIFTER, turret: undefined }, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    buttonFor(document, "M").trigger("click");
    expect(turretOverrides.get().sigRes).toBe("M");
    expect(emitDisplayInvalidated).toHaveBeenCalled();
  });

  test("optimal input updates the optimal override and emits displayInvalidated", () => {
    const { document, turretOverrides, events } = buildTurret();
    const emitDisplayInvalidated = vi.spyOn(events, "emitDisplayInvalidated");
    getFake(document, "ship-a-optimal").value = "12345";
    getFake(document, "ship-a-optimal").trigger("input");
    expect(turretOverrides.get().optimal).toBe(12345);
    expect(emitDisplayInvalidated).toHaveBeenCalled();
  });

  test("falloff input updates the falloff override and emits displayInvalidated", () => {
    const { document, turretOverrides, events } = buildTurret();
    const emitDisplayInvalidated = vi.spyOn(events, "emitDisplayInvalidated");
    getFake(document, "ship-a-falloff").value = "54321";
    getFake(document, "ship-a-falloff").trigger("input");
    expect(turretOverrides.get().falloff).toBe(54321);
    expect(emitDisplayInvalidated).toHaveBeenCalled();
  });

  test("variant gear is disabled when no turret is fitted", () => {
    const { document } = buildTurret();
    expect(getFake(document, "ship-a-turret-variant-gear").disabled).toBe(true);
  });

  test("variant gear is enabled when a turret is fitted", () => {
    const { document, controller } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
    });
    controller.applyImported(IMPORTED_RIFTER, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    expect(getFake(document, "ship-a-turret-variant-gear").disabled).toBe(false);
  });

  test("clicking variant gear toggles the popup via popupGroup", () => {
    const { document, controller, popupGroup } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
    });
    controller.applyImported(IMPORTED_RIFTER, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    getFake(document, "ship-a-turret-variant-gear").trigger("click");
    expect(popupGroup.toggle).toHaveBeenCalled();
  });

  test("selecting a turret variant sets the module override, updates the turret, closes the popup, and emits configInvalidated", () => {
    const { document, controller, gunFamilies, fittingOverrides, events, popupGroup } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
    });
    vi.mocked(gunFamilies.variantsForFamily).mockReturnValue([
      { id: "486" as TypeId, name: "200mm AutoCannon I", chargeSize: 1, damageMultiplier: 3, tracking: 0.3, optimal: 1000, falloff: 2000, cycleTime: 5, metaLevel: 0, metaGroupID: 1 } as never,
      { id: "21076" as TypeId, name: "125mm Gatling AutoCannon II", chargeSize: 1, damageMultiplier: 3, tracking: 0.3, optimal: 1000, falloff: 2000, cycleTime: 5, metaLevel: 5, metaGroupID: 2 } as never,
    ]);
    const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
    controller.applyImported(IMPORTED_RIFTER, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    const list = getFake(document, "ship-a-turret-variants");
    const buttons = Array.from(list.children).filter((c) => c.getAttribute("data-value") === "21076");
    expect(buttons.length).toBe(1);
    (buttons[0] as unknown as FakeElement).trigger("click");
    expect(fittingOverrides.get().turretModuleReplacements.get("486" as TypeId)).toBe("21076" as TypeId);
    expect(controller.turret()?.moduleId).toBe("21076" as TypeId);
    expect(popupGroup.close).toHaveBeenCalled();
    expect(emitConfigInvalidated).toHaveBeenCalled();
  });

  test("variant selection remembers the module per sig-res class and restores it on sig-res round-trip", () => {
    const { document, controller, gunFamilies, selectionSession } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
    });
    vi.mocked(gunFamilies.variantsForFamily).mockReturnValue([
      { id: "486" as TypeId, name: "200mm AutoCannon I", chargeSize: 1, damageMultiplier: 3, tracking: 0.3, optimal: 1000, falloff: 2000, cycleTime: 5, metaLevel: 0, metaGroupID: 1 } as never,
      { id: "21076" as TypeId, name: "125mm Gatling AutoCannon II", chargeSize: 1, damageMultiplier: 3, tracking: 0.3, optimal: 1000, falloff: 2000, cycleTime: 5, metaLevel: 5, metaGroupID: 2 } as never,
    ]);
    controller.applyImported(IMPORTED_RIFTER, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    const list = getFake(document, "ship-a-turret-variants");
    const buttons = Array.from(list.children).filter((c) => c.getAttribute("data-value") === "21076");
    expect(buttons.length).toBe(1);
    (buttons[0] as unknown as FakeElement).trigger("click");
    expect(controller.turret()?.moduleId).toBe("21076" as TypeId);
    expect(controller.turret()?.sigResolutionClass).toBe("S");
    buttonFor(document, "M").trigger("click");
    expect(controller.turret()?.moduleId).toBe("491" as TypeId);
    expect(controller.turret()?.sigResolutionClass).toBe("M");
    expect(selectionSession.recall("turret:autocannon:M")?.moduleId).toBe("491" as TypeId);
    buttonFor(document, "S").trigger("click");
    expect(controller.turret()?.moduleId).toBe("21076" as TypeId);
    expect(controller.turret()?.sigResolutionClass).toBe("S");
  });
});

function buttonFor(document: Document, value: string) {
  const group = getFake(document, "ship-a-sig-res-options");
  for (const child of group.children) {
    if (child.getAttribute("data-value") === value) return child;
  }
  throw new Error(`Missing sig-res button: ${value}`);
}

function optionFor(document: Document, value: string) {
  const select = getFake(document, "ship-a-sigRes");
  for (const option of select.options) {
    if (option.value === value) return option;
  }
  throw new Error(`Missing sig-res option: ${value}`);
}

function mockTurretSizeOptions() {
  return vi.fn((profile: ShipProfile) => (profile.name === "Caracal"
    ? ["small", "medium", "large"] as const
    : ["small", "medium"] as const));
}
