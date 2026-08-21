import type { SigResolutionClass } from "../sim";
import {
  ChargeCatalogImpl,
  _chargeSizeFromName,
  _isNavyCharge,
  type ChargeOption,
  type ImportedTurret,
} from "./chargeCatalog";
import type { ChargeStats } from "./fittingDb";

const CHARGES: Readonly<Record<string, ChargeStats>> = {
  "Caldari Navy Antimatter Charge S": { trackingMultiplier: 0.75, rangeMultiplier: 0.4 },
  "Federation Navy Antimatter Charge S": { trackingMultiplier: 0.75, rangeMultiplier: 0.4 },
  "Imperial Navy Multifrequency S": { trackingMultiplier: 0.75, rangeMultiplier: 0.6 },
  "Republic Fleet EMP S": { rangeMultiplier: 0.5 },
  "Shadow Iron Charge S": { trackingMultiplier: 0.85, rangeMultiplier: 0.5 },
  "Titanium Sabot S": { trackingMultiplier: 1.2, rangeMultiplier: 1 },
  "Carbonized Lead M": { trackingMultiplier: 1.05, rangeMultiplier: 1.6 },
  "Caldari Navy Scourge M": { trackingMultiplier: 0.75, rangeMultiplier: 0.5 },
  "Republic Fleet Carbonized Lead XL": { trackingMultiplier: 1.05, rangeMultiplier: 1.6 },
  "Nuclear L": { rangeMultiplier: 1.6 },
};

function buildCatalog(charges = CHARGES): ChargeCatalogImpl {
  return new ChargeCatalogImpl({ fittingDb: { charges } });
}

function turret(overrides: Partial<ImportedTurret> = {}): ImportedTurret {
  return {
    tracking: 0.315,
    sigResolutionClass: "S",
    optimal: 600,
    falloff: 3000,
    chargeSize: 1,
    charge: "Titanium Sabot S",
    base: { tracking: 0.315, optimal: 600, falloff: 3000 },
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
    expect(catalog.usualForChargeSize(1)).toBe("Caldari Navy Antimatter Charge S");
  });

  test("usualForChargeSize falls back to any charge when no navy exists for size", () => {
    const catalog = buildCatalog();
    expect(catalog.usualForChargeSize(4)).toBe("Republic Fleet Carbonized Lead XL");
  });

  test("usualForChargeSize does not confuse XL with L", () => {
    const catalog = buildCatalog();
    expect(catalog.usualForChargeSize(3)).toBe("Nuclear L");
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
      name: "Caldari Navy Antimatter Charge S",
      trackingMultiplier: 0.75,
      rangeMultiplier: 0.4,
      falloffMultiplier: 1,
    } as ChargeOption);
  });

  test("chargesForSize normalizes missing multipliers to 1", () => {
    const catalog = buildCatalog();
    const s = catalog.chargesForSize(1);
    const republic = s.find((c) => c.name === "Republic Fleet EMP S");
    expect(republic).toEqual({
      name: "Republic Fleet EMP S",
      trackingMultiplier: 1,
      rangeMultiplier: 0.5,
      falloffMultiplier: 1,
    } as ChargeOption);
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
    const next = catalog.withCharge(base, "Caldari Navy Antimatter Charge S");
    expect(next.charge).toBe("Caldari Navy Antimatter Charge S");
    expect(next.tracking).toBeCloseTo(0.4 * 0.75, 6);
    expect(next.optimal).toBeCloseTo(1000 * 0.4, 6);
    expect(next.falloff).toBeCloseTo(5000 * 1, 6);
    expect(next.base).toEqual(base.base);
    expect(next.sigResolutionClass).toBe("S");
    expect(next.chargeSize).toBe(1);
  });

  test("withCharge returns input unchanged for unknown charge", () => {
    const catalog = buildCatalog();
    const base = turret();
    expect(catalog.withCharge(base, "Unknown Charge S")).toBe(base);
  });
});
