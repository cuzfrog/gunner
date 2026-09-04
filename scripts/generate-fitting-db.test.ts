import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toTypeId } from "../src/gamedata/ids";
import { buildDisruptionScriptStats, buildDroneStats, buildLauncherStats, buildMissileStats, buildStasisWebStats, buildTrackingComputerStats, buildTrackingDisruptorStats, buildWarpScramblerStats, _buildModuleStats, _buildTargetPainterStats, _buildMissileGuidanceComputerStats, _buildMissileGuidanceEnhancerStats, _buildMissileScriptStats, _filterItemNames, _writeI18nFiles, _buildDefenseStats } from "./generate-fitting-db";
import type { SdeDogmaEffect, SdeDogmaEffectModifier, SdeTypeDogma } from "./fittingDb/dogmaTypes";

function values(entries: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(entries));
}

function defenseEffect(eid: number, category: number, modifiers: readonly SdeDogmaEffectModifier[], name?: string): SdeDogmaEffect {
  return { effectID: eid, effectName: name, effectCategory: category, modifierInfo: modifiers };
}

function itemMod(modifiedAttr: number, modifyingAttr: number, operation: number): SdeDogmaEffectModifier {
  return { domain: "shipID", func: "ItemModifier", modifiedAttributeID: modifiedAttr, modifyingAttributeID: modifyingAttr, operation };
}

function skillMod(modifiedAttr: number, modifyingAttr: number, operation: number, skillId: number): SdeDogmaEffectModifier {
  return { domain: "shipID", func: "LocationRequiredSkillModifier", modifiedAttributeID: modifiedAttr, modifyingAttributeID: modifyingAttr, operation, skillTypeID: skillId };
}

function dogmaEffectsMap(effects: readonly SdeDogmaEffect[]): Record<string, SdeDogmaEffect> {
  const map: Record<string, SdeDogmaEffect> = {};
  for (const e of effects) map[String(e.effectID)] = e;
  return map;
}

function typeDogmaForAttrs(attrs: readonly { attributeID: number; value: number }[]): SdeTypeDogma {
  return { dogmaAttributes: attrs, dogmaEffects: [] };
}

function callBuildDefenseStats(vals: Map<string, number>, effects: readonly SdeDogmaEffect[], groupId: number, typeDogma?: SdeTypeDogma): ReturnType<typeof _buildDefenseStats> {
  const effectIds = new Set(effects.map((e) => e.effectID));
  return _buildDefenseStats(vals, effectIds, groupId, typeDogma, dogmaEffectsMap(effects));
}

function groupMod(modifiedAttr: number, modifyingAttr: number, operation: number, groupId: number): SdeDogmaEffectModifier {
  return { domain: "shipID", func: "LocationGroupModifier", modifiedAttributeID: modifiedAttr, modifyingAttributeID: modifyingAttr, operation, groupID: groupId };
}

function combatEffect(eid: number, category: number, modifiers: readonly SdeDogmaEffectModifier[], name?: string): SdeDogmaEffect {
  return { effectID: eid, effectName: name, effectCategory: category, modifierInfo: modifiers };
}

