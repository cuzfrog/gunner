import { buildTurret, CHARGE_OPTIONS, getFake, IMPORTED_RIFTER, IMPORTED_RIFTER_WITH_CARGO, TURRET } from "./testSupport";

describe("TurretController", () => {
  test("initial state disables the trigger and hides the summary icon", () => {
    const { document, controller } = buildTurret();
    expect(getFake(document, "attacker-ammo-trigger").disabled).toBe(true);
    expect(getFake(document, "attacker-ammo-summary").textContent).toBe("—");
    expect(getFake(document, "attacker-ammo-summary-icon").hidden).toBe(true);
    expect(getFake(document, "attacker-ammo-all-section").hidden).toBe(true);
    expect(controller.ammo()).toBe("Hail S");
    expect(controller.turret()).toBeUndefined();
  });

  test("applyImported with a turret sets inputs, renders lists and sig-res icons", () => {
    const { document, controller, imageCatalog, chargeCatalog } = buildTurret({
      imageCatalog: { itemIconUrl: vi.fn((name: string) => `images/icons/${name.replaceAll(" ", "_")}.png`) },
      chargeCatalog: { chargesForTurret: vi.fn(() => CHARGE_OPTIONS) },
    });
    controller.applyImported(IMPORTED_RIFTER_WITH_CARGO);

    expect(controller.turret()).toBeDefined();
    expect(controller.ammo()).toBe("Hail S");
    expect(getFake(document, "attacker-ammo-trigger").disabled).toBe(false);
    expect(getFake(document, "attacker-ammo-summary").textContent).toBe("Hail S");
    expect(getFake(document, "attacker-ammo-summary-icon").src).toBe("images/icons/Hail_S.png");
    expect(getFake(document, "tracking").value).toBe("0.315");
    expect(getFake(document, "sigRes").value).toBe("S");
    expect(getFake(document, "optimal").value).toBe("600");
    expect(getFake(document, "falloff").value).toBe("3000");
    expect(getFake(document, "attacker-ammo-cargo-list").children.length).toBe(2);
    expect(getFake(document, "attacker-ammo-all-list").children.length).toBe(2);
    expect(imageCatalog.itemIconUrl).toHaveBeenCalledWith("200mm AutoCannon I");
    expect(getFake(document, "sig-res-options").children[0].title).toContain("Original S");
  });

  test("applyImported without a turret leaves the trigger disabled", () => {
    const { document, controller } = buildTurret({ fittingImport: {} });
    controller.applyImported({ ...IMPORTED_RIFTER, turret: undefined });
    expect(getFake(document, "attacker-ammo-trigger").disabled).toBe(true);
    expect(controller.ammo()).toBe("Hail S");
  });

  test("restore imports the fitting and applies the stored ammo", () => {
    const { controller, fittingImport, chargeCatalog } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
      chargeCatalog: { withCharge: vi.fn((turret, charge) => ({ ...turret, charge, tracking: turret.base.tracking, optimal: turret.base.optimal, falloff: turret.base.falloff })) },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true }, "Republic Fleet EMP S");

    expect(fittingImport.importFitting).toHaveBeenCalledWith("[Rifter, Brawler]", { skillLevel: 5, overloaded: true });
    expect(controller.ammo()).toBe("Republic Fleet EMP S");
    expect(chargeCatalog.withCharge).toHaveBeenCalledWith(TURRET, "Republic Fleet EMP S");
  });

  test("restore with no fitting text resets to the default charge", () => {
    const { controller, fittingImport } = buildTurret({ fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) } });
    controller.restore(undefined, { skillLevel: 5, overloaded: true }, "Republic Fleet EMP S");
    expect(fittingImport.importFitting).not.toHaveBeenCalled();
    expect(controller.ammo()).toBe("Hail S");
    expect(controller.turret()).toBeUndefined();
  });

  test("clear resets turret, cargo and expand state", () => {
    const { document, controller, chargeCatalog } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER_WITH_CARGO) },
      chargeCatalog: { chargesForTurret: vi.fn(() => CHARGE_OPTIONS) },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true });
    getFake(document, "attacker-ammo-expand").trigger("click");
    controller.clear();

    expect(controller.turret()).toBeUndefined();
    expect(controller.ammo()).toBe("Hail S");
    expect(getFake(document, "attacker-ammo-trigger").disabled).toBe(true);
    expect(getFake(document, "attacker-ammo-all-section").hidden).toBe(true);
  });

  test("expand toggle reveals and hides the all charges section", () => {
    const { document, controller, chargeCatalog } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
      chargeCatalog: { chargesForTurret: vi.fn(() => CHARGE_OPTIONS) },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true });
    const allSection = getFake(document, "attacker-ammo-all-section");
    const expand = getFake(document, "attacker-ammo-expand");

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
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true });
    controller.openAmmoPopup();

    const cargoList = getFake(document, "attacker-ammo-cargo-list");
    expect(cargoList.children.length).toBe(2);
    expect(cargoList.children[0].getAttribute("aria-selected")).toBe("true");
    expect(cargoList.children[0].children[0].textContent).toBe("Hail S");
    expect(cargoList.children[1].children[0].textContent).toBe("Republic Fleet EMP S");
    expect(cargoList.children[1].children[1].textContent).toBe("x2000");
  });

  test("selecting a different charge updates turret inputs and clears overrides", () => {
    const { document, controller, chargeCatalog, clearTurretOverrides, onConfigChange } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
      chargeCatalog: {
        chargesForTurret: vi.fn(() => CHARGE_OPTIONS),
        withCharge: vi.fn((turret, charge) => ({ ...turret, charge, tracking: turret.base.tracking, optimal: turret.base.optimal, falloff: turret.base.falloff })),
      },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true });
    getFake(document, "optimal").value = "12345";
    controller.openAmmoPopup();
    getFake(document, "attacker-ammo-all-list").children[1].trigger("click");

    expect(controller.ammo()).toBe("Republic Fleet EMP S");
    expect(getFake(document, "attacker-ammo-summary").textContent).toBe("Republic Fleet EMP S");
    expect(chargeCatalog.withCharge).toHaveBeenLastCalledWith(expect.objectContaining({ charge: "Hail S" }), "Republic Fleet EMP S");
    expect(clearTurretOverrides).toHaveBeenCalled();
    expect(onConfigChange).toHaveBeenCalledWith(false);
    expect(getFake(document, "tracking").value).toBe("0.42");
    expect(getFake(document, "optimal").value).toBe("1200");
    expect(getFake(document, "falloff").value).toBe("3000");
  });

  test("icon URL fallback hides the icon", () => {
    const { document, controller } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
      imageCatalog: { itemIconUrl: vi.fn(() => undefined) },
    });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true });

    const icon = getFake(document, "attacker-ammo-summary-icon");
    expect(icon.hidden).toBe(true);
    expect(icon.src).toBe("");
    for (const button of getFake(document, "sig-res-options").children) {
      expect(button.children[0].hidden).toBe(true);
    }
  });

  test("sig-res title is cached and restored when icons are hidden", () => {
    const { document, controller } = buildTurret({
      fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) },
      imageCatalog: { itemIconUrl: vi.fn((name: string) => `images/icons/${name.replaceAll(" ", "_")}.png`) },
    });
    const button = getFake(document, "sig-res-options").children[0];
    const original = button.title;
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true });

    expect(button.title).not.toBe(original);
    controller.clear();
    expect(button.title).toBe(original);
    expect(button.children[0].hidden).toBe(true);
  });

  test("currentTurretSpec reads inputs and uses the provided tracking override", () => {
    const { controller, trackingInput } = buildTurret({ fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) } });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true });
    const spec = controller.currentTurretSpec(0.5);
    expect(spec.tracking).toBe(0.5);
    expect(spec.sigResolution).toBe(40);
    expect(spec.optimal).toBe(600);
    expect(spec.falloff).toBe(3000);
    expect(controller.currentTurretSpec().tracking).toBe(trackingInput.rad);
  });

  test("capture returns the current turret inputs and ammo", () => {
    const { document, controller } = buildTurret({ fittingImport: { importFitting: vi.fn(() => IMPORTED_RIFTER) } });
    controller.restore("[Rifter, Brawler]", { skillLevel: 5, overloaded: true });
    getFake(document, "optimal").value = "5000";
    getFake(document, "falloff").value = "4000";
    getFake(document, "sigRes").value = "M";
    const captured = controller.capture();
    expect(captured.sigRes).toBe("M");
    expect(captured.optimal).toBe(5000);
    expect(captured.falloff).toBe(4000);
    expect(captured.ammo).toBe("Hail S");
  });
});
