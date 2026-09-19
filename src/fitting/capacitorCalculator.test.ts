import { toTypeId, type FactionId, type HullTypeId, type ShipId, type TypeId } from "../gamedata/ids";
import { FITTING_DB, type HullBonus } from "../gamedata/fittingDb";
import { type ShipProfile, type SkillLevel, type StatConditions, defaultCapacitorSkills } from "../ships";
import { EMPTY_BOOST_LOADOUT, EMPTY_EWAR_LOADOUT, EMPTY_MISSILE_BOOSTER_LOADOUT, EMPTY_SENSOR_BOOST_LOADOUT, StackingPenaltyImpl, type BoostLoadout, type CommandBurstSpec, type EwarLoadout, type EnergyNeutralizerSpec, type MissileBoosterLoadout, type SensorBoostLoadout, type StasisWebSpec, type TrackingBoosterSpec } from "../sim";
import { FittingStateFactory, type CargoEntry, type FittingModuleEntry } from "./fittingState";
import { DefenseCalculatorImpl } from "./defenseCalculator";
import { CapacitorCalculatorImpl, buildInjectorDrains, type CapacitorDrainSources } from "./capacitorCalculator";
import type { ImportedTurret } from "./chargeCatalog";
import { EMPTY_DAMAGE_BREAKDOWN } from "./damageBreakdown";

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
  maxTargetingRange: 30000,  maxLockedTargets: 4,
  highSlots: 3,
  medSlots: 4,
  lowSlots: 3,
  rigSlots: 3,
  powerGrid: 1000,
  cpuOutput: 400,
  droneBandwidth: 0,
  droneCapacity: 0,
  maxActiveDrones: 5,
  fighterCapacity: 0,
  fighterTubes: 0,
  fighterLightSlots: 0,
  fighterHeavySlots: 0,
  fighterSupportSlots: 0,
  shieldHp: 7700,
  shieldRechargeTime: 1250,
  armorHp: 9350,
  hullHp: 7000,
  capacitorCapacity: 6375,
  capacitorRechargeTime: 1250,
  shieldResists: { em: 0, thermal: 0.2, kinetic: 0.4, explosive: 0.5 },
  armorResists: { em: 0.5, thermal: 0.35, kinetic: 0.25, explosive: 0.2 },
  hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  bonuses: [],
};

const stacking = new StackingPenaltyImpl();
const factory = new FittingStateFactory(FITTING_DB);
const defenseCalculator = new DefenseCalculatorImpl({ fittingDb: FITTING_DB, stackingPenalty: stacking });
const calculator = new CapacitorCalculatorImpl({ fittingDb: FITTING_DB, stackingPenalty: stacking });
const emptyConditions: StatConditions = { skillLevel: 0 as SkillLevel, overloaded: false, weaponOverloaded: false };