function callBuildModuleStats(vals: Map<string, number>, effects: readonly SdeDogmaEffect[], typeDogma?: SdeTypeDogma): ReturnType<typeof _buildModuleStats> {
  const effectIds = new Set(effects.map((e) => e.effectID));
  return _buildModuleStats(vals, effectIds, typeDogma, dogmaEffectsMap(effects));
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
  test("returns undefined when no stats are present", () => {
    expect(callBuildModuleStats(values({}), [])).toBeUndefined();
  });

  test("extracts mass and agility stats without damage effects", () => {
    expect(callBuildModuleStats(values({ massAddition: 500000, agilityMultiplier: -10 }), [])).toEqual({
      massAddition: 500000,
      agilityMultiplier: 0.9,
    });
  });

  test("extracts Heat Sink damage and speed multipliers with energy weapon effect", () => {
    const stats = callBuildModuleStats(values({ damageMultiplier: 1.1, speedMultiplier: 0.895 }), [
      combatEffect(91, 4, [groupMod(64, 204, 4, 53)]),
      combatEffect(95, 4, [groupMod(51, 204, 4, 53)]),
    ]);
    expect(stats).toEqual({
      turretDamageMultiplier: 1.1,
      turretSpeedMultiplier: 0.895,
      turretWeaponGroup: "Energy Weapon",
    });
  });

  test("extracts Gyrostabilizer damage and speed with projectile weapon effect", () => {
    const stats = callBuildModuleStats(values({ damageMultiplier: 1.15, speedMultiplier: 0.89 }), [
      combatEffect(92, 4, [groupMod(64, 204, 4, 55)]),
      combatEffect(89, 4, [groupMod(51, 204, 4, 55)]),
    ]);
    expect(stats).toEqual({
      turretDamageMultiplier: 1.15,
      turretSpeedMultiplier: 0.89,
      turretWeaponGroup: "Projectile Weapon",
    });
  });

  test("extracts Magnetic Field Stabilizer with hybrid weapon effect", () => {
    const stats = callBuildModuleStats(values({ damageMultiplier: 1.15, speedMultiplier: 0.905 }), [
      combatEffect(93, 4, [groupMod(64, 204, 4, 74)]),
      combatEffect(96, 4, [groupMod(51, 204, 4, 74)]),
    ]);
    expect(stats).toEqual({
      turretDamageMultiplier: 1.15,
      turretSpeedMultiplier: 0.905,
      turretWeaponGroup: "Hybrid Weapon",
    });
  });

  test("does not extract damage stats when no damage effect is present", () => {
    const stats = callBuildModuleStats(values({ damageMultiplier: 1.1, speedMultiplier: 0.895 }), []);
    expect(stats).toBeUndefined();
  });

  test("preserves damage stats alongside tracking stats", () => {
    const stats = callBuildModuleStats(values({ damageMultiplier: 1.1, speedMultiplier: 0.895, trackingSpeedBonus: 10 }), [
      combatEffect(91, 4, [groupMod(64, 204, 4, 53)]),
      combatEffect(95, 4, [groupMod(51, 204, 4, 53)]),
    ]);
    expect(stats).toEqual({
      turretDamageMultiplier: 1.1,
      turretSpeedMultiplier: 0.895,
      turretWeaponGroup: "Energy Weapon",
      turretTrackingPercent: 10,
    });
  });

  test("extracts projectile rig damage effect (passive)", () => {
    const stats = callBuildModuleStats(values({ damageMultiplier: 1.15 }), [
      combatEffect(2798, 0, [groupMod(64, 204, 4, 55)]),
    ]);
    expect(stats).toEqual({
      turretDamageMultiplier: 1.15,
      turretWeaponGroup: "Projectile Weapon",
    });
  });

  test("extracts missile rig speed effect (passive) as missile not turret", () => {
    const stats = callBuildModuleStats(values({ speedMultiplier: 0.93 }), [
      combatEffect(2799, 0, [skillMod(51, 204, 4, 3319)]),
    ]);
    expect(stats).toEqual({
      missileCycleTimeMultiplier: 0.93,
    });
  });
});

describe("buildLauncherStats", () => {
  const skillIds = [toTypeId("3319"), toTypeId("3321")];

  test("returns undefined when speed attribute is missing", () => {
    expect(buildLauncherStats(values({ chargeGroup1: 384 }), 509, sdeType(), skillIds)).toBeUndefined();
  });

  test("returns undefined when speed is non-positive", () => {
    expect(buildLauncherStats(values({ speed: 0, chargeGroup1: 384 }), 509, sdeType(), skillIds)).toBeUndefined();
    expect(buildLauncherStats(values({ speed: -100, chargeGroup1: 384 }), 509, sdeType(), skillIds)).toBeUndefined();
  });

  test("returns undefined when no charge groups are present", () => {
    expect(buildLauncherStats(values({ speed: 13600 }), 509, sdeType(), skillIds)).toBeUndefined();
  });

  test("converts cycle time from milliseconds to seconds and preserves launcher group with charge groups", () => {
    expect(buildLauncherStats(values({ speed: 13600, chargeGroup1: 384, chargeGroup2: 394 }), 509, sdeType(), skillIds)).toEqual({
      rateOfFire: 13.6,
      launcherGroup: 509,
      chargeGroups: [384, 394],
      requiredSkillIds: skillIds,
      metaLevel: 0,
      metaGroupID: 1,
    });
  });

  test("collects charge groups from chargeGroup1 through chargeGroup5", () => {
    expect(buildLauncherStats(values({
      speed: 18000, chargeGroup1: 657, chargeGroup3: 89,
    }), 508, sdeType(), skillIds)).toEqual({
      rateOfFire: 18,
      launcherGroup: 508,
      chargeGroups: [657, 89],
      requiredSkillIds: skillIds,
      metaLevel: 0,
      metaGroupID: 1,
    });
  });

  test("preserves torpedo launcher group (508) with chargeGroup3", () => {
    const stats = buildLauncherStats(values({ speed: 18000, chargeGroup3: 89 }), 508, sdeType(), skillIds);
    expect(stats?.launcherGroup).toBe(508);
    expect(stats?.chargeGroups).toEqual([89]);
  });

  test("preserves metaLevel and metaGroupID from SDE type", () => {
    expect(buildLauncherStats(values({ speed: 12800, chargeGroup1: 384 }), 509, sdeType(5, 2), skillIds)).toEqual({
      rateOfFire: 12.8,
      launcherGroup: 509,
      chargeGroups: [384],
      requiredSkillIds: skillIds,
      metaLevel: 5,
      metaGroupID: 2,
    });
  });
});

