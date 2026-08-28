import { toTypeId, type TypeId } from "../gamedata/ids";
import { FITTING_DB, type FittingDb, type TurretStats } from "../gamedata/fittingDb";
import { ChargeCatalogImpl, type ImportedTurret } from "./chargeCatalog";
import { GunFamiliesImpl } from "./gunFamilies";
import { TurretCatalogImpl } from "./turretCatalog";

const gunFamilies = new GunFamiliesImpl({ fittingDb: FITTING_DB });
const chargeCatalog = new ChargeCatalogImpl({ fittingDb: FITTING_DB, gunFamilies });
const turretCatalog = new TurretCatalogImpl({ fittingDb: FITTING_DB, gunFamilies, chargeCatalog });

function turretIdForName(name: string): TypeId {
  for (const stats of Object.values(FITTING_DB.turrets)) {
    if (stats.name === name) return stats.id;
  }
  throw new Error(`Missing turret ${name}`);
}

function chargeIdForName(name: string): TypeId {
  for (const stats of Object.values(FITTING_DB.charges)) {
    if (stats.name === name) return stats.id;
  }
  throw new Error(`Missing charge ${name}`);
}

function makeTurret(moduleName: string, chargeName?: string, skillLevel: number = 0): ImportedTurret {
  const moduleId = turretIdForName(moduleName);
  const stats = FITTING_DB.turrets[moduleId];
  const chargeId = chargeName ? chargeIdForName(chargeName) : chargeCatalog.usualForChargeSize(stats.chargeSize);
  const charge = FITTING_DB.charges[chargeId] ?? {};
  const sigResClass = stats.chargeSize >= 4 ? "XL" : stats.chargeSize === 3 ? "L" : stats.chargeSize === 2 ? "M" : "S";
  const sigRes = { S: 40, M: 125, L: 400, XL: 2000 }[sigResClass];
  const skillMult = 1 + 0.05 * skillLevel;
  const baseTracking = (stats.tracking * skillMult * sigRes) / 40_000;
  const baseOptimal = stats.optimal * skillMult;
  const baseFalloff = stats.falloff * skillMult;
  return {
    tracking: baseTracking * (charge.trackingMultiplier ?? 1),
    sigResolutionClass: sigResClass,
    optimal: baseOptimal * (charge.rangeMultiplier ?? 1),
    falloff: baseFalloff * (charge.falloffMultiplier ?? 1),
    chargeSize: stats.chargeSize,
    chargeId,
    base: { tracking: baseTracking, optimal: baseOptimal, falloff: baseFalloff },
    moduleId,
  };
}

