import type { ShipId, TypeId } from "../ids";
import { toTypeId } from "../ids";
import { CHARGES, COMBAT_DRONES, DISRUPTION_SCRIPTS, DRONES, FITTING_MODULES, HULL_BONUSES, LAUNCHERS, MISSILES, MISSILE_GUIDANCE_COMPUTERS, MISSILE_GUIDANCE_ENHANCERS, MISSILE_SCRIPTS, RIG_DRAWBACK_REDUCTIONS, SCRIPTS, SENSOR_BOOSTERS, SENSOR_BOOSTER_SCRIPTS, SENSOR_DAMPENERS, SENSOR_DAMPENER_SCRIPTS, SIGNAL_AMPLIFIERS, SKILL_BONUSES, STASIS_GRAPPLERS, STASIS_WEBS, TARGET_PAINTERS, TRACKING_COMPUTERS, TRACKING_DISRUPTORS, TURRETS, WARP_SCRAMBLERS } from "./generated/fittingDb.data";
import type { FittingModuleStats } from "./types";

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

  test("bulkheads provide hull HP defense stats", () => {
    const defense = moduleByName("Reinforced Bulkheads II")?.defense;
    expect(defense).toBeDefined();
    expect(defense!.kind).toBe("hullBulkhead");
    expect(defense!.hullHpPercent).toBe(25);
  });

  test("transverse bulkhead rigs provide hull HP defense stats", () => {
    const defense = moduleByName("Medium Transverse Bulkhead II")?.defense;
    expect(defense).toBeDefined();
    expect(defense!.kind).toBe("hullBulkhead");
    expect(defense!.hullHpPercent).toBe(25);
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
    expect(moduleByName("Medium Trimark Armor Pump II")).toMatchObject({ rigDrawback: { kind: "agility", percent: 10, groupId: 773 } });
  });

  test("includes shield rig signature drawback", () => {
    expect(moduleByName("Medium Core Defense Field Extender I")).toMatchObject({ rigDrawback: { kind: "signature", percent: 10, groupId: 774 } });
  });

  test("includes rig drawback reductions for all rigging skills", () => {
    expect(RIG_DRAWBACK_REDUCTIONS).toContainEqual({ skillId: toTypeId("26261"), groupId: 774, magnitudePerLevel: -10 });
    expect(RIG_DRAWBACK_REDUCTIONS).toContainEqual({ skillId: toTypeId("26253"), groupId: 773, magnitudePerLevel: -10 });
    expect(RIG_DRAWBACK_REDUCTIONS).toContainEqual({ skillId: toTypeId("26254"), groupId: 782, magnitudePerLevel: -10 });
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
      { attribute: "turretOptimal", magnitude: 50, scalesWithHullSkill: false, moduleSkillId: toTypeId("3302") },
      { attribute: "turretDamage", magnitude: 5, scalesWithHullSkill: true, moduleSkillId: toTypeId("3302") },
      { attribute: "turretTracking", magnitude: 10, scalesWithHullSkill: true, moduleSkillId: toTypeId("3302") },
    ]);
    expect(HULL_BONUSES["23917" as ShipId]).toContainEqual({ attribute: "agility", magnitude: -5, scalesWithHullSkill: true });
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

  test("includes Hobgoblin II combat drone with both speed fields and light classification", () => {
    expect(rowByName(COMBAT_DRONES, "Hobgoblin II")).toMatchObject({
      sizeClass: "light",
      damageMultiplier: 1.92,
      thermalDamage: 20,
      tracking: 2.178,
      sigResolution: 25,
      optimal: 2100,
      falloff: 2000,
      maxVelocity: 3360,
      orbitSpeed: 660,
      cycleTime: 4,
      bandwidth: 5,
      volume: 5,
      metaLevel: 5,
      metaGroupID: 2,
    });
  });

  test("includes Garde II sentry drone with zero orbit speed and sentry classification", () => {
    expect(rowByName(COMBAT_DRONES, "Garde II")).toMatchObject({
      sizeClass: "sentry",
      orbitSpeed: 0,
      thermalDamage: 64,
      optimal: 18000,
      bandwidth: 25,
    });
  });

  test("includes Hammerhead II as medium and Ogre II as heavy", () => {
    expect(rowByName(COMBAT_DRONES, "Hammerhead II")?.sizeClass).toBe("medium");
    expect(rowByName(COMBAT_DRONES, "Ogre II")?.sizeClass).toBe("heavy");
  });

  test("excludes non-combat drones from the combat drone table", () => {
    expect(rowByName(COMBAT_DRONES, "Mining Drone I")).toBeUndefined();
    expect(rowByName(COMBAT_DRONES, "Salvage Drone I")).toBeUndefined();
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

  test("includes required skill IDs on launchers, missiles, and turrets", () => {
    expect(rowByName(LAUNCHERS, "Light Missile Launcher II")?.requiredSkillIds).toContain(toTypeId("3319"));
    expect(rowByName(LAUNCHERS, "Light Missile Launcher II")?.requiredSkillIds).toContain(toTypeId("20210"));
    expect(rowByName(MISSILES, "Caldari Navy Mjolnir Light Missile")?.requiredSkillIds).toContain(toTypeId("3319"));
    expect(rowByName(MISSILES, "Caldari Navy Mjolnir Light Missile")?.requiredSkillIds).toContain(toTypeId("3321"));
    expect(rowByName(TURRETS, "Heavy Pulse Laser II")?.requiredSkillIds).toContain(toTypeId("3300"));
    expect(rowByName(TURRETS, "Heavy Pulse Laser II")?.requiredSkillIds).toContain(toTypeId("3306"));
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
    expect(HULL_BONUSES["602" as ShipId]).toContainEqual({ attribute: "missileDamage", magnitude: 5, scalesWithHullSkill: true, chargeSkillId: toTypeId("3320") });
    expect(HULL_BONUSES["602" as ShipId]).toContainEqual({ attribute: "missileDamage", magnitude: 5, scalesWithHullSkill: true, chargeSkillId: toTypeId("3321") });
  });

  test("includes Raven missile ROF hull bonuses for cruise, torpedo, and rapid heavy launchers", () => {
    expect(HULL_BONUSES["638" as ShipId]).toContainEqual({ attribute: "missileRoF", magnitude: -5, scalesWithHullSkill: true, moduleGroupId: 506 });
    expect(HULL_BONUSES["638" as ShipId]).toContainEqual({ attribute: "missileRoF", magnitude: -5, scalesWithHullSkill: true, moduleGroupId: 508 });
    expect(HULL_BONUSES["638" as ShipId]).toContainEqual({ attribute: "missileRoF", magnitude: -5, scalesWithHullSkill: true, moduleGroupId: 1245 });
    expect(HULL_BONUSES["638" as ShipId]).toContainEqual({ attribute: "plateHpPercent", magnitude: 50, scalesWithHullSkill: false, moduleGroupId: 329 });
    expect(HULL_BONUSES["638" as ShipId]).toContainEqual({ attribute: "extenderHpPercent", magnitude: 100, scalesWithHullSkill: false, moduleGroupId: 38 });
  });

  test("includes Drake missile damage hull bonuses for heavy and heavy assault missiles", () => {
    expect(HULL_BONUSES["24698" as ShipId]).toContainEqual({ attribute: "shieldResist", magnitude: -4, scalesWithHullSkill: true });
    expect(HULL_BONUSES["24698" as ShipId]).toContainEqual({ attribute: "missileDamage", magnitude: 10, scalesWithHullSkill: true, chargeSkillId: toTypeId("25719") });
    expect(HULL_BONUSES["24698" as ShipId]).toContainEqual({ attribute: "missileDamage", magnitude: 10, scalesWithHullSkill: true, chargeSkillId: toTypeId("3324") });
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
      scalesWithHullSkill: true,
      moduleSkillId: toTypeId("3306"),
    });
  });

  test("includes Abaddon defensive hull bonuses for armor resist and plate/extender HP", () => {
    expect(HULL_BONUSES["24692" as ShipId]).toContainEqual({
      attribute: "armorResist",
      magnitude: -4,
      scalesWithHullSkill: true,
    });
    expect(HULL_BONUSES["24692" as ShipId]).toContainEqual({
      attribute: "plateHpPercent",
      magnitude: 50,
      scalesWithHullSkill: false,
      moduleGroupId: 329,
    });
    expect(HULL_BONUSES["24692" as ShipId]).toContainEqual({
      attribute: "extenderHpPercent",
      magnitude: 100,
      scalesWithHullSkill: false,
      moduleGroupId: 38,
    });
  });

  test("includes Garmur missile damage, velocity, and flight time hull bonuses", () => {
    expect(HULL_BONUSES["33816" as ShipId]).toContainEqual({
      attribute: "missileDamage",
      magnitude: 25,
      scalesWithHullSkill: true,
      chargeSkillId: toTypeId("3319"),
    });
    expect(HULL_BONUSES["33816" as ShipId]).toContainEqual({
      attribute: "missileVelocity",
      magnitude: 200,
      scalesWithHullSkill: false,
      chargeSkillId: toTypeId("3319"),
    });
    expect(HULL_BONUSES["33816" as ShipId]).toContainEqual({
      attribute: "missileFlightTime",
      magnitude: -50,
      scalesWithHullSkill: false,
      chargeSkillId: toTypeId("3319"),
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
    const energy = SKILL_BONUSES.find((b) => b.skillId === "3315" as TypeId && b.moduleGroupId === 53);
    const projectile = SKILL_BONUSES.find((b) => b.skillId === "3315" as TypeId && b.moduleGroupId === 55);
    const hybrid = SKILL_BONUSES.find((b) => b.skillId === "3315" as TypeId && b.moduleGroupId === 74);
    expect(energy).toBeDefined();
    expect(energy!.bonusType).toBe("turretDamage");
    expect(energy!.magnitudePerLevel).toBe(3);
    expect(projectile).toBeDefined();
    expect(hybrid).toBeDefined();
  });

  test("includes Medium Energy Turret damage bonus", () => {
    const mediumEnergy = SKILL_BONUSES.find((b) => b.requiredSkillId === toTypeId("3306"));
    expect(mediumEnergy).toBeDefined();
    expect(mediumEnergy!.bonusType).toBe("turretDamage");
    expect(mediumEnergy!.magnitudePerLevel).toBe(5);
  });

  test("includes Large Hybrid Turret damage bonus", () => {
    const largeHybrid = SKILL_BONUSES.find((b) => b.requiredSkillId === toTypeId("3307"));
    expect(largeHybrid).toBeDefined();
    expect(largeHybrid!.bonusType).toBe("turretDamage");
    expect(largeHybrid!.magnitudePerLevel).toBe(5);
  });

  test("includes Capital Energy Turret damage bonus", () => {
    const capitalEnergy = SKILL_BONUSES.find((b) => b.requiredSkillId === toTypeId("20327"));
    expect(capitalEnergy).toBeDefined();
    expect(capitalEnergy!.bonusType).toBe("turretDamage");
    expect(capitalEnergy!.magnitudePerLevel).toBe(5);
  });

  test("includes all 12 turret size skills", () => {
    const turretSizeSkillIds = new Set(["3301", "3302", "3303", "3304", "3305", "3306", "3307", "3308", "3309", "20327", "21666", "21667"].map((s) => toTypeId(s)));
    const turretSkills = SKILL_BONUSES.filter((b) => b.requiredSkillId !== undefined && turretSizeSkillIds.has(b.requiredSkillId)).map((b) => b.requiredSkillId);
    expect(turretSkills).toEqual(expect.arrayContaining([...turretSizeSkillIds]));
  });

  test("includes Medium Pulse Laser Specialization damage bonus", () => {
    const medPulseSpec = SKILL_BONUSES.find((b) => b.requiredSkillId === toTypeId("12214"));
    expect(medPulseSpec).toBeDefined();
    expect(medPulseSpec!.bonusType).toBe("turretDamage");
    expect(medPulseSpec!.magnitudePerLevel).toBe(2);
  });

  test("includes all 24 turret specialization skills", () => {
    const specSkillIds = new Set(["11082", "11083", "11084", "12201", "12202", "12203", "12204", "12205", "12206", "12207", "12208", "12209", "12210", "12211", "12212", "12213", "12214", "12215", "41403", "41404", "41405", "41406", "41407", "41408"].map((s) => toTypeId(s)));
    const specSkills = SKILL_BONUSES.filter((b) => b.requiredSkillId !== undefined && specSkillIds.has(b.requiredSkillId)).map((b) => b.requiredSkillId);
    expect(specSkills.length).toBe(24);
    expect(specSkills).toEqual(expect.arrayContaining([...specSkillIds]));
  });

  test("includes Light Missiles damage bonus", () => {
    const lightMissiles = SKILL_BONUSES.find((b) => b.skillId === toTypeId("3321") && b.bonusType === "missileDamage");
    expect(lightMissiles).toBeDefined();
    expect(lightMissiles!.magnitudePerLevel).toBe(5);
    expect(lightMissiles!.appliesTo).toBe("charge");
    expect(lightMissiles!.requiredSkillId).toBe(toTypeId("3321"));
  });

  test("includes Warhead Upgrades damage bonus", () => {
    const warhead = SKILL_BONUSES.find((b) => b.skillId === toTypeId("20315") && b.bonusType === "missileDamage");
    expect(warhead).toBeDefined();
    expect(warhead!.magnitudePerLevel).toBe(2);
    expect(warhead!.appliesTo).toBe("charge");
    expect(warhead!.requiredSkillId).toBe(toTypeId("3319"));
  });

  test("includes Missile Launcher Operation ROF bonus", () => {
    const mlo = SKILL_BONUSES.find((b) => b.skillId === toTypeId("3319") && b.bonusType === "missileRoF");
    expect(mlo).toBeDefined();
    expect(mlo!.magnitudePerLevel).toBe(-2);
    expect(mlo!.appliesTo).toBe("module");
  });

  test("includes Rapid Launch ROF bonus", () => {
    const rapidLaunch = SKILL_BONUSES.find((b) => b.skillId === toTypeId("21071") && b.bonusType === "missileRoF");
    expect(rapidLaunch).toBeDefined();
    expect(rapidLaunch!.magnitudePerLevel).toBe(-3);
    expect(rapidLaunch!.appliesTo).toBe("module");
  });

  test("includes Light Missile Specialization ROF bonus", () => {
    const lightSpec = SKILL_BONUSES.find((b) => b.skillId === toTypeId("20210") && b.bonusType === "missileRoF");
    expect(lightSpec).toBeDefined();
    expect(lightSpec!.magnitudePerLevel).toBe(-2);
    expect(lightSpec!.appliesTo).toBe("module");
  });

  test("includes Missile Bombardment flight time bonus", () => {
    const bombardment = SKILL_BONUSES.find((b) => b.skillId === toTypeId("12441") && b.bonusType === "missileFlightTime");
    expect(bombardment).toBeDefined();
    expect(bombardment!.magnitudePerLevel).toBe(10);
    expect(bombardment!.appliesTo).toBe("charge");
  });

  test("includes Missile Projection velocity bonus", () => {
    const projection = SKILL_BONUSES.find((b) => b.skillId === toTypeId("12442") && b.bonusType === "missileVelocity");
    expect(projection).toBeDefined();
    expect(projection!.magnitudePerLevel).toBe(10);
    expect(projection!.appliesTo).toBe("charge");
  });

  test("includes Guided Precision explosion radius bonus", () => {
    const precision = SKILL_BONUSES.find((b) => b.skillId === toTypeId("20312") && b.bonusType === "missileExplosionRadius");
    expect(precision).toBeDefined();
    expect(precision!.magnitudePerLevel).toBe(-5);
    expect(precision!.appliesTo).toBe("charge");
  });

  test("includes Target Navigation Prediction explosion velocity bonus", () => {
    const targetNav = SKILL_BONUSES.find((b) => b.skillId === toTypeId("20314") && b.bonusType === "missileExplosionVelocity");
    expect(targetNav).toBeDefined();
    expect(targetNav!.magnitudePerLevel).toBe(10);
    expect(targetNav!.appliesTo).toBe("charge");
  });

  test("includes Motion Prediction tracking bonus", () => {
    const motionPred = SKILL_BONUSES.find((b) => b.skillId === toTypeId("3312") && b.bonusType === "turretTracking");
    expect(motionPred).toBeDefined();
    expect(motionPred!.magnitudePerLevel).toBe(5);
    expect(motionPred!.appliesTo).toBe("module");
  });

  test("includes Sharpshooter optimal range bonus", () => {
    const sharpshooter = SKILL_BONUSES.find((b) => b.skillId === toTypeId("3311") && b.bonusType === "turretOptimal");
    expect(sharpshooter).toBeDefined();
    expect(sharpshooter!.magnitudePerLevel).toBe(5);
    expect(sharpshooter!.appliesTo).toBe("module");
  });

  test("includes Trajectory Analysis falloff bonus", () => {
    const trajectory = SKILL_BONUSES.find((b) => b.skillId === toTypeId("3317") && b.bonusType === "turretFalloff");
    expect(trajectory).toBeDefined();
    expect(trajectory!.magnitudePerLevel).toBe(5);
    expect(trajectory!.appliesTo).toBe("module");
  });

  test("Heavy Pulse Laser II has Medium Pulse Laser Specialization", () => {
    const hpl2 = Object.values(TURRETS).find((t) => t.name === "Heavy Pulse Laser II");
    expect(hpl2).toBeDefined();
    expect(hpl2!.specializationSkill).toBe("Medium Pulse Laser Specialization");
  });

  test("includes target painters with signature radius bonus, range and falloff", () => {
    const painter = rowByName(TARGET_PAINTERS, "Target Painter II");
    expect(painter).toMatchObject({
      maxRange: 36000,
      falloff: 90000,
      signatureRadiusBonusPercent: 30,
      overloadStrengthBonusPercent: 20,
    });
    expect(moduleByName("Target Painter II")?.targetPainter).toMatchObject(baseStats(painter!));
  });

  test("includes missile guidance computers with application and range bonuses", () => {
    const mgc = rowByName(MISSILE_GUIDANCE_COMPUTERS, "Missile Guidance Computer II");
    expect(mgc).toMatchObject({
      explosionRadiusBonusPercent: -8.25,
      explosionVelocityBonusPercent: 8.25,
      missileVelocityBonusPercent: 5.5,
      flightTimeBonusPercent: 5.5,
      overloadStrengthBonusPercent: 15,
    });
  });

  test("includes missile guidance enhancers with passive application and range bonuses", () => {
    const mge = rowByName(MISSILE_GUIDANCE_ENHANCERS, "Missile Guidance Enhancer II");
    expect(mge).toMatchObject({
      explosionRadiusBonusPercent: -6,
      explosionVelocityBonusPercent: 6,
      missileVelocityBonusPercent: 6,
      flightTimeBonusPercent: 6,
    });
  });

  test("includes missile guidance scripts with precision and range multipliers", () => {
    const precision = rowByName(MISSILE_SCRIPTS, "Missile Precision Script");
    expect(precision).toMatchObject({
      explosionRadiusMultiplier: 2,
      explosionVelocityMultiplier: 2,
      missileVelocityMultiplier: 0,
      flightTimeMultiplier: 0,
    });
    const range = rowByName(MISSILE_SCRIPTS, "Missile Range Script");
    expect(range).toMatchObject({
      explosionRadiusMultiplier: 0,
      explosionVelocityMultiplier: 0,
      missileVelocityMultiplier: 2,
      flightTimeMultiplier: 2,
    });
  });

  test("includes ballistic control systems with missile damage and cycle time multipliers", () => {
    expect(moduleByName("Ballistic Control System II")).toMatchObject({
      missileDamageMultiplier: 1.1,
      missileCycleTimeMultiplier: 0.895,
    });
  });

  test("includes sensor dampeners with scan resolution and targeting range penalties", () => {
    const dampener = rowByName(SENSOR_DAMPENERS, "Remote Sensor Dampener II");
    expect(dampener).toMatchObject({
      optimal: 30000,
      falloff: 60000,
      scanResolutionBonusPercent: -15.3,
      maxTargetRangeBonusPercent: -15.3,
      overloadStrengthBonusPercent: 20,
    });
    expect(moduleByName("Remote Sensor Dampener II")?.sensorDampener).toMatchObject(baseStats(dampener!));
  });

  test("includes sensor boosters with scan resolution and targeting range bonuses", () => {
    const booster = rowByName(SENSOR_BOOSTERS, "Sensor Booster II");
    expect(booster).toMatchObject({
      scanResolutionBonusPercent: 30,
      maxTargetRangeBonusPercent: 30,
      overloadStrengthBonusPercent: 15,
    });
    expect(moduleByName("Sensor Booster II")?.sensorBooster).toMatchObject(baseStats(booster!));
  });

  test("includes signal amplifiers with passive sensor bonuses and max locked targets", () => {
    const amplifier = rowByName(SIGNAL_AMPLIFIERS, "Signal Amplifier II");
    expect(amplifier).toMatchObject({
      scanResolutionBonusPercent: 15,
      maxTargetRangeBonusPercent: 30,
      maxLockedTargetsBonus: 2,
    });
    expect(moduleByName("Signal Amplifier II")?.signalAmplifier).toMatchObject(baseStats(amplifier!));
  });

  test("includes sensor booster scripts with scan resolution and targeting range multipliers", () => {
    const scanResScript = rowByName(SENSOR_BOOSTER_SCRIPTS, "Scan Resolution Script");
    expect(scanResScript).toMatchObject({
      scanResolutionMultiplier: 2,
      maxTargetRangeMultiplier: 0,
    });
    const rangeScript = rowByName(SENSOR_BOOSTER_SCRIPTS, "Targeting Range Script");
    expect(rangeScript).toMatchObject({
      scanResolutionMultiplier: 0,
      maxTargetRangeMultiplier: 2,
    });
  });

  test("includes sensor dampener scripts with scan resolution and targeting range multipliers", () => {
    const scanResScript = rowByName(SENSOR_DAMPENER_SCRIPTS, "Scan Resolution Dampening Script");
    expect(scanResScript).toMatchObject({
      scanResolutionMultiplier: 2,
      maxTargetRangeMultiplier: 0,
    });
    const rangeScript = rowByName(SENSOR_DAMPENER_SCRIPTS, "Targeting Range Dampening Script");
    expect(rangeScript).toMatchObject({
      scanResolutionMultiplier: 0,
      maxTargetRangeMultiplier: 2,
    });
  });
});