describe("buildMissileStats", () => {
  const skillIds = [toTypeId("3319"), toTypeId("3321")];

  test("returns undefined when all damage attributes are zero or missing", () => {
    expect(buildMissileStats(values({
      aoeCloudSize: 50, aoeVelocity: 170, aoeDamageReductionFactor: 2.7,
      maxVelocity: 3000, explosionDelay: 5000, launcherGroup: 509,
    }), 384, skillIds)).toBeUndefined();
  });

  test("returns undefined when application attributes are missing", () => {
    expect(buildMissileStats(values({ kineticDamage: 100 }), 384, skillIds)).toBeUndefined();
  });

  test("builds a kinetic light missile from SDE attributes", () => {
    expect(buildMissileStats(values({
      emDamage: 0, thermalDamage: 0, kineticDamage: 113, explosiveDamage: 0,
      aoeCloudSize: 50, aoeVelocity: 170, aoeDamageReductionFactor: 2.7,
      maxVelocity: 3750, explosionDelay: 5000, launcherGroup: 509,
    }), 384, skillIds)).toEqual({
      damage: 113,
      damageType: "kinetic",
      explosionRadius: 50,
      explosionVelocity: 170,
      damageReductionFactor: 2.7,
      maxVelocity: 3750,
      flightTime: 5,
      launcherGroup: 509,
      chargeGroup: 384,
      requiredSkillIds: skillIds,
    });
  });

  test("classifies EM damage type when emDamage is present", () => {
    const stats = buildMissileStats(values({
      emDamage: 113, thermalDamage: 0, kineticDamage: 0, explosiveDamage: 0,
      aoeCloudSize: 50, aoeVelocity: 170, aoeDamageReductionFactor: 2.7,
      maxVelocity: 3750, explosionDelay: 5000, launcherGroup: 509,
    }), 384, skillIds);
    expect(stats?.damageType).toBe("em");
    expect(stats?.damage).toBe(113);
  });

  test("classifies thermal damage type when thermalDamage is present", () => {
    const stats = buildMissileStats(values({
      emDamage: 0, thermalDamage: 113, kineticDamage: 0, explosiveDamage: 0,
      aoeCloudSize: 50, aoeVelocity: 170, aoeDamageReductionFactor: 2.7,
      maxVelocity: 3750, explosionDelay: 5000, launcherGroup: 509,
    }), 384, skillIds);
    expect(stats?.damageType).toBe("thermal");
  });

  test("classifies explosive damage type when only explosiveDamage is present", () => {
    const stats = buildMissileStats(values({
      emDamage: 0, thermalDamage: 0, kineticDamage: 0, explosiveDamage: 113,
      aoeCloudSize: 50, aoeVelocity: 170, aoeDamageReductionFactor: 2.7,
      maxVelocity: 3750, explosionDelay: 5000, launcherGroup: 509,
    }), 384, skillIds);
    expect(stats?.damageType).toBe("explosive");
  });

  test("converts flight time from milliseconds to seconds", () => {
    const stats = buildMissileStats(values({
      emDamage: 0, thermalDamage: 0, kineticDamage: 100, explosiveDamage: 0,
      aoeCloudSize: 50, aoeVelocity: 170, aoeDamageReductionFactor: 2.7,
      maxVelocity: 3750, explosionDelay: 10000, launcherGroup: 509,
    }), 384, skillIds);
    expect(stats?.flightTime).toBe(10);
  });

  test("sums multi-type damage into total damage", () => {
    const stats = buildMissileStats(values({
      emDamage: 30, thermalDamage: 30, kineticDamage: 30, explosiveDamage: 30,
      aoeCloudSize: 50, aoeVelocity: 170, aoeDamageReductionFactor: 2.7,
      maxVelocity: 3750, explosionDelay: 5000, launcherGroup: 509,
    }), 384, skillIds);
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
      falloff: 2000, maxVelocity: 3360, entityCruiseSpeed: 660, entityFlyRange: 1000, droneBandwidthUsed: 5,
    }), sdeType(5, 2, 5));
    expect(stats).toEqual({
      sizeClass: "light",
      damageMultiplier: 1.92,
      emDamage: 0, thermalDamage: 20, kineticDamage: 0, explosiveDamage: 0,
      tracking: 2.178, sigResolution: 25, optimal: 2100, falloff: 2000,
      maxVelocity: 3360, orbitSpeed: 660, orbitRange: 1000, cycleTime: 4, bandwidth: 5, volume: 5,
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
  test("extracts BCS damage and cycle time multipliers with missile damage effects", () => {
    const stats = callBuildModuleStats(values({ missileDamageMultiplierBonus: 1.1, speedMultiplier: 0.895 }), [
      combatEffect(763, 4, [itemMod(212, 212, 0)]),
      combatEffect(889, 4, [skillMod(51, 204, 4, 3319)]),
    ]);
    expect(stats).toEqual({
      missileDamageMultiplier: 1.1,
      missileCycleTimeMultiplier: 0.895,
    });
  });

  test("does not extract missile damage stats when no missile effect is present", () => {
    const stats = callBuildModuleStats(values({ missileDamageMultiplierBonus: 1.1, speedMultiplier: 0.895 }), []);
    expect(stats).toBeUndefined();
  });
});

describe("Drone Link Augmentor in _buildModuleStats", () => {
  test("extracts drone control range bonus from droneRangeBonus attribute", () => {
    const stats = callBuildModuleStats(values({ droneRangeBonus: 20000 }), []);
    expect(stats).toEqual({ droneControlRangeBonus: 20000 });
  });

  test("does not extract drone control range when attribute is absent", () => {
    const stats = callBuildModuleStats(values({}), []);
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

describe("_buildDefenseStats", () => {
  test("Damage Control II extracts shield, armor, and hull resists from resonances", () => {
    expect(callBuildDefenseStats(values({
      armorEmDamageResonance: 0.85, armorExplosiveDamageResonance: 0.85, armorKineticDamageResonance: 0.85, armorThermalDamageResonance: 0.85,
      shieldEmDamageResonance: 0.875, shieldExplosiveDamageResonance: 0.875, shieldKineticDamageResonance: 0.875, shieldThermalDamageResonance: 0.875,
      hullEmDamageResonance: 0.6, hullExplosiveDamageResonance: 0.6, hullKineticDamageResonance: 0.6, hullThermalDamageResonance: 0.6,
    }), [defenseEffect(2302, 4, [itemMod(267, 267, 0), itemMod(271, 271, 0), itemMod(113, 974, 0)])], 0)).toEqual({
      kind: "damageControl",
      shieldResists: { em: 0.125, thermal: 0.125, kinetic: 0.125, explosive: 0.125 },
      armorResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 },
      hullResists: { em: 0.4, thermal: 0.4, kinetic: 0.4, explosive: 0.4 },
    });
  });

  test("EM Shield Hardener II extracts active shield resist bonus with overload", () => {
    expect(callBuildDefenseStats(values({
      emDamageResistanceBonus: -55, explosiveDamageResistanceBonus: 0, kineticDamageResistanceBonus: 0, thermalDamageResistanceBonus: 0,
      duration: 10000, capacitorNeed: 20, heatDamage: 3.4, overloadHardeningBonus: 20,
    }), [defenseEffect(5230, 1, [itemMod(271, 984, 6)])], 0)).toEqual({
      kind: "resistModule",
      layer: "shield",
      active: true,
      resistBonus: { em: 0.55, thermal: 0, kinetic: 0, explosive: 0 },
      overloadBonusMultiplier: 1.2,
      cycleTime: 10,
      capacitorNeed: 20,
      heatDamage: 3.4,
    });
  });

  test("Multispectrum Energized Membrane II extracts passive armor resist bonus", () => {
    expect(callBuildDefenseStats(values({
      emDamageResistanceBonus: -20, thermalDamageResistanceBonus: -20, kineticDamageResistanceBonus: -20, explosiveDamageResistanceBonus: -20,
    }), [defenseEffect(2041, 4, [itemMod(267, 984, 6), itemMod(268, 985, 6), itemMod(269, 986, 6), itemMod(270, 987, 6)])], 0)).toEqual({
      kind: "resistModule",
      layer: "armor",
      active: false,
      resistBonus: { em: 0.2, thermal: 0.2, kinetic: 0.2, explosive: 0.2 },
    });
  });

  test("Small EM Shield Reinforcer I rig extracts passive shield resist bonus via rig effect", () => {
    expect(callBuildDefenseStats(values({
      emDamageResistanceBonus: -30,
    }), [defenseEffect(2795, 0, [itemMod(271, 984, 6)])], 0)).toEqual({
      kind: "resistModule",
      layer: "shield",
      active: false,
      resistBonus: { em: 0.3, thermal: 0, kinetic: 0, explosive: 0 },
    });
  });

  test("Small EM Armor Reinforcer I rig extracts passive armor resist bonus via rig effect", () => {
    expect(callBuildDefenseStats(values({
      emDamageResistanceBonus: -30,
    }), [defenseEffect(2792, 0, [itemMod(267, 984, 6)])], 0)).toEqual({
      kind: "resistModule",
      layer: "armor",
      active: false,
      resistBonus: { em: 0.3, thermal: 0, kinetic: 0, explosive: 0 },
    });
  });

  test("Large Shield Booster II extracts shield repair amount with overload multipliers", () => {
    expect(callBuildDefenseStats(values({
      shieldBonus: 276, duration: 4000, capacitorNeed: 160, heatDamage: 1.3, overloadShieldBonus: 10, overloadSelfDurationBonus: -15,
    }), [defenseEffect(4, 1, [], "shieldBoosting")], 0, typeDogmaForAttrs([{ attributeID: 68, value: 276 }]))).toEqual({
      kind: "repairer",
      layer: "shield",
      amount: 276,
      cycleTime: 4,
      capacitorNeed: 160,
      heatDamage: 1.3,
      overload: { amountMultiplier: 1.1, cycleTimeMultiplier: 0.85 },
      ancillary: undefined,
    });
  });

  test("Large Armor Repairer II extracts armor repair amount with overload multipliers", () => {
    expect(callBuildDefenseStats(values({
      armorDamageAmount: 920, duration: 15000, capacitorNeed: 400, heatDamage: 5.4, overloadArmorDamageAmount: 10, overloadSelfDurationBonus: -15,
    }), [defenseEffect(27, 1, [], "armorRepair")], 62, typeDogmaForAttrs([{ attributeID: 84, value: 920 }]))).toEqual({
      kind: "repairer",
      layer: "armor",
      amount: 920,
      cycleTime: 15,
      capacitorNeed: 400,
      heatDamage: 5.4,
      overload: { amountMultiplier: 1.1, cycleTimeMultiplier: 0.85 },
      ancillary: undefined,
    });
  });

  test("Large Ancillary Shield Booster extracts ancillary charge multiplier and reload time", () => {
    expect(callBuildDefenseStats(values({
      shieldBonus: 390, duration: 4000, capacitorNeed: 528, heatDamage: 1.3, overloadShieldBonus: 10, overloadSelfDurationBonus: -15, chargeSize: 2, reloadTime: 60000,
    }), [defenseEffect(4936, 1, [], "fueledShieldBoosting")], 1156, typeDogmaForAttrs([{ attributeID: 68, value: 390 }]))).toMatchObject({
      kind: "repairer",
      layer: "shield",
      amount: 390,
      cycleTime: 4,
      ancillary: { chargeMultiplier: 1, shots: 0, reloadTime: 60 },
    });
  });

  test("Medium Ancillary Armor Repairer extracts ancillary charge multiplier and reload time", () => {
    expect(callBuildDefenseStats(values({
      armorDamageAmount: 207, duration: 12000, capacitorNeed: 160, heatDamage: 5.3, overloadArmorDamageAmount: 10, overloadSelfDurationBonus: -15, chargedArmorDamageMultiplier: 3, reloadTime: 60000,
    }), [defenseEffect(5275, 1, [], "fueledArmorRepair")], 1199, typeDogmaForAttrs([{ attributeID: 84, value: 207 }]))).toMatchObject({
      kind: "repairer",
      layer: "armor",
      amount: 207,
      cycleTime: 12,
      ancillary: { chargeMultiplier: 3, shots: 0, reloadTime: 60 },
    });
  });

  test("Reactive Armor Hardener extracts base armor resists and shift amount", () => {
    expect(callBuildDefenseStats(values({
      armorEmDamageResonance: 0.85, armorExplosiveDamageResonance: 0.85, armorKineticDamageResonance: 0.85, armorThermalDamageResonance: 0.85,
      resistanceShiftAmount: 6, duration: 10000, capacitorNeed: 42, overloadSelfDurationBonus: -15,
    }), [defenseEffect(4928, 1, [], "adaptiveArmorHardener")], 1150, typeDogmaForAttrs([{ attributeID: 1849, value: 6 }]))).toEqual({
      kind: "rah",
      baseArmorResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 },
      resistanceShiftAmount: 6,
      cycleTime: 10,
      capacitorNeed: 42,
      overloadCycleTimeMultiplier: 0.85,
    });
  });

  test("1600mm Steel Plates II extracts armor HP bonus", () => {
    expect(callBuildDefenseStats(values({ armorHPBonusAdd: 4800, massAddition: 3750000 }), [defenseEffect(2837, 4, [itemMod(265, 1159, 2)])], 0)).toEqual({
      kind: "armorPlate",
      armorHpAdd: 4800,
    });
  });

  test("Medium Shield Extender II extracts shield HP and signature radius penalty", () => {
    expect(callBuildDefenseStats(values({ capacityBonus: 1100, signatureRadiusAdd: 7 }), [defenseEffect(21, 4, [itemMod(263, 72, 2)])], 0)).toEqual({
      kind: "shieldExtender",
      shieldHpAdd: 1100,
      sigRadiusPenalty: 7,
    });
  });

  test("Shield Boost Amplifier II extracts boost multiplier", () => {
    expect(callBuildDefenseStats(values({ shieldBoostMultiplier: 36 }), [defenseEffect(1720, 4, [skillMod(68, 548, 6, 21802)])], 0)).toEqual({
      kind: "boostAmplifier",
      multiplier: 1.36,
    });
  });

  test("Hull Repairer extracts structure repair amount with no overload", () => {
    expect(callBuildDefenseStats(values({ structureDamageAmount: 500, duration: 12000, capacitorNeed: 80 }), [defenseEffect(26, 1, [], "structureRepair")], 0, typeDogmaForAttrs([{ attributeID: 83, value: 500 }]))).toEqual({
      kind: "repairer",
      layer: "hull",
      amount: 500,
      cycleTime: 12,
      capacitorNeed: 80,
      heatDamage: undefined,
      overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 },
    });
  });

  test("returns undefined when no defense effects are present", () => {
    expect(callBuildDefenseStats(values({}), [defenseEffect(999, 0, [itemMod(1234, 5678, 6)])], 0)).toBeUndefined();
  });

  test("Shield Recharger II extracts recharge multiplier", () => {
    expect(callBuildDefenseStats(values({ rechargeratebonus: -15 }), [defenseEffect(50, 4, [itemMod(479, 134, 4)])], 0)).toEqual({
      kind: "rechargeModule",
      rechargeMultiplier: 0.85,
    });
  });

  test("Damage Control resonances are rounded to 6 decimals", () => {
    const stats = callBuildDefenseStats(values({
      shieldEmDamageResonance: 0.8575, shieldThermalDamageResonance: 0.8575,
      shieldKineticDamageResonance: 0.8575, shieldExplosiveDamageResonance: 0.8575,
    }), [defenseEffect(2302, 4, [itemMod(267, 267, 0), itemMod(271, 271, 0), itemMod(113, 974, 0)])], 0);
    expect(stats?.shieldResists).toEqual({ em: 0.1425, thermal: 0.1425, kinetic: 0.1425, explosive: 0.1425 });
  });

  test("dispatch prioritizes passive resist over shield extender for effect 21 + 2052", () => {
    const stats = callBuildDefenseStats(values({ emDamageResistanceBonus: -25, capacityBonus: 1000 }), [
      defenseEffect(2052, 4, [itemMod(271, 984, 6)]),
      defenseEffect(21, 4, [itemMod(263, 72, 2)]),
    ], 0);
    expect(stats?.kind).toBe("resistModule");
    expect(stats?.layer).toBe("shield");
    expect(stats?.active).toBe(false);
  });
});
