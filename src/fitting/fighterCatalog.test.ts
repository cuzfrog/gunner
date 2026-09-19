import { FighterCatalogImpl } from "./fighterCatalog";
import type { FighterStats, FittingDb } from "../gamedata/fittingDb";
import { toTypeId } from "../gamedata/ids";

function fighter(id: string, name: string, kind: FighterStats["kind"], emDamage: number, volume: number, squadronMaxSize: number): FighterStats {
  return {
    kind,
    squadronMaxSize,
    orbitRange: 6500,
    maxVelocity: 833,
    signatureRadius: 110,
    refuelingTime: 5,
    volume,
    ...(kind === "support" ? {} : { attack: { emDamage, thermalDamage: 0, kineticDamage: 0, explosiveDamage: 0, damageMultiplier: 1, cycleTime: 5, explosionRadius: 185, explosionVelocity: 105, damageReductionFactor: 3, damageReductionSensitivity: 5.5, optimal: 8000, falloff: 5000, numShots: 12, rearmTime: 4 } }),
    metaLevel: 0,
    metaGroupID: 1,
    requiredSkillIds: [toTypeId("23069")],
    id: toTypeId(id),
    name,
  };
}

const db = {
  fighters: {
    "23055": fighter("23055", "Templar I", "light", 97.5, 1000, 6),
    "23061": fighter("23061", "Templar II", "light", 107.25, 1000, 6),
    "23277": fighter("23277", "Ametat I", "heavy", 295, 2000, 3),
    "23280": fighter("23280", "Cenobite I", "support", 0, 3000, 3),
  },
} as Pick<FittingDb, "fighters">;

describe("FighterCatalogImpl", () => {
  test("fightersByKind returns options of the requested kind sorted by name", () => {
    const catalog = new FighterCatalogImpl({ fittingDb: db });
    const light = catalog.fightersByKind("light");
    expect(light.map((option) => option.name)).toEqual(["Templar I", "Templar II"]);
    expect(light[0].damage).toBeCloseTo(97.5, 9);
    expect(light[0].damageByType).toEqual({ em: 97.5 });
    expect(light[0].squadronMaxSize).toBe(6);
  });

  test("support fighters list with zero damage", () => {
    const catalog = new FighterCatalogImpl({ fittingDb: db });
    const support = catalog.fightersByKind("support");
    expect(support.map((option) => option.name)).toEqual(["Cenobite I"]);
    expect(support[0].damage).toBe(0);
    expect(support[0].damageByType).toEqual({});
  });

  test("has distinguishes fighters from unknown ids", () => {
    const catalog = new FighterCatalogImpl({ fittingDb: db });
    expect(catalog.has(toTypeId("23055"))).toBe(true);
    expect(catalog.has(toTypeId("587"))).toBe(false);
  });

  test("idForName resolves by generated name", () => {
    const catalog = new FighterCatalogImpl({ fittingDb: db });
    expect(catalog.idForName("Ametat I")).toBe(toTypeId("23277"));
    expect(catalog.idForName("Not a fighter")).toBeUndefined();
  });
});
