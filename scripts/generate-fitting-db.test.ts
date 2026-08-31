import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildDisruptionScriptStats, buildDroneStats, buildLauncherStats, buildMissileStats, buildStasisWebStats, buildTrackingComputerStats, buildTrackingDisruptorStats, buildWarpScramblerStats, _buildModuleStats, _buildTargetPainterStats, _buildMissileGuidanceComputerStats, _buildMissileGuidanceEnhancerStats, _buildMissileScriptStats, _filterItemNames, _writeI18nFiles } from "./generate-fitting-db";

function values(entries: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(entries));
}

function sdeType(metaLevel = 0, metaGroupID = 1, volume?: number): { typeID: number; "typeName_en-us": string; groupID: number; published: number; metaLevel: number; metaGroupID: number; volume?: number } {
  return { typeID: 0, "typeName_en-us": "", groupID: 0, published: 1, metaLevel, metaGroupID, volume };
}

describe("buildStasisWebStats", () => {
  test("returns undefined when required attributes are missing", () => {
    expect(buildStasisWebStats(values({ maxRange: 10000 }))).toBeUndefined();
    expect(buildStasisWebStats(values({ speedFactor: -50 }))).toBeUndefined();
  });

  test("builds a web from speed factor and range", () => {
    expect(buildStasisWebStats(values({ maxRange: 10000, speedFactor: -55 }))).toEqual({
      maxRange: 10000,
      speedFactorPercent: -55,
      overloadRangeBonusPercent: 0,
    });
  });

  test("preserves overload range bonus when present", () => {
    expect(buildStasisWebStats(values({ maxRange: 10000, speedFactor: -60, overloadRangeBonus: 30 }))).toEqual({
      maxRange: 10000,
      speedFactorPercent: -60,
      overloadRangeBonusPercent: 30,
    });
  });
});

describe("buildTrackingDisruptorStats", () => {
  test("returns undefined for guidance disruptors without trackingSpeedBonus", () => {
    expect(buildTrackingDisruptorStats(values({ maxRange: 48000, falloffEffectiveness: 24000 }))).toBeUndefined();
  });

  test("builds a tracking disruptor from weapon disruptor attributes", () => {
    expect(buildTrackingDisruptorStats(values({
      maxRange: 48000,
      falloffEffectiveness: 24000,
      trackingSpeedBonus: -17.19,
      overloadTrackingModuleStrengthBonus: 20,
    }))).toEqual({
      optimal: 48000,
      falloff: 24000,
      disruptionPercent: -17.19,
      overloadStrengthBonusPercent: 20,
    });
  });
});

