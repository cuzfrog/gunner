import { WeaponDamageAssessorImpl } from "./weaponDamageAssessor";
import { toTypeId } from "../gamedata/ids";
import type { DroneSpec, MissileSpec, TurretSpec } from "./types";
import { ZERO_DAMAGE, damageVectorSum } from "./types";

const turret: TurretSpec = { kind: "turret", moduleId: toTypeId("1"), tracking: 0.1, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 4 };
const missile: MissileSpec = { kind: "missile", moduleId: toTypeId("2"), damagePerMissile: { em: 50, thermal: 0, kinetic: 0, explosive: 0 }, cycleTime: 10, launcherCount: 3, explosionRadius: 40, explosionVelocity: 170, damageReductionFactor: 0.604, maxVelocity: 3750, flightTime: 5, flightRange: 18750 };
const drone: DroneSpec = { kind: "drone", moduleId: toTypeId("3"), tracking: 0.15, sigResolution: 40, optimal: 1000, falloff: 500, damagePerShot: { em: 0, thermal: 0, kinetic: 20, explosive: 0 }, cycleTime: 4, droneCount: 5, maxVelocity: 6000, orbitSpeed: 1800, orbitRange: 1000, isSentry: false, controlRange: 60000 };

const assessor = new WeaponDamageAssessorImpl();

describe("WeaponDamageAssessorImpl", () => {
  describe("turret", () => {
    test("baseVolleyByType = damagePerShot * turretCount", () => {
      const result = assessor.assess(turret, 1, true);
      expect(result.baseVolleyByType.kinetic).toBe(400);
      expect(result.volley).toBe(400);
    });

    test("nominalDps = volley / cycleTime", () => {
      const result = assessor.assess(turret, 1, true);
      expect(result.nominalDps).toBeCloseTo(80, 10);
    });

    test("appliedDps scales by applicationFactor", () => {
      const result = assessor.assess(turret, 0.5, true);
      expect(result.appliedDps).toBeCloseTo(40, 10);
      expect(result.application).toBeCloseTo(0.5, 10);
    });

    test("appliedVolleyByType = baseVolleyByType * applicationFactor", () => {
      const result = assessor.assess(turret, 0.5, true);
      expect(result.appliedVolleyByType.kinetic).toBeCloseTo(200, 10);
    });

    test("appliedByType = appliedVolleyByType / cycleTime", () => {
      const result = assessor.assess(turret, 0.8, true);
      expect(result.appliedByType.kinetic).toBeCloseTo((400 * 0.8) / 5, 10);
      expect(damageVectorSum(result.appliedByType)).toBeCloseTo(result.appliedDps, 10);
    });

    test("inRange=false zeroes applied fields, keeps baseVolley and nominalDps", () => {
      const result = assessor.assess(turret, 0.8, false);
      expect(result.appliedDps).toBe(0);
      expect(result.application).toBe(0);
      expect(result.appliedVolleyByType).toEqual(ZERO_DAMAGE);
      expect(result.appliedByType).toEqual(ZERO_DAMAGE);
      expect(result.baseVolleyByType.kinetic).toBe(400);
      expect(result.nominalDps).toBeCloseTo(80, 10);
      expect(result.volley).toBe(400);
    });
  });

  describe("missile", () => {
    test("baseVolleyByType = damagePerMissile * launcherCount", () => {
      const result = assessor.assess(missile, 1, true);
      expect(result.baseVolleyByType.em).toBe(150);
      expect(result.volley).toBe(150);
    });

    test("nominalDps = volley / cycleTime", () => {
      const result = assessor.assess(missile, 1, true);
      expect(result.nominalDps).toBeCloseTo(15, 10);
    });

    test("applied scales by applicationFactor", () => {
      const result = assessor.assess(missile, 0.7, true);
      expect(result.appliedDps).toBeCloseTo(10.5, 10);
      expect(result.appliedVolleyByType.em).toBeCloseTo(105, 10);
    });

    test("launcherCount=1 yields single-missile volley", () => {
      const single: MissileSpec = { ...missile, launcherCount: 1 };
      const result = assessor.assess(single, 1, true);
      expect(result.baseVolleyByType.em).toBe(50);
      expect(result.volley).toBe(50);
    });
  });

  describe("drone", () => {
    test("baseVolleyByType = damagePerShot * droneCount", () => {
      const result = assessor.assess(drone, 1, true);
      expect(result.baseVolleyByType.kinetic).toBe(100);
      expect(result.volley).toBe(100);
    });

    test("nominalDps = volley / cycleTime", () => {
      const result = assessor.assess(drone, 1, true);
      expect(result.nominalDps).toBeCloseTo(25, 10);
    });

    test("applied scales by applicationFactor", () => {
      const result = assessor.assess(drone, 0.6, true);
      expect(result.appliedDps).toBeCloseTo(15, 10);
      expect(result.appliedVolleyByType.kinetic).toBeCloseTo(60, 10);
    });
  });

  describe("edge cases", () => {
    test("zero cycleTime yields zero DPS but preserves volley", () => {
      const zeroCycle: TurretSpec = { ...turret, cycleTime: 0 };
      const result = assessor.assess(zeroCycle, 1, true);
      expect(result.nominalDps).toBe(0);
      expect(result.appliedDps).toBe(0);
      expect(result.volley).toBe(400);
      expect(result.baseVolleyByType.kinetic).toBe(400);
    });

    test("zero damage yields zero everything", () => {
      const zeroDamage: TurretSpec = { ...turret, damagePerShot: ZERO_DAMAGE };
      const result = assessor.assess(zeroDamage, 1, true);
      expect(result.nominalDps).toBe(0);
      expect(result.volley).toBe(0);
      expect(result.baseVolleyByType).toEqual(ZERO_DAMAGE);
    });

    test("multi-type damage preserves per-type proportions", () => {
      const multiType: TurretSpec = { ...turret, damagePerShot: { em: 10, thermal: 20, kinetic: 30, explosive: 40 }, turretCount: 2 };
      const result = assessor.assess(multiType, 0.5, true);
      expect(result.baseVolleyByType).toEqual({ em: 20, thermal: 40, kinetic: 60, explosive: 80 });
      expect(result.appliedVolleyByType).toEqual({ em: 10, thermal: 20, kinetic: 30, explosive: 40 });
      expect(damageVectorSum(result.appliedByType)).toBeCloseTo(result.appliedDps, 10);
    });
  });
});
