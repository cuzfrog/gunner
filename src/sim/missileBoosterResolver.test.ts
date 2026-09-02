import { MissileBoosterResolverImpl } from "./missileBoosterResolver";
import { StackingPenaltyImpl } from "./stackingPenalty";
import { toTypeId } from "../gamedata/ids";
import { type MissileBoosterSpec, type MissileBoosterProjection, type MissileEnhancerSpec, type MissileScriptSpec, type MissileSpec } from "./types";

const stacking = new StackingPenaltyImpl();
const resolver = new MissileBoosterResolverImpl({ stackingPenalty: stacking });

const MGC_II_ID = toTypeId("35790");
const MGE_II_ID = toTypeId("35771");
const PRECISION_SCRIPT_ID = toTypeId("35795");
const RANGE_SCRIPT_ID = toTypeId("35794");

const PRECISION_SCRIPT: MissileScriptSpec = {
  name: "Missile Precision Script",
  moduleId: PRECISION_SCRIPT_ID,
  explosionRadiusMultiplier: 2,
  explosionVelocityMultiplier: 2,
  missileVelocityMultiplier: 0,
  flightTimeMultiplier: 0,
};

const RANGE_SCRIPT: MissileScriptSpec = {
  name: "Missile Range Script",
  moduleId: RANGE_SCRIPT_ID,
  explosionRadiusMultiplier: 0,
  explosionVelocityMultiplier: 0,
  missileVelocityMultiplier: 2,
  flightTimeMultiplier: 2,
};

const MGC_II: MissileBoosterSpec = {
  moduleName: "Missile Guidance Computer II",
  moduleId: MGC_II_ID,
  explosionRadiusBonusPercent: -8.25,
  explosionVelocityBonusPercent: 8.25,
  missileVelocityBonusPercent: 5.5,
  flightTimeBonusPercent: 5.5,
  overloadStrengthBonusPercent: 15,
  defaultScript: undefined,
};

const MGE_II: MissileEnhancerSpec = {
  moduleName: "Missile Guidance Enhancer II",
  moduleId: MGE_II_ID,
  explosionRadiusBonusPercent: -6,
  explosionVelocityBonusPercent: 6,
  missileVelocityBonusPercent: 6,
  flightTimeBonusPercent: 6,
};

const BASE_MISSILE: MissileSpec = {
  kind: "missile",
  damagePerMissile: { em: 0, thermal: 0, kinetic: 100, explosive: 0 },
  cycleTime: 10,
  launcherCount: 1,
  explosionRadius: 50,
  explosionVelocity: 100,
  damageReductionFactor: 0.5,
  maxVelocity: 5000,
  flightTime: 10,
  flightRange: 50000,
};