describe("_filterItemNames", () => {
  function makeType(overrides: { published: number; groupID: number; typeName?: string; typeID?: number }) {
    return {
      typeID: overrides.typeID ?? 1,
      "typeName_en-us": overrides.typeName ?? "Name",
      groupID: overrides.groupID,
      published: overrides.published,
    };
  }

  test("includes published in-scope category items", () => {
    const itemNames = { "A": { en: "A", zh: "a", ja: "a" } };
    const idToType = new Map([["A", makeType({ published: 1, groupID: 1 })]]);
    const groups = { "1": { groupID: 1, categoryID: 7 } };
    const result = _filterItemNames(itemNames, idToType, groups, new Set());
    expect(Object.keys(result)).toContain("A");
  });

  test("includes published structure modules (category 66 is in scope)", () => {
    const itemNames = { "Structure X": { en: "Structure X", zh: "x", ja: "x" } };
    const idToType = new Map([["Structure X", makeType({ published: 1, groupID: 2, typeName: "Structure X" })]]);
    const groups = { "2": { groupID: 2, categoryID: 66 } };
    const result = _filterItemNames(itemNames, idToType, groups, new Set());
    expect(Object.keys(result)).toContain("Structure X");
  });

  test("includes unpublished in-scope items", () => {
    const itemNames = { "Unpublished Y": { en: "Unpublished Y", zh: "y", ja: "y" } };
    const idToType = new Map([["Unpublished Y", makeType({ published: 0, groupID: 1, typeName: "Unpublished Y" })]]);
    const groups = { "1": { groupID: 1, categoryID: 7 } };
    const result = _filterItemNames(itemNames, idToType, groups, new Set());
    expect(Object.keys(result)).toContain("Unpublished Y");
  });

  test("includes fuel category items (category 4 is in scope)", () => {
    const itemNames = { "Nitrogen Isotopes": { en: "Nitrogen Isotopes", zh: "n", ja: "n" } };
    const idToType = new Map([["Nitrogen Isotopes", makeType({ published: 1, groupID: 3, typeName: "Nitrogen Isotopes" })]]);
    const groups = { "3": { groupID: 3, categoryID: 4 } };
    const result = _filterItemNames(itemNames, idToType, groups, new Set());
    expect(Object.keys(result)).toContain("Nitrogen Isotopes");
  });

  test("includes deployable category items (category 22 is in scope)", () => {
    const itemNames = { "Mobile Depot": { en: "Mobile Depot", zh: "m", ja: "m" } };
    const idToType = new Map([["Mobile Depot", makeType({ published: 1, groupID: 4, typeName: "Mobile Depot" })]]);
    const groups = { "4": { groupID: 4, categoryID: 22 } };
    const result = _filterItemNames(itemNames, idToType, groups, new Set());
    expect(Object.keys(result)).toContain("Mobile Depot");
  });

  test("excludes out-of-scope category items", () => {
    const itemNames = { "Out Of Scope": { en: "Out Of Scope", zh: "o", ja: "o" } };
    const idToType = new Map([["Out Of Scope", makeType({ published: 1, groupID: 5, typeName: "Out Of Scope" })]]);
    const groups = { "5": { groupID: 5, categoryID: 1 } };
    const result = _filterItemNames(itemNames, idToType, groups, new Set());
    expect(Object.keys(result)).not.toContain("Out Of Scope");
  });

  test("includes names that are keys of emitted fittingDb tables", () => {
    const itemNames = { "Table Key": { en: "Table Key", zh: "table", ja: "table" } };
    const idToType = new Map([["Table Key", makeType({ published: 0, groupID: 1, typeName: "Table Key" })]]);
    const groups = { "1": { groupID: 1, categoryID: 7 } };
    const result = _filterItemNames(itemNames, idToType, groups, new Set(["Table Key"]));
    expect(Object.keys(result)).toContain("Table Key");
  });
});

describe("buildWarpScramblerStats", () => {
  test("returns undefined when propulsion block attribute is missing or non-positive", () => {
    expect(buildWarpScramblerStats(values({ maxRange: 9000 }))).toBeUndefined();
    expect(buildWarpScramblerStats(values({ activationBlockedStrenght: 0, maxRange: 9000 }))).toBeUndefined();
  });

  test("builds a warp scrambler from propulsion block, range, and overload bonus", () => {
    expect(buildWarpScramblerStats(values({ activationBlockedStrenght: 1, maxRange: 9000, overloadRangeBonus: 20 }))).toEqual({
      maxRange: 9000,
      overloadRangeBonusPercent: 20,
    });
  });

  test("defaults missing overload range bonus to zero", () => {
    expect(buildWarpScramblerStats(values({ activationBlockedStrenght: 1, maxRange: 7500 }))).toEqual({
      maxRange: 7500,
      overloadRangeBonusPercent: 0,
    });
  });

  test("returns undefined when range is missing", () => {
    expect(buildWarpScramblerStats(values({ activationBlockedStrenght: 1 }))).toBeUndefined();
  });
});

describe("buildTrackingComputerStats", () => {
  test("returns undefined when tracking bonus is missing", () => {
    expect(buildTrackingComputerStats(values({}))).toBeUndefined();
  });

  test("builds a tracking computer from bonus attributes", () => {
    expect(buildTrackingComputerStats(values({ trackingSpeedBonus: 10, maxRangeBonus: 5, falloffBonus: 10 }))).toEqual({
      trackingBonusPercent: 10,
      optimalBonusPercent: 5,
      falloffBonusPercent: 10,
    });
  });

  test("defaults missing range and falloff bonuses to zero", () => {
    expect(buildTrackingComputerStats(values({ trackingSpeedBonus: 15 }))).toEqual({
      trackingBonusPercent: 15,
      optimalBonusPercent: 0,
      falloffBonusPercent: 0,
    });
  });
});

