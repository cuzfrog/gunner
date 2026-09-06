import { type FactionId, type HullTypeId, type ShipId, type TypeId } from "../gamedata/ids";
import { FITTING_DB, type HullBonus, type DefenseModuleStats } from "../gamedata/fittingDb";
import { type DefenseSkills, type ShipProfile, type SkillLevel, defaultDefenseSkills } from "../ships";
import { StackingPenaltyImpl } from "../sim";
import { FittingStateFactory, type CargoEntry, type FittingModuleEntry } from "./fittingState";
import { DefenseCalculatorImpl } from "./defenseCalculator";

const profile: ShipProfile = {
  id: "24692" as ShipId,
  name: "Abaddon",
  factionId: "amarr-empire" as FactionId,
  hullTypeId: "419" as HullTypeId,
  mass: 15_500_000,
  inertiaModifier: 0.45,
  baseSpeed: 165,
  sigRadius: 270,
  scanResolution: 200,
  maxTargetingRange: 30000,
  maxLockedTargets: 4,
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
const calculator = new DefenseCalculatorImpl({ fittingDb: FITTING_DB, stackingPenalty: new StackingPenaltyImpl() });

const conditions = { skillLevel: 5 as const, overloaded: false, weaponOverloaded: false };

const rokhProfile: ShipProfile = {
  id: "24688" as ShipId,
  name: "Rokh",
  factionId: "caldari-state" as FactionId,
  hullTypeId: "27" as HullTypeId,
  mass: 105_300_000,
  inertiaModifier: 0.136,
  baseSpeed: 89,
  sigRadius: 500,
  scanResolution: 200,
  maxTargetingRange: 30000,
  maxLockedTargets: 4,
  droneBandwidth: 75,
  droneCapacity: 125,
  maxActiveDrones: 5,
  shieldHp: 9350,
  shieldRechargeTime: 2500,
  armorHp: 7700,
  hullHp: 8250,
  shieldResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  armorResists: { em: 0.5, thermal: 0.45, kinetic: 0.25, explosive: 0.1 },
  hullResists: { em: 0.33, thermal: 0.33, kinetic: 0.33, explosive: 0.33 },
};
const rokhHullBonuses: readonly HullBonus[] = FITTING_DB.hullBonuses["24688" as ShipId] ?? [];

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

function resolveRokh(modules: readonly FittingModuleEntry[], overrides: { overloaded?: boolean } = {}) {
  const state = factory.create(rokhProfile, rokhHullBonuses, modules, [], [] as readonly CargoEntry[]);
  return calculator.resolve(state, { skillLevel: 5 as const, overloaded: overrides.overloaded ?? false, weaponOverloaded: false });
}

describe("DefenseCalculatorImpl", () => {
  test("base defense with no modules uses profile HP and resists", () => {
    const spec = resolve([]);
    expect(spec.layers.shield.hp).toBe(9625);
    expect(spec.layers.armor.hp).toBe(11688);
    expect(spec.layers.hull.hp).toBe(8750);
    expect(spec.layers.shield.resists.em).toBe(0);
    expect(spec.layers.armor.resists.em).toBeCloseTo(0.6, 5);
    expect(spec.shieldRechargeTime).toBeCloseTo(937.5, 1);
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

  test("Large Shield Extender II contributes signature penalty", () => {
    const spec = resolve([moduleEntry("Large Shield Extender II")]);
    expect(spec.signaturePenalty).toBeGreaterThan(0);
  });

  test("no shield extenders yields zero signature penalty", () => {
    const spec = resolve([]);
    expect(spec.signaturePenalty).toBe(0);
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

  test("Rokh shield resist hull bonus applies -4% per Caldari Battleship level", () => {
    const spec = resolveRokh([]);
    const expectedResonance = 1 * (1 + (-4 * 5) / 100);
    expect(spec.layers.shield.resists.em).toBeCloseTo(1 - expectedResonance, 5);
    expect(spec.layers.shield.resists.thermal).toBeCloseTo(1 - expectedResonance, 5);
    expect(spec.layers.shield.resists.kinetic).toBeCloseTo(1 - expectedResonance, 5);
    expect(spec.layers.shield.resists.explosive).toBeCloseTo(1 - expectedResonance, 5);
  });

  test("Shield Boost Amplifier II multiplies shield booster repair amount", () => {
    const boosterOnly = resolve([moduleEntry("Medium Shield Booster II")]);
    const withAmplifier = resolve([moduleEntry("Medium Shield Booster II"), moduleEntry("Shield Boost Amplifier II")]);
    expect(boosterOnly.repairers).toHaveLength(1);
    expect(withAmplifier.repairers).toHaveLength(1);
    expect(withAmplifier.repairers[0].amount).toBeGreaterThan(boosterOnly.repairers[0].amount);
  });

  test("Damage Control II + EM and Thermal hardeners apply DC in its own stacking group", () => {
    const emPlusThermal = resolve([moduleEntry("EM Shield Hardener II"), moduleEntry("Thermal Shield Hardener II")]);
    const dcPlusEm = resolve([moduleEntry("Damage Control II"), moduleEntry("EM Shield Hardener II")]);
    const dcPlusThermal = resolve([moduleEntry("Damage Control II"), moduleEntry("Thermal Shield Hardener II")]);
    const allThree = resolve([moduleEntry("Damage Control II"), moduleEntry("EM Shield Hardener II"), moduleEntry("Thermal Shield Hardener II")]);

    // DC resist is applied in its own group, not stacking-penalized with the hardeners
    expect(allThree.layers.shield.resists.em).toBeGreaterThan(emPlusThermal.layers.shield.resists.em);

    // Adding the Thermal hardener (0 EM bonus) does not reduce EM resist from DC + EM hardener,
    // because the stacking penalty filters out the 1.0 multiplier
    expect(allThree.layers.shield.resists.em).toBeCloseTo(dcPlusEm.layers.shield.resists.em, 5);

    // The resulting EM resist is greater than DC + Thermal hardener alone
    expect(allThree.layers.shield.resists.em).toBeGreaterThan(dcPlusThermal.layers.shield.resists.em);
  });

  test("overloaded EM Shield Hardener II applies overloadBonusMultiplier for higher resist", () => {
    const normal = resolveRokh([moduleEntry("EM Shield Hardener II")], { overloaded: false });
    const overloaded = resolveRokh([moduleEntry("EM Shield Hardener II")], { overloaded: true });
    expect(overloaded.layers.shield.resists.em).toBeGreaterThan(normal.layers.shield.resists.em);
  });

  test("two Shield Boost Amplifier IIs are stacking-penalized", () => {
    const booster = moduleEntry("Medium Shield Booster II");
    const amplifier = moduleEntry("Shield Boost Amplifier II");
    const one = resolve([booster, amplifier]);
    const two = resolve([booster, amplifier, amplifier]);
    expect(two.repairers).toHaveLength(1);
    expect(two.repairers[0].amount).toBeGreaterThan(one.repairers[0].amount);
    const naiveProduct = one.repairers[0].amount * 1.36;
    expect(two.repairers[0].amount).toBeLessThan(naiveProduct);
  });

  test("compensation skills boost passive resist modules but not active hardeners or rigs", () => {
    const amplifier = moduleEntry("EM Shield Amplifier II");
    const hardener = moduleEntry("EM Shield Hardener II");
    const rig = moduleEntry("Small EM Shield Reinforcer II");
    const skillsLevel0: DefenseSkills = { ...defaultDefenseSkills(5), shieldCompensationEm: 0 };
    const skillsLevel5: DefenseSkills = { ...defaultDefenseSkills(5), shieldCompensationEm: 5 };
    const state0 = factory.create(profile, hullBonuses, [amplifier], [], [] as readonly CargoEntry[]);
    const state5 = factory.create(profile, hullBonuses, [amplifier], [], [] as readonly CargoEntry[]);
    const amplifier0 = calculator.resolve(state0, { skillLevel: 5, overloaded: false, weaponOverloaded: false, defenseSkills: skillsLevel0 });
    const amplifier5 = calculator.resolve(state5, { skillLevel: 5, overloaded: false, weaponOverloaded: false, defenseSkills: skillsLevel5 });
    expect(amplifier5.layers.shield.resists.em).toBeGreaterThan(amplifier0.layers.shield.resists.em);
    const hardenerState0 = factory.create(profile, hullBonuses, [hardener], [], [] as readonly CargoEntry[]);
    const hardenerState5 = factory.create(profile, hullBonuses, [hardener], [], [] as readonly CargoEntry[]);
    const hardener0 = calculator.resolve(hardenerState0, { skillLevel: 5, overloaded: false, weaponOverloaded: false, defenseSkills: skillsLevel0 });
    const hardener5 = calculator.resolve(hardenerState5, { skillLevel: 5, overloaded: false, weaponOverloaded: false, defenseSkills: skillsLevel5 });
    expect(hardener5.layers.shield.resists.em).toBeCloseTo(hardener0.layers.shield.resists.em, 5);
    const rigState0 = factory.create(profile, hullBonuses, [rig], [], [] as readonly CargoEntry[]);
    const rigState5 = factory.create(profile, hullBonuses, [rig], [], [] as readonly CargoEntry[]);
    const rig0 = calculator.resolve(rigState0, { skillLevel: 5, overloaded: false, weaponOverloaded: false, defenseSkills: skillsLevel0 });
    const rig5 = calculator.resolve(rigState5, { skillLevel: 5, overloaded: false, weaponOverloaded: false, defenseSkills: skillsLevel5 });
    expect(rig5.layers.shield.resists.em).toBeCloseTo(rig0.layers.shield.resists.em, 5);
  });

  test("RAH is excluded from armor resists and emitted as RahSpec", () => {
    const eanmPlusRah = resolve([moduleEntry("Multispectrum Energized Membrane II"), moduleEntry("Reactive Armor Hardener")]);
    const eanmOnly = resolve([moduleEntry("Multispectrum Energized Membrane II")]);
    expect(eanmPlusRah.layers.armor.resists.em).toBeCloseTo(eanmOnly.layers.armor.resists.em, 5);
    expect(eanmPlusRah.rah).toBeDefined();
    expect(eanmPlusRah.rah?.baseResists.em).toBeCloseTo(0.15, 5);
    expect(eanmPlusRah.rah?.shiftAmount).toBeCloseTo(0.06, 5);
    expect(eanmPlusRah.rah?.cycleTime).toBeGreaterThan(0);
    expect(eanmPlusRah.rah?.armorResistsWithoutRah.em).toBeCloseTo(eanmOnly.layers.armor.resists.em, 5);
  });

  test("RAH cycle time is reduced by Armor Resistance Phasing skill", () => {
    const skillsLevel0: DefenseSkills = { ...defaultDefenseSkills(5), armorResistancePhasing: 0 };
    const skillsLevel5: DefenseSkills = { ...defaultDefenseSkills(5), armorResistancePhasing: 5 };
    const state0 = factory.create(profile, hullBonuses, [moduleEntry("Reactive Armor Hardener")], [], [] as readonly CargoEntry[]);
    const state5 = factory.create(profile, hullBonuses, [moduleEntry("Reactive Armor Hardener")], [], [] as readonly CargoEntry[]);
    const spec0 = calculator.resolve(state0, { skillLevel: 5, overloaded: false, weaponOverloaded: false, defenseSkills: skillsLevel0 });
    const spec5 = calculator.resolve(state5, { skillLevel: 5, overloaded: false, weaponOverloaded: false, defenseSkills: skillsLevel5 });
    expect(spec5.rah?.cycleTime).toBeLessThan(spec0.rah?.cycleTime ?? Infinity);
    expect(spec5.rah?.cycleTime).toBeCloseTo((spec0.rah?.cycleTime ?? 10) * 0.5, 5);
  });

  test("no RAH fitted yields undefined rah in DefenseSpec", () => {
    const spec = resolve([]);
    expect(spec.rah).toBeUndefined();
  });

  test("shieldHpPercent hull bonus uses general skill level, not shieldManagement", () => {
    const shieldHpBonus: readonly HullBonus[] = [{ attribute: "shieldHpPercent", magnitude: 5, scalesWithHullSkill: true }];
    const state = factory.create(rokhProfile, shieldHpBonus, [], [], [] as readonly CargoEntry[]);
    const withManagement0 = calculator.resolve(state, { skillLevel: 4, overloaded: false, weaponOverloaded: false, defenseSkills: { ...defaultDefenseSkills(4), shieldManagement: 0 } });
    const withManagement5 = calculator.resolve(state, { skillLevel: 4, overloaded: false, weaponOverloaded: false, defenseSkills: { ...defaultDefenseSkills(4), shieldManagement: 5 } });
    const hullBonusMultiplier = 1 + (5 * 4) / 100;
    expect(withManagement0.layers.shield.hp).toBeCloseTo(rokhProfile.shieldHp * hullBonusMultiplier, 0);
    const managementRatio = withManagement5.layers.shield.hp / withManagement0.layers.shield.hp;
    expect(managementRatio).toBeCloseTo(1 + 0.05 * 5, 5);
  });

  test("shieldUniformity is 0.25 at TSM 0", () => {
    const skills: DefenseSkills = { ...defaultDefenseSkills(5), tacticalShieldManipulation: 0 };
    const state = factory.create(profile, hullBonuses, [], [], [] as readonly CargoEntry[]);
    const spec = calculator.resolve(state, { skillLevel: 5, overloaded: false, weaponOverloaded: false, defenseSkills: skills });
    expect(spec.shieldUniformity).toBeCloseTo(0.25, 5);
  });

  test("shieldUniformity is 0 at TSM 5", () => {
    const skills: DefenseSkills = { ...defaultDefenseSkills(5), tacticalShieldManipulation: 5 };
    const state = factory.create(profile, hullBonuses, [], [], [] as readonly CargoEntry[]);
    const spec = calculator.resolve(state, { skillLevel: 5, overloaded: false, weaponOverloaded: false, defenseSkills: skills });
    expect(spec.shieldUniformity).toBe(0);
  });

  test("shieldUniformity decreases by 0.05 per TSM level", () => {
    const state = factory.create(profile, hullBonuses, [], [], [] as readonly CargoEntry[]);
    for (let level = 0; level <= 5; level++) {
      const skills: DefenseSkills = { ...defaultDefenseSkills(5), tacticalShieldManipulation: level as SkillLevel };
      const spec = calculator.resolve(state, { skillLevel: 5, overloaded: false, weaponOverloaded: false, defenseSkills: skills });
      expect(spec.shieldUniformity).toBeCloseTo(Math.max(0, 0.25 - 0.05 * level), 5);
    }
  });

  test("Reinforced Bulkheads II increases hull HP above base", () => {
    const base = resolve([]);
    const withBulkhead = resolve([moduleEntry("Reinforced Bulkheads II")]);
    expect(withBulkhead.layers.hull.hp).toBeGreaterThan(base.layers.hull.hp);
  });

  test("two Reinforced Bulkheads II multiply without stacking penalty", () => {
    const two = resolve([moduleEntry("Reinforced Bulkheads II"), moduleEntry("Reinforced Bulkheads II")]);
    const mechanicsMultiplier = 1 + 0.05 * 5;
    const expected = profile.hullHp * mechanicsMultiplier * 1.25 * 1.25;
    expect(two.layers.hull.hp).toBe(Math.round(expected));
  });

  test("single Reinforced Bulkheads II applies full bonus without stacking penalty", () => {
    const base = resolve([]);
    const withBulkhead = resolve([moduleEntry("Reinforced Bulkheads II")]);
    const mechanicsMultiplier = 1 + 0.05 * 5;
    const expected = profile.hullHp * mechanicsMultiplier * 1.25;
    expect(withBulkhead.layers.hull.hp).toBe(Math.round(expected));
    expect(withBulkhead.layers.hull.hp).toBeGreaterThan(base.layers.hull.hp);
  });

  test("Nanofiber Internal Structure II reduces hull HP", () => {
    const base = resolve([]);
    const withNanofiber = resolve([moduleEntry("Nanofiber Internal Structure II")]);
    expect(withNanofiber.layers.hull.hp).toBeLessThan(base.layers.hull.hp);
  });

  test("Medium Transverse Bulkhead II rig increases hull HP", () => {
    const base = resolve([]);
    const withRig = resolve([moduleEntry("Medium Transverse Bulkhead II")]);
    expect(withRig.layers.hull.hp).toBeGreaterThan(base.layers.hull.hp);
  });

  test("Damage Control II hull resists stack with bulkhead HP bonus", () => {
    const withBoth = resolve([moduleEntry("Reinforced Bulkheads II"), moduleEntry("Damage Control II")]);
    const withDcOnly = resolve([moduleEntry("Damage Control II")]);
    expect(withBoth.layers.hull.hp).toBeGreaterThan(withDcOnly.layers.hull.hp);
    expect(withBoth.layers.hull.resists.em).toBeCloseTo(withDcOnly.layers.hull.resists.em, 5);
  });
});

function mockModuleDb(extraDefense: Record<string, DefenseModuleStats>): typeof FITTING_DB {
  const modules: Record<string, { id: TypeId; name: string; defense: DefenseModuleStats }> = {};
  for (const [id, defense] of Object.entries(extraDefense)) {
    modules[id] = { id: id as TypeId, name: id, defense };
  }
  return { ...FITTING_DB, modules: { ...FITTING_DB.modules, ...modules } };
}

function resolveWithCustomDefense(defenseModules: readonly { id: string; defense: DefenseModuleStats }[]): ReturnType<DefenseCalculatorImpl["resolve"]> {
  const defenseMap: Record<string, DefenseModuleStats> = {};
  for (const { id, defense } of defenseModules) defenseMap[id] = defense;
  const db = mockModuleDb(defenseMap);
  const factory = new FittingStateFactory(db);
  const calc = new DefenseCalculatorImpl({ fittingDb: db, stackingPenalty: new StackingPenaltyImpl() });
  const entries: FittingModuleEntry[] = defenseModules.map(({ id }) => ({ moduleId: id as TypeId, offline: false }));
  const state = factory.create(profile, hullBonuses, entries, [], [] as readonly CargoEntry[]);
  return calc.resolve(state, conditions);
}

function resolveMixedDefense(namedModules: readonly string[], defenseModules: readonly { id: string; defense: DefenseModuleStats }[]): ReturnType<DefenseCalculatorImpl["resolve"]> {
  const defenseMap: Record<string, DefenseModuleStats> = {};
  for (const { id, defense } of defenseModules) defenseMap[id] = defense;
  const db = mockModuleDb(defenseMap);
  const factory = new FittingStateFactory(db);
  const calc = new DefenseCalculatorImpl({ fittingDb: db, stackingPenalty: new StackingPenaltyImpl() });
  const entries: FittingModuleEntry[] = [
    ...namedModules.map((name) => moduleEntry(name)),
    ...defenseModules.map(({ id }) => ({ moduleId: id as TypeId, offline: false })),
  ];
  const state = factory.create(profile, hullBonuses, entries, [], [] as readonly CargoEntry[]);
  return calc.resolve(state, conditions);
}

describe("DefenseCalculatorImpl - hpPercent modules", () => {
  test("shield hpPercent rig multiplies (base + extender) HP", () => {
    const base = resolve([]);
    const withExtender = resolve([moduleEntry("Large Shield Extender II")]);
    const extenderAdd = withExtender.layers.shield.hp - base.layers.shield.hp;
    const withRig = resolveWithCustomDefense([{ id: "test-hpPercent-shield", defense: { kind: "hpPercent", layer: "shield", hpPercent: 15 } }]);
    const expectedRigOnly = base.layers.shield.hp * 1.15;
    expect(withRig.layers.shield.hp).toBeCloseTo(expectedRigOnly, 0);
    const withRigAndExtender = resolveMixedDefense(["Large Shield Extender II"], [{ id: "test-hpPercent-shield", defense: { kind: "hpPercent", layer: "shield", hpPercent: 15 } }]);
    const expectedWithExtender = (base.layers.shield.hp + extenderAdd) * 1.15;
    expect(withRigAndExtender.layers.shield.hp).toBeCloseTo(expectedWithExtender, 0);
  });

  test("armor hpPercent rig multiplies (base + plate) HP", () => {
    const base = resolve([]);
    const withPlate = resolve([moduleEntry("1600mm Steel Plates II")]);
    const plateAdd = withPlate.layers.armor.hp - base.layers.armor.hp;
    const withRig = resolveWithCustomDefense([{ id: "test-hpPercent-armor", defense: { kind: "hpPercent", layer: "armor", hpPercent: 15 } }]);
    const expectedRigOnly = base.layers.armor.hp * 1.15;
    expect(withRig.layers.armor.hp).toBeCloseTo(expectedRigOnly, 0);
    const withRigAndPlate = resolveMixedDefense(["1600mm Steel Plates II"], [{ id: "test-hpPercent-armor", defense: { kind: "hpPercent", layer: "armor", hpPercent: 15 } }]);
    const expectedWithPlate = (base.layers.armor.hp + plateAdd) * 1.15;
    expect(withRigAndPlate.layers.armor.hp).toBeCloseTo(expectedWithPlate, 0);
  });

  test("two shield hpPercent rigs are stacking-penalized", () => {
    const base = resolve([]);
    const stacking = new StackingPenaltyImpl();
    const expectedMultiplier = stacking.apply([1.15, 1.15]);
    const withTwoRigs = resolveWithCustomDefense([
      { id: "test-hpPercent-shield-1", defense: { kind: "hpPercent", layer: "shield", hpPercent: 15 } },
      { id: "test-hpPercent-shield-2", defense: { kind: "hpPercent", layer: "shield", hpPercent: 15 } },
    ]);
    const expectedHp = base.layers.shield.hp * expectedMultiplier;
    expect(withTwoRigs.layers.shield.hp).toBeCloseTo(expectedHp, 0);
  });
});

describe("DefenseCalculatorImpl - rechargeAmplifier modules", () => {
  test("rechargeAmplifier rig reduces shield recharge time", () => {
    const base = resolve([]);
    const withRig = resolveWithCustomDefense([{ id: "test-rechargeAmp", defense: { kind: "rechargeAmplifier", rechargeMultiplier: 0.85 } }]);
    expect(withRig.shieldRechargeTime).toBeLessThan(base.shieldRechargeTime);
  });

  test("rechargeAmplifier stacks with rechargeModule", () => {
    const withBoth = resolveWithCustomDefense([
      { id: "test-rechargeModule", defense: { kind: "rechargeModule", rechargeMultiplier: 0.85 } },
      { id: "test-rechargeAmp", defense: { kind: "rechargeAmplifier", rechargeMultiplier: 0.85 } },
    ]);
    const withRechargerOnly = resolveWithCustomDefense([{ id: "test-rechargeModule", defense: { kind: "rechargeModule", rechargeMultiplier: 0.85 } }]);
    expect(withBoth.shieldRechargeTime).toBeLessThan(withRechargerOnly.shieldRechargeTime);
  });
});

describe("DefenseCalculatorImpl - repairAmplifier modules", () => {
  test("repairAmplifier amount increases armor repairer but not shield booster", () => {
    const withAmp = resolveMixedDefense(["Large Armor Repairer II"], [{ id: "test-repAmp-amount", defense: { kind: "repairAmplifier", layer: "armor", repairAmountMultiplier: 1.15 } }]);
    const withoutAmp = resolve([moduleEntry("Large Armor Repairer II")]);
    const armorWithAmp = withAmp.repairers.find((r) => r.layer === "armor");
    const armorWithoutAmp = withoutAmp.repairers.find((r) => r.layer === "armor");
    expect(armorWithAmp!.amount).toBeGreaterThan(armorWithoutAmp!.amount);
    const withShieldAmp = resolveMixedDefense(["Large Shield Booster II"], [{ id: "test-repAmp-amount", defense: { kind: "repairAmplifier", layer: "armor", repairAmountMultiplier: 1.15 } }]);
    const withoutShieldAmp = resolve([moduleEntry("Large Shield Booster II")]);
    const shieldWithAmp = withShieldAmp.repairers.find((r) => r.layer === "shield");
    const shieldWithoutAmp = withoutShieldAmp.repairers.find((r) => r.layer === "shield");
    expect(shieldWithAmp!.amount).toBeCloseTo(shieldWithoutAmp!.amount, 5);
  });

  test("repairAmplifier cycleTime decreases armor repairer but not shield booster", () => {
    const withAmp = resolveMixedDefense(["Large Armor Repairer II"], [{ id: "test-repAmp-cycle", defense: { kind: "repairAmplifier", layer: "armor", repairCycleTimeMultiplier: 0.85 } }]);
    const withoutAmp = resolve([moduleEntry("Large Armor Repairer II")]);
    const armorWithAmp = withAmp.repairers.find((r) => r.layer === "armor");
    const armorWithoutAmp = withoutAmp.repairers.find((r) => r.layer === "armor");
    expect(armorWithAmp!.cycleTime).toBeLessThan(armorWithoutAmp!.cycleTime);
    const withShieldAmp = resolveMixedDefense(["Large Shield Booster II"], [{ id: "test-repAmp-cycle", defense: { kind: "repairAmplifier", layer: "armor", repairCycleTimeMultiplier: 0.85 } }]);
    const withoutShieldAmp = resolve([moduleEntry("Large Shield Booster II")]);
    const shieldWithAmp = withShieldAmp.repairers.find((r) => r.layer === "shield");
    const shieldWithoutAmp = withoutShieldAmp.repairers.find((r) => r.layer === "shield");
    expect(shieldWithAmp!.cycleTime).toBeCloseTo(shieldWithoutAmp!.cycleTime, 5);
  });
});
