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

    test("rocket -> light -> rocket round-trip preserves damage type", () => {
      const catalog = createCatalog();
      const rocketId = findLauncherId(507);
      const rageRocketId = findMissileIdByName("Mjolnir Rage Rocket");
      const launcher = makeLauncher(rocketId, rageRocketId, 4);
      const originalMissile = FITTING_DB.missiles[launcher.chargeId];

      const lightLauncher = catalog.switchClass(launcher, "light", [], 5)!;
      const lightMissile = FITTING_DB.missiles[lightLauncher.chargeId];
      expect(lightMissile.damageType).toBe(originalMissile.damageType);

      const rocketLauncher = catalog.switchClass(lightLauncher, "rocket", [], 5)!;
      const rocketMissile = FITTING_DB.missiles[rocketLauncher.chargeId];
      expect(rocketMissile.damageType).toBe(originalMissile.damageType);
    });

    test("light -> rocket -> light round-trip preserves damage type", () => {
      const catalog = createCatalog();
      const lightId = findLauncherId(509);
      const scourgeLightId = findMissileIdByName("Scourge Light Missile");
      const launcher = makeLauncher(lightId, scourgeLightId, 3);
      const originalMissile = FITTING_DB.missiles[launcher.chargeId];

      const rocketLauncher = catalog.switchClass(launcher, "rocket", [], 5)!;
      const rocketMissile = FITTING_DB.missiles[rocketLauncher.chargeId];
      expect(rocketMissile.damageType).toBe(originalMissile.damageType);

      const lightLauncher = catalog.switchClass(rocketLauncher, "light", [], 5)!;
      const lightMissile = FITTING_DB.missiles[lightLauncher.chargeId];
      expect(lightMissile.damageType).toBe(originalMissile.damageType);
    });

    test("rage rocket -> basic light missile when fury unavailable in tech I launcher", () => {
      const catalog = createCatalog();
      const rocketId = findLauncherId(507);
      const rageRocketId = findMissileIdByName("Mjolnir Rage Rocket");
      const launcher = makeLauncher(rocketId, rageRocketId, 2);

      const lightLauncher = catalog.switchClass(launcher, "light", [], 5)!;
      const lightMissile = FITTING_DB.missiles[lightLauncher.chargeId];
      expect(lightMissile.damageType).toBe("em");
      expect(lightMissile.name).toBe("Mjolnir Light Missile");
    });

    test("javelin rocket -> basic light missile when precision unavailable in tech I launcher", () => {
      const catalog = createCatalog();
      const rocketId = findLauncherId(507);
      const javelinRocketId = findMissileIdByName("Inferno Javelin Rocket");
      const launcher = makeLauncher(rocketId, javelinRocketId, 2);

      const lightLauncher = catalog.switchClass(launcher, "light", [], 5)!;
      const lightMissile = FITTING_DB.missiles[lightLauncher.chargeId];
      expect(lightMissile.damageType).toBe("thermal");
      expect(lightMissile.name).toBe("Inferno Light Missile");
    });

    test("uses preferredModuleId instead of the representative when provided", () => {
      const catalog = createCatalog();
      const lightId = findLauncherId(509);
      const rocketIiId = findLauncherIdByName("Rocket Launcher II");
      const missileId = findMissileId(384, "em");
      const launcher = makeLauncher(lightId, missileId, 2);
      const result = catalog.switchClass(launcher, "rocket", [], 5, toTypeId(rocketIiId));
      expect(result).toBeDefined();
      expect(result!.moduleId).toBe(toTypeId(rocketIiId));
      expect(result!.name).toBe("Rocket Launcher II");
    });

    test("falls back to representative when preferredModuleId is unknown", () => {
      const catalog = createCatalog();
      const lightId = findLauncherId(509);
      const missileId = findMissileId(384, "em");
      const launcher = makeLauncher(lightId, missileId, 2);
      const result = catalog.switchClass(launcher, "rocket", [], 5, toTypeId("999999"));
      expect(result).toBeDefined();
      expect(result!.moduleId).toBe(toTypeId(findLauncherId(507)));
    });

    test("rocket -> light -> rocket round-trip with preferredModuleId restores Tech II launcher and T2 ammo charge group", () => {
      const catalog = createCatalog();
      const rocketIiId = findLauncherIdByName("Rocket Launcher II");
      const rageRocketId = findMissileIdByName("Mjolnir Rage Rocket");
      const launcher = makeLauncher(rocketIiId, rageRocketId, 4);

      const lightLauncher = catalog.switchClass(launcher, "light", [], 5)!;
      expect(lightLauncher).toBeDefined();

      const rocketLauncher = catalog.switchClass(lightLauncher, "rocket", [], 5, toTypeId(rocketIiId))!;
      expect(rocketLauncher.moduleId).toBe(toTypeId(rocketIiId));
      const resolvedMissile = FITTING_DB.missiles[rocketLauncher.chargeId];
      expect(FITTING_DB.launchers[rocketIiId].chargeGroups).toContain(resolvedMissile.chargeGroup);
    });
  });

  describe("switchVariant", () => {
    test("switches from Tech I to Tech II light missile launcher", () => {
      const catalog = createCatalog();
      const lightIId = findLauncherId(509);
      const lightIiId = findLauncherIdByName("Light Missile Launcher II");
      const missileId = findMissileId(384, "kinetic");
      const launcher = makeLauncher(lightIId, missileId, 2);
      const result = catalog.switchVariant(launcher, toTypeId(lightIiId), [], 5);
      expect(result).toBeDefined();
      expect(result!.moduleId).toBe(toTypeId(lightIiId));
      expect(result!.name).toBe("Light Missile Launcher II");
      expect(result!.count).toBe(2);
    });

    test("returns the same launcher when target module is the same", () => {
      const catalog = createCatalog();
      const lightId = findLauncherId(509);
      const missileId = findMissileId(384, "kinetic");
      const launcher = makeLauncher(lightId, missileId, 2);
      const result = catalog.switchVariant(launcher, toTypeId(lightId), [], 5);
      expect(result).toBe(launcher);
    });

    test("returns undefined for an unknown target module id", () => {
      const catalog = createCatalog();
      const lightId = findLauncherId(509);
      const missileId = findMissileId(384, "kinetic");
      const launcher = makeLauncher(lightId, missileId, 2);
      const result = catalog.switchVariant(launcher, toTypeId("999999"), [], 5);
      expect(result).toBeUndefined();
    });

    test("preserves compatible missile when switching to a variant that supports the charge group", () => {
      const catalog = createCatalog();
      const lightIId = findLauncherId(509);
      const lightIiId = findLauncherIdByName("Light Missile Launcher II");
      const scourgeLightId = findMissileIdByName("Scourge Light Missile");
      const launcher = makeLauncher(lightIId, scourgeLightId, 3);
      const result = catalog.switchVariant(launcher, toTypeId(lightIiId), [], 5);
      expect(result).toBeDefined();
      expect(result!.chargeId).toBe(launcher.chargeId);
    });

    test("recomputes stats with skills on variant switch", () => {
      const catalog = createCatalog();
      const lightIId = findLauncherId(509);
      const lightIiId = findLauncherIdByName("Light Missile Launcher II");
      const missileId = findMissileId(384, "kinetic");
      const launcher = makeLauncher(lightIId, missileId, 2);
      const result = catalog.switchVariant(launcher, toTypeId(lightIiId), [], 5);
      expect(result).toBeDefined();
      expect(result!.damagePerMissile).toBeGreaterThan(0);
      expect(result!.cycleTime).toBeGreaterThan(0);
    });
  });
});

function findLauncherIdByName(name: string): string {
  const entry = Object.entries(FITTING_DB.launchers).find(([, s]) => s.name === name);
  if (!entry) throw new Error(`No launcher named ${name}`);
  return entry[0];
}

function findMissileIdByName(name: string): string {
  const entry = Object.entries(FITTING_DB.missiles).find(([, s]) => s.name === name);
  if (!entry) throw new Error(`No missile named ${name}`);
  return entry[0];
}