describe("buildDisruptionScriptStats", () => {
  test("builds script deltas from bonus attributes", () => {
    expect(buildDisruptionScriptStats(values({
      trackingSpeedBonusBonus: -100,
      maxRangeBonusBonus: 100,
      falloffBonusBonus: 100,
    }))).toEqual({
      trackingDeltaBonus: -100,
      rangeDeltaBonus: 100,
      falloffDeltaBonus: 100,
    });
  });

  test("defaults missing deltas to zero", () => {
    expect(buildDisruptionScriptStats(values({}))).toEqual({
      trackingDeltaBonus: 0,
      rangeDeltaBonus: 0,
      falloffDeltaBonus: 0,
    });
  });
});

describe("_buildModuleStats", () => {
  function effects(...ids: number[]): Set<number> {
    return new Set(ids);
  }

  test("returns undefined when no stats are present", () => {
    expect(_buildModuleStats(values({}), effects())).toBeUndefined();
  });

  test("extracts mass and agility stats without damage effects", () => {
    expect(_buildModuleStats(values({ massAddition: 500000, agilityMultiplier: -10 }), effects())).toEqual({
      massAddition: 500000,
      agilityMultiplier: 0.9,
    });
  });

  test("extracts Heat Sink damage and speed multipliers with energy weapon effect", () => {
    // Heat Sink II: effect 91 (energyWeaponDamageMultiply), effect 95 (energyWeaponSpeedMultiply)
    const stats = _buildModuleStats(values({ damageMultiplier: 1.1, speedMultiplier: 0.895 }), effects(91, 95));
    expect(stats).toEqual({
      turretDamageMultiplier: 1.1,
      turretSpeedMultiplier: 0.895,
      turretWeaponGroup: "Energy Weapon",
    });
  });

  test("extracts Gyrostabilizer damage and speed with projectile weapon effect", () => {
    // Gyrostabilizer II: effect 92 (projectileWeaponDamageMultiply), effect 89 (projectileWeaponSpeedMultiply)
    const stats = _buildModuleStats(values({ damageMultiplier: 1.15, speedMultiplier: 0.89 }), effects(92, 89));
    expect(stats).toEqual({
      turretDamageMultiplier: 1.15,
      turretSpeedMultiplier: 0.89,
      turretWeaponGroup: "Projectile Weapon",
    });
  });

  test("extracts Magnetic Field Stabilizer with hybrid weapon effect", () => {
    // Magnetic Field Stabilizer II: effect 93 (hybridWeaponDamageMultiply), effect 96 (hybridWeaponSpeedMultiply)
    const stats = _buildModuleStats(values({ damageMultiplier: 1.15, speedMultiplier: 0.905 }), effects(93, 96));
    expect(stats).toEqual({
      turretDamageMultiplier: 1.15,
      turretSpeedMultiplier: 0.905,
      turretWeaponGroup: "Hybrid Weapon",
    });
  });

  test("does not extract damage stats when no damage effect is present", () => {
    const stats = _buildModuleStats(values({ damageMultiplier: 1.1, speedMultiplier: 0.895 }), effects());
    expect(stats).toBeUndefined();
  });

  test("preserves damage stats alongside tracking stats", () => {
    const stats = _buildModuleStats(values({ damageMultiplier: 1.1, speedMultiplier: 0.895, trackingSpeedBonus: 10 }), effects(91, 95));
    expect(stats).toEqual({
      turretDamageMultiplier: 1.1,
      turretSpeedMultiplier: 0.895,
      turretWeaponGroup: "Energy Weapon",
      turretTrackingPercent: 10,
    });
  });

  test("extracts rig damage effects for projectile weapon", () => {
    // Projectile rig: effect 2798 (projectileWeaponDamageMultiplyPassive), effect 2799 (projectileWeaponSpeedMultiplyPassive)
    const stats = _buildModuleStats(values({ damageMultiplier: 1.15, speedMultiplier: 0.93 }), effects(2798, 2799));
    expect(stats).toEqual({
      turretDamageMultiplier: 1.15,
      turretSpeedMultiplier: 0.93,
      turretWeaponGroup: "Projectile Weapon",
    });
  });
});

