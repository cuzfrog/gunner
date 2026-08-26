import type { TypeId } from "../gamedata/ids";
import type { ChargeStats, FittingDb } from "../gamedata/fittingDb";
import { FITTING_DB } from "../gamedata/fittingDb";
import {
  ChargeCatalogImpl,
  _chargeFamilyOf,
  _chargeSizeFromName,
  _isNavyCharge,
  _turretChargeFamily,
  type ChargeOption,
  type ImportedTurret,
} from "./chargeCatalog";
import { GunFamiliesImpl } from "./gunFamilies";

function typeId(name: string): TypeId {
  return `charge-${name.replace(/\s+/g, "-").toLowerCase()}` as TypeId;
}

function charge(name: string, multipliers: Partial<Pick<ChargeStats, "trackingMultiplier" | "rangeMultiplier" | "falloffMultiplier">> = {}): ChargeStats {
  return { id: typeId(name), name, trackingMultiplier: 1, rangeMultiplier: 1, falloffMultiplier: 1, ...multipliers };
}

const CALDARI_NAVY_ANTIMATTER_CHARGE_S = charge("Caldari Navy Antimatter Charge S", { trackingMultiplier: 0.75, rangeMultiplier: 0.4 });
const FEDERATION_NAVY_ANTIMATTER_CHARGE_S = charge("Federation Navy Antimatter Charge S", { trackingMultiplier: 0.75, rangeMultiplier: 0.4 });
const IMPERIAL_NAVY_MULTIFREQUENCY_S = charge("Imperial Navy Multifrequency S", { trackingMultiplier: 0.75, rangeMultiplier: 0.6 });
const REPUBLIC_FLEET_EMP_S = charge("Republic Fleet EMP S", { rangeMultiplier: 0.5 });
const SHADOW_IRON_CHARGE_S = charge("Shadow Iron Charge S", { trackingMultiplier: 0.85, rangeMultiplier: 0.5 });
const TITANIUM_SABOT_S = charge("Titanium Sabot S", { trackingMultiplier: 1.2, rangeMultiplier: 1 });
const CARBONIZED_LEAD_M = charge("Carbonized Lead M", { trackingMultiplier: 1.05, rangeMultiplier: 1.6 });
const CALDARI_NAVY_SCOURGE_M = charge("Caldari Navy Scourge M", { trackingMultiplier: 0.75, rangeMultiplier: 0.5 });
const REPUBLIC_FLEET_CARBONIZED_LEAD_XL = charge("Republic Fleet Carbonized Lead XL", { trackingMultiplier: 1.05, rangeMultiplier: 1.6 });
const NUCLEAR_L = charge("Nuclear L", { rangeMultiplier: 1.6 });
const HAIL_S = charge("Hail S", { trackingMultiplier: 1, rangeMultiplier: 0.5 });
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
};

function chargeByName(name: string): ChargeStats {
  if (name === HAIL_S.name) return HAIL_S;
  const found = Object.values(TEST_CHARGES).find((c) => c.name === name);
  if (!found) throw new Error(`Missing charge ${name}`);
  return found;
}

function turretIdForName(name: string): TypeId {
  for (const stats of Object.values(FITTING_DB.turrets)) {
    if (stats.name === name) return stats.id;
  }
  for (const stats of Object.values(FITTING_DB.modules)) {
    if (stats.name === name) return stats.id;
  }
  throw new Error(`Missing module/turret ${name}`);
}

const gunFamilies = new GunFamiliesImpl({ fittingDb: FITTING_DB });

