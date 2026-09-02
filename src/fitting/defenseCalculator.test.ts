import { type FactionId, type HullTypeId, type ShipId } from "../gamedata/ids";
import { FITTING_DB, type HullBonus } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import type { StackingPenalty } from "../sim";
import { FittingStateFactory, type CargoEntry, type FittingModuleEntry } from "./fittingState";
import { DefenseCalculatorImpl } from "./defenseCalculator";

class TestStackingPenalty implements StackingPenalty {
  apply(multipliers: readonly number[]): number {
    const values = multipliers.filter((value) => value !== 1);
    const positive = values.filter((value) => value > 1).sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1));
    const negative = values.filter((value) => value < 1).sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1));
    let product = 1;
    for (const list of [positive, negative]) {
      for (let i = 0; i < list.length; i++) {
        product *= 1 + (list[i] - 1) * Math.exp(-(i * i) / 7.1289);
      }
    }
    return product;
  }
}

const profile: ShipProfile = {
  id: "24692" as ShipId,
  name: "Abaddon",
  factionId: "amarr-empire" as FactionId,
  hullTypeId: "419" as HullTypeId,
  mass: 15_500_000,
  inertiaModifier: 0.45,
  baseSpeed: 165,
  sigRadius: 270,
  droneBandwidth: 0,
  droneCapacity: 0,
  maxActiveDrones: 5,
  shieldHp: 7700,
  shieldRechargeTime: 1250,
  armorHp: 9350,
  hullHp: 7000,
  shieldResists: { em: 0, thermal: 0.2, kinetic: 0.4, explosive: 0.5 },
  armorResists: { em: 0.5, thermal: 0.35, kinetic: 0.25, explosive: 0.2 },
  hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
};

const hullBonuses: readonly HullBonus[] = FITTING_DB.hullBonuses[profile.id] ?? [];
const factory = new FittingStateFactory(FITTING_DB);
const calculator = new DefenseCalculatorImpl({ fittingDb: FITTING_DB, stackingPenalty: new TestStackingPenalty() });

const conditions = { skillLevel: 5 as const, overloaded: false, weaponOverloaded: false };

function moduleEntry(name: string): FittingModuleEntry {
  for (const stats of Object.values(FITTING_DB.modules)) {
    if (stats.name === name) return { moduleId: stats.id, offline: false };
  }
  throw new Error(`Module not found: ${name}`);
}

function resolve(modules: readonly FittingModuleEntry[]) {
  const state = factory.create(profile, hullBonuses, modules, [], [] as readonly CargoEntry[]);
  return calculator.resolve(state, conditions);
}

describe("DefenseCalculatorImpl", () => {
  test("base defense with no modules uses profile HP and resists", () => {
    const spec = resolve([]);
    expect(spec.layers.shield.hp).toBe(9625);
    expect(spec.layers.armor.hp).toBe(11688);
    expect(spec.layers.hull.hp).toBe(8750);
    expect(spec.layers.shield.resists.em).toBe(0);
    expect(spec.layers.armor.resists.em).toBeCloseTo(0.6, 5);
    expect(spec.shieldRechargeTime).toBe(1250);
    expect(spec.repairers).toEqual([]);
  });

  test("Damage Control II adds per-layer resists in its own stacking group", () => {
    const spec = resolve([moduleEntry("Damage Control II")]);
    expect(spec.layers.armor.resists.em).toBeGreaterThan(0.6);
  });

  test("EM Shield Hardener II adds 55% EM shield resist", () => {
    const spec = resolve([moduleEntry("EM Shield Hardener II")]);
    expect(spec.layers.shield.resists.em).toBeCloseTo(0.55, 5);
  });

  test("two hardeners are stacking-penalized", () => {
    const one = resolve([moduleEntry("EM Shield Hardener II")]);
    const two = resolve([moduleEntry("EM Shield Hardener II"), moduleEntry("EM Shield Amplifier II")]);
    expect(two.layers.shield.resists.em).toBeGreaterThan(one.layers.shield.resists.em);
    expect(two.layers.shield.resists.em).toBeLessThan(1);
  });

  test("1600mm Steel Plates II adds armor HP with hull bonus", () => {
    const spec = resolve([moduleEntry("1600mm Steel Plates II")]);
    expect(spec.layers.armor.hp).toBeGreaterThan(profile.armorHp + 10000);
  });

  test("Large Shield Extender II adds shield HP", () => {
    const spec = resolve([moduleEntry("Large Shield Extender II")]);
    expect(spec.layers.shield.hp).toBeGreaterThan(profile.shieldHp + 2000);
  });

  test("Multispectrum Energized Membrane II adds omni shield resist passively", () => {
    const spec = resolve([moduleEntry("Multispectrum Energized Membrane II")]);
    expect(spec.layers.armor.resists.em).toBeGreaterThan(profile.armorResists.em);
  });

  test("Large Armor Repairer II produces a repairer spec", () => {
    const spec = resolve([moduleEntry("Large Armor Repairer II")]);
    expect(spec.repairers).toHaveLength(1);
    expect(spec.repairers[0].layer).toBe("armor");
    expect(spec.repairers[0].amount).toBeGreaterThan(0);
    expect(spec.repairers[0].cycleTime).toBeGreaterThan(0);
  });

  test("overloaded repairer applies overload multipliers", () => {
    const state = factory.create(profile, hullBonuses, [moduleEntry("Large Armor Repairer II")], [], [] as readonly CargoEntry[]);
    const overloadedConditions = { skillLevel: 5 as const, overloaded: true, weaponOverloaded: false };
    const spec = calculator.resolve(state, overloadedConditions);
    expect(spec.repairers[0].overload.amountMultiplier).toBeGreaterThan(1);
  });

  test("Abaddon armor resist hull bonus is applied", () => {
    const spec = resolve([]);
    const baseEmResist = profile.armorResists.em;
    const expectedResonance = (1 - baseEmResist) * (1 + (-4 * 5) / 100);
    expect(spec.layers.armor.resists.em).toBeCloseTo(1 - expectedResonance, 5);
  });
});