describe("buildLauncherStats", () => {
  test("returns undefined when speed attribute is missing", () => {
    expect(buildLauncherStats(values({ chargeGroup1: 384 }), 509, sdeType())).toBeUndefined();
  });

  test("returns undefined when speed is non-positive", () => {
    expect(buildLauncherStats(values({ speed: 0, chargeGroup1: 384 }), 509, sdeType())).toBeUndefined();
    expect(buildLauncherStats(values({ speed: -100, chargeGroup1: 384 }), 509, sdeType())).toBeUndefined();
  });

  test("returns undefined when no charge groups are present", () => {
    expect(buildLauncherStats(values({ speed: 13600 }), 509, sdeType())).toBeUndefined();
  });

  test("converts cycle time from milliseconds to seconds and preserves launcher group with charge groups", () => {
    // Arbalest Compact Light Missile Launcher: speed=13600ms, group 509, chargeGroup1=384, chargeGroup2=394
    expect(buildLauncherStats(values({ speed: 13600, chargeGroup1: 384, chargeGroup2: 394 }), 509, sdeType())).toEqual({
      rateOfFire: 13.6,
      launcherGroup: 509,
      chargeGroups: [384, 394],
      metaLevel: 0,
      metaGroupID: 1,
    });
  });

  test("collects charge groups from chargeGroup1 through chargeGroup5", () => {
    expect(buildLauncherStats(values({
      speed: 18000, chargeGroup1: 657, chargeGroup3: 89,
    }), 508, sdeType())).toEqual({
      rateOfFire: 18,
      launcherGroup: 508,
      chargeGroups: [657, 89],
      metaLevel: 0,
      metaGroupID: 1,
    });
  });

  test("preserves torpedo launcher group (508) with chargeGroup3", () => {
    const stats = buildLauncherStats(values({ speed: 18000, chargeGroup3: 89 }), 508, sdeType());
    expect(stats?.launcherGroup).toBe(508);
    expect(stats?.chargeGroups).toEqual([89]);
  });

  test("preserves metaLevel and metaGroupID from SDE type", () => {
    expect(buildLauncherStats(values({ speed: 12800, chargeGroup1: 384 }), 509, sdeType(5, 2))).toEqual({
      rateOfFire: 12.8,
      launcherGroup: 509,
      chargeGroups: [384],
      metaLevel: 5,
      metaGroupID: 2,
    });
  });
});

