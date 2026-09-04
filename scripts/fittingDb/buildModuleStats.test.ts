import { buildCombatModuleStats, type BuildModuleStatsContext } from "./buildModuleStats";
import type { SdeDogmaEffect, SdeDogmaEffectModifier, SdeTypeDogma } from "./dogmaTypes";

function mod(overrides: Partial<SdeDogmaEffectModifier> = {}): SdeDogmaEffectModifier {
  return { domain: "shipID", func: "ItemModifier", modifiedAttributeID: 0, modifyingAttributeID: 0, operation: 6, ...overrides };
}

function makeEffect(eid: number, opts: { category?: number; modifiers?: readonly SdeDogmaEffectModifier[]; name?: string }): SdeDogmaEffect {
  return { effectID: eid, effectName: opts.name, effectCategory: opts.category ?? 0, modifierInfo: opts.modifiers };
}

function makeCtx(opts: {
  values?: Record<string, number>;
  effects?: readonly number[];
  dogmaEffects?: readonly SdeDogmaEffect[];
  typeDogma?: SdeTypeDogma;
}): BuildModuleStatsContext {
  const effects = new Set(opts.effects ?? []);
  const dogmaEffectsMap: Record<string, SdeDogmaEffect> = {};
  for (const e of opts.dogmaEffects ?? []) dogmaEffectsMap[String(e.effectID)] = e;
  return {
    values: new Map(Object.entries(opts.values ?? {})),
    effects,
    dogmaEffects: dogmaEffectsMap,
    typeDogma: opts.typeDogma ?? { dogmaAttributes: [], dogmaEffects: [] },
  };
}

describe("buildCombatModuleStats - turret damage modules", () => {
  test("Gyrostabilizer (projectile damage+speed) extracts turret damage and speed multipliers", () => {
    const ctx = makeCtx({
      values: { damageMultiplier: 25, speedMultiplier: -10 },
      effects: [92, 89],
      dogmaEffects: [
        makeEffect(92, { category: 4, modifiers: [mod({ func: "LocationGroupModifier", modifiedAttributeID: 64, operation: 4, groupID: 55 })] }),
        makeEffect(89, { category: 4, modifiers: [mod({ func: "LocationGroupModifier", modifiedAttributeID: 51, operation: 4, groupID: 55 })] }),
      ],
    });
    expect(buildCombatModuleStats(ctx)).toEqual({
      turretWeaponGroup: "Projectile Weapon",
      turretDamageMultiplier: 25,
      turretSpeedMultiplier: -10,
    });
  });

  test("Heat Sink (energy damage+speed) extracts energy weapon group", () => {
    const ctx = makeCtx({
      values: { damageMultiplier: 20, speedMultiplier: -15 },
      effects: [91, 95],
      dogmaEffects: [
        makeEffect(91, { category: 4, modifiers: [mod({ func: "LocationGroupModifier", modifiedAttributeID: 64, operation: 4, groupID: 53 })] }),
        makeEffect(95, { category: 4, modifiers: [mod({ func: "LocationGroupModifier", modifiedAttributeID: 51, operation: 4, groupID: 53 })] }),
      ],
    });
    expect(buildCombatModuleStats(ctx)).toEqual({
      turretWeaponGroup: "Energy Weapon",
      turretDamageMultiplier: 20,
      turretSpeedMultiplier: -15,
    });
  });

  test("Magnetic Field Stabilizer (hybrid damage+speed) extracts hybrid weapon group", () => {
    const ctx = makeCtx({
      values: { damageMultiplier: 25, speedMultiplier: -10 },
      effects: [93, 96],
      dogmaEffects: [
        makeEffect(93, { category: 4, modifiers: [mod({ func: "LocationGroupModifier", modifiedAttributeID: 64, operation: 4, groupID: 74 })] }),
        makeEffect(96, { category: 4, modifiers: [mod({ func: "LocationGroupModifier", modifiedAttributeID: 51, operation: 4, groupID: 74 })] }),
      ],
    });
    expect(buildCombatModuleStats(ctx)).toEqual({
      turretWeaponGroup: "Hybrid Weapon",
      turretDamageMultiplier: 25,
      turretSpeedMultiplier: -10,
    });
  });

  test("Projectile damage rig (passive, effect 2798) classifies via modifierInfo not effect ID", () => {
    const ctx = makeCtx({
      values: { damageMultiplier: 15 },
      effects: [2798],
      dogmaEffects: [
        makeEffect(2798, { category: 0, modifiers: [mod({ func: "LocationGroupModifier", modifiedAttributeID: 64, operation: 4, groupID: 55 })] }),
      ],
    });
    expect(buildCombatModuleStats(ctx)).toEqual({
      turretWeaponGroup: "Projectile Weapon",
      turretDamageMultiplier: 15,
    });
  });

  test("returns undefined when damage and speed multipliers are both zero", () => {
    const ctx = makeCtx({
      values: { damageMultiplier: 0, speedMultiplier: 0 },
      effects: [92],
      dogmaEffects: [
        makeEffect(92, { category: 4, modifiers: [mod({ func: "LocationGroupModifier", modifiedAttributeID: 64, operation: 4, groupID: 55 })] }),
      ],
    });
    expect(buildCombatModuleStats(ctx)).toBeUndefined();
  });
});

