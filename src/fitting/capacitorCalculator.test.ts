import { type FactionId, type HullTypeId, type ShipId, type TypeId } from "../gamedata/ids";
import { FITTING_DB, type HullBonus } from "../gamedata/fittingDb";
import { type ShipProfile, type SkillLevel, type StatConditions, defaultCapacitorSkills } from "../ships";
import { StackingPenaltyImpl, type DefenseSpec } from "../sim";
import { FittingStateFactory, type CargoEntry, type FittingModuleEntry } from "./fittingState";
import { DefenseCalculatorImpl } from "./defenseCalculator";
import { CapacitorCalculatorImpl, buildInjectorDrains } from "./capacitorCalculator";

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
  capacitorCapacity: 6375,
  capacitorRechargeTime: 1250,
  shieldResists: { em: 0, thermal: 0.2, kinetic: 0.4, explosive: 0.5 },
  armorResists: { em: 0.5, thermal: 0.35, kinetic: 0.25, explosive: 0.2 },
  hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
};

const stacking = new StackingPenaltyImpl();
const factory = new FittingStateFactory(FITTING_DB);
const defenseCalculator = new DefenseCalculatorImpl({ fittingDb: FITTING_DB, stackingPenalty: stacking });
const calculator = new CapacitorCalculatorImpl({ fittingDb: FITTING_DB, stackingPenalty: stacking });
const emptyConditions: StatConditions = { skillLevel: 0 as SkillLevel, overloaded: false, weaponOverloaded: false };

function moduleEntry(name: string, chargeName?: string): FittingModuleEntry {
  const searchCatalogs = [FITTING_DB.modules, FITTING_DB.turrets, FITTING_DB.launchers, FITTING_DB.trackingComputers] as const;
  for (const catalog of searchCatalogs) {
    for (const stats of Object.values(catalog)) {
      if (stats.name === name) {
        const chargeId = chargeName ? findChargeId(chargeName) : undefined;
        return { moduleId: stats.id, offline: false, ...(chargeId ? { chargeId } : {}) };
      }
    }
  }
  throw new Error(`Module not found: ${name}`);
}

function findChargeId(name: string): TypeId {
  for (const stats of Object.values(FITTING_DB.charges)) {
    if (stats.name === name) return stats.id;
  }
  throw new Error(`Charge not found: ${name}`);
}

function resolve(entries: readonly FittingModuleEntry[], conditions: StatConditions = emptyConditions): ReturnType<CapacitorCalculatorImpl["resolve"]> {
  const state = factory.create(profile, [] as readonly HullBonus[], entries, [], [] as readonly CargoEntry[]);
  const defense = defenseCalculator.resolve(state, conditions);
  return calculator.resolve(state, conditions, defense);
}