describe("buildMissileStats", () => {
  test("returns undefined when all damage attributes are zero or missing", () => {
    expect(buildMissileStats(values({
      aoeCloudSize: 50, aoeVelocity: 170, aoeDamageReductionFactor: 2.7,
      maxVelocity: 3000, explosionDelay: 5000, launcherGroup: 509,
    }), 384)).toBeUndefined();
  });

  test("returns undefined when application attributes are missing", () => {
    expect(buildMissileStats(values({ kineticDamage: 100 }), 384)).toBeUndefined();
  });

  test("builds a kinetic light missile from SDE attributes", () => {
    // Mjolnir Light Missile is EM, but we test with kinetic here
    expect(buildMissileStats(values({
      emDamage: 0, thermalDamage: 0, kineticDamage: 113, explosiveDamage: 0,
      aoeCloudSize: 50, aoeVelocity: 170, aoeDamageReductionFactor: 2.7,
      maxVelocity: 3750, explosionDelay: 5000, launcherGroup: 509,
    }), 384)).toEqual({
      damage: 113,
      damageType: "kinetic",
      explosionRadius: 50,
      explosionVelocity: 170,
      damageReductionFactor: 2.7,
      maxVelocity: 3750,
      flightTime: 5,
      launcherGroup: 509,
      chargeGroup: 384,
    });
  });

  test("classifies EM damage type when emDamage is present", () => {
    const stats = buildMissileStats(values({
      emDamage: 113, thermalDamage: 0, kineticDamage: 0, explosiveDamage: 0,
      aoeCloudSize: 50, aoeVelocity: 170, aoeDamageReductionFactor: 2.7,
      maxVelocity: 3750, explosionDelay: 5000, launcherGroup: 509,
    }), 384);
    expect(stats?.damageType).toBe("em");
    expect(stats?.damage).toBe(113);
  });

  test("classifies thermal damage type when thermalDamage is present", () => {
    const stats = buildMissileStats(values({
      emDamage: 0, thermalDamage: 113, kineticDamage: 0, explosiveDamage: 0,
      aoeCloudSize: 50, aoeVelocity: 170, aoeDamageReductionFactor: 2.7,
      maxVelocity: 3750, explosionDelay: 5000, launcherGroup: 509,
    }), 384);
    expect(stats?.damageType).toBe("thermal");
  });

  test("classifies explosive damage type when only explosiveDamage is present", () => {
    const stats = buildMissileStats(values({
      emDamage: 0, thermalDamage: 0, kineticDamage: 0, explosiveDamage: 113,
      aoeCloudSize: 50, aoeVelocity: 170, aoeDamageReductionFactor: 2.7,
      maxVelocity: 3750, explosionDelay: 5000, launcherGroup: 509,
    }), 384);
    expect(stats?.damageType).toBe("explosive");
  });

  test("converts flight time from milliseconds to seconds", () => {
    const stats = buildMissileStats(values({
      emDamage: 0, thermalDamage: 0, kineticDamage: 100, explosiveDamage: 0,
      aoeCloudSize: 50, aoeVelocity: 170, aoeDamageReductionFactor: 2.7,
      maxVelocity: 3750, explosionDelay: 10000, launcherGroup: 509,
    }), 384);
    expect(stats?.flightTime).toBe(10);
  });

  test("sums multi-type damage into total damage", () => {
    const stats = buildMissileStats(values({
      emDamage: 30, thermalDamage: 30, kineticDamage: 30, explosiveDamage: 30,
      aoeCloudSize: 50, aoeVelocity: 170, aoeDamageReductionFactor: 2.7,
      maxVelocity: 3750, explosionDelay: 5000, launcherGroup: 509,
    }), 384);
    expect(stats?.damage).toBe(120);
  });
});

describe("buildDroneStats", () => {
  test("returns undefined when damageMultiplier is missing", () => {
    expect(buildDroneStats(values({ trackingSpeed: 2, optimalSigRadius: 25, maxRange: 2100, speed: 4000 }), sdeType())).toBeUndefined();
  });

  test("returns undefined when all damage attributes are zero", () => {
    expect(buildDroneStats(values({
      damageMultiplier: 1.92, trackingSpeed: 2.178, optimalSigRadius: 25, maxRange: 2100, speed: 4000,
      emDamage: 0, thermalDamage: 0, kineticDamage: 0, explosiveDamage: 0,
    }), sdeType())).toBeUndefined();
  });

  test("builds a light combat drone (Hobgoblin II) with both speed fields", () => {
    const stats = buildDroneStats(values({
      damageMultiplier: 1.92, trackingSpeed: 2.178, optimalSigRadius: 25, maxRange: 2100, speed: 4000,
      emDamage: 0, thermalDamage: 20, kineticDamage: 0, explosiveDamage: 0,
      falloff: 2000, maxVelocity: 3360, entityCruiseSpeed: 660, droneBandwidthUsed: 5,
    }), sdeType(5, 2, 5));
    expect(stats).toEqual({
      sizeClass: "light",
      damageMultiplier: 1.92,
      emDamage: 0, thermalDamage: 20, kineticDamage: 0, explosiveDamage: 0,
      tracking: 2.178, sigResolution: 25, optimal: 2100, falloff: 2000,
      maxVelocity: 3360, orbitSpeed: 660, cycleTime: 4, bandwidth: 5, volume: 5,
      metaLevel: 5, metaGroupID: 2,
    });
  });

  test("builds a sentry drone (Garde II) with zero orbit speed", () => {
    const stats = buildDroneStats(values({
      damageMultiplier: 1.65, trackingSpeed: 0.0336, optimalSigRadius: 400, maxRange: 18000, speed: 4000,
      emDamage: 0, thermalDamage: 64, kineticDamage: 0, explosiveDamage: 0,
      falloff: 30000, maxVelocity: 0.00001, entityCruiseSpeed: 0, droneBandwidthUsed: 25,
    }), sdeType(5, 2, 25));
    expect(stats?.sizeClass).toBe("sentry");
    expect(stats?.maxVelocity).toBe(0.00001);
    expect(stats?.orbitSpeed).toBe(0);
  });

  test("classifies medium drone by bandwidth 10", () => {
    const stats = buildDroneStats(values({
      damageMultiplier: 1.92, trackingSpeed: 1.2, optimalSigRadius: 50, maxRange: 3000, speed: 4000,
      thermalDamage: 24, maxVelocity: 1500, entityCruiseSpeed: 500, droneBandwidthUsed: 10,
    }), sdeType());
    expect(stats?.sizeClass).toBe("medium");
  });

  test("classifies heavy drone by bandwidth 25", () => {
    const stats = buildDroneStats(values({
      damageMultiplier: 1.92, trackingSpeed: 0.6, optimalSigRadius: 100, maxRange: 4000, speed: 4000,
      thermalDamage: 48, maxVelocity: 1000, entityCruiseSpeed: 400, droneBandwidthUsed: 25,
    }), sdeType());
    expect(stats?.sizeClass).toBe("heavy");
  });

  test("falls back to bandwidth for volume when type volume is missing", () => {
    const stats = buildDroneStats(values({
      damageMultiplier: 1.92, trackingSpeed: 2.178, optimalSigRadius: 25, maxRange: 2100, speed: 4000,
      thermalDamage: 20, droneBandwidthUsed: 5,
    }), sdeType());
    expect(stats?.volume).toBe(5);
  });
});

