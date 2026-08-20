import { CHARGES, FITTING_MODULES, TURRETS } from "./fittingDb";

describe("fittingDb", () => {
  test("includes known plates with accurate flat mass", () => {
    expect(FITTING_MODULES["1600mm Steel Plates II"]).toEqual({ massAddition: 3_750_000 });
    expect(FITTING_MODULES["800mm Steel Plates II"]).toEqual({ massAddition: 1_450_000 });
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

  test("includes inertia and speed modules with multipliers", () => {
    expect(FITTING_MODULES["Inertial Stabilizers II"]).toEqual({ massAddition: 200, agilityMultiplier: 0.8 });
    expect(FITTING_MODULES["Nanofiber Internal Structure II"]).toEqual({
      massAddition: 100,
      speedBonusPercent: 9.5,
      agilityMultiplier: 0.8425,
    });
  });

  test("includes turret base stats", () => {
    expect(TURRETS["Heavy Pulse Laser II"]).toEqual({
      tracking: 26,
      sigResolution: 40_000,
      optimal: 12_600,
      falloff: 5_000,
    });
  });

  test("includes charge multipliers", () => {
    expect(CHARGES["Conflagration M"]).toEqual({
      trackingMultiplier: 0.7,
      rangeMultiplier: 0.5,
      falloffMultiplier: 1,
    });
    expect(CHARGES["Scorch M"]).toEqual({
      trackingMultiplier: 0.75,
      rangeMultiplier: 1.4,
      falloffMultiplier: 1,
    });
    expect(CHARGES["Null M"]).toEqual({
      trackingMultiplier: 0.75,
      rangeMultiplier: 1.4,
      falloffMultiplier: 1.4,
    });
  });
});
