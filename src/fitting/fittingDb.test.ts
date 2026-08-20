import { CHARGES, FITTING_MODULES, SCRIPTS, TURRETS } from "./fittingDb";

describe("fittingDb", () => {
  test("includes known plates with accurate flat mass and no item mass fallback", () => {
    expect(FITTING_MODULES["1600mm Steel Plates II"]).toEqual({ massAddition: 3_750_000 });
    expect(FITTING_MODULES["800mm Steel Plates II"]).toEqual({ massAddition: 1_450_000 });
  });

  test("bulkheads add agility penalty but no mass", () => {
    expect(FITTING_MODULES["Reinforced Bulkheads II"]).toEqual({ agilityMultiplier: 1.05 });
  });

  test("includes small afterburner and microwarpdrive with exact SDE values", () => {
    const ab = FITTING_MODULES["1MN Afterburner I"]?.propulsion;
    expect(ab).toBeDefined();
    expect(ab!.kind).toBe("afterburner");
    expect(ab!.sizeTier).toBe("small");
    expect(ab!.speedBonus).toBe(1.15);
    expect(ab!.thrust).toBe(1_500_000);
    expect(ab!.massAddition).toBe(500_000);
    expect(ab!.sigBloom).toBe(0);

    const mwd = FITTING_MODULES["5MN Microwarpdrive I"]?.propulsion;
    expect(mwd).toBeDefined();
    expect(mwd!.kind).toBe("microwarpdrive");
    expect(mwd!.sizeTier).toBe("small");
    expect(mwd!.speedBonus).toBe(5);
    expect(mwd!.thrust).toBe(1_500_000);
    expect(mwd!.massAddition).toBe(500_000);
    expect(mwd!.sigBloom).toBe(5);
  });

  test("includes 100MN afterburner for the Harbinger sample", () => {
    const ab = FITTING_MODULES["100MN Y-S8 Compact Afterburner"]?.propulsion;
    expect(ab).toBeDefined();
    expect(ab!.sizeTier).toBe("large");
    expect(ab!.kind).toBe("afterburner");
    expect(ab!.speedBonus).toBe(1.25);
    expect(ab!.thrust).toBe(150_000_000);
  });

  test("includes shield extenders with flat signature radius additions", () => {
    expect(FITTING_MODULES["Medium Shield Extender II"]).toEqual({ sigRadiusAdd: 7 });
  });

  test("includes inertia modules with agility multiplier and stacking-penalized signature bonus", () => {
    expect(FITTING_MODULES["Inertial Stabilizers II"]).toEqual({ agilityMultiplier: 0.8, sigBonusPercent: 11 });
  });

  test("includes speed and agility modules without item mass fallback", () => {
    expect(FITTING_MODULES["Nanofiber Internal Structure II"]).toEqual({
      speedBonusPercent: 9.5,
      agilityMultiplier: 0.8425,
    });
  });

  test("includes overdrive speed bonus", () => {
    expect(FITTING_MODULES["Overdrive Injector System II"]).toEqual({ speedBonusPercent: 12.5 });
  });

  test("includes armor rig agility drawback", () => {
    expect(FITTING_MODULES["Medium Trimark Armor Pump II"]).toEqual({ agilityDrawbackPercent: 10 });
  });

  test("includes shield rig signature drawback", () => {
    expect(FITTING_MODULES["Medium Core Defense Field Extender I"]).toEqual({ sigDrawbackPercent: 10 });
  });

  test("includes turret base stats with charge size and no sig resolution", () => {
    expect(TURRETS["Heavy Pulse Laser II"]).toEqual({
      tracking: 26,
      optimal: 12_600,
      falloff: 5_000,
      chargeSize: 2,
    });
  });

  test("includes charge multipliers", () => {
    expect(CHARGES["Conflagration M"]).toEqual({
      trackingMultiplier: 0.7,
      rangeMultiplier: 0.5,
    });
    expect(CHARGES["Scorch M"]).toEqual({
      trackingMultiplier: 0.75,
      rangeMultiplier: 1.4,
    });
    expect(CHARGES["Imperial Navy Multifrequency M"]).toEqual({
      rangeMultiplier: 0.5,
    });
    expect(CHARGES["Null M"]).toEqual({
      trackingMultiplier: 0.75,
      rangeMultiplier: 1.4,
      falloffMultiplier: 1.4,
    });
  });

  test("includes tracking enhancer and computer turret bonus percents", () => {
    expect(FITTING_MODULES["Tracking Enhancer II"]).toEqual({
      turretTrackingPercent: 9.5,
      turretOptimalPercent: 10,
      turretFalloffPercent: 20,
    });
    expect(FITTING_MODULES["Tracking Computer II"]).toEqual({
      turretTrackingPercent: 15,
      turretOptimalPercent: 7.5,
      turretFalloffPercent: 15,
    });
  });

  test("includes weapon rig tracking bonus percent", () => {
    expect(FITTING_MODULES["Medium Energy Metastasis Adjuster II"]).toEqual({ turretTrackingPercent: 20 });
  });

  test("includes tracking computer scripts", () => {
    expect(SCRIPTS["Tracking Speed Script"]).toEqual({
      trackingMultiplier: 2,
      optimalMultiplier: 0,
      falloffMultiplier: 0,
    });
    expect(SCRIPTS["Optimal Range Script"]).toEqual({
      trackingMultiplier: 0,
      optimalMultiplier: 2,
      falloffMultiplier: 2,
    });
  });
});
