import { FighterLoadoutValidatorImpl } from "./fighterLoadoutValidator";
import type { FighterStats, FittingDb } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import { toTypeId, type FactionId, type HullTypeId, type ShipId, type TypeId } from "../gamedata/ids";
import type { FighterGroup } from "./fighterCatalog";

const FIGHTERS_SKILL_ID = toTypeId("23069");

function fighter(id: string, kind: FighterStats["kind"], volume: number, squadronMaxSize: number): FighterStats {
  return {
    kind,
    squadronMaxSize,
    orbitRange: 6500,
    maxVelocity: 833,
    signatureRadius: 110,
    refuelingTime: 5,
    volume,
    ...(kind === "support" ? {} : { attack: { emDamage: 97.5, thermalDamage: 0, kineticDamage: 0, explosiveDamage: 0, damageMultiplier: 1, cycleTime: 5, explosionRadius: 185, explosionVelocity: 105, damageReductionFactor: 3, damageReductionSensitivity: 5.5, optimal: 8000, falloff: 5000, numShots: 12, rearmTime: 4 } }),
    metaLevel: 0,
    metaGroupID: 1,
    requiredSkillIds: [FIGHTERS_SKILL_ID],
    id: toTypeId(id),
    name: `Fighter ${id}`,
  };
}

const db = {
  fighters: {
    "23055": fighter("23055", "light", 1000, 6),
    "23277": fighter("23277", "heavy", 2000, 3),
    "23280": fighter("23280", "support", 3000, 3),
  },
} as Pick<FittingDb, "fighters">;

function carrier(overrides: Partial<ShipProfile> = {}): ShipProfile {
  return {
    id: "23757" as ShipId,
    name: "Archon",
    factionId: "amarr-empire" as FactionId,
    hullTypeId: "547" as HullTypeId,
    mass: 1_260_000_000,
    inertiaModifier: 0.041,
    baseSpeed: 80,
    sigRadius: 9920,
    scanResolution: 70,
    maxTargetingRange: 315000,
    maxLockedTargets: 14,
    sensorStrengths: { gravimetric: 11, ladar: 0, magnetometric: 0, radar: 0 },
    highSlots: 5,
    medSlots: 4,
    lowSlots: 7,
    rigSlots: 3,
    powerGrid: 775000,
    cpuOutput: 625,
    droneBandwidth: 0,
    droneCapacity: 0,
    maxActiveDrones: 0,
    fighterCapacity: overrides.fighterCapacity ?? 65000,
    fighterTubes: overrides.fighterTubes ?? 4,
    fighterLightSlots: overrides.fighterLightSlots ?? 3,
    fighterHeavySlots: overrides.fighterHeavySlots ?? 0,
    fighterSupportSlots: overrides.fighterSupportSlots ?? 2,
    shieldHp: 53000,
    shieldRechargeTime: 15000,
    armorHp: 72000,
    hullHp: 86000,
    capacitorCapacity: 45000,
    capacitorRechargeTime: 750000,
    shieldResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    armorResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    bonuses: [],
  };
}

const templar = toTypeId("23055");
const ametat = toTypeId("23277");
const cenobite = toTypeId("23280");

function group(typeId: TypeId, count: number, activeCount: number = count): FighterGroup {
  return { typeId, count, activeCount };
}

describe("FighterLoadoutValidatorImpl", () => {
  const validator = new FighterLoadoutValidatorImpl({ fittingDb: db });

  test("empty loadout is valid", () => {
    const result = validator.validate([], carrier());
    expect(result.valid).toBe(true);
    expect(result.activeSquadrons).toBe(0);
    expect(result.activeFighters).toBe(0);
    expect(result.totalFighters).toBe(0);
    expect(result.totalVolume).toBe(0);
    expect(result.hangarCapacity).toBe(65000);
  });

  test("one full light squadron is valid and counts one squadron of six fighters", () => {
    const result = validator.validate([group(templar, 6)], carrier());
    expect(result.valid).toBe(true);
    expect(result.activeSquadrons).toBe(1);
    expect(result.activeFighters).toBe(6);
    expect(result.totalFighters).toBe(6);
    expect(result.totalVolume).toBe(6000);
  });

  test("squadrons per group ceil-divide by squadron max size (8 fighters = 2 squadrons)", () => {
    const result = validator.validate([group(templar, 8)], carrier());
    expect(result.activeSquadrons).toBe(2);
    expect(result.totalFighters).toBe(8);
  });

  test("squadron limits apply to launched fighters only", () => {
    const result = validator.validate([group(templar, 24, 18)], carrier());
    expect(result.valid).toBe(true);
    expect(result.activeSquadrons).toBe(3);
    expect(result.activeFighters).toBe(18);
    expect(result.totalFighters).toBe(24);
    expect(result.violations).toEqual([]);
  });

  test("three light and one support squadron fill the four tubes without violations", () => {
    const result = validator.validate([group(templar, 18), group(cenobite, 3)], carrier());
    expect(result.valid).toBe(true);
    expect(result.activeSquadrons).toBe(4);
  });

  test("five squadrons exceed the four tubes", () => {
    const result = validator.validate([group(templar, 18), group(cenobite, 6)], carrier());
    expect(result.violations).toEqual(["tooManySquadrons"]);
    expect(result.valid).toBe(false);
  });

  test("four light squadrons exceed the three light slots", () => {
    const result = validator.validate([group(templar, 24)], carrier());
    expect(result.violations).toEqual(["lightSquadronsExceeded"]);
  });

  test("heavy fighters violate a hull without heavy slots", () => {
    const result = validator.validate([group(ametat, 3)], carrier());
    expect(result.violations).toEqual(["heavySquadronsExceeded"]);
  });

  test("heavy fighters fit a supercarrier with heavy slots (Hel)", () => {
    const hel = carrier({ fighterCapacity: 150000, fighterLightSlots: 3, fighterHeavySlots: 4, fighterSupportSlots: 0 });
    const result = validator.validate([group(ametat, 6)], hel);
    expect(result.valid).toBe(true);
  });

  test("hangar volume sums fighter volume times fighter count", () => {
    const result = validator.validate([group(templar, 6), group(cenobite, 6)], carrier());
    expect(result.totalVolume).toBe(6000 + 18000);
    expect(result.valid).toBe(true);
  });

  test("volume beyond the fighter hangar capacity is a violation", () => {
    const small = carrier({ fighterCapacity: 10000 });
    const result = validator.validate([group(templar, 12)], small);
    expect(result.violations).toEqual(["hangarCapacityExceeded"]);
  });

  test("hangar capacity counts idle fighters stored in the hangar", () => {
    const small = carrier({ fighterCapacity: 10000 });
    const result = validator.validate([group(templar, 12, 6)], small);
    expect(result.violations).toEqual(["hangarCapacityExceeded"]);
    expect(result.activeSquadrons).toBe(1);
  });

  test("fighters on a hull without tubes violate the squadron, slot and hangar limits", () => {
    const rifter = carrier({ fighterCapacity: 0, fighterTubes: 0, fighterLightSlots: 0, fighterHeavySlots: 0, fighterSupportSlots: 0 });
    const result = validator.validate([group(templar, 1)], rifter);
    expect(result.violations).toEqual(["tooManySquadrons", "lightSquadronsExceeded", "hangarCapacityExceeded"]);
  });

  test("unknown fighter ids are ignored without crashing", () => {
    const result = validator.validate([group(toTypeId("99999"), 6)], carrier());
    expect(result.valid).toBe(true);
    expect(result.activeSquadrons).toBe(0);
    expect(result.totalFighters).toBe(6);
  });
});
