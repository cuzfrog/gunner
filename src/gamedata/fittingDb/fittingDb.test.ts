import type { ShipId, TypeId } from "../ids";
import { CHARGES, DISRUPTION_SCRIPTS, DRONES, FITTING_MODULES, HULL_BONUSES, LAUNCHERS, MISSILES, SCRIPTS, SKILL_BONUSES, STASIS_GRAPPLERS, STASIS_WEBS, TRACKING_COMPUTERS, TRACKING_DISRUPTORS, TURRETS, WARP_SCRAMBLERS, type FittingModuleStats } from "./fittingDb";

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
      { attribute: "turretDamage", magnitude: 5, skill: "Minmatar Destroyer", turretSkill: "Small Projectile Turret" },
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

  test("includes light missile launchers with cycle time in seconds and launcher group", () => {
    expect(rowByName(LAUNCHERS, "Arbalest Compact Light Missile Launcher")).toMatchObject({
      rateOfFire: 13.6,
      launcherGroup: 509,
      chargeGroups: [384, 394],
    });
    expect(rowByName(LAUNCHERS, "Light Missile Launcher II")).toMatchObject({
      launcherGroup: 509,
    });
    expect(rowByName(LAUNCHERS, "Light Missile Launcher II")?.chargeGroups).toContain(653);
  });

  test("includes torpedo launchers with group 508 and chargeGroup3 for standard torpedoes", () => {
    expect(rowByName(LAUNCHERS, "Torpedo Launcher I")).toMatchObject({
      rateOfFire: 18,
      launcherGroup: 508,
    });
    expect(rowByName(LAUNCHERS, "Torpedo Launcher I")?.chargeGroups).toContain(89);
  });

  test("includes rapid light missile launchers with group 511 and light missile charge groups", () => {
    const launcher = rowByName(LAUNCHERS, "Rapid Light Missile Launcher II");
    expect(launcher?.launcherGroup).toBe(511);
    expect(launcher?.chargeGroups).toContain(384);
  });

  test("includes heavy assault missile launchers with group 771", () => {
    expect(rowByName(LAUNCHERS, "Heavy Assault Missile Launcher II")).toMatchObject({
      launcherGroup: 771,
    });
  });

  test("includes cruise missile launchers with group 506", () => {
    expect(rowByName(LAUNCHERS, "Cruise Missile Launcher I")).toMatchObject({
      launcherGroup: 506,
    });
  });

  test("excludes defender, bomb, and probe launchers", () => {
    expect(rowByName(LAUNCHERS, "Defender Missile Launcher I")).toBeUndefined();
    expect(rowByName(LAUNCHERS, "Bomb Launcher I")).toBeUndefined();
    expect(rowByName(LAUNCHERS, "Expanded Probe Launcher II")).toBeUndefined();
  });

  test("includes Mjolnir Light Missile with EM damage and light launcher group", () => {
    expect(rowByName(MISSILES, "Mjolnir Light Missile")).toMatchObject({
      damage: 83,
      damageType: "em",
      explosionRadius: 40,
      explosionVelocity: 170,
      damageReductionFactor: 0.604,
      maxVelocity: 3750,
      flightTime: 5,
      launcherGroup: 509,
      chargeGroup: 384,
    });
  });

  test("includes Scourge Light Missile with kinetic damage type", () => {
    expect(rowByName(MISSILES, "Scourge Light Missile")?.damageType).toBe("kinetic");
  });

  test("includes Inferno Light Missile with thermal damage type", () => {
    expect(rowByName(MISSILES, "Inferno Light Missile")?.damageType).toBe("thermal");
  });

  test("includes Nova Light Missile with explosive damage type", () => {
    expect(rowByName(MISSILES, "Nova Light Missile")?.damageType).toBe("explosive");
  });

  test("includes cruise missiles with launcher group 506", () => {
    expect(rowByName(MISSILES, "Mjolnir Cruise Missile")).toMatchObject({
      damage: 375,
      damageType: "em",
      explosionRadius: 330,
      explosionVelocity: 69,
      launcherGroup: 506,
    });
  });

  test("includes heavy missiles with launcher group 510", () => {
    expect(rowByName(MISSILES, "Scourge Heavy Missile")).toMatchObject({
      damage: 149,
      launcherGroup: 510,
    });
  });

  test("includes rockets with launcher group 507", () => {
    expect(rowByName(MISSILES, "Mjolnir Rocket")?.launcherGroup).toBe(507);
  });

  test("includes advanced missile variants (Fury, Rage, Javelin, Precision)", () => {
    expect(rowByName(MISSILES, "Scourge Fury Light Missile")).toBeDefined();
    expect(rowByName(MISSILES, "Inferno Rage Heavy Assault Missile")).toBeDefined();
    expect(rowByName(MISSILES, "Mjolnir Javelin Rocket")).toBeDefined();
    expect(rowByName(MISSILES, "Scourge Precision Cruise Missile")).toBeDefined();
  });

  test("advanced missiles share the same launcher group as their base variant", () => {
    expect(rowByName(MISSILES, "Scourge Fury Light Missile")?.launcherGroup).toBe(509);
    expect(rowByName(MISSILES, "Inferno Rage Heavy Assault Missile")?.launcherGroup).toBe(771);
  });

  test("includes Kestrel missile damage hull bonus for light missiles", () => {
    expect(HULL_BONUSES["602" as ShipId]).toEqual([
      { attribute: "missileDamage", magnitude: 5, skill: "Caldari Frigate", launcherGroup: 509 },
    ]);
  });

  test("includes Raven missile ROF hull bonuses for cruise, torpedo, and rapid heavy launchers", () => {
    expect(HULL_BONUSES["638" as ShipId]).toEqual([
      { attribute: "missileRoF", magnitude: -5, skill: "Caldari Battleship", launcherGroup: 506 },
      { attribute: "missileRoF", magnitude: -5, skill: "Caldari Battleship", launcherGroup: 508 },
      { attribute: "missileRoF", magnitude: -5, skill: "Caldari Battleship", launcherGroup: 1245 },
    ]);
  });

  test("includes Drake missile damage hull bonuses for heavy and heavy assault missiles", () => {
    expect(HULL_BONUSES["24698" as ShipId]).toEqual([
      { attribute: "missileDamage", magnitude: 10, skill: "Caldari Battlecruiser", launcherGroup: 771 },
      { attribute: "missileDamage", magnitude: 10, skill: "Caldari Battlecruiser", launcherGroup: 510 },
    ]);
  });

  test("includes Heat Sink II with damage and speed multipliers for energy weapons", () => {
    expect(moduleByName("Heat Sink II")).toMatchObject({
      turretDamageMultiplier: 1.1,
      turretSpeedMultiplier: 0.895,
      turretWeaponGroup: "Energy Weapon",
    });
  });

  test("includes Gyrostabilizer II with damage and speed multipliers for projectile weapons", () => {
    expect(moduleByName("Gyrostabilizer II")).toMatchObject({
      turretWeaponGroup: "Projectile Weapon",
    });
    expect(moduleByName("Gyrostabilizer II")?.turretDamageMultiplier).toBeGreaterThan(1);
    expect(moduleByName("Gyrostabilizer II")?.turretSpeedMultiplier).toBeLessThan(1);
  });

  test("includes Magnetic Field Stabilizer II with damage and speed multipliers for hybrid weapons", () => {
    expect(moduleByName("Magnetic Field Stabilizer II")).toMatchObject({
      turretWeaponGroup: "Hybrid Weapon",
    });
    expect(moduleByName("Magnetic Field Stabilizer II")?.turretDamageMultiplier).toBeGreaterThan(1);
    expect(moduleByName("Magnetic Field Stabilizer II")?.turretSpeedMultiplier).toBeLessThan(1);
  });

  test("includes Harbinger turret damage hull bonus for medium energy turrets", () => {
    expect(HULL_BONUSES["24696" as ShipId]).toContainEqual({
      attribute: "turretDamage",
      magnitude: 10,
      skill: "Amarr Battlecruiser",
      turretSkill: "Medium Energy Turret",
    });
  });

  test("includes Gunnery skill RoF bonus", () => {
    const gunnery = SKILL_BONUSES.find((b) => b.skillId === "3300" as TypeId);
    expect(gunnery).toBeDefined();
    expect(gunnery!.bonusType).toBe("turretRoF");
    expect(gunnery!.magnitudePerLevel).toBe(-2);
  });

  test("includes Rapid Firing skill RoF bonus", () => {
    const rapidFiring = SKILL_BONUSES.find((b) => b.skillId === "3310" as TypeId);
    expect(rapidFiring).toBeDefined();
    expect(rapidFiring!.bonusType).toBe("turretRoF");
    expect(rapidFiring!.magnitudePerLevel).toBe(-4);
  });

  test("includes Surgical Strike damage bonus for all weapon groups", () => {
    const energy = SKILL_BONUSES.find((b) => b.skillId === "3315" as TypeId && b.weaponGroup === "Energy Weapon");
    const projectile = SKILL_BONUSES.find((b) => b.skillId === "3315" as TypeId && b.weaponGroup === "Projectile Weapon");
    const hybrid = SKILL_BONUSES.find((b) => b.skillId === "3315" as TypeId && b.weaponGroup === "Hybrid Weapon");
    expect(energy).toBeDefined();
    expect(energy!.bonusType).toBe("turretDamage");
    expect(energy!.magnitudePerLevel).toBe(3);
    expect(projectile).toBeDefined();
    expect(hybrid).toBeDefined();
  });

  test("includes Medium Energy Turret damage bonus", () => {
    const mediumEnergy = SKILL_BONUSES.find((b) => b.turretSkill === "Medium Energy Turret");
    expect(mediumEnergy).toBeDefined();
    expect(mediumEnergy!.bonusType).toBe("turretDamage");
    expect(mediumEnergy!.magnitudePerLevel).toBe(5);
  });

  test("includes Large Hybrid Turret damage bonus", () => {
    const largeHybrid = SKILL_BONUSES.find((b) => b.turretSkill === "Large Hybrid Turret");
    expect(largeHybrid).toBeDefined();
    expect(largeHybrid!.bonusType).toBe("turretDamage");
    expect(largeHybrid!.magnitudePerLevel).toBe(5);
  });

  test("includes Capital Energy Turret damage bonus", () => {
    const capitalEnergy = SKILL_BONUSES.find((b) => b.turretSkill === "Capital Energy Turret");
    expect(capitalEnergy).toBeDefined();
    expect(capitalEnergy!.bonusType).toBe("turretDamage");
    expect(capitalEnergy!.magnitudePerLevel).toBe(5);
  });

  test("includes all 12 turret size skills", () => {
    const turretSkills = SKILL_BONUSES.filter((b) => b.turretSkill !== undefined).map((b) => b.turretSkill);
    expect(turretSkills).toEqual(expect.arrayContaining([
      "Small Energy Turret", "Small Hybrid Turret", "Small Projectile Turret",
      "Medium Energy Turret", "Medium Hybrid Turret", "Medium Projectile Turret",
      "Large Energy Turret", "Large Hybrid Turret", "Large Projectile Turret",
      "Capital Energy Turret", "Capital Hybrid Turret", "Capital Projectile Turret",
    ]));
  });
});
