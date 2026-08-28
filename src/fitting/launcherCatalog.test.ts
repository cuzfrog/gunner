import { FITTING_DB } from "../gamedata/fittingDb";
import { toTypeId } from "../gamedata/ids";
import { LauncherClassesImpl } from "./launcherClasses";
import { LauncherCatalogImpl } from "./launcherCatalog";
import { MissileCatalogImpl } from "./missileCatalog";
import { MissileSkillModelImpl } from "./missileStats";
import type { StackingPenalty } from "../sim";
import type { ImportedLauncher } from "./chargeCatalog";

const stacking = vi.mocked<StackingPenalty>({ apply: vi.fn((m: readonly number[]) => m.reduce((p, x) => p * x, 1)) });
const skillModel = new MissileSkillModelImpl({ stackingPenalty: stacking });
const launcherClasses = new LauncherClassesImpl({ fittingDb: FITTING_DB });
const missileCatalog = new MissileCatalogImpl({ fittingDb: FITTING_DB, missileSkillModel: skillModel });

function createCatalog(): LauncherCatalogImpl {
  return new LauncherCatalogImpl({ fittingDb: FITTING_DB, launcherClasses, missileCatalog });
}

function findLauncherId(group: number): string {
  const entry = Object.entries(FITTING_DB.launchers).find(([, s]) => s.launcherGroup === group && s.name.endsWith(" I") && !s.name.includes(" II"));
  if (!entry) throw new Error(`No Tech I launcher for group ${group}`);
  return entry[0];
}

function findMissileId(chargeGroup: number, damageType: string): string {
  const entry = Object.entries(FITTING_DB.missiles).find(([, s]) =>
    s.chargeGroup === chargeGroup && s.damageType === damageType &&
    !s.name.includes("Fury") && !s.name.includes("Precision") && !s.name.includes("Rage") &&
    !s.name.includes("Javelin") && !s.name.includes("Auto-Targeting") && !s.name.includes("Civilian") &&
    !s.name.includes("Legion") && !s.name.includes("Caldari Navy") && !s.name.includes("Dread Guristas") && !s.name.includes("Guristas"));
  if (!entry) throw new Error(`No basic missile for chargeGroup ${chargeGroup}, damageType ${damageType}`);
  return entry[0];
}

function makeLauncher(moduleId: string, chargeId: string, count: number): ImportedLauncher {
  const launcherStats = FITTING_DB.launchers[moduleId];
  const missileStats = FITTING_DB.missiles[chargeId];
  if (!launcherStats || !missileStats) throw new Error(`Unknown module/charge: ${moduleId}/${chargeId}`);
  return {
    moduleId: toTypeId(moduleId), name: launcherStats.name, count,
    chargeId: toTypeId(chargeId), chargeName: missileStats.name,
    damagePerMissile: missileStats.damage, cycleTime: launcherStats.rateOfFire,
    explosionRadius: missileStats.explosionRadius, explosionVelocity: missileStats.explosionVelocity,
    damageReductionFactor: missileStats.damageReductionFactor, maxVelocity: missileStats.maxVelocity, flightTime: missileStats.flightTime,
  };
}

describe("LauncherCatalog", () => {
  describe("switchClass", () => {
    test("returns the same launcher when target class matches current class", () => {
      const catalog = createCatalog();
      const rocketId = findLauncherId(507);
      const missileId = findMissileId(387, "kinetic");
      const launcher = makeLauncher(rocketId, missileId, 2);
      const result = catalog.switchClass(launcher, "rocket", [], 5);
      expect(result).toBe(launcher);
    });

    test("returns undefined for an unknown module id", () => {
      const catalog = createCatalog();
      const launcher = makeLauncher(findLauncherId(507), findMissileId(387, "kinetic"), 1);
      const fake = { ...launcher, moduleId: toTypeId("999999") };
      const result = catalog.switchClass(fake, "light", [], 5);
      expect(result).toBeUndefined();
    });

    test("switches rocket to light and resolves a compatible missile via stem matching", () => {
      const catalog = createCatalog();
      const rocketId = findLauncherId(507);
      const scourgeRocketId = findMissileId(387, "kinetic");
      const launcher = makeLauncher(rocketId, scourgeRocketId, 2);
      const result = catalog.switchClass(launcher, "light", [], 5);
      expect(result).toBeDefined();
      expect(result!.count).toBe(2);
      const newMissile = FITTING_DB.missiles[result!.chargeId];
      expect(newMissile.damageType).toBe("kinetic");
      expect(newMissile.name).toContain("Light Missile");
    });

    test("switches light to rapidLight and keeps the same missile (shared charge groups)", () => {
      const catalog = createCatalog();
      const lightId = findLauncherId(509);
      const missileId = findMissileId(384, "kinetic");
      const launcher = makeLauncher(lightId, missileId, 3);
      const result = catalog.switchClass(launcher, "rapidLight", [], 5);
      expect(result).toBeDefined();
      expect(result!.chargeId).toBe(launcher.chargeId);
      expect(result!.count).toBe(3);
    });

    test("switches ham to heavy and resolves a compatible missile via stem matching", () => {
      const catalog = createCatalog();
      const hamId = findLauncherId(771);
      const missileId = findMissileId(772, "kinetic");
      const launcher = makeLauncher(hamId, missileId, 4);
      const result = catalog.switchClass(launcher, "heavy", [], 5);
      expect(result).toBeDefined();
      const newMissile = FITTING_DB.missiles[result!.chargeId];
      expect(newMissile.damageType).toBe("kinetic");
      expect(newMissile.name).toContain("Heavy Missile");
      expect(newMissile.name).not.toContain("Heavy Assault");
    });

    test("preserves count across class switch", () => {
      const catalog = createCatalog();
      const rocketId = findLauncherId(507);
      const missileId = findMissileId(387, "em");
      const launcher = makeLauncher(rocketId, missileId, 5);
      const result = catalog.switchClass(launcher, "light", [], 5);
      expect(result!.count).toBe(5);
    });

    test("recomputes stats with skills on class switch", () => {
      const catalog = createCatalog();
      const rocketId = findLauncherId(507);
      const missileId = findMissileId(387, "kinetic");
      const launcher = makeLauncher(rocketId, missileId, 2);
      const result = catalog.switchClass(launcher, "light", [], 5);
      expect(result).toBeDefined();
      expect(result!.damagePerMissile).toBeGreaterThan(0);
      expect(result!.cycleTime).toBeGreaterThan(0);
      expect(result!.maxVelocity).toBeGreaterThan(0);
      expect(result!.flightTime).toBeGreaterThan(0);
    });
  });
});
