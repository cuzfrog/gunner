import { VortonApplicationImpl } from "./vortonApplication";
import { MissileApplicationImpl } from "./missileApplication";
import { WeaponDamageAssessorImpl } from "./weaponDamageAssessor";
import { toTypeId } from "../gamedata/ids";
import type { VortonSpec } from "./types";

const app = new VortonApplicationImpl({ missileApplication: new MissileApplicationImpl(), weaponDamageAssessor: new WeaponDamageAssessorImpl() });

// Medium Scoped Vorton Projector with GalvaSurge Condenser Pack M: 550 em + 166.1 kin per shot, two projectors.
const vorton: VortonSpec = { kind: "vorton", moduleId: toTypeId("54747"), damagePerShot: { em: 550, thermal: 0, kinetic: 166.1, explosive: 0 }, cycleTime: 9, count: 2, maxRange: 31680, explosionRadius: 143, explosionVelocity: 105, damageReductionFactor: 0.5, capacitorNeed: 32, heatDamagePerCycle: 1 };

describe("VortonApplicationImpl", () => {
  test("in-range stationary target of the explosion radius applies the full count-scaled volley", () => {
    const result = app.compute(vorton, 10000, 0, 143);
    expect(result.inRange).toBe(true);
    expect(result.application).toBe(1);
    expect(result.signatureTerm).toBe(1);
    expect(result.velocityTerm).toBe(1);
    expect(result.volley).toBeCloseTo(1432.2);
    expect(result.nominalDps).toBeCloseTo(1432.2 / 9);
    expect(result.appliedDps).toBeCloseTo(1432.2 / 9);
    expect(result.appliedVolleyByType.em).toBeCloseTo(1100);
    expect(result.appliedVolleyByType.kinetic).toBeCloseTo(332.2);
  });

  test("small fast target application follows the missile factor min(1, S/E, (S/E*Ve/Vt)^drf)", () => {
    const result = app.compute(vorton, 10000, 2000, 40);
    const signatureTerm = 40 / 143;
    const velocityTerm = Math.sqrt((signatureTerm * 105) / 2000);
    expect(result.signatureTerm).toBeCloseTo(signatureTerm, 10);
    expect(result.velocityTerm).toBeCloseTo(velocityTerm, 10);
    expect(result.application).toBeCloseTo(Math.min(1, signatureTerm, velocityTerm), 10);
    expect(result.appliedVolleyByType.em).toBeCloseTo(1100 * result.application, 10);
  });

  test("target beyond maxRange applies zero while the nominal volley stays", () => {
    const result = app.compute(vorton, 31681, 0, 143);
    expect(result.inRange).toBe(false);
    expect(result.application).toBe(0);
    expect(result.appliedDps).toBe(0);
    expect(result.appliedVolleyByType).toEqual({ em: 0, thermal: 0, kinetic: 0, explosive: 0 });
    expect(result.nominalDps).toBeCloseTo(1432.2 / 9);
  });

  test("target exactly at maxRange applies in full (hard cutoff, no falloff)", () => {
    const result = app.compute(vorton, 31680, 0, 143);
    expect(result.inRange).toBe(true);
    expect(result.application).toBe(1);
  });

  test("a painted signature raises the application factor", () => {
    const unpainted = app.compute(vorton, 10000, 2000, 40);
    const painted = app.compute(vorton, 10000, 2000, 143);
    expect(painted.application).toBeGreaterThan(unpainted.application);
  });
});