function buildCatalog(charges = TEST_CHARGES): ChargeCatalogImpl {
  const fittingDb: FittingDb = { ...FITTING_DB, charges };
  return new ChargeCatalogImpl({ fittingDb, gunFamilies });
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
    moduleId: turretIdForName("150mm Railgun I"),
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
      "Republic Fleet EMP S",
      "Shadow Iron Charge S",
      "Imperial Navy Multifrequency S",
      "Titanium Sabot S",
    ]);
    expect(s[0]).toEqual({
      id: chargeByName("Caldari Navy Antimatter Charge S").id,
      name: "Caldari Navy Antimatter Charge S",
      trackingMultiplier: 0.75,
      rangeMultiplier: 0.4,
      falloffMultiplier: 1,
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

  test("chargesForTurret filters by turret family and charge size", () => {
    const catalog = buildCatalog();
    const autocannon = turret({ moduleId: turretIdForName("200mm AutoCannon I"), chargeSize: 1, chargeId: chargeByName("Hail S").id });
    const projectileS = catalog.chargesForTurret(autocannon);
    expect(projectileS.map((c) => c.name)).toEqual(["Republic Fleet EMP S", "Titanium Sabot S"]);

    const railgun = turret({ moduleId: turretIdForName("150mm Railgun I"), chargeSize: 1, chargeId: chargeByName("Titanium Sabot S").id });
    const hybridS = catalog.chargesForTurret(railgun);
    expect(hybridS.map((c) => c.name)).toEqual([
      "Caldari Navy Antimatter Charge S",
      "Federation Navy Antimatter Charge S",
      "Shadow Iron Charge S",
    ]);

    const pulse = turret({ moduleId: turretIdForName("Gatling Pulse Laser I"), chargeSize: 1, chargeId: chargeByName("Hail S").id });
    const laserS = catalog.chargesForTurret(pulse);
    expect(laserS.map((c) => c.name)).toEqual(["Imperial Navy Multifrequency S"]);
  });

  test("usualForTurret prefers a navy charge from the turret's own family", () => {
    const catalog = buildCatalog();
    const autocannon = turret({ moduleId: turretIdForName("200mm AutoCannon I"), chargeSize: 1, chargeId: chargeByName("Hail S").id });
    expect(catalog.usualForTurret(autocannon)).toBe(chargeByName("Republic Fleet EMP S").id);

    const railgun = turret({ moduleId: turretIdForName("150mm Railgun I"), chargeSize: 1, chargeId: chargeByName("Titanium Sabot S").id });
    expect(catalog.usualForTurret(railgun)).toBe(chargeByName("Caldari Navy Antimatter Charge S").id);

    const pulse = turret({ moduleId: turretIdForName("Gatling Pulse Laser I"), chargeSize: 1, chargeId: chargeByName("Hail S").id });
    expect(catalog.usualForTurret(pulse)).toBe(chargeByName("Imperial Navy Multifrequency S").id);
  });

  test("usualForTurret falls back to size-based usual for an unrecognized turret", () => {
    const catalog = buildCatalog();
    const unknown = turret({ moduleId: turretIdForName("5MN Microwarpdrive I"), chargeSize: 1, chargeId: chargeByName("Hail S").id });
    expect(catalog.usualForTurret(unknown)).toBe(chargeByName("Caldari Navy Antimatter Charge S").id);
  });

  test("withCharge keeps the turret unchanged when the charge belongs to another family", () => {
    const catalog = buildCatalog();
    const autocannon = turret({ moduleId: turretIdForName("200mm AutoCannon I"), chargeSize: 1, chargeId: chargeByName("Hail S").id });
    const unchanged = catalog.withCharge(autocannon, chargeByName("Caldari Navy Antimatter Charge S").id);
    expect(unchanged).toBe(autocannon);
  });

  test("chargesForTurret preserves all charges for turrets without a known family", () => {
    const catalog = buildCatalog();
    const unknown = turret({ moduleId: turretIdForName("5MN Microwarpdrive I"), chargeSize: 1, chargeId: chargeByName("Hail S").id });
    expect(catalog.chargesForTurret(unknown).map((c) => c.name)).toEqual([
      "Caldari Navy Antimatter Charge S",
      "Federation Navy Antimatter Charge S",
      "Republic Fleet EMP S",
      "Shadow Iron Charge S",
      "Imperial Navy Multifrequency S",
      "Titanium Sabot S",
    ]);
  });

  test("chargeFamilyOf covers all charges in the generated fitting database", () => {
    const knownUnknowns = new Set(["Exotic Plasma", "Mystic", "Occult"]);
    for (const stats of Object.values(FITTING_DB.charges)) {
      const family = _chargeFamilyOf(stats.name);
      if (family !== undefined) continue;
      const stem = stats.name;
      const size = stem.match(/ (S|M|L|XL)$/)?.[0];
      const base = size ? stem.slice(0, -size.length) : stem;
      const tokens = base.split(/\s+/);
      const lookup = tokens.length >= 2 ? tokens.slice(-2).join(" ") : tokens[0];
      expect(knownUnknowns).toContain(lookup);
    }
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

  test("turretChargeFamily maps turret families to charge families", () => {
    expect(_turretChargeFamily(turretIdForName("200mm AutoCannon I"), gunFamilies)).toBe("projectile");
    expect(_turretChargeFamily(turretIdForName("280mm Howitzer Artillery I"), gunFamilies)).toBe("projectile");
    expect(_turretChargeFamily(turretIdForName("150mm Railgun I"), gunFamilies)).toBe("hybrid");
    expect(_turretChargeFamily(turretIdForName("Light Neutron Blaster I"), gunFamilies)).toBe("hybrid");
    expect(_turretChargeFamily(turretIdForName("Gatling Pulse Laser I"), gunFamilies)).toBe("laser");
    expect(_turretChargeFamily(turretIdForName("Small Focused Beam Laser I"), gunFamilies)).toBe("laser");
  });
});