describe("buildCombatModuleStats - missile damage modules", () => {
  test("Ballistic Control System (missile damage+speed) extracts missile multipliers", () => {
    const ctx = makeCtx({
      values: { missileDamageMultiplierBonus: 50, speedMultiplier: -10 },
      effects: [763, 889],
      dogmaEffects: [
        makeEffect(763, { category: 4, modifiers: [mod({ func: "ItemModifier", modifiedAttributeID: 212, operation: 0 })] }),
        makeEffect(889, { category: 4, modifiers: [mod({ func: "LocationRequiredSkillModifier", modifiedAttributeID: 51, operation: 4, skillTypeID: 3319 })] }),
      ],
    });
    expect(buildCombatModuleStats(ctx)).toEqual({
      missileDamageMultiplier: 50,
      missileCycleTimeMultiplier: -10,
    });
  });

  test("missile damage rig (passive, effect 2799) classifies via modifierInfo", () => {
    const ctx = makeCtx({
      values: { speedMultiplier: -15 },
      effects: [2799],
      dogmaEffects: [
        makeEffect(2799, { category: 0, modifiers: [mod({ func: "LocationRequiredSkillModifier", modifiedAttributeID: 51, operation: 4, skillTypeID: 3319 })] }),
      ],
    });
    expect(buildCombatModuleStats(ctx)).toEqual({
      missileCycleTimeMultiplier: -15,
    });
  });
});

describe("buildCombatModuleStats - edge cases", () => {
  test("returns undefined when no combat effects are present", () => {
    const ctx = makeCtx({
      values: {},
      effects: [999],
      dogmaEffects: [
        makeEffect(999, { category: 0, modifiers: [mod({ func: "ItemModifier", modifiedAttributeID: 999, operation: 0 })] }),
      ],
    });
    expect(buildCombatModuleStats(ctx)).toBeUndefined();
  });

  test("returns undefined when effect has no modifierInfo and no defense attributes", () => {
    const ctx = makeCtx({
      values: {},
      effects: [660],
      dogmaEffects: [makeEffect(660, { category: 0 })],
    });
    expect(buildCombatModuleStats(ctx)).toBeUndefined();
  });

  test("defense-only effect does not produce turret/missile stats", () => {
    const ctx = makeCtx({
      values: { damageMultiplier: 25 },
      effects: [2052],
      dogmaEffects: [
        makeEffect(2052, { category: 4, modifiers: [mod({ modifiedAttributeID: 271, modifyingAttributeID: 984 })] }),
      ],
    });
    expect(buildCombatModuleStats(ctx)).toBeUndefined();
  });
});
