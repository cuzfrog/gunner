import type { ShipId, TypeId } from "../ids";
import { CHARGES, DISRUPTION_SCRIPTS, DRONES, FITTING_MODULES, HULL_BONUSES, SCRIPTS, STASIS_GRAPPLERS, STASIS_WEBS, TRACKING_COMPUTERS, TRACKING_DISRUPTORS, TURRETS, WARP_SCRAMBLERS, type FittingModuleStats } from "./fittingDb";

function moduleByName(name: string): FittingModuleStats | undefined {
  return Object.values(FITTING_MODULES).find((m) => m.name === name);
}

function rowByName<T extends { readonly name: string }>(table: Readonly<Record<string, T>>, name: string): T | undefined {
  return Object.values(table).find((row) => row.name === name);
}

function baseStats<T extends { readonly id: unknown; readonly name: unknown }>(row: T): Omit<T, "id" | "name"> {
  const { id: _id, name: _name, ...rest } = row;
  return rest as Omit<T, "id" | "name">;
}

describe("fittingDb", () => {
  test("includes known plates with accurate flat mass and no item mass fallback", () => {
    expect(moduleByName("1600mm Steel Plates II")).toMatchObject({ massAddition: 3_750_000 });
    expect(moduleByName("800mm Steel Plates II")).toMatchObject({ massAddition: 1_450_000 });
  });

  test("bulkheads add agility penalty but no mass", () => {
    expect(moduleByName("Reinforced Bulkheads II")).toMatchObject({ agilityMultiplier: 1.05 });
  });

  test("includes small afterburner and microwarpdrive with exact SDE values", () => {
    const ab = moduleByName("1MN Afterburner I")?.propulsion;
    expect(ab).toBeDefined();
    expect(ab!.kind).toBe("afterburner");
    expect(ab!.sizeTier).toBe("small");
    expect(ab!.speedBonus).toBe(1.15);
    expect(ab!.thrust).toBe(1_500_000);
    expect(ab!.massAddition).toBe(500_000);
    expect(ab!.sigBloom).toBe(0);

    const mwd = moduleByName("5MN Microwarpdrive I")?.propulsion;
    expect(mwd).toBeDefined();
    expect(mwd!.kind).toBe("microwarpdrive");
    expect(mwd!.sizeTier).toBe("small");
    expect(mwd!.speedBonus).toBe(5);
    expect(mwd!.thrust).toBe(1_500_000);
    expect(mwd!.massAddition).toBe(500_000);
    expect(mwd!.sigBloom).toBe(5);
  });

  test("includes 100MN afterburner for the Harbinger sample", () => {
    const ab = moduleByName("100MN Y-S8 Compact Afterburner")?.propulsion;
    expect(ab).toBeDefined();
    expect(ab!.sizeTier).toBe("large");
    expect(ab!.kind).toBe("afterburner");
    expect(ab!.speedBonus).toBe(1.25);
    expect(ab!.thrust).toBe(150_000_000);
  });

  test("includes shield extenders with flat signature radius additions", () => {
    expect(moduleByName("Medium Shield Extender II")).toMatchObject({ sigRadiusAdd: 7 });
  });

  test("includes inertia modules with agility multiplier and stacking-penalized signature bonus", () => {
    expect(moduleByName("Inertial Stabilizers II")).toMatchObject({ agilityMultiplier: 0.8, sigBonusPercent: 11 });
  });

  test("includes speed and agility modules without item mass fallback", () => {
    expect(moduleByName("Nanofiber Internal Structure II")).toMatchObject({
      speedBonusPercent: 9.5,
      agilityMultiplier: 0.8425,
    });
  });

  test("includes overdrive speed bonus", () => {
    expect(moduleByName("Overdrive Injector System II")).toMatchObject({ speedBonusPercent: 12.5 });
  });

  test("includes armor rig agility drawback", () => {
    expect(moduleByName("Medium Trimark Armor Pump II")).toMatchObject({ agilityDrawbackPercent: 10 });
  });

  test("includes shield rig signature drawback", () => {
    expect(moduleByName("Medium Core Defense Field Extender I")).toMatchObject({ sigDrawbackPercent: 10 });
  });

  test("includes turret base stats with charge size, turret skill and no sig resolution", () => {
    expect(rowByName(TURRETS, "Heavy Pulse Laser II")).toMatchObject({
      tracking: 26,
      optimal: 12_600,
      falloff: 5_000,
      chargeSize: 2,
      turretSkill: "Medium Energy Turret",
    });
  });

  test("includes hull bonuses for turret, velocity and agility attributes", () => {
    expect(HULL_BONUSES["16242" as ShipId]).toEqual([
      { attribute: "turretOptimal", magnitude: 50, turretSkill: "Small Projectile Turret" },
      { attribute: "turretTracking", magnitude: 10, skill: "Minmatar Destroyer", turretSkill: "Small Projectile Turret" },
    ]);
    expect(HULL_BONUSES["23917" as ShipId]).toEqual([{ attribute: "agility", magnitude: -5, skill: "Advanced Spaceship Command" }]);
  });

  test("includes charge multipliers", () => {
    expect(rowByName(CHARGES, "Conflagration M")).toMatchObject({
      trackingMultiplier: 0.7,
      rangeMultiplier: 0.5,
    });
    expect(rowByName(CHARGES, "Scorch M")).toMatchObject({
      trackingMultiplier: 0.75,
      rangeMultiplier: 1.4,
    });
    expect(rowByName(CHARGES, "Imperial Navy Multifrequency M")).toMatchObject({
      rangeMultiplier: 0.5,
    });
    expect(rowByName(CHARGES, "Null M")).toMatchObject({
      trackingMultiplier: 0.75,
      rangeMultiplier: 1.4,
      falloffMultiplier: 1.4,
    });
  });

  test("includes tracking enhancer turret bonus percents and tracking computer stats", () => {
    expect(moduleByName("Tracking Enhancer II")).toMatchObject({
      turretTrackingPercent: 9.5,
      turretOptimalPercent: 10,
      turretFalloffPercent: 20,
    });
    expect(rowByName(TRACKING_COMPUTERS, "Tracking Computer II")).toMatchObject({
      trackingBonusPercent: 15,
      optimalBonusPercent: 7.5,
      falloffBonusPercent: 15,
    });
  });

  test("includes weapon rig tracking bonus percent", () => {
    expect(moduleByName("Medium Energy Metastasis Adjuster II")).toMatchObject({ turretTrackingPercent: 20 });
  });

  test("includes stasis webs with raw negative speed factor and overload range bonus", () => {
    const stasisWeb = rowByName(STASIS_WEBS, "Stasis Webifier II");
    expect(stasisWeb).toMatchObject({
      maxRange: 10000,
      speedFactorPercent: -60,
      overloadRangeBonusPercent: 30,
    });
    expect(moduleByName("Stasis Webifier II")?.stasisWeb).toMatchObject(baseStats(stasisWeb!));
  });

  test("includes tracking disruptors and excludes guidance disruptors", () => {
    const trackingDisruptor = rowByName(TRACKING_DISRUPTORS, "Tracking Disruptor II");
    expect(trackingDisruptor).toMatchObject({
      optimal: 48000,
      falloff: 24000,
      disruptionPercent: -17.19,
      overloadStrengthBonusPercent: 20,
    });
    expect(moduleByName("Tracking Disruptor II")?.trackingDisruptor).toMatchObject(baseStats(trackingDisruptor!));
  });

  test("includes disruption scripts with raw bonus deltas", () => {
    expect(rowByName(DISRUPTION_SCRIPTS, "Optimal Range Disruption Script")).toMatchObject({
      trackingDeltaBonus: -100,
      rangeDeltaBonus: 100,
      falloffDeltaBonus: 100,
    });
    expect(rowByName(DISRUPTION_SCRIPTS, "Tracking Speed Disruption Script")).toMatchObject({
      trackingDeltaBonus: 100,
      rangeDeltaBonus: -100,
      falloffDeltaBonus: -100,
    });
  });

  test("includes tracking computer scripts", () => {
    expect(rowByName(SCRIPTS, "Tracking Speed Script")).toMatchObject({
      trackingMultiplier: 2,
      optimalMultiplier: 0,
      falloffMultiplier: 0,
    });
    expect(rowByName(SCRIPTS, "Optimal Range Script")).toMatchObject({
      trackingMultiplier: 0,
      optimalMultiplier: 2,
      falloffMultiplier: 2,
    });
  });

  test("includes combat and mining drones", () => {
    expect(rowByName(DRONES as Readonly<Record<string, { readonly id: TypeId; readonly name: string }>>, "Hobgoblin I")).toBeDefined();
    expect(rowByName(DRONES as Readonly<Record<string, { readonly id: TypeId; readonly name: string }>>, "Hobgoblin II")).toBeDefined();
    expect(rowByName(DRONES as Readonly<Record<string, { readonly id: TypeId; readonly name: string }>>, "Mining Drone I")).toBeDefined();
    expect(rowByName(DRONES as Readonly<Record<string, { readonly id: TypeId; readonly name: string }>>, "Salvage Drone I")).toBeDefined();
  });

  test("includes warp scramblers and excludes long warp disruptors", () => {
    const warpScrambler = rowByName(WARP_SCRAMBLERS, "Warp Scrambler II");
    expect(warpScrambler).toMatchObject({
      maxRange: 9000,
      overloadRangeBonusPercent: 20,
    });
    expect(moduleByName("Warp Scrambler II")?.warpScrambler).toMatchObject(baseStats(warpScrambler!));
    expect(rowByName(WARP_SCRAMBLERS, "Warp Disruptor II")).toBeUndefined();
    expect(moduleByName("Warp Disruptor II")).toBeUndefined();
  });

  test("includes heavy stasis grapplers with optimal, falloff and overload bonus", () => {
    const stasisGrappler = rowByName(STASIS_GRAPPLERS, "Heavy Stasis Grappler I");
    expect(stasisGrappler).toMatchObject({
      optimal: 1000,
      falloff: 8000,
      speedFactorPercent: -80,
      overloadOptimalBonusPercent: 300,
    });
    expect(moduleByName("Heavy Stasis Grappler I")?.stasisGrappler).toMatchObject(baseStats(stasisGrappler!));
    expect(rowByName(STASIS_WEBS, "Heavy Stasis Grappler I")).toBeUndefined();
  });
});
