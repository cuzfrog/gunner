import { toTypeId, type FactionId, type HullTypeId, type ShipId, type TypeId } from "../gamedata/ids";
import { FITTING_DB, type HullBonus } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import { FittingStateFactory, type CargoEntry, type FittingModuleEntry } from "./fittingState";

const profile: ShipProfile = {
  id: "24696" as ShipId,
  name: "Harbinger",
  factionId: "amarr-empire" as FactionId,
  hullTypeId: "419" as HullTypeId,
  mass: 15_500_000,
  inertiaModifier: 0.45,
  baseSpeed: 165,
  sigRadius: 270,
  scanResolution: 200,
  maxTargetingRange: 30000,  maxLockedTargets: 4,
  sensorStrengths: { gravimetric: 11, ladar: 0, magnetometric: 0, radar: 0 },
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
  shieldHp: 0,
  shieldRechargeTime: 0,
  armorHp: 0,
  hullHp: 0,
  capacitorCapacity: 0,
  capacitorRechargeTime: 0,
  shieldResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  armorResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  bonuses: [],
};

const hullBonuses: readonly HullBonus[] = FITTING_DB.hullBonuses[profile.id] ?? [];

function moduleId(name: string): TypeId {
  for (const stats of Object.values(FITTING_DB.turrets)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.launchers)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.modules)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.commandBursts)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.trackingComputers)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.targetPainters)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.missileGuidanceComputers)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.missileGuidanceEnhancers)) if (stats.name === name) return stats.id;
  throw new Error(`Module not found: ${name}`);
}

function chargeId(name: string): TypeId {
  for (const stats of Object.values(FITTING_DB.charges)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.missiles)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.scripts)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.missileScripts)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.drones)) if (stats.name === name) return stats.id;
  throw new Error(`Charge not found: ${name}`);
}

function entry(moduleName: string, chargeName?: string, offline = false): FittingModuleEntry {
  return { moduleId: moduleId(moduleName), chargeId: chargeName ? chargeId(chargeName) : undefined, offline };
}

function cargo(name: string, quantity: number): CargoEntry {
  return { id: chargeId(name), quantity };
}

function fighterTypeId(name: string): TypeId {
  for (const stats of Object.values(FITTING_DB.fighters)) if (stats.name === name) return stats.id;
  throw new Error(`Fighter not found: ${name}`);
}

function fighterEntry(name: string, quantity: number): CargoEntry {
  return { id: fighterTypeId(name), quantity };
}