function moduleEntry(name: string, chargeName?: string): FittingModuleEntry {
  const searchCatalogs = [FITTING_DB.modules, FITTING_DB.turrets, FITTING_DB.launchers, FITTING_DB.trackingComputers, FITTING_DB.omnidirectionalTrackingLinks] as const;
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

interface DrainLoadouts {
  readonly ewar?: EwarLoadout;
  readonly boosts?: BoostLoadout;
  readonly missileBoosts?: MissileBoosterLoadout;
  readonly sensorBoosts?: SensorBoostLoadout;
  readonly commandBursts?: readonly CommandBurstSpec[];
}

function resolve(entries: readonly FittingModuleEntry[], conditions: StatConditions = emptyConditions, turrets: readonly ImportedTurret[] = [], loadouts: DrainLoadouts = {}, propulsionModuleId: TypeId | undefined = undefined): ReturnType<CapacitorCalculatorImpl["resolve"]> {
  const state = factory.create(profile, [] as readonly HullBonus[], entries, [], [], [] as readonly CargoEntry[]);
  const defense = defenseCalculator.resolve(state, conditions);
  const turretDrains = turrets.map((turret) => ({ moduleId: turret.moduleId, capacitorNeed: turret.capacitorNeed, cycleTime: turret.cycleTime, count: turret.turretCount }));
  const sources: CapacitorDrainSources = { defense, turretDrains, ewar: loadouts.ewar ?? EMPTY_EWAR_LOADOUT, boosts: loadouts.boosts ?? EMPTY_BOOST_LOADOUT, missileBoosts: loadouts.missileBoosts ?? EMPTY_MISSILE_BOOSTER_LOADOUT, sensorBoosts: loadouts.sensorBoosts ?? EMPTY_SENSOR_BOOST_LOADOUT, commandBursts: loadouts.commandBursts ?? [], propulsionModuleId };
  return calculator.resolve(state, conditions, sources);
}

function resolvedTurret(entry: FittingModuleEntry, cycleTime: number, turretCount = 1): ImportedTurret {
  const turretStats = FITTING_DB.turrets[entry.moduleId];
  if (!turretStats) throw new Error(`Turret not found: ${entry.moduleId}`);
  return {
    tracking: 0, sigResolutionClass: "S", optimal: 0, falloff: 0, chargeSize: 1, base: { tracking: 0, optimal: 0, falloff: 0 },
    chargeId: entry.chargeId ?? ("" as TypeId), moduleId: entry.moduleId, damageMultiplier: 1,
    damagePerShot: { em: 0, thermal: 0, kinetic: 0, explosive: 0 }, cycleTime, turretCount, capacitorNeed: turretStats.capacitorNeed, damageBreakdown: EMPTY_DAMAGE_BREAKDOWN,
  };
}

function webSpec(name: string): StasisWebSpec {
  for (const stats of Object.values(FITTING_DB.stasisWebs)) {
    if (stats.name === name) return { moduleName: stats.name, moduleId: stats.id, maxRange: stats.maxRange, speedFactor: Math.round(-stats.speedFactorPercent * 10000) / 1000000, overloadRangeBonusPercent: stats.overloadRangeBonusPercent, capacitorNeed: stats.capacitorNeed, cycleTime: stats.cycleTime };
  }
  throw new Error(`Stasis web not found: ${name}`);
}

function trackingComputerSpec(name: string): TrackingBoosterSpec {
  for (const stats of Object.values(FITTING_DB.trackingComputers)) {
    if (stats.name === name) return { moduleName: stats.name, moduleId: stats.id, trackingBonusPercent: stats.trackingBonusPercent, optimalBonusPercent: stats.optimalBonusPercent, falloffBonusPercent: stats.falloffBonusPercent, defaultScript: undefined, capacitorNeed: stats.capacitorNeed, cycleTime: stats.cycleTime };
  }
  throw new Error(`Tracking computer not found: ${name}`);
}

function neutralizerSpec(name: string): EnergyNeutralizerSpec {
  for (const stats of Object.values(FITTING_DB.modules)) {
    if (stats.name === name && stats.neutralizer) return { moduleName: stats.name, moduleId: stats.id, amount: stats.neutralizer.amount, cycleTime: stats.neutralizer.cycleTime, capacitorNeed: stats.neutralizer.capacitorNeed, maxRange: stats.neutralizer.maxRange, falloff: stats.neutralizer.falloff };
  }
  throw new Error(`Neutralizer not found: ${name}`);
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
    const mwd = moduleEntry("50MN Microwarpdrive I");
    const result = resolve([mwd], emptyConditions, [], {}, mwd.moduleId);
    expect(result.spec.capacity).toBeCloseTo(6375, 3);
    expect(result.peakRecharge).toBeCloseTo((2.5 * 6375 * 0.75) / 1250, 6);
    const row = result.rows.find((candidate) => candidate.moduleName === "50MN Microwarpdrive I");
    expect(row).toBeDefined();
    expect(row?.amount).toBeCloseTo(180, 3);
    expect(row?.cycleTime).toBeCloseTo(10, 3);
    expect(row?.count).toBe(1);
  });

  test("propulsion usage follows the drain source instead of the fitting state", () => {
    const mwd = moduleEntry("50MN Microwarpdrive I");
    const disabled = resolve([mwd]);
    expect(disabled.rows.find((candidate) => candidate.moduleName === "50MN Microwarpdrive I")).toBeUndefined();
    expect(disabled.peakRecharge).toBeCloseTo(12.75, 6);
    expect(disabled.usagePerSecond).toBe(0);
    const variant = resolve([mwd], emptyConditions, [], {}, mwd.moduleId);
    expect(variant.rows.find((candidate) => candidate.moduleName === "50MN Microwarpdrive I")).toBeDefined();
    expect(variant.peakRecharge).toBeCloseTo((2.5 * 6375 * 0.75) / 1250, 6);
  });

  test("propulsion row derives from the source id without a fitted propulsion module", () => {
    const ab = moduleEntry("1MN Afterburner I");
    const result = resolve([], emptyConditions, [], {}, ab.moduleId);
    const row = result.rows.find((candidate) => candidate.moduleId === ab.moduleId);
    expect(row).toBeDefined();
    expect(row?.amount).toBeCloseTo(20, 3);
    expect(row?.cycleTime).toBeCloseTo(10, 3);
    expect(result.peakRecharge).toBeCloseTo(12.75, 6);
  });

  test("propulsion variant swap changes the row stats and the capacity multiplier", () => {
    const base = resolve([], emptyConditions, [], {}, moduleEntry("50MN Microwarpdrive I").moduleId);
    expect(base.rows.find((candidate) => candidate.moduleId === moduleEntry("50MN Microwarpdrive I").moduleId)?.amount).toBeCloseTo(180, 3);
    expect(base.peakRecharge).toBeCloseTo((2.5 * 6375 * 0.75) / 1250, 6);
    const upgraded = resolve([], emptyConditions, [], {}, moduleEntry("50MN Microwarpdrive II").moduleId);
    expect(upgraded.rows.find((candidate) => candidate.moduleId === moduleEntry("50MN Microwarpdrive II").moduleId)?.amount).toBeCloseTo(160, 3);
    expect(upgraded.peakRecharge).toBeCloseTo((2.5 * 6375 * 0.8) / 1250, 6);
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

  test("turret groups produce count-scaled rows from the resolved cycle time", () => {
    const entry = moduleEntry("Mega Pulse Laser II");
    const result = resolve([entry, entry, entry, entry], emptyConditions, [resolvedTurret(entry, 7.875, 4)]);
    const row = result.rows.find((candidate) => candidate.moduleName === "Mega Pulse Laser II");
    expect(row).toBeDefined();
    expect(row?.amount).toBeCloseTo(36, 3);
    expect(row?.cycleTime).toBeCloseTo(7.875, 3);
    expect(row?.count).toBe(4);
    expect(row?.perSecond).toBeCloseTo(36 / 7.875, 3);
  });

  test("turret row cycle reflects the skill-adjusted resolved cycle (Rapid Firing V)", () => {
    const entry = moduleEntry("Mega Pulse Laser II");
    const conditions: StatConditions = { ...emptyConditions, skillLevel: 5 as SkillLevel };
    const result = resolve([entry], conditions, [resolvedTurret(entry, 7.875 * 0.75)]);
    const row = result.rows.find((candidate) => candidate.moduleName === "Mega Pulse Laser II");
    expect(row?.cycleTime).toBeCloseTo(7.875 * 0.75, 6);
    expect(row?.amount).toBeCloseTo(36, 3);
    expect(row?.perSecond).toBeCloseTo(36 / (7.875 * 0.75), 6);
  });

  test("resolved turret cycle passes through without re-applying the overload multiplier", () => {
    const entry = moduleEntry("Mega Pulse Laser II");
    const conditions: StatConditions = { ...emptyConditions, weaponOverloaded: true };
    const result = resolve([entry], conditions, [resolvedTurret(entry, 7.875 * 0.85)]);
    const row = result.rows.find((candidate) => candidate.moduleName === "Mega Pulse Laser II");
    expect(row?.cycleTime).toBeCloseTo(7.875 * 0.85, 6);
    expect(row?.cycleTime).not.toBeCloseTo(7.875 * 0.85 * 0.85, 6);
  });

  test("weapon overload shortens turret cycle time via the resolved cycle", () => {
    const entry = moduleEntry("Mega Pulse Laser II");
    const conditions: StatConditions = { ...emptyConditions, weaponOverloaded: true };
    const result = resolve([entry], conditions, [resolvedTurret(entry, 7.875 * 0.85)]);
    const row = result.rows.find((candidate) => candidate.moduleName === "Mega Pulse Laser II");
    expect(row?.cycleTime).toBeCloseTo(7.875 * 0.85, 3);
  });

  test("projectile turrets and launchers consume no capacitor", () => {
    const entry = moduleEntry("200mm AutoCannon II");
    const result = resolve([entry, moduleEntry("Rocket Launcher I")], emptyConditions, [resolvedTurret(entry, 2, 1)]);
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

  test("reactive armor hardener produces a row from the resolved defense spec", () => {
    const result = resolve([moduleEntry("Reactive Armor Hardener")]);
    const row = result.rows.find((candidate) => candidate.moduleName === "Reactive Armor Hardener");
    expect(row).toBeDefined();
    expect(row?.amount).toBeCloseTo(42, 3);
    expect(row?.cycleTime).toBeCloseTo(10, 3);
  });

  test("ewar loadout drains produce usage rows", () => {
    const result = resolve([moduleEntry("Stasis Webifier II")], emptyConditions, [], { ewar: { ...EMPTY_EWAR_LOADOUT, webs: [webSpec("Stasis Webifier II")] } });
    const row = result.rows.find((candidate) => candidate.moduleName === "Stasis Webifier II");
    expect(row).toBeDefined();
    expect(row?.amount).toBeCloseTo(6, 3);
    expect(row?.cycleTime).toBeCloseTo(5, 3);
    expect(row?.count).toBe(1);
  });

  test("identical ewar modules group into one count-scaled row", () => {
    const web = webSpec("Stasis Webifier II");
    const result = resolve([moduleEntry("Stasis Webifier II"), moduleEntry("Stasis Webifier II")], emptyConditions, [], { ewar: { ...EMPTY_EWAR_LOADOUT, webs: [web, web] } });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.count).toBe(2);
    expect(result.usagePerSecond).toBeCloseTo((6 / 5) * 2, 6);
  });

  test("tracking computers produce rows", () => {
    const result = resolve([moduleEntry("Tracking Computer II")], emptyConditions, [], { boosts: { ...EMPTY_BOOST_LOADOUT, computers: [trackingComputerSpec("Tracking Computer II")] } });
    const row = result.rows.find((candidate) => candidate.moduleName === "Tracking Computer II");
    expect(row).toBeDefined();
    expect(row?.amount).toBeCloseTo(10, 3);
    expect(row?.cycleTime).toBeCloseTo(10, 3);
  });

  test("omnidirectional tracking links produce no usage row (runtime never debits them)", () => {
    const withOmni = resolve([moduleEntry("Omnidirectional Tracking Link II")]);
    const withoutOmni = resolve([]);
    expect(withOmni.rows).toHaveLength(0);
    expect(withOmni.usagePerSecond).toBeCloseTo(withoutOmni.usagePerSecond, 9);
    expect(withOmni.stablePercent ?? 0).toBeCloseTo(withoutOmni.stablePercent ?? 0, 9);
  });

  test("omnidirectional tracking link alongside a stasis web yields exactly the web row", () => {
    const result = resolve([moduleEntry("Omnidirectional Tracking Link II"), moduleEntry("Stasis Webifier II")], emptyConditions, [], { ewar: { ...EMPTY_EWAR_LOADOUT, webs: [webSpec("Stasis Webifier II")] } });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.moduleName).toBe("Stasis Webifier II");
  });

  test("energy neutralizers drain own capacitor, nosferatu do not", () => {
    const result = resolve([moduleEntry("Heavy Energy Neutralizer II"), moduleEntry("Medium Energy Nosferatu II")], emptyConditions, [], { ewar: { ...EMPTY_EWAR_LOADOUT, neutralizers: [neutralizerSpec("Heavy Energy Neutralizer II")] } });
    const neutRow = result.rows.find((candidate) => candidate.moduleName === "Heavy Energy Neutralizer II");
    expect(neutRow).toBeDefined();
    expect(neutRow?.amount).toBeCloseTo(500, 3);
    expect(neutRow?.cycleTime).toBeCloseTo(24, 3);
    expect(result.rows.find((candidate) => candidate.moduleName === "Medium Energy Nosferatu II")).toBeUndefined();
  });

  test("cap booster with charge produces an injector drain, not a usage row", () => {
    const entries = [moduleEntry("Medium Capacitor Booster II", "Cap Booster 200")];
    const state = factory.create(profile, [] as readonly HullBonus[], entries, [], [], [] as readonly CargoEntry[]);
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
    const state = factory.create(profile, [] as readonly HullBonus[], [moduleEntry("Medium Capacitor Booster II")], [], [], [] as readonly CargoEntry[]);
    expect(buildInjectorDrains(state, FITTING_DB)).toHaveLength(0);
  });

  test("cap boosters resolve with charge options for the popup and sim wiring", () => {
    const result = resolve([moduleEntry("Medium Capacitor Booster II", "Cap Booster 200")]);
    expect(result.boosters).toHaveLength(1);
    const booster = result.boosters[0];
    expect(booster?.moduleName).toBe("Medium Capacitor Booster II");
    expect(booster?.cycleTime).toBeCloseTo(12, 3);
    expect(booster?.reloadTime).toBeCloseTo(10, 3);
    expect(booster?.chargeId).toBeDefined();
    const option = booster?.chargeOptions.find((candidate) => candidate.id === booster?.chargeId);
    expect(option?.amount).toBeCloseTo(200, 3);
    expect(option?.clipSize).toBe(5); // floor(40 / 8)
  });

  test("cap booster charge options list fitting charges with per-charge clip sizes", () => {
    const result = resolve([moduleEntry("Medium Capacitor Booster II")]);
    const booster = result.boosters[0];
    expect(booster?.chargeId).toBeUndefined();
    const ids = booster?.chargeOptions.map((candidate) => candidate.id) ?? [];
    expect(ids.length).toBeGreaterThan(1);
    for (const option of booster?.chargeOptions ?? []) {
      expect(option.amount).toBeGreaterThan(0);
      expect(option.clipSize).toBeGreaterThan(0);
    }
  });

  test("battery does not appear as a booster", () => {
    const result = resolve([moduleEntry("Large Cap Battery II")]);
    expect(result.boosters).toHaveLength(0);
  });

  test("usage per second sums scaled rows", () => {
    const turretEntry = moduleEntry("Mega Pulse Laser II");
    const result = resolve([moduleEntry("Stasis Webifier II"), turretEntry], emptyConditions, [resolvedTurret(turretEntry, 7.875, 1)], { ewar: { ...EMPTY_EWAR_LOADOUT, webs: [webSpec("Stasis Webifier II")] } });
    expect(result.usagePerSecond).toBeCloseTo(6 / 5 + 36 / 7.875, 3);
  });

  test("weapons per second is the turret subset of the usage", () => {
    const turretEntry = moduleEntry("Mega Pulse Laser II");
    const result = resolve([moduleEntry("Stasis Webifier II"), turretEntry], emptyConditions, [resolvedTurret(turretEntry, 7.875, 1)], { ewar: { ...EMPTY_EWAR_LOADOUT, webs: [webSpec("Stasis Webifier II")] } });
    expect(result.weaponsPerSecond).toBeCloseTo(36 / 7.875, 6);
    const noTurret = resolve([moduleEntry("Stasis Webifier II")], emptyConditions, [], { ewar: { ...EMPTY_EWAR_LOADOUT, webs: [webSpec("Stasis Webifier II")] } });
    expect(noTurret.weaponsPerSecond).toBe(0);
  });

  test("propulsion row applies cap use and duration skill multipliers at all-fives", () => {
    const ab = moduleEntry("1MN Afterburner I");
    const conditions: StatConditions = { ...emptyConditions, skillLevel: 5 as SkillLevel };
    const result = resolve([ab], conditions, [], {}, ab.moduleId);
    const row = result.rows.find((candidate) => candidate.moduleId === ab.moduleId);
    // Afterburner -10% and Fuel Conservation -10% cap per level; Afterburner -5% duration per level.
    expect(row?.amount).toBeCloseTo(20 * 0.25, 3);
    expect(row?.cycleTime).toBeCloseTo(10 * 0.75, 3);
  });

  test("light drain is cap stable with a watermark percent", () => {
    const result = resolve([moduleEntry("Stasis Webifier II")], emptyConditions, [], { ewar: { ...EMPTY_EWAR_LOADOUT, webs: [webSpec("Stasis Webifier II")] } });
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

describe("CapacitorCalculatorImpl - subsystem flat bonuses", () => {
  function resolveWithBonuses(hullBonuses: readonly HullBonus[], entries: readonly FittingModuleEntry[] = []) {
    const state = factory.create(profile, hullBonuses, entries, [], [], [] as readonly CargoEntry[]);
    const defense = defenseCalculator.resolve(state, emptyConditions);
    const sources: CapacitorDrainSources = { defense, turretDrains: [], ewar: EMPTY_EWAR_LOADOUT, boosts: EMPTY_BOOST_LOADOUT, missileBoosts: EMPTY_MISSILE_BOOSTER_LOADOUT, sensorBoosts: EMPTY_SENSOR_BOOST_LOADOUT, commandBursts: [], propulsionModuleId: undefined };
    return calculator.resolve(state, emptyConditions, sources);
  }

  test("flat capacitor capacity adds to base before percent multipliers", () => {
    const base = resolveWithBonuses([]);
    expect(base.spec.capacity).toBe(profile.capacitorCapacity);
    const boosted = resolveWithBonuses([{ attribute: "capacitorCapacityFlat", magnitude: 200, scalesWithHullSkill: false, sourceId: toTypeId("24692") }]);
    expect(boosted.spec.capacity).toBe(profile.capacitorCapacity + 200);
  });
});
