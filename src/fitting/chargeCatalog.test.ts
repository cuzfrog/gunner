import type { TypeId } from "../gamedata/ids";
import type { ChargeStats, FittingDb, TurretStats } from "../gamedata/fittingDb";
import { FITTING_DB } from "../gamedata/fittingDb";
import {
  ChargeCatalogImpl,
  _chargeSizeFromName,
  _isNavyCharge,
  type ImportedTurret,
} from "./chargeCatalog";
import { EMPTY_DAMAGE_BREAKDOWN } from "./damageBreakdown";

const PROJECTILE_AMMO = 83;
const HYBRID_CHARGE = 85;
const FREQUENCY_CRYSTAL = 86;
const ADVANCED_PULSE = 375;
const EXOTIC_PLASMA = 1987;
const ADVANCED_EXOTIC = 1989;

const RAILGUN_ID = "railgun-s" as TypeId;
const AUTOCANNON_ID = "autocannon-s" as TypeId;
const PULSE_T1_ID = "pulse-t1-s" as TypeId;
const PULSE_T2_ID = "pulse-t2-s" as TypeId;
const DISINTEGRATOR_T1_ID = "disintegrator-t1-s" as TypeId;
const DISINTEGRATOR_T2_ID = "disintegrator-t2-s" as TypeId;
const UNKNOWN_ID = "not-a-turret" as TypeId;

function typeId(name: string): TypeId {
  return `charge-${name.replace(/\s+/g, "-").toLowerCase()}` as TypeId;
}

function charge(name: string, extras: Partial<ChargeStats> & { readonly chargeGroup: number }): ChargeStats {
  const chargeSize = extras.chargeSize ?? _chargeSizeFromName(name) ?? 1;
  return { id: typeId(name), name, trackingMultiplier: 1, rangeMultiplier: 1, falloffMultiplier: 1, chargeSize, ...extras };
}

function turretRow(id: TypeId, name: string, chargeGroups: readonly number[], chargeSize = 1): TurretStats {
  return {
    id,
    name,
    tracking: 1,
    optimal: 1000,
    falloff: 1000,
    chargeSize,
    chargeGroups,
    damageMultiplier: 1,
    cycleTime: 5,
    requiredSkillIds: [],
    groupID: 55,
    metaLevel: 0,
    metaGroupID: 1,
  };
}

const CALDARI_NAVY_ANTIMATTER_CHARGE_S = charge("Caldari Navy Antimatter Charge S", { chargeGroup: HYBRID_CHARGE, trackingMultiplier: 0.75, rangeMultiplier: 0.4 });
const FEDERATION_NAVY_ANTIMATTER_CHARGE_S = charge("Federation Navy Antimatter Charge S", { chargeGroup: HYBRID_CHARGE, trackingMultiplier: 0.75, rangeMultiplier: 0.4 });
const IMPERIAL_NAVY_MULTIFREQUENCY_S = charge("Imperial Navy Multifrequency S", { chargeGroup: FREQUENCY_CRYSTAL, trackingMultiplier: 0.75, rangeMultiplier: 0.6 });
const REPUBLIC_FLEET_EMP_S = charge("Republic Fleet EMP S", { chargeGroup: PROJECTILE_AMMO, rangeMultiplier: 0.5 });
const SHADOW_IRON_CHARGE_S = charge("Shadow Iron Charge S", { chargeGroup: HYBRID_CHARGE, trackingMultiplier: 0.85, rangeMultiplier: 0.5 });
const TITANIUM_SABOT_S = charge("Titanium Sabot S", { chargeGroup: PROJECTILE_AMMO, trackingMultiplier: 1.2, rangeMultiplier: 1 });
const CARBONIZED_LEAD_M = charge("Carbonized Lead M", { chargeGroup: PROJECTILE_AMMO, trackingMultiplier: 1.05, rangeMultiplier: 1.6 });
const CALDARI_NAVY_SCOURGE_M = charge("Caldari Navy Scourge M", { chargeGroup: 384, trackingMultiplier: 0.75, rangeMultiplier: 0.5 });
const REPUBLIC_FLEET_CARBONIZED_LEAD_XL = charge("Republic Fleet Carbonized Lead XL", { chargeGroup: PROJECTILE_AMMO, trackingMultiplier: 1.05, rangeMultiplier: 1.6 });
const NUCLEAR_L = charge("Nuclear L", { chargeGroup: PROJECTILE_AMMO, rangeMultiplier: 1.6 });
const HAIL_S = charge("Hail S", { chargeGroup: 372, trackingMultiplier: 1, rangeMultiplier: 0.5 });
const CONFLAGRATION_S = charge("Conflagration S", { chargeGroup: ADVANCED_PULSE, trackingMultiplier: 0.7, rangeMultiplier: 0.5 });
const TETRYON_S = charge("Tetryon Exotic Plasma S", { chargeGroup: EXOTIC_PLASMA, rangeMultiplier: 0.7 });
const BARYON_S = charge("Baryon Exotic Plasma S", { chargeGroup: EXOTIC_PLASMA, rangeMultiplier: 1.1 });
const OCCULT_S = charge("Occult S", { chargeGroup: ADVANCED_EXOTIC, trackingMultiplier: 0.75, rangeMultiplier: 0.6 });
const MISSING_CHARGE = typeId("Missing Charge S");

