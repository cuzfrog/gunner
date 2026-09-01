import { MissileApplicationImpl } from "./missileApplication";
import type { MissileSpec } from "./types";

const missile: MissileSpec = {
  kind: "missile",
  damagePerMissile: 100,
  cycleTime: 10,
  launcherCount: 1,
  explosionRadius: 40,
  explosionVelocity: 170,
  damageReductionFactor: 0.604,
  maxVelocity: 3750,
  flightTime: 5,
  flightRange: 3750 * 5,
};

const application = new MissileApplicationImpl();

describe("MissileApplicationImpl", () => {
  test("full damage when sig >= explosion radius and target is stationary", () => {
    const result = application.compute(missile, 0, 100);
    expect(result.application).toBeCloseTo(1, 10);
    expect(result.signatureTerm).toBeCloseTo(100 / 40, 10);
  });

  test("signature-limited when target sig < explosion radius", () => {
    const result = application.compute(missile, 0, 20);
    expect(result.signatureTerm).toBeCloseTo(20 / 40, 10);
    expect(result.application).toBeCloseTo(0.5, 10);
  });

  test("velocity-limited when target is fast", () => {
    const result = application.compute(missile, 500, 40);
    expect(result.velocityTerm).toBeLessThan(1);
    expect(result.application).toBeLessThan(1);
    expect(result.application).toBe(result.velocityTerm);
  });

  test("drf exponent shape: application = min(1, S/E, (S/E * Ve/Vt)^drf)", () => {
    const sigRadius = 40;
    const targetSpeed = 340;
    const result = application.compute(missile, targetSpeed, sigRadius);
    const sOverE = sigRadius / missile.explosionRadius;
    const veOverVt = missile.explosionVelocity / targetSpeed;
    const expected = Math.min(1, sOverE, (sOverE * veOverVt) ** missile.damageReductionFactor);
    expect(result.application).toBeCloseTo(expected, 10);
  });

  test("application is min of signature and velocity terms when both < 1", () => {
    const result = application.compute(missile, 500, 20);
    const sOverE = 20 / 40;
    const veOverVt = 170 / 500;
    const sigTerm = sOverE;
    const velTerm = (sOverE * veOverVt) ** missile.damageReductionFactor;
    const expected = Math.min(sigTerm, velTerm);
    expect(result.application).toBeCloseTo(expected, 10);
  });

  test("zero target velocity yields velocity term of 1 (no velocity penalty)", () => {
    const result = application.compute(missile, 0, 40);
    expect(result.velocityTerm).toBeCloseTo(1, 10);
  });

  test("uses real-time target velocity, not projected maxSpeed", () => {
    const result = application.compute(missile, 500, 40);
    expect(result.velocityTerm).toBeLessThan(1);
    expect(result.application).toBeLessThan(1);
    const ratio = (1 * 170) / 500;
    const expected = ratio ** 0.604;
    expect(result.velocityTerm).toBeCloseTo(expected, 10);
  });

  test("stationary target with high maxSpeed still gets 100% velocity factor", () => {
    const result = application.compute(missile, 0, 40);
    expect(result.velocityTerm).toBeCloseTo(1, 10);
    expect(result.application).toBeCloseTo(1, 10);
  });
});