describe("_buildTargetPainterStats", () => {
  test("returns undefined when signatureRadiusBonus is missing", () => {
    expect(_buildTargetPainterStats(values({ maxRange: 36000 }))).toBeUndefined();
  });

  test("returns undefined when maxRange is missing", () => {
    expect(_buildTargetPainterStats(values({ signatureRadiusBonus: 30 }))).toBeUndefined();
  });

  test("builds a target painter from SDE attributes", () => {
    expect(_buildTargetPainterStats(values({
      maxRange: 36000,
      falloffEffectiveness: 90000,
      signatureRadiusBonus: 30,
      overloadPainterStrengthBonus: 20,
    }))).toEqual({
      maxRange: 36000,
      falloff: 90000,
      signatureRadiusBonusPercent: 30,
      overloadStrengthBonusPercent: 20,
    });
  });

  test("defaults falloff and overload bonus to zero when missing", () => {
    expect(_buildTargetPainterStats(values({ maxRange: 30000, signatureRadiusBonus: 25 }))).toEqual({
      maxRange: 30000,
      falloff: 0,
      signatureRadiusBonusPercent: 25,
      overloadStrengthBonusPercent: 0,
    });
  });
});

describe("_buildMissileGuidanceComputerStats", () => {
  test("returns undefined when aoeCloudSizeBonus is missing", () => {
    expect(_buildMissileGuidanceComputerStats(values({ aoeVelocityBonus: 8.25 }))).toBeUndefined();
  });

  test("builds an MGC II from SDE attributes", () => {
    expect(_buildMissileGuidanceComputerStats(values({
      aoeCloudSizeBonus: -8.25,
      aoeVelocityBonus: 8.25,
      missileVelocityBonus: 5.5,
      explosionDelayBonus: 5.5,
      overloadTrackingModuleStrengthBonus: 15,
    }))).toEqual({
      explosionRadiusBonusPercent: -8.25,
      explosionVelocityBonusPercent: 8.25,
      missileVelocityBonusPercent: 5.5,
      flightTimeBonusPercent: 5.5,
      overloadStrengthBonusPercent: 15,
    });
  });

  test("defaults missing bonuses to zero", () => {
    expect(_buildMissileGuidanceComputerStats(values({ aoeCloudSizeBonus: -5.5 }))).toEqual({
      explosionRadiusBonusPercent: -5.5,
      explosionVelocityBonusPercent: 0,
      missileVelocityBonusPercent: 0,
      flightTimeBonusPercent: 0,
      overloadStrengthBonusPercent: 0,
    });
  });
});

