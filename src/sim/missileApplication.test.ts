import { Vec2 } from "./vec2";
import { MissileApplicationImpl } from "./missileApplication";
import type { EngagementFrame, MissileSpec, ShipState } from "./types";

const missile: MissileSpec = {
  kind: "missile",
  damagePerMissile: 100,
  cycleTime: 10,
  launcherCount: 1,
  explosionRadius: 40,
  explosionVelocity: 170,
  damageReductionFactor: 3.0,
  maxVelocity: 3750,
  flightTime: 5,
  flightRange: 3750 * 5,
};

function shipState(velocity: Vec2): ShipState {
  return {
    id: "shipB",
    maxSpeed: 0,
    mass: 1_000_000,
    inertiaModifier: 1,
    mode: "orbit",
    desiredRange: 5000,
    aggressivity: 1,
    position: new Vec2(0, 0),
    velocity,
  };
}

function frame(distance: number, targetVelocity: Vec2): EngagementFrame {
  const shipA = shipState(new Vec2(0, 0));
  const shipB = shipState(targetVelocity);
  return {
    time: 0,
    shipA,
    shipB,
    relPosition: new Vec2(0, distance),
    distance,
    relVelocity: new Vec2(0, 0),
    radialVelocity: 0,
    transversalVelocity: new Vec2(0, 0),
    transversalSpeed: 0,
    angularVelocity: 0,
  };
}

const application = new MissileApplicationImpl();

describe("MissileApplicationImpl", () => {
  test("full damage when sig >= explosion radius and target is slow", () => {
    const f = frame(1000, new Vec2(0, 0));
    const result = application.compute(f, missile, f.shipB, 100);
    expect(result.application).toBeCloseTo(1, 10);
    expect(result.signatureTerm).toBeCloseTo(100 / 40, 10);
    expect(result.inRange).toBe(true);
    expect(result.timeToImpact).toBeCloseTo(1000 / 3750, 10);
  });

  test("signature-limited when target sig < explosion radius", () => {
    const f = frame(1000, new Vec2(0, 0));
    const result = application.compute(f, missile, f.shipB, 20);
    expect(result.signatureTerm).toBeCloseTo(20 / 40, 10);
    expect(result.application).toBeCloseTo(0.5, 10);
  });

  test("velocity-limited when target is fast", () => {
    const f = frame(1000, new Vec2(0, 500));
    const result = application.compute(f, missile, f.shipB, 40);
    expect(result.velocityTerm).toBeLessThan(1);
    expect(result.application).toBeLessThan(1);
    expect(result.application).toBe(result.velocityTerm);
  });

  test("drf exponent shape: application = min(1, S/E, (S/E * Ve/Vt)^drfNorm)", () => {
    const f = frame(1000, new Vec2(0, 340));
    const sigRadius = 40;
    const result = application.compute(f, missile, f.shipB, sigRadius);
    const sOverE = sigRadius / missile.explosionRadius;
    const veOverVt = missile.explosionVelocity / 340;
    const drfNorm = Math.log(missile.damageReductionFactor) / Math.log(5.5);
    const expected = Math.min(1, sOverE, (sOverE * veOverVt) ** drfNorm);
    expect(result.application).toBeCloseTo(expected, 10);
  });

  test("out-of-range flag when distance exceeds flight range", () => {
    const f = frame(missile.flightRange + 1000, new Vec2(0, 0));
    const result = application.compute(f, missile, f.shipB, 100);
    expect(result.inRange).toBe(false);
  });

  test("in-range flag when distance equals flight range exactly", () => {
    const f = frame(missile.flightRange, new Vec2(0, 0));
    const result = application.compute(f, missile, f.shipB, 100);
    expect(result.inRange).toBe(true);
  });

  test("timeToImpact = distance / maxVelocity", () => {
    const f = frame(7500, new Vec2(0, 0));
    const result = application.compute(f, missile, f.shipB, 100);
    expect(result.timeToImpact).toBeCloseTo(7500 / 3750, 10);
  });

  test("application is min of signature and velocity terms when both < 1", () => {
    const f = frame(1000, new Vec2(0, 500));
    const result = application.compute(f, missile, f.shipB, 20);
    const sOverE = 20 / 40;
    const veOverVt = 170 / 500;
    const drfNorm = Math.log(missile.damageReductionFactor) / Math.log(5.5);
    const sigTerm = sOverE;
    const velTerm = (sOverE * veOverVt) ** drfNorm;
    const expected = Math.min(sigTerm, velTerm);
    expect(result.application).toBeCloseTo(expected, 10);
  });

  test("zero target velocity yields velocity term of 1 (no velocity penalty)", () => {
    const f = frame(1000, new Vec2(0, 0));
    const result = application.compute(f, missile, f.shipB, 40);
    expect(result.velocityTerm).toBeCloseTo(1, 10);
  });

  test("uses opponent velocity, not frame.shipB velocity, when shipA is the target", () => {
    const f = frame(1000, new Vec2(0, 0));
    f.shipA.velocity = new Vec2(0, 500);
    const result = application.compute(f, missile, f.shipA, 40);
    expect(result.velocityTerm).toBeLessThan(1);
    expect(result.application).toBeLessThan(1);
  });
});