const TEST_CHARGES: Record<string, ChargeStats> = {
  [CALDARI_NAVY_ANTIMATTER_CHARGE_S.id]: CALDARI_NAVY_ANTIMATTER_CHARGE_S,
  [FEDERATION_NAVY_ANTIMATTER_CHARGE_S.id]: FEDERATION_NAVY_ANTIMATTER_CHARGE_S,
  [IMPERIAL_NAVY_MULTIFREQUENCY_S.id]: IMPERIAL_NAVY_MULTIFREQUENCY_S,
  [REPUBLIC_FLEET_EMP_S.id]: REPUBLIC_FLEET_EMP_S,
  [SHADOW_IRON_CHARGE_S.id]: SHADOW_IRON_CHARGE_S,
  [TITANIUM_SABOT_S.id]: TITANIUM_SABOT_S,
  [CARBONIZED_LEAD_M.id]: CARBONIZED_LEAD_M,
  [CALDARI_NAVY_SCOURGE_M.id]: CALDARI_NAVY_SCOURGE_M,
  [REPUBLIC_FLEET_CARBONIZED_LEAD_XL.id]: REPUBLIC_FLEET_CARBONIZED_LEAD_XL,
  [NUCLEAR_L.id]: NUCLEAR_L,
  [CONFLAGRATION_S.id]: CONFLAGRATION_S,
  [TETRYON_S.id]: TETRYON_S,
  [BARYON_S.id]: BARYON_S,
  [OCCULT_S.id]: OCCULT_S,
};

const TEST_TURRETS: Record<string, TurretStats> = {
  [RAILGUN_ID]: turretRow(RAILGUN_ID, "150mm Railgun I", [HYBRID_CHARGE]),
  [AUTOCANNON_ID]: turretRow(AUTOCANNON_ID, "200mm AutoCannon I", [PROJECTILE_AMMO]),
  [PULSE_T1_ID]: turretRow(PULSE_T1_ID, "Gatling Pulse Laser I", [FREQUENCY_CRYSTAL]),
  [PULSE_T2_ID]: turretRow(PULSE_T2_ID, "Gatling Pulse Laser II", [FREQUENCY_CRYSTAL, ADVANCED_PULSE]),
  [DISINTEGRATOR_T1_ID]: turretRow(DISINTEGRATOR_T1_ID, "Light Entropic Disintegrator I", [EXOTIC_PLASMA]),
  [DISINTEGRATOR_T2_ID]: turretRow(DISINTEGRATOR_T2_ID, "Light Entropic Disintegrator II", [EXOTIC_PLASMA, ADVANCED_EXOTIC]),
};

function chargeByName(name: string): ChargeStats {
  if (name === HAIL_S.name) return HAIL_S;
  const found = Object.values(TEST_CHARGES).find((c) => c.name === name);
  if (!found) throw new Error(`Missing charge ${name}`);
  return found;
}

function buildCatalog(charges = TEST_CHARGES): ChargeCatalogImpl {
  const fittingDb: FittingDb = { ...FITTING_DB, charges, turrets: TEST_TURRETS };
  return new ChargeCatalogImpl({ fittingDb });
}

function turret(overrides: Partial<ImportedTurret> = {}): ImportedTurret {
  return {
    tracking: 0.315,
    sigResolutionClass: "S",
    optimal: 600,
    falloff: 3000,
    chargeSize: 1,
    chargeId: TITANIUM_SABOT_S.id,
    base: { tracking: 0.315, optimal: 600, falloff: 3000 },
    moduleId: RAILGUN_ID,
    damageMultiplier: 3,
    damagePerShot: { em: 0, thermal: 0, kinetic: 12, explosive: 0 },
    cycleTime: 5,
    turretCount: 1,
    damageBreakdown: EMPTY_DAMAGE_BREAKDOWN,
    ...overrides,
  };
}