describe("MissileBoosterResolverImpl", () => {
  test("returns missile unchanged for undefined projection", () => {
    expect(resolver.boostedMissile(BASE_MISSILE, undefined)).toEqual(BASE_MISSILE);
  });

  test("returns missile unchanged for empty loadout", () => {
    const projection: MissileBoosterProjection = { loadout: { computers: [], enhancers: [], scripts: [] } };
    expect(resolver.boostedMissile(BASE_MISSILE, projection)).toEqual(BASE_MISSILE);
  });

  test("single MGC II reduces explosion radius by 8.25%", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [MGC_II], enhancers: [], scripts: [] },
      activation: { computers: [{ active: true, overloaded: false, script: undefined }] },
    };
    const result = resolver.boostedMissile(BASE_MISSILE, projection);
    expect(result.explosionRadius).toBeCloseTo(50 * (1 - 0.0825), 10);
    expect(result.explosionVelocity).toBeCloseTo(100 * (1 + 0.0825), 10);
    expect(result.maxVelocity).toBeCloseTo(5000 * (1 + 0.055), 10);
    expect(result.flightTime).toBeCloseTo(10 * (1 + 0.055), 10);
    expect(result.flightRange).toBeCloseTo(5000 * (1 + 0.055) * 10 * (1 + 0.055), 10);
  });

  test("inactive MGC does not apply bonuses", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [MGC_II], enhancers: [], scripts: [] },
      activation: { computers: [{ active: false, overloaded: false, script: undefined }] },
    };
    expect(resolver.boostedMissile(BASE_MISSILE, projection)).toEqual(BASE_MISSILE);
  });

  test("overloaded MGC applies overload strength bonus to all fields", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [MGC_II], enhancers: [], scripts: [] },
      activation: { computers: [{ active: true, overloaded: true, script: undefined }] },
    };
    const result = resolver.boostedMissile(BASE_MISSILE, projection);
    const overloadFactor = 1.15;
    expect(result.explosionRadius).toBeCloseTo(50 * (1 + (-8.25 * overloadFactor) / 100), 10);
    expect(result.explosionVelocity).toBeCloseTo(100 * (1 + (8.25 * overloadFactor) / 100), 10);
  });

  test("precision script boosts application and reduces range", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [MGC_II], enhancers: [], scripts: [PRECISION_SCRIPT] },
      activation: { computers: [{ active: true, overloaded: false, script: PRECISION_SCRIPT }] },
    };
    const result = resolver.boostedMissile(BASE_MISSILE, projection);
    expect(result.explosionRadius).toBeCloseTo(50 * (1 + (-8.25 * 2) / 100), 10);
    expect(result.explosionVelocity).toBeCloseTo(100 * (1 + (8.25 * 2) / 100), 10);
    expect(result.maxVelocity).toBeCloseTo(5000, 10);
    expect(result.flightTime).toBeCloseTo(10, 10);
  });

  test("range script boosts range and reduces application", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [MGC_II], enhancers: [], scripts: [RANGE_SCRIPT] },
      activation: { computers: [{ active: true, overloaded: false, script: RANGE_SCRIPT }] },
    };
    const result = resolver.boostedMissile(BASE_MISSILE, projection);
    expect(result.explosionRadius).toBeCloseTo(50, 10);
    expect(result.explosionVelocity).toBeCloseTo(100, 10);
    expect(result.maxVelocity).toBeCloseTo(5000 * (1 + 5.5 * 2 / 100), 10);
    expect(result.flightTime).toBeCloseTo(10 * (1 + 5.5 * 2 / 100), 10);
  });

  test("single MGE II applies passive bonuses", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [], enhancers: [MGE_II], scripts: [] },
    };
    const result = resolver.boostedMissile(BASE_MISSILE, projection);
    expect(result.explosionRadius).toBeCloseTo(50 * (1 - 0.06), 10);
    expect(result.explosionVelocity).toBeCloseTo(100 * (1 + 0.06), 10);
    expect(result.maxVelocity).toBeCloseTo(5000 * (1 + 0.06), 10);
    expect(result.flightTime).toBeCloseTo(10 * (1 + 0.06), 10);
  });

  test("MGC and MGE together apply stacking penalties", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [MGC_II], enhancers: [MGE_II], scripts: [] },
      activation: { computers: [{ active: true, overloaded: false, script: undefined }] },
    };
    const result = resolver.boostedMissile(BASE_MISSILE, projection);
    const secondPenalty = Math.exp(-(1 * 1) / 7.1289);
    const expectedExplosionRadius = 50 * (1 - 0.0825) * (1 + (-0.06) * secondPenalty);
    expect(result.explosionRadius).toBeCloseTo(expectedExplosionRadius, 6);
  });

  test("multiple MGEs apply stacking penalties", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [], enhancers: [MGE_II, MGE_II], scripts: [] },
    };
    const result = resolver.boostedMissile(BASE_MISSILE, projection);
    const secondPenalty = Math.exp(-(1 * 1) / 7.1289);
    const expectedExplosionVelocity = 100 * (1 + 0.06) * (1 + 0.06 * secondPenalty);
    expect(result.explosionVelocity).toBeCloseTo(expectedExplosionVelocity, 6);
  });

  test("flightRange is recomputed from boosted velocity and flight time", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [MGC_II], enhancers: [], scripts: [] },
      activation: { computers: [{ active: true, overloaded: false, script: undefined }] },
    };
    const result = resolver.boostedMissile(BASE_MISSILE, projection);
    expect(result.flightRange).toBeCloseTo(result.maxVelocity * result.flightTime, 6);
  });

  test("MGC falls back to spec defaultScript when activation script is undefined", () => {
    const mgcWithDefault: MissileBoosterSpec = { ...MGC_II, defaultScript: PRECISION_SCRIPT };
    const projection: MissileBoosterProjection = {
      loadout: { computers: [mgcWithDefault], enhancers: [], scripts: [PRECISION_SCRIPT] },
      activation: { computers: [{ active: true, overloaded: false, script: undefined }] },
    };
    const result = resolver.boostedMissile(BASE_MISSILE, projection);
    expect(result.explosionRadius).toBeCloseTo(50 * (1 + (-8.25 * 2) / 100), 10);
    expect(result.explosionVelocity).toBeCloseTo(100 * (1 + (8.25 * 2) / 100), 10);
    expect(result.maxVelocity).toBeCloseTo(5000, 10);
    expect(result.flightTime).toBeCloseTo(10, 10);
  });

  test("overloaded MGC with precision script applies both overload and script multipliers", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [MGC_II], enhancers: [], scripts: [PRECISION_SCRIPT] },
      activation: { computers: [{ active: true, overloaded: true, script: PRECISION_SCRIPT }] },
    };
    const result = resolver.boostedMissile(BASE_MISSILE, projection);
    const overloadFactor = 1.15;
    expect(result.explosionRadius).toBeCloseTo(50 * (1 + (-8.25 * overloadFactor * 2) / 100), 10);
    expect(result.explosionVelocity).toBeCloseTo(100 * (1 + (8.25 * overloadFactor * 2) / 100), 10);
  });

  test("multiple MGCs apply stacking penalties", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [MGC_II, MGC_II], enhancers: [], scripts: [] },
      activation: { computers: [{ active: true, overloaded: false, script: undefined }, { active: true, overloaded: false, script: undefined }] },
    };
    const result = resolver.boostedMissile(BASE_MISSILE, projection);
    const secondPenalty = Math.exp(-(1 * 1) / 7.1289);
    const expectedExplosionRadius = 50 * (1 - 0.0825) * (1 + (-0.0825) * secondPenalty);
    expect(result.explosionRadius).toBeCloseTo(expectedExplosionRadius, 6);
  });
});