describe("capacitorCalculator", () => {
  test("empty fit: base spec, peak regen, stable at 100%", () => {
    const result = resolve([]);
    expect(result.spec).toEqual({ capacity: 6375, rechargeTime: 1250 });
    expect(result.peakRecharge).toBeCloseTo(12.75, 6);
    expect(result.rows).toHaveLength(0);
    expect(result.usagePerSecond).toBe(0);
    expect(result.stablePercent).toBeCloseTo(100, 3);
    expect(result.depletesInSeconds).toBeUndefined();
  });

  test("cap battery adds flat GJ before multipliers", () => {
    const result = resolve([moduleEntry("Large Cap Battery II")]);
    expect(result.spec.capacity).toBeCloseTo(8000, 3); // 6375 + 1625
  });

  test("energy management skill multiplies capacity including battery adds", () => {
    const conditions: StatConditions = { ...emptyConditions, capacitorSkills: { energyManagement: 5 as SkillLevel, energySystemsOperations: 0 as SkillLevel } };
    const result = resolve([moduleEntry("Large Cap Battery II")], conditions);
    expect(result.spec.capacity).toBeCloseTo(10000, 3); // (6375 + 1625) * 1.25
  });

  test("MWD capacity penalty applies to peak recharge but not the exported spec", () => {
    const result = resolve([moduleEntry("50MN Microwarpdrive I")]);
    expect(result.spec.capacity).toBeCloseTo(6375, 3);
    expect(result.peakRecharge).toBeCloseTo((2.5 * 6375 * 0.75) / 1250, 6);
    const row = result.rows.find((candidate) => candidate.moduleName === "50MN Microwarpdrive I");
    expect(row).toBeDefined();
    expect(row?.amount).toBeCloseTo(180, 3);
    expect(row?.cycleTime).toBeCloseTo(10, 3);
    expect(row?.count).toBe(1);
  });

  test("two PDS stack both capacity and recharge multipliers", () => {
    const result = resolve([moduleEntry("Power Diagnostic System II"), moduleEntry("Power Diagnostic System II")]);
    expect(result.spec.capacity).toBeCloseTo(6375 * stacking.apply([1.05, 1.05]), 3);
    expect(result.spec.rechargeTime).toBeCloseTo(1250 * stacking.apply([0.915, 0.915]), 3);
  });

  test("cap recharger shortens recharge time and skill compounds it", () => {
    const result = resolve([moduleEntry("Cap Recharger II")]);
    expect(result.spec.rechargeTime).toBeCloseTo(1000, 3); // 1250 * 0.8
    const conditions: StatConditions = { ...emptyConditions, capacitorSkills: { energyManagement: 0 as SkillLevel, energySystemsOperations: 5 as SkillLevel } };
    const skilled = resolve([moduleEntry("Cap Recharger II")], conditions);
    expect(skilled.spec.rechargeTime).toBeCloseTo(750, 3); // 1250 * 0.8 * 0.75
  });

  test("capacitor power relay shortens recharge time", () => {
    const result = resolve([moduleEntry("Capacitor Power Relay II")]);
    expect(result.spec.rechargeTime).toBeCloseTo(1250 * 0.76, 3);
  });

  test("flux coil trades capacity for recharge", () => {
    const result = resolve([moduleEntry("Capacitor Flux Coil II")]);
    expect(result.spec.capacity).toBeCloseTo(6375 * 0.8, 3);
    expect(result.spec.rechargeTime).toBeCloseTo(1250 * 0.61, 3);
  });

  test("turret groups produce count-scaled rows from the turret catalog", () => {
    const result = resolve([moduleEntry("Mega Pulse Laser II"), moduleEntry("Mega Pulse Laser II"), moduleEntry("Mega Pulse Laser II"), moduleEntry("Mega Pulse Laser II")]);
    const row = result.rows.find((candidate) => candidate.moduleName === "Mega Pulse Laser II");
    expect(row).toBeDefined();
    expect(row?.amount).toBeCloseTo(36, 3);
    expect(row?.cycleTime).toBeCloseTo(7.875, 3);
    expect(row?.count).toBe(4);
    expect(row?.perSecond).toBeCloseTo(36 / 7.875, 3);
  });

  test("weapon overload shortens turret cycle time", () => {
    const conditions: StatConditions = { ...emptyConditions, weaponOverloaded: true };
    const result = resolve([moduleEntry("Mega Pulse Laser II")], conditions);
    const row = result.rows.find((candidate) => candidate.moduleName === "Mega Pulse Laser II");
    expect(row?.cycleTime).toBeCloseTo(7.875 * 0.85, 3);
  });

  test("projectile turrets and launchers consume no capacitor", () => {
    const result = resolve([moduleEntry("200mm AutoCannon II"), moduleEntry("Rocket Launcher I")]);
    expect(result.rows).toHaveLength(0);
  });

  test("repairers produce rows from the resolved defense spec", () => {
    const result = resolve([moduleEntry("Large Armor Repairer II")]);
    const row = result.rows.find((candidate) => candidate.moduleName === "Large Armor Repairer II");
    expect(row).toBeDefined();
    expect(row?.amount).toBeCloseTo(400, 3);
    expect(row?.cycleTime).toBeCloseTo(15, 3);
  });

  test("overloaded repairer shortens its cycle time", () => {
    const conditions: StatConditions = { ...emptyConditions, overloaded: true };
    const result = resolve([moduleEntry("Large Armor Repairer II")], conditions);
    const row = result.rows.find((candidate) => candidate.moduleName === "Large Armor Repairer II");
    expect(row?.cycleTime).toBeCloseTo(15 * 0.85, 3);
  });

  test("reactive armor hardener produces a row", () => {
    const result = resolve([moduleEntry("Reactive Armor Hardener")]);
    const row = result.rows.find((candidate) => candidate.moduleName === "Reactive Armor Hardener");
    expect(row).toBeDefined();
    expect(row?.amount).toBeCloseTo(42, 3);
    expect(row?.cycleTime).toBeCloseTo(10, 3);
  });

  test("ewar modules produce rows from their family catalogs", () => {
    const result = resolve([moduleEntry("Stasis Webifier II")]);
    const row = result.rows.find((candidate) => candidate.moduleName === "Stasis Webifier II");
    expect(row).toBeDefined();
    expect(row?.amount).toBeCloseTo(6, 3);
    expect(row?.cycleTime).toBeCloseTo(5, 3);
  });

  test("tracking computers produce rows", () => {
    const result = resolve([moduleEntry("Tracking Computer II")]);
    const row = result.rows.find((candidate) => candidate.moduleName === "Tracking Computer II");
    expect(row).toBeDefined();
    expect(row?.amount).toBeCloseTo(10, 3);
    expect(row?.cycleTime).toBeCloseTo(10, 3);
  });

  test("energy neutralizers drain own capacitor, nosferatu do not", () => {
    const result = resolve([moduleEntry("Heavy Energy Neutralizer II"), moduleEntry("Medium Energy Nosferatu II")]);
    const neutRow = result.rows.find((candidate) => candidate.moduleName === "Heavy Energy Neutralizer II");
    expect(neutRow).toBeDefined();
    expect(neutRow?.amount).toBeCloseTo(500, 3);
    expect(neutRow?.cycleTime).toBeCloseTo(24, 3);
    expect(result.rows.find((candidate) => candidate.moduleName === "Medium Energy Nosferatu II")).toBeUndefined();
  });

  test("cap booster with charge produces an injector drain, not a usage row", () => {
    const entries = [moduleEntry("Medium Capacitor Booster II", "Cap Booster 200")];
    const state = factory.create(profile, [] as readonly HullBonus[], entries, [], [] as readonly CargoEntry[]);
    const injectorDrains = buildInjectorDrains(state, FITTING_DB);
    expect(injectorDrains).toHaveLength(1);
    expect(injectorDrains[0]?.amount).toBeCloseTo(200, 3);
    expect(injectorDrains[0]?.interval).toBeCloseTo(12, 3);
    expect(injectorDrains[0]?.clipSize).toBe(5); // floor(40 / 8)
    expect(injectorDrains[0]?.reloadTime).toBeCloseTo(10, 3);
    expect(injectorDrains[0]?.injector).toBe(true);

    const result = resolve(entries);
    expect(result.rows.find((candidate) => candidate.moduleName === "Medium Capacitor Booster II")).toBeUndefined();
  });

  test("cap booster without charge injects nothing", () => {
    const state = factory.create(profile, [] as readonly HullBonus[], [moduleEntry("Medium Capacitor Booster II")], [], [] as readonly CargoEntry[]);
    expect(buildInjectorDrains(state, FITTING_DB)).toHaveLength(0);
  });

  test("usage per second sums scaled rows", () => {
    const result = resolve([moduleEntry("Stasis Webifier II"), moduleEntry("Mega Pulse Laser II")]);
    expect(result.usagePerSecond).toBeCloseTo(6 / 5 + 36 / 7.875, 3);
  });

  test("light drain is cap stable with a watermark percent", () => {
    const result = resolve([moduleEntry("Stasis Webifier II")]);
    expect(result.stablePercent).toBeDefined();
    expect(result.stablePercent).toBeGreaterThan(85);
  });

  test("heavy drain depletes in finite time", () => {
    const result = resolve([moduleEntry("50MN Microwarpdrive I"), moduleEntry("Large Armor Repairer II")]);
    expect(result.stablePercent).toBeUndefined();
    expect(result.depletesInSeconds).toBeDefined();
    expect(result.depletesInSeconds).toBeLessThan(600);
  });
});
