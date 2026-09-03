import { TurretDamageImpl } from "./turretDamage";
import { type HitChanceBreakdown, type TurretSpec, ZERO_DAMAGE, damageVectorScale, damageVectorSum } from "./types";

const turret: TurretSpec = {
  kind: "turret",
  tracking: 0.1,
  sigResolution: 40,
  optimal: 5000,
  falloff: 5000,
  damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 },
  cycleTime: 5,
  turretCount: 4,
};

const damage = new TurretDamageImpl();

describe("TurretDamageImpl", () => {
  test("z=1 yields expectedMultiplier ~1.01505 (101.5% of paper)", () => {
    const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0 };
    const result = damage.compute(hit, turret);
    expect(result.expectedMultiplier).toBeCloseTo(1.01505, 4);
    expect(result.application).toBeCloseTo(1.01505, 4);
  });

  test("z=0.5 yields expectedMultiplier ~0.39505 (~40%)", () => {
    const hit: HitChanceBreakdown = { chance: 0.5, trackingTerm: 1, rangeTerm: 0 };
    const result = damage.compute(hit, turret);
    expect(result.expectedMultiplier).toBeCloseTo(0.39505, 4);
    expect(result.application).toBeCloseTo(0.39505, 4);
  });

  test("z<=0.01 yields expectedMultiplier = 3*z (wrecking hits)", () => {
    const hit: HitChanceBreakdown = { chance: 0.01, trackingTerm: 10, rangeTerm: 10 };
    const result = damage.compute(hit, turret);
    expect(result.expectedMultiplier).toBeCloseTo(0.03, 10);
  });

  test("zero chance yields zero expectedMultiplier", () => {
    const hit: HitChanceBreakdown = { chance: 0, trackingTerm: Infinity, rangeTerm: 0 };
    const result = damage.compute(hit, turret);
    expect(result.expectedMultiplier).toBe(0);
  });

  test("nominalDps = damagePerShot * turretCount / cycleTime", () => {
    const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0 };
    const result = damage.compute(hit, turret);
    expect(result.nominalDps).toBeCloseTo((100 * 4) / 5, 10);
  });

  test("appliedDps = nominalDps * expectedMultiplier", () => {
    const hit: HitChanceBreakdown = { chance: 0.5, trackingTerm: 1, rangeTerm: 0 };
    const result = damage.compute(hit, turret);
    expect(result.appliedDps).toBeCloseTo(result.nominalDps * result.expectedMultiplier, 10);
  });

  test("volley = damagePerShot * turretCount", () => {
    const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0 };
    const result = damage.compute(hit, turret);
    expect(result.volley).toBe(100 * 4);
  });

  test("zero damagePerShot yields zero DPS and volley", () => {
    const zeroTurret: TurretSpec = { ...turret, damagePerShot: ZERO_DAMAGE };
    const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0 };
    const result = damage.compute(hit, zeroTurret);
    expect(result.nominalDps).toBe(0);
    expect(result.appliedDps).toBe(0);
    expect(result.volley).toBe(0);
    expect(result.expectedMultiplier).toBeCloseTo(1.01505, 4);
  });

  test("preserves the hit breakdown in the result", () => {
    const hit: HitChanceBreakdown = { chance: 0.8, trackingTerm: 0.1, rangeTerm: 0.2 };
    const result = damage.compute(hit, turret);
    expect(result.hit).toBe(hit);
  });

  test("appliedByType carries per-type applied DPS scaled by expectedMultiplier", () => {
    const multiTypeTurret: TurretSpec = { ...turret, damagePerShot: { em: 10, thermal: 20, kinetic: 30, explosive: 40 } };
    const hit: HitChanceBreakdown = { chance: 0.5, trackingTerm: 1, rangeTerm: 0 };
    const result = damage.compute(hit, multiTypeTurret);
    const expected = damageVectorScale(multiTypeTurret.damagePerShot, (multiTypeTurret.turretCount * result.expectedMultiplier) / multiTypeTurret.cycleTime);
    expect(result.appliedByType).toEqual(expected);
    expect(damageVectorSum(result.appliedByType)).toBeCloseTo(result.appliedDps, 10);
  });

  test("appliedVolleyByType carries per-type per-cycle volley scaled by expectedMultiplier", () => {
    const multiTypeTurret: TurretSpec = { ...turret, damagePerShot: { em: 10, thermal: 20, kinetic: 30, explosive: 40 } };
    const hit: HitChanceBreakdown = { chance: 0.5, trackingTerm: 1, rangeTerm: 0 };
    const result = damage.compute(hit, multiTypeTurret);
    const expected = damageVectorScale(multiTypeTurret.damagePerShot, multiTypeTurret.turretCount * result.expectedMultiplier);
    expect(result.appliedVolleyByType).toEqual(expected);
    expect(damageVectorSum(result.appliedVolleyByType)).toBeCloseTo(result.volley * result.expectedMultiplier, 10);
  });

  test("appliedVolleyByType equals appliedByType * cycleTime", () => {
    const hit: HitChanceBreakdown = { chance: 0.8, trackingTerm: 0.1, rangeTerm: 0.2 };
    const result = damage.compute(hit, turret);
    expect(result.appliedVolleyByType.kinetic).toBeCloseTo(result.appliedByType.kinetic * turret.cycleTime, 10);
  });
});