describe("ChargeCatalogImpl", () => {
  test("chargeSizeFromName checks XL before L", () => {
    expect(_chargeSizeFromName("Republic Fleet Carbonized Lead XL")).toBe(4);
    expect(_chargeSizeFromName("Nuclear L")).toBe(3);
    expect(_chargeSizeFromName("Caldari Navy Scourge M")).toBe(2);
    expect(_chargeSizeFromName("Titanium Sabot S")).toBe(1);
    expect(_chargeSizeFromName("no size")).toBeUndefined();
  });

  test("isNavyCharge recognizes only the four navy prefixes", () => {
    expect(_isNavyCharge("Caldari Navy Antimatter Charge S")).toBe(true);
    expect(_isNavyCharge("Federation Navy Antimatter Charge S")).toBe(true);
    expect(_isNavyCharge("Imperial Navy Multifrequency S")).toBe(true);
    expect(_isNavyCharge("Republic Fleet EMP S")).toBe(true);
    expect(_isNavyCharge("Shadow Iron Charge S")).toBe(false);
    expect(_isNavyCharge("Titanium Sabot S")).toBe(false);
  });

  test("usualForChargeSize prefers navy then shortest range then alphabetical", () => {
    const catalog = buildCatalog();
    expect(catalog.usualForChargeSize(1)).toBe(chargeByName("Caldari Navy Antimatter Charge S").id);
  });

  test("usualForChargeSize falls back to any charge when no navy exists for size", () => {
    const catalog = buildCatalog();
    expect(catalog.usualForChargeSize(4)).toBe(chargeByName("Republic Fleet Carbonized Lead XL").id);
  });

  test("usualForChargeSize does not confuse XL with L", () => {
    const catalog = buildCatalog();
    expect(catalog.usualForChargeSize(3)).toBe(chargeByName("Nuclear L").id);
    expect(catalog.chargesForSize(4).some((c) => c.name.endsWith(" L"))).toBe(false);
  });

  test("chargesForSize filters by size and sorts by range then name", () => {
    const catalog = buildCatalog();
    const s = catalog.chargesForSize(1);
    expect(s.map((c) => c.name)).toEqual([
      "Caldari Navy Antimatter Charge S",
      "Federation Navy Antimatter Charge S",
      "Conflagration S",
      "Republic Fleet EMP S",
      "Shadow Iron Charge S",
      "Imperial Navy Multifrequency S",
      "Occult S",
      "Tetryon Exotic Plasma S",
      "Titanium Sabot S",
      "Baryon Exotic Plasma S",
    ]);
    expect(s[0]).toEqual({
      id: chargeByName("Caldari Navy Antimatter Charge S").id,
      name: "Caldari Navy Antimatter Charge S",
      trackingMultiplier: 0.75,
      rangeMultiplier: 0.4,
      falloffMultiplier: 1,
      damageByType: {},
    });
  });

  test("chargesForSize normalizes missing multipliers to 1", () => {
    const catalog = buildCatalog();
    const s = catalog.chargesForSize(1);
    const republic = s.find((c) => c.name === "Republic Fleet EMP S");
    expect(republic).toEqual({
      id: chargeByName("Republic Fleet EMP S").id,
      name: "Republic Fleet EMP S",
      trackingMultiplier: 1,
      rangeMultiplier: 0.5,
      falloffMultiplier: 1,
      damageByType: {},
    });
  });

  test("chargesForSize returns empty array for unknown size", () => {
    const catalog = buildCatalog();
    expect(catalog.chargesForSize(5)).toEqual([]);
  });

  test("withCharge recomputes tracking, optimal, and falloff from base", () => {
    const catalog = buildCatalog();
    const base: ImportedTurret = turret({
      base: { tracking: 0.4, optimal: 1000, falloff: 5000 },
    });
    const next = catalog.withCharge(base, chargeByName("Caldari Navy Antimatter Charge S").id);
    expect(next.chargeId).toBe(chargeByName("Caldari Navy Antimatter Charge S").id);
    expect(next.tracking).toBeCloseTo(0.4 * 0.75, 6);
    expect(next.optimal).toBeCloseTo(1000 * 0.4, 6);
    expect(next.falloff).toBeCloseTo(5000 * 1, 6);
    expect(next.base).toEqual(base.base);
    expect(next.sigResolutionClass).toBe("S");
    expect(next.chargeSize).toBe(1);
    expect(next.moduleId).toBe(base.moduleId);
  });

  test("withCharge returns input unchanged for unknown charge", () => {
    const catalog = buildCatalog();
    const base = turret();
    expect(catalog.withCharge(base, MISSING_CHARGE)).toBe(base);
  });

  test("chargesForTurret filters by charge groups and charge size", () => {
    const catalog = buildCatalog();
    const autocannon = turret({ moduleId: AUTOCANNON_ID, chargeSize: 1, chargeId: HAIL_S.id });
    expect(catalog.chargesForTurret(autocannon).map((c) => c.name)).toEqual(["Republic Fleet EMP S", "Titanium Sabot S"]);

    const railgun = turret({ moduleId: RAILGUN_ID, chargeSize: 1, chargeId: TITANIUM_SABOT_S.id });
    expect(catalog.chargesForTurret(railgun).map((c) => c.name)).toEqual([
      "Caldari Navy Antimatter Charge S",
      "Federation Navy Antimatter Charge S",
      "Shadow Iron Charge S",
    ]);

    const pulse = turret({ moduleId: PULSE_T1_ID, chargeSize: 1, chargeId: HAIL_S.id });
    expect(catalog.chargesForTurret(pulse).map((c) => c.name)).toEqual(["Imperial Navy Multifrequency S"]);
  });

  test("chargesForTurret excludes T2 crystals from a T1 pulse laser", () => {
    const catalog = buildCatalog();
    const pulseT1 = turret({ moduleId: PULSE_T1_ID });
    expect(catalog.chargesForTurret(pulseT1).map((c) => c.name)).not.toContain("Conflagration S");
    const pulseT2 = turret({ moduleId: PULSE_T2_ID });
    expect(catalog.chargesForTurret(pulseT2).map((c) => c.name)).toEqual(["Conflagration S", "Imperial Navy Multifrequency S"]);
  });

  test("chargesForTurret lists only exotic plasma for a T1 disintegrator", () => {
    const catalog = buildCatalog();
    const t1 = turret({ moduleId: DISINTEGRATOR_T1_ID });
    expect(catalog.chargesForTurret(t1).map((c) => c.name)).toEqual(["Tetryon Exotic Plasma S", "Baryon Exotic Plasma S"]);
    const t2 = turret({ moduleId: DISINTEGRATOR_T2_ID });
    expect(catalog.chargesForTurret(t2).map((c) => c.name)).toEqual(["Occult S", "Tetryon Exotic Plasma S", "Baryon Exotic Plasma S"]);
  });

  test("usualForTurret prefers a navy charge from the turret's charge groups", () => {
    const catalog = buildCatalog();
    expect(catalog.usualForTurret(turret({ moduleId: AUTOCANNON_ID }))).toBe(REPUBLIC_FLEET_EMP_S.id);
    expect(catalog.usualForTurret(turret({ moduleId: RAILGUN_ID }))).toBe(CALDARI_NAVY_ANTIMATTER_CHARGE_S.id);
    expect(catalog.usualForTurret(turret({ moduleId: PULSE_T1_ID }))).toBe(IMPERIAL_NAVY_MULTIFREQUENCY_S.id);
  });

  test("usualForTurret selects exotic plasma for a disintegrator", () => {
    const catalog = buildCatalog();
    expect(catalog.usualForTurret(turret({ moduleId: DISINTEGRATOR_T1_ID }))).toBe(TETRYON_S.id);
    expect(catalog.usualForTurret(turret({ moduleId: DISINTEGRATOR_T2_ID }))).toBe(OCCULT_S.id);
  });

  test("usualForTurret throws when the module is not a turret", () => {
    const catalog = buildCatalog();
    expect(() => catalog.usualForTurret(turret({ moduleId: UNKNOWN_ID }))).toThrow("No compatible charges for turret");
  });

  test("withCharge keeps the turret unchanged when the charge is not in the turret's charge groups", () => {
    const catalog = buildCatalog();
    const autocannon = turret({ moduleId: AUTOCANNON_ID, chargeId: HAIL_S.id });
    const unchanged = catalog.withCharge(autocannon, CALDARI_NAVY_ANTIMATTER_CHARGE_S.id);
    expect(unchanged).toBe(autocannon);
  });

  test("chargesForTurret returns empty for a module that is not a turret", () => {
    const catalog = buildCatalog();
    expect(catalog.chargesForTurret(turret({ moduleId: UNKNOWN_ID }))).toEqual([]);
  });

  test("generated fitting database covers every turret with at least one compatible charge", () => {
    expect(() => new ChargeCatalogImpl({ fittingDb: FITTING_DB })).not.toThrow();
  });

  test("generated disintegrator usual ammo is exotic plasma", () => {
    const catalog = new ChargeCatalogImpl({ fittingDb: FITTING_DB });
    const disintegrator = Object.values(FITTING_DB.turrets).find((stats) => stats.name === "Light Entropic Disintegrator I");
    expect(disintegrator).toBeDefined();
    const usual = catalog.usualForTurret({ moduleId: disintegrator!.id, chargeSize: disintegrator!.chargeSize });
    expect(FITTING_DB.charges[usual]?.name).toBe("Tetryon Exotic Plasma S");
    const names = catalog.chargesForTurret({ moduleId: disintegrator!.id, chargeSize: disintegrator!.chargeSize }).map((c) => c.name);
    expect(names.some((name) => /Antimatter|EMP|Multifrequency|Hail/.test(name))).toBe(false);
  });

  test("has returns true for a known charge id", () => {
    const catalog = buildCatalog();
    expect(catalog.has(chargeByName("Republic Fleet EMP S").id)).toBe(true);
    expect(catalog.has(chargeByName("Titanium Sabot S").id)).toBe(true);
  });

  test("has returns false for an unknown charge id", () => {
    const catalog = buildCatalog();
    expect(catalog.has(MISSING_CHARGE)).toBe(false);
    expect(catalog.has("0" as TypeId)).toBe(false);
  });

  test("equivalentInSize returns undefined when the target size has no matching stem", () => {
    const catalog = buildCatalog();
    expect(catalog.equivalentInSize(chargeByName("Titanium Sabot S").id, 2)).toBeUndefined();
    expect(catalog.equivalentInSize(chargeByName("Republic Fleet EMP S").id, 2)).toBeUndefined();
  });

  test("equivalentInSize maps a charge to the same-stem charge in the target size with matching target", () => {
    const titaniumSabotM = charge("Titanium Sabot M", { chargeGroup: PROJECTILE_AMMO, trackingMultiplier: 1.2, rangeMultiplier: 1 });
    const republicFleetEmpM = charge("Republic Fleet EMP M", { chargeGroup: PROJECTILE_AMMO, rangeMultiplier: 0.5 });
    const chargesWithM = { ...TEST_CHARGES, [titaniumSabotM.id]: titaniumSabotM, [republicFleetEmpM.id]: republicFleetEmpM };
    const catalog = buildCatalog(chargesWithM);
    expect(catalog.equivalentInSize(chargeByName("Titanium Sabot S").id, 2)).toBe(titaniumSabotM.id);
    expect(catalog.equivalentInSize(chargeByName("Republic Fleet EMP S").id, 2)).toBe(republicFleetEmpM.id);
  });

  test("equivalentInSize maps navy charges across sizes", () => {
    const republicFleetEmpXL = charge("Republic Fleet EMP XL", { chargeGroup: PROJECTILE_AMMO, rangeMultiplier: 0.5 });
    const chargesWithXL = { ...TEST_CHARGES, [republicFleetEmpXL.id]: republicFleetEmpXL };
    const catalog = buildCatalog(chargesWithXL);
    expect(catalog.equivalentInSize(chargeByName("Republic Fleet EMP S").id, 4)).toBe(republicFleetEmpXL.id);
  });

  test("equivalentInSize returns undefined for an unknown charge id", () => {
    const catalog = buildCatalog();
    expect(catalog.equivalentInSize(MISSING_CHARGE, 2)).toBeUndefined();
  });

  test("equivalentInSize returns undefined when no same-stem charge exists in the target size", () => {
    const catalog = buildCatalog();
    expect(catalog.equivalentInSize(chargeByName("Titanium Sabot S").id, 3)).toBeUndefined();
  });

  test("equivalentInSize returns the same id when the charge is already in the target size", () => {
    const catalog = buildCatalog();
    expect(catalog.equivalentInSize(chargeByName("Titanium Sabot S").id, 1)).toBe(chargeByName("Titanium Sabot S").id);
  });
});