describe("_buildMissileGuidanceEnhancerStats", () => {
  test("returns undefined when aoeCloudSizeBonus is missing", () => {
    expect(_buildMissileGuidanceEnhancerStats(values({ aoeVelocityBonus: 6 }))).toBeUndefined();
  });

  test("builds an MGE II from SDE attributes", () => {
    expect(_buildMissileGuidanceEnhancerStats(values({
      aoeCloudSizeBonus: -6,
      aoeVelocityBonus: 6,
      missileVelocityBonus: 6,
      explosionDelayBonus: 6,
    }))).toEqual({
      explosionRadiusBonusPercent: -6,
      explosionVelocityBonusPercent: 6,
      missileVelocityBonusPercent: 6,
      flightTimeBonusPercent: 6,
    });
  });
});

describe("_buildMissileScriptStats", () => {
  test("returns undefined when aoeCloudSizeBonusBonus is missing", () => {
    expect(_buildMissileScriptStats(values({ aoeVelocityBonusBonus: 100 }))).toBeUndefined();
  });

  test("builds a precision script from SDE attributes", () => {
    expect(_buildMissileScriptStats(values({
      aoeCloudSizeBonusBonus: 100,
      aoeVelocityBonusBonus: 100,
      missileVelocityBonusBonus: -100,
      explosionDelayBonusBonus: -100,
    }))).toEqual({
      explosionRadiusMultiplier: 2,
      explosionVelocityMultiplier: 2,
      missileVelocityMultiplier: 0,
      flightTimeMultiplier: 0,
    });
  });

  test("builds a range script from SDE attributes", () => {
    expect(_buildMissileScriptStats(values({
      aoeCloudSizeBonusBonus: -100,
      aoeVelocityBonusBonus: -100,
      missileVelocityBonusBonus: 100,
      explosionDelayBonusBonus: 100,
    }))).toEqual({
      explosionRadiusMultiplier: 0,
      explosionVelocityMultiplier: 0,
      missileVelocityMultiplier: 2,
      flightTimeMultiplier: 2,
    });
  });
});

describe("Ballistic Control System in _buildModuleStats", () => {
  function effects(...ids: number[]): Set<number> {
    return new Set(ids);
  }

  test("extracts BCS damage and cycle time multipliers with missile damage effects", () => {
    const stats = _buildModuleStats(values({ missileDamageMultiplierBonus: 1.1, speedMultiplier: 0.895 }), effects(763, 889));
    expect(stats).toEqual({
      missileDamageMultiplier: 1.1,
      missileCycleTimeMultiplier: 0.895,
    });
  });

  test("does not extract missile damage stats when no missile effect is present", () => {
    const stats = _buildModuleStats(values({ missileDamageMultiplierBonus: 1.1, speedMultiplier: 0.895 }), effects());
    expect(stats).toBeUndefined();
  });
});