describe("TurretCatalogImpl", () => {
  test("resize S to M changes moduleId to the same-family representative", () => {
    const small = makeTurret("200mm AutoCannon I", "EMP S");
    const resized = turretCatalog.resize(small, "M", 0);
    expect(resized).toBeDefined();
    expect(resized!.moduleId).toBe(turretIdForName("425mm AutoCannon I"));
    expect(resized!.sigResolutionClass).toBe("M");
    expect(resized!.chargeSize).toBe(2);
  });

  test("resize S to M changes tracking, optimal, and falloff to the new module's stats", () => {
    const small = makeTurret("200mm AutoCannon I", "EMP S");
    const resized = turretCatalog.resize(small, "M", 0);
    const mediumStats = FITTING_DB.turrets[turretIdForName("425mm AutoCannon I")];
    expect(resized!.base.tracking).toBeCloseTo((mediumStats.tracking * 125) / 40_000, 6);
    expect(resized!.base.optimal).toBeCloseTo(mediumStats.optimal, 6);
    expect(resized!.base.falloff).toBeCloseTo(mediumStats.falloff, 6);
  });

  test("resize applies skill multipliers", () => {
    const small = makeTurret("200mm AutoCannon I", "EMP S", 4);
    const resized = turretCatalog.resize(small, "M", 4);
    const mediumStats = FITTING_DB.turrets[turretIdForName("425mm AutoCannon I")];
    const skillMult = 1 + 0.05 * 4;
    expect(resized!.base.tracking).toBeCloseTo((mediumStats.tracking * skillMult * 125) / 40_000, 6);
    expect(resized!.base.optimal).toBeCloseTo(mediumStats.optimal * skillMult, 6);
    expect(resized!.base.falloff).toBeCloseTo(mediumStats.falloff * skillMult, 6);
  });

  test("resize maps charge to the same-stem charge in the new size", () => {
    const small = makeTurret("200mm AutoCannon I", "EMP S");
    const resized = turretCatalog.resize(small, "M", 0);
    expect(resized!.chargeId).toBe(chargeIdForName("EMP M"));
  });

  test("resize falls back to usual charge when the current charge has no equivalent in the new size", () => {
    const small = makeTurret("200mm AutoCannon I");
    const withUnknownCharge: ImportedTurret = { ...small, chargeId: toTypeId("999999") };
    const resized = turretCatalog.resize(withUnknownCharge, "M", 0);
    const mediumModuleId = turretIdForName("425mm AutoCannon I");
    const mediumTurret: ImportedTurret = {
      tracking: 0, sigResolutionClass: "M", optimal: 0, falloff: 0,
      chargeSize: 2, chargeId: toTypeId("0"), base: { tracking: 0, optimal: 0, falloff: 0 },
      moduleId: mediumModuleId,
    };
    expect(resized!.chargeId).toBe(chargeCatalog.usualForTurret(mediumTurret));
  });

  test("resize applies charge multipliers to the final stats", () => {
    const small = makeTurret("200mm AutoCannon I", "EMP S");
    const resized = turretCatalog.resize(small, "M", 0);
    const charge = FITTING_DB.charges[resized!.chargeId];
    expect(resized!.tracking).toBeCloseTo(resized!.base.tracking * (charge?.trackingMultiplier ?? 1), 6);
    expect(resized!.optimal).toBeCloseTo(resized!.base.optimal * (charge?.rangeMultiplier ?? 1), 6);
    expect(resized!.falloff).toBeCloseTo(resized!.base.falloff * (charge?.falloffMultiplier ?? 1), 6);
  });

  test("resize M to L changes moduleId to the large representative", () => {
    const medium = makeTurret("425mm AutoCannon I", "EMP M");
    const resized = turretCatalog.resize(medium, "L", 0);
    expect(resized).toBeDefined();
    expect(resized!.moduleId).toBe(turretIdForName("800mm Repeating Cannon I"));
    expect(resized!.sigResolutionClass).toBe("L");
    expect(resized!.chargeSize).toBe(3);
  });

  test("resize returns undefined when the module is not a known turret", () => {
    const unknown: ImportedTurret = {
      tracking: 0, sigResolutionClass: "S", optimal: 0, falloff: 0,
      chargeSize: 1, chargeId: toTypeId("0"), base: { tracking: 0, optimal: 0, falloff: 0 },
      moduleId: toTypeId("999999"),
    };
    expect(turretCatalog.resize(unknown, "M", 0)).toBeUndefined();
  });

  test("resize to the same size returns a turret with the same moduleId", () => {
    const small = makeTurret("200mm AutoCannon I", "EMP S");
    const resized = turretCatalog.resize(small, "S", 0);
    expect(resized).toBeDefined();
    expect(resized!.moduleId).toBe(small.moduleId);
  });

  test("resize works across different families", () => {
    const smallPulse = makeTurret("Gatling Pulse Laser I", "Multifrequency S");
    const resized = turretCatalog.resize(smallPulse, "M", 0);
    expect(resized).toBeDefined();
    expect(resized!.moduleId).toBe(turretIdForName("Heavy Pulse Laser I"));
    expect(resized!.sigResolutionClass).toBe("M");
  });
});