describe("FittingStateFactory", () => {
  test("categorizes turret modules into turret groups with count and charge", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [
      entry("Heavy Pulse Laser II", "Conflagration M"),
      entry("Heavy Pulse Laser II", "Conflagration M"),
      entry("Heavy Pulse Laser II", "Conflagration M"),
    ], [], [], []);
    expect(state.turretGroups.length).toBe(1);
    expect(state.turretGroups[0].moduleId).toBe(moduleId("Heavy Pulse Laser II"));
    expect(state.turretGroups[0].count).toBe(3);
    expect(state.turretGroups[0].chargeId).toBe(chargeId("Conflagration M"));
  });

  test("categorizes launcher modules into launcher groups with count and charge", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [
      entry("Heavy Missile Launcher II", "Scourge Heavy Missile"),
      entry("Heavy Missile Launcher II"),
    ], [], [], []);
    expect(state.launcherGroups.length).toBe(1);
    expect(state.launcherGroups[0].count).toBe(2);
  });

  test("separates support modules from turrets and launchers", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [
      entry("Heavy Pulse Laser II", "Conflagration M"),
      entry("Heat Sink II"),
      entry("Heat Sink II"),
      entry("1600mm Steel Plates I"),
    ], [], [], []);
    expect(state.turretGroups.length).toBe(1);
    expect(state.supportModules.length).toBe(2);
    expect(state.defenseModules.length).toBe(1);
    expect(state.defenseModules[0].moduleId).toBe(moduleId("1600mm Steel Plates I"));
    expect(state.supportModules.every((m) => m.moduleId !== moduleId("Heavy Pulse Laser II"))).toBe(true);
  });

  test("identifies propulsion module", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [
      entry("100MN Y-S8 Compact Afterburner"),
      entry("Heat Sink II"),
    ], [], [], []);
    expect(state.propulsionModule).toBeDefined();
    expect(state.propulsionModule!.moduleId).toBe(moduleId("100MN Y-S8 Compact Afterburner"));
  });

  test("separates ewar modules from support modules", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [
      entry("Fleeting Compact Stasis Webifier"),
      entry("Heat Sink II"),
    ], [], [], []);
    expect(state.ewarModules.length).toBe(1);
    expect(state.ewarModules[0].moduleId).toBe(moduleId("Fleeting Compact Stasis Webifier"));
    expect(state.supportModules.length).toBe(1);
  });

  test("separates booster modules from support modules", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [
      entry("Tracking Computer I", "Tracking Speed Script"),
      entry("Heat Sink II"),
    ], [], [], []);
    expect(state.boosterModules.length).toBe(1);
    expect(state.boosterModules[0].moduleId).toBe(moduleId("Tracking Computer I"));
    expect(state.boosterModules[0].chargeId).toBe(chargeId("Tracking Speed Script"));
    expect(state.supportModules.length).toBe(1);
  });

  test("classifies target painter as ewar module", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [
      entry("Target Painter II"),
      entry("Heat Sink II"),
    ], [], [], []);
    expect(state.ewarModules.length).toBe(1);
    expect(state.ewarModules[0].moduleId).toBe(moduleId("Target Painter II"));
    expect(state.supportModules.length).toBe(1);
  });

  test("classifies energy neutralizer and nosferatu as ewar modules", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [
      entry("Heavy Energy Neutralizer II"),
      entry("Medium Energy Nosferatu II"),
      entry("Heat Sink II"),
    ], [], [], []);
    expect(state.ewarModules.length).toBe(2);
    expect(state.ewarModules[0].moduleId).toBe(moduleId("Heavy Energy Neutralizer II"));
    expect(state.ewarModules[1].moduleId).toBe(moduleId("Medium Energy Nosferatu II"));
    expect(state.supportModules.length).toBe(1);
  });

  test("classifies missile guidance computer as missile booster module", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [
      entry("Missile Guidance Computer II", "Missile Precision Script"),
      entry("Heat Sink II"),
    ], [], [], []);
    expect(state.missileBoosterModules.length).toBe(1);
    expect(state.missileBoosterModules[0].moduleId).toBe(moduleId("Missile Guidance Computer II"));
    expect(state.missileBoosterModules[0].chargeId).toBe(chargeId("Missile Precision Script"));
    expect(state.supportModules.length).toBe(1);
  });

  test("classifies missile guidance enhancer as missile booster module", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [
      entry("Missile Guidance Enhancer II"),
      entry("Heat Sink II"),
    ], [], [], []);
    expect(state.missileBoosterModules.length).toBe(1);
    expect(state.missileBoosterModules[0].moduleId).toBe(moduleId("Missile Guidance Enhancer II"));
    expect(state.supportModules.length).toBe(1);
  });

  test("passes through drones and cargo", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const drones = [cargo("Infiltrator I", 5)];
    const cargoItems = [cargo("Scorch M", 6), cargo("Conflagration M", 6)];
    const state = factory.create(profile, hullBonuses, [], drones, [], cargoItems);
    expect(state.drones).toEqual(drones);
    expect(state.cargo).toEqual(cargoItems);
  });

  test("groups fighter entries into fighter groups ordered by fighter count", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const fighters = [fighterEntry("Templar I", 6), fighterEntry("Templar I", 6), fighterEntry("Cenobite I", 3)];
    const state = factory.create(profile, hullBonuses, [], [], fighters, []);
    expect(state.fighterGroups).toEqual([
      { typeId: fighterTypeId("Templar I"), count: 12, activeCount: 12 },
      { typeId: fighterTypeId("Cenobite I"), count: 3, activeCount: 3 },
    ]);
  });

  test("groups drone entries into drone groups with every drone launched", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const drones = [cargo("Infiltrator I", 3), cargo("Infiltrator I", 2)];
    const state = factory.create(profile, hullBonuses, [], drones, [], []);
    expect(state.droneGroups).toEqual([{ typeId: chargeId("Infiltrator I"), count: 5, activeCount: 5 }]);
  });

  test("drops unknown fighter entries from fighter groups", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const fighters = [cargo("Navy Cap Booster 800", 5)];
    const state = factory.create(profile, hullBonuses, [], [], fighters, []);
    expect(state.fighterGroups).toEqual([]);
  });

  test("carries hull bonuses and profile", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [], [], [], []);
    expect(state.profile).toBe(profile);
    expect(state.hullBonuses).toEqual(hullBonuses);
  });

  test("merges subsystem bonuses into hull bonuses", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const subsystemBonuses = FITTING_DB.subsystemBonuses["45601"] ?? [];
    expect(subsystemBonuses.length).toBeGreaterThan(0);
    const state = factory.create(profile, hullBonuses, [{ moduleId: toTypeId("45601"), offline: false }], [], [], []);
    expect(state.hullBonuses).toEqual([...hullBonuses, ...subsystemBonuses]);
  });

  test("routes command bursts into their own bucket and keeps the loaded charge", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [entry("Armor Command Burst II", "Armor Energizing Charge")], [], [], []);
    expect(state.commandBurstModules.length).toBe(1);
    expect(state.commandBurstModules[0].chargeId).toBe(chargeId("Armor Energizing Charge"));
  });

  test("offline command bursts do not enter the bucket", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [entry("Armor Command Burst II", undefined, true)], [], [], []);
    expect(state.commandBurstModules.length).toBe(0);
  });

  test("skips offline subsystem bonuses", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [{ moduleId: toTypeId("45601"), offline: true }], [], [], []);
    expect(state.hullBonuses).toEqual(hullBonuses);
  });

  test("skips offline modules", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [
      entry("Heavy Pulse Laser II", "Conflagration M"),
      entry("Heavy Pulse Laser II", "Conflagration M", true),
    ], [], [], []);
    expect(state.turretGroups[0].count).toBe(1);
  });

  test("aggregates multiple turret groups by module id", () => {
    const factory = new FittingStateFactory(FITTING_DB);
    const state = factory.create(profile, hullBonuses, [
      entry("Heavy Pulse Laser II", "Conflagration M"),
      entry("Heavy Pulse Laser II", "Conflagration M"),
      entry("Focused Medium Pulse Laser II", "Scorch M"),
    ], [], [], []);
    expect(state.turretGroups.length).toBe(2);
    const hpl2 = state.turretGroups.find((g) => g.moduleId === moduleId("Heavy Pulse Laser II"));
    const fmpl2 = state.turretGroups.find((g) => g.moduleId === moduleId("Focused Medium Pulse Laser II"));
    expect(hpl2!.count).toBe(2);
    expect(fmpl2!.count).toBe(1);
  });
});