describe("_writeI18nFiles", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "i18n-XXXXXX"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function filePaths() {
    return {
      enFile: join(tempDir, "item-names-en.ts"),
      zhFile: join(tempDir, "item-names-zh.ts"),
      jaFile: join(tempDir, "item-names-ja.ts"),
      collisionEnFile: join(tempDir, "item-name-collisions-en.ts"),
      collisionZhFile: join(tempDir, "item-name-collisions-zh.ts"),
      collisionJaFile: join(tempDir, "item-name-collisions-ja.ts"),
      canonicalOverrides: { en: {}, zh: {}, ja: {} },
    };
  }

  function parseExport(filePath: string, constName: string): unknown {
    const content = readFileSync(filePath, "utf8");
    const match = content.match(new RegExp(`export const ${constName}[^=]*=([\\s\\S]*?);`));
    if (!match) throw new Error(`Export ${constName} not found in ${filePath}`);
    return JSON.parse(match[1].trim());
  }

  test("sorts English names and keeps zh/ja records keyed by id", async () => {
    const itemNames = {
      B: { en: "B", zh: "b-zh", ja: "b-ja" },
      A: { en: "A", zh: "a-zh", ja: "a-ja" },
      C: { en: "C", zh: "c-zh", ja: "c-ja" },
    };
    const paths = filePaths();
    await _writeI18nFiles(itemNames, "2026-08-24", paths);
    const en = parseExport(paths.enFile, "ITEM_NAMES_EN");
    const zh = parseExport(paths.zhFile, "ITEM_NAMES_ZH");
    const ja = parseExport(paths.jaFile, "ITEM_NAMES_JA");
    expect(en).toEqual({ A: "A", B: "B", C: "C" });
    expect(zh).toEqual({ A: "a-zh", B: "b-zh", C: "c-zh" });
    expect(ja).toEqual({ A: "a-ja", B: "b-ja", C: "c-ja" });
  });

  test("falls back to the English name when a localization is blank or missing", async () => {
    const itemNames = {
      B: { en: "B", zh: "b-zh" },
      A: { en: "A", zh: "", ja: "" },
      C: { en: "C", ja: "c-ja" },
    };
    const paths = filePaths();
    await _writeI18nFiles(itemNames, "2026-08-24", paths);
    const en = parseExport(paths.enFile, "ITEM_NAMES_EN");
    const zh = parseExport(paths.zhFile, "ITEM_NAMES_ZH");
    const ja = parseExport(paths.jaFile, "ITEM_NAMES_JA");
    expect(en).toEqual({ A: "A", B: "B", C: "C" });
    expect(zh).toEqual({ A: "A", B: "b-zh", C: "C" });
    expect(ja).toEqual({ A: "A", B: "B", C: "c-ja" });
  });

  test("writes per-language collision tables", async () => {
    const itemNames = {
      A: { en: "A", zh: "same-zh", ja: "same-ja" },
      B: { en: "B", zh: "same-zh", ja: "same-ja" },
    };
    const paths = filePaths();
    await _writeI18nFiles(itemNames, "2026-08-24", paths);
    const enCollisions = parseExport(paths.collisionEnFile, "ITEM_NAME_COLLISIONS_EN");
    const zhCollisions = parseExport(paths.collisionZhFile, "ITEM_NAME_COLLISIONS_ZH");
    const jaCollisions = parseExport(paths.collisionJaFile, "ITEM_NAME_COLLISIONS_JA");
    expect(enCollisions).toEqual({});
    expect(zhCollisions).toEqual({ "same-zh": "A" });
    expect(jaCollisions).toEqual({ "same-ja": "A" });
  });

  test("does not write collision tables in the item-name pack files", async () => {
    const itemNames = { A: { en: "A", zh: "a-zh", ja: "a-ja" } };
    const paths = filePaths();
    await _writeI18nFiles(itemNames, "2026-08-24", paths);
    const zhContent = readFileSync(paths.zhFile, "utf8");
    expect(zhContent).not.toContain("COLLISIONS");
  });

  test("throws when a collision override maps to an unknown English name", async () => {
    const itemNames = { A: { en: "A", zh: "same-zh", ja: "same-ja" }, B: { en: "B", zh: "same-zh", ja: "same-ja" } };
    const paths = filePaths();
    paths.canonicalOverrides.zh = { "same-zh": "Unknown" };
    await expect(_writeI18nFiles(itemNames, "2026-08-24", paths)).rejects.toThrow(/same-zh/);
  });

  test("throws when a collision override matches a non-colliding name", async () => {
    const itemNames = { A: { en: "A", zh: "a-zh", ja: "a-ja" } };
    const paths = filePaths();
    paths.canonicalOverrides.zh = { "a-zh": "A" };
    await expect(_writeI18nFiles(itemNames, "2026-08-24", paths)).rejects.toThrow(/a-zh/);
  });

  test("puts the override target id first in the emitted collision table", async () => {
    const itemNames = { A: { en: "A", zh: "same-zh", ja: "same-ja" }, B: { en: "B", zh: "same-zh", ja: "same-ja" } };
    const paths = filePaths();
    paths.canonicalOverrides.zh = { "same-zh": "B" };
    await _writeI18nFiles(itemNames, "2026-08-24", paths);
    const zhCollisions = parseExport(paths.collisionZhFile, "ITEM_NAME_COLLISIONS_ZH");
    expect(zhCollisions).toEqual({ "same-zh": "B" });
  });
});
