import { describe, expect, test } from "bun:test";
import { toTypeId } from "../gamedata/ids";
import { MissileApplicationImpl } from "./missileApplication";
import { WeaponDamageAssessorImpl } from "./weaponDamageAssessor";
import { FighterApplicationImpl } from "./fighterApplication";
import { ZERO_DAMAGE, damageVectorSum, type FighterSpec } from "./types";

const TEMPLAR_DRF_AGGREGATED = 0.64444259751338; // ln(3)/ln(5.5)

function templar(overrides: Partial<FighterSpec> = {}): FighterSpec {
  return {
    kind: "fighter",
    moduleId: toTypeId("34359"),
    damagePerVolley: { em: 182.8125, thermal: 0, kinetic: 0, explosive: 0 }, // 97.5 base x 1.875 all-5 multiplier
    cycleTime: 5,
    fighterCount: 6,
    maxVelocity: 1301.5625,
    orbitRange: 6500,
    explosionRadius: 185,
    explosionVelocity: 105,
    damageReductionFactor: TEMPLAR_DRF_AGGREGATED,
    optimal: 8000,
    falloff: 5000,
    magazine: { numShots: 12, rearmTime: 4, refuelingTime: 5 },
    ...overrides,
  };
}

function application(): FighterApplicationImpl {
  return new FighterApplicationImpl({ missileApplication: new MissileApplicationImpl(), weaponDamageAssessor: new WeaponDamageAssessorImpl() });
}

describe("FighterApplicationImpl", () => {
  test("fighter faster than the target applies at full strength with rangeFactor 1", () => {
    const result = application().compute(templar(), 100, 40000, 400);
    expect(result.rangeFactor).toBe(1);
    expect(result.application).toBe(1);
    expect(result.inRange).toBe(true);
  });

  test("scales the volley by the alive fighter count", () => {
    const result = application().compute(templar(), 100, 40000, 400, 4);
    expect(damageVectorSum(result.baseVolleyByType)).toBeCloseTo(182.8125 * 4, 6);
  });

  test("full alive count keeps the unscaled volley", () => {
    const result = application().compute(templar(), 100, 40000, 400);
    expect(damageVectorSum(result.baseVolleyByType)).toBeCloseTo(182.8125 * 6, 6);
  });

  test("stationary target gets pure signature application: S/E clamped at 1", () => {
    const result = application().compute(templar(), 0, 40000, 400);
    expect(result.signatureTerm).toBeCloseTo(400 / 185, 9);
    expect(result.velocityTerm).toBe(1);
    expect(result.application).toBe(1);
  });

  test("small signature target applies signature term unclamped", () => {
    const result = application().compute(templar(), 0, 40000, 100);
    expect(result.signatureTerm).toBeCloseTo(100 / 185, 9);
    expect(result.application).toBeCloseTo(100 / 185, 9);
  });

  test("fast target applies the velocity term with the aggregated DRF exponent", () => {
    const result = application().compute(templar(), 210, 40000, 185);
    expect(result.signatureTerm).toBe(1);
    expect(result.velocityTerm).toBeCloseTo(0.6397399140644863, 9); // ((185/185 * 105)/210)^ln(3)/ln(5.5) = 0.5^drfAgg
    expect(result.application).toBeCloseTo(0.6397399140644863, 9);
  });

  test("slow fighter inside attack optimal keeps rangeFactor 1 (pyfa places it at the ship)", () => {
    const slow = templar({ maxVelocity: 100 });
    const result = application().compute(slow, 200, 4000, 400);
    expect(result.rangeFactor).toBe(1);
    expect(result.application).toBe(1);
  });

  test("slow fighter beyond optimal applies the falloff range factor", () => {
    const slow = templar({ maxVelocity: 100 });
    const result = application().compute(slow, 200, 10000, 400);
    expect(result.rangeFactor).toBeCloseTo(0.8950250709279725, 9); // 0.5^((10000-8000)/5000)^2
    expect(result.application).toBeCloseTo(0.8950250709279725, 9);
  });

  test("slow fighter beyond optimal + 3*falloff cannot apply at all", () => {
    const slow = templar({ maxVelocity: 100 });
    const result = application().compute(slow, 200, 24000, 400);
    expect(result.rangeFactor).toBe(0);
    expect(result.inRange).toBe(false);
    expect(result.application).toBe(0);
    expect(result.appliedDps).toBe(0);
  });

  test("slow fighter with zero falloff cuts off hard beyond optimal", () => {
    const noFalloff = templar({ maxVelocity: 100, falloff: 0 });
    const inside = application().compute(noFalloff, 200, 8000, 400);
    expect(inside.rangeFactor).toBe(1);
    const beyond = application().compute(noFalloff, 200, 8001, 400);
    expect(beyond.rangeFactor).toBe(0);
  });

  test("nominal DPS scales volley by fighter count over cycle time (squadron 219.375)", () => {
    const result = application().compute(templar(), 0, 40000, 400);
    expect(result.nominalDps).toBeCloseTo(182.8125 * 6 / 5, 9);
    expect(result.baseVolleyByType.em).toBeCloseTo(1096.875, 9);
    expect(result.appliedDps).toBeCloseTo(219.375, 9);
    expect(result.appliedVolleyByType.em).toBeCloseTo(1096.875, 9);
  });

  test("applied damage combines range factor with missile application", () => {
    const slow = templar({ maxVelocity: 100 });
    const result = application().compute(slow, 200, 10000, 400);
    // velocity term with sig 400: ((400/185 * 105)/200)^drfAgg > 1 clamped by min(...,1) -> application = rangeFactor
    expect(result.appliedDps).toBeCloseTo(219.375 * result.application, 9);
    expect(result.appliedByType.em).toBeCloseTo((182.8125 * 6 / 5) * result.application, 9);
  });

  test("zero-damage fighter produces empty assessment", () => {
    const inert = templar({ damagePerVolley: ZERO_DAMAGE });
    const result = application().compute(inert, 0, 40000, 400);
    expect(result.nominalDps).toBe(0);
    expect(result.appliedDps).toBe(0);
  });
});
