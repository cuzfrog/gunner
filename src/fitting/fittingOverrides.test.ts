import { toTypeId, type FactionId, type HullTypeId, type ShipId, type TypeId } from "../gamedata/ids";
import { FITTING_DB, type HullBonus } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import { FittingStateFactory, type FittingModuleEntry, type CargoEntry, type FittingState } from "./fittingState";
import { FittingOverridesStoreImpl, applyFittingOverrides, type FittingOverrides } from "./fittingOverrides";

const profile: ShipProfile = {
  id: "24696" as ShipId,
  name: "Harbinger",
  factionId: "amarr-empire" as FactionId,
  hullTypeId: "419" as HullTypeId,
  mass: 15_500_000,
  inertiaModifier: 0.45,
  baseSpeed: 165,
  sigRadius: 270,
  droneBandwidth: 0,
  droneCapacity: 0,
  maxActiveDrones: 5,
  shieldHp: 0,
  shieldRechargeTime: 0,
  armorHp: 0,
  hullHp: 0,
  shieldResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  armorResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
};

const hullBonuses: readonly HullBonus[] = FITTING_DB.hullBonuses[profile.id] ?? [];
const factory = new FittingStateFactory(FITTING_DB);

function moduleId(name: string): TypeId {
  for (const stats of Object.values(FITTING_DB.turrets)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.launchers)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.modules)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.trackingComputers)) if (stats.name === name) return stats.id;
  throw new Error(`Module not found: ${name}`);
}

function chargeId(name: string): TypeId {
  for (const stats of Object.values(FITTING_DB.charges)) if (stats.name === name) return stats.id;
  for (const stats of Object.values(FITTING_DB.missiles)) if (stats.name === name) return stats.id;
  throw new Error(`Charge not found: ${name}`);
}

function entry(moduleName: string, chargeName?: string): FittingModuleEntry {
  return { moduleId: moduleId(moduleName), chargeId: chargeName ? chargeId(chargeName) : undefined, offline: false };
}

function baseState(): FittingState {
  return factory.create(profile, hullBonuses, [
    entry("Heavy Pulse Laser II", "Conflagration M"),
    entry("Heavy Pulse Laser II", "Conflagration M"),
    entry("Heat Sink II"),
    entry("100MN Y-S8 Compact Afterburner"),
  ], [], []);
}

describe("FittingOverridesStoreImpl", () => {
  test("starts empty", () => {
    const store = new FittingOverridesStoreImpl();
    const overrides = store.get();
    expect(overrides.turretModuleReplacements.size).toBe(0);
    expect(overrides.turretChargeReplacements.size).toBe(0);
    expect(overrides.launcherModuleReplacements.size).toBe(0);
    expect(overrides.launcherChargeReplacements.size).toBe(0);
    expect(overrides.propulsionModuleReplacement).toBeUndefined();
  });

  test("setTurretModule records replacement", () => {
    const store = new FittingOverridesStoreImpl();
    const original = moduleId("Heavy Pulse Laser II");
    const replacement = moduleId("Heavy Pulse Laser I");
    store.setTurretModule(original, replacement);
    expect(store.get().turretModuleReplacements.get(original)).toBe(replacement);
  });

  test("setTurretCharge records replacement", () => {
    const store = new FittingOverridesStoreImpl();
    const turretModule = moduleId("Heavy Pulse Laser II");
    const newCharge = chargeId("Scorch M");
    store.setTurretCharge(turretModule, newCharge);
    expect(store.get().turretChargeReplacements.get(turretModule)).toBe(newCharge);
  });

  test("setLauncherModule records replacement", () => {
    const store = new FittingOverridesStoreImpl();
    const original = moduleId("Heavy Missile Launcher II");
    const replacement = moduleId("Heavy Missile Launcher I");
    store.setLauncherModule(original, replacement);
    expect(store.get().launcherModuleReplacements.get(original)).toBe(replacement);
  });

  test("setLauncherCharge records replacement", () => {
    const store = new FittingOverridesStoreImpl();
    const launcherModule = moduleId("Heavy Missile Launcher II");
    const newCharge = chargeId("Scourge Heavy Missile");
    store.setLauncherCharge(launcherModule, newCharge);
    expect(store.get().launcherChargeReplacements.get(launcherModule)).toBe(newCharge);
  });

  test("setPropulsionModule records replacement", () => {
    const store = new FittingOverridesStoreImpl();
    const newPropulsion = moduleId("100MN Afterburner II");
    store.setPropulsionModule(newPropulsion);
    expect(store.get().propulsionModuleReplacement).toBe(newPropulsion);
  });

  test("clearTurret removes only turret overrides", () => {
    const store = new FittingOverridesStoreImpl();
    store.setTurretModule(moduleId("Heavy Pulse Laser II"), moduleId("Heavy Pulse Laser I"));
    store.setTurretCharge(moduleId("Heavy Pulse Laser II"), chargeId("Scorch M"));
    store.setLauncherModule(moduleId("Heavy Missile Launcher II"), moduleId("Heavy Missile Launcher I"));
    store.clearTurret();
    expect(store.get().turretModuleReplacements.size).toBe(0);
    expect(store.get().turretChargeReplacements.size).toBe(0);
    expect(store.get().launcherModuleReplacements.size).toBe(1);
  });

  test("clearLauncher removes only launcher overrides", () => {
    const store = new FittingOverridesStoreImpl();
    store.setTurretModule(moduleId("Heavy Pulse Laser II"), moduleId("Heavy Pulse Laser I"));
    store.setLauncherModule(moduleId("Heavy Missile Launcher II"), moduleId("Heavy Missile Launcher I"));
    store.setLauncherCharge(moduleId("Heavy Missile Launcher II"), chargeId("Scourge Heavy Missile"));
    store.clearLauncher();
    expect(store.get().launcherModuleReplacements.size).toBe(0);
    expect(store.get().launcherChargeReplacements.size).toBe(0);
    expect(store.get().turretModuleReplacements.size).toBe(1);
  });

  test("clearPropulsion removes only propulsion override", () => {
    const store = new FittingOverridesStoreImpl();
    store.setPropulsionModule(moduleId("100MN Afterburner II"));
    store.setTurretModule(moduleId("Heavy Pulse Laser II"), moduleId("Heavy Pulse Laser I"));
    store.clearPropulsion();
    expect(store.get().propulsionModuleReplacement).toBeUndefined();
    expect(store.get().turretModuleReplacements.size).toBe(1);
  });

  test("clear removes all overrides", () => {
    const store = new FittingOverridesStoreImpl();
    store.setTurretModule(moduleId("Heavy Pulse Laser II"), moduleId("Heavy Pulse Laser I"));
    store.setLauncherModule(moduleId("Heavy Missile Launcher II"), moduleId("Heavy Missile Launcher I"));
    store.setPropulsionModule(moduleId("100MN Afterburner II"));
    store.clear();
    const overrides = store.get();
    expect(overrides.turretModuleReplacements.size).toBe(0);
    expect(overrides.launcherModuleReplacements.size).toBe(0);
    expect(overrides.propulsionModuleReplacement).toBeUndefined();
  });
});

describe("applyFittingOverrides", () => {
  test("returns state unchanged when no overrides", () => {
    const state = baseState();
    const result = applyFittingOverrides(state, { turretModuleReplacements: new Map(), turretChargeReplacements: new Map(), launcherModuleReplacements: new Map(), launcherChargeReplacements: new Map(), propulsionModuleReplacement: undefined });
    expect(result).toEqual(state);
  });

  test("replaces turret module in turret groups", () => {
    const state = baseState();
    const original = moduleId("Heavy Pulse Laser II");
    const replacement = moduleId("Heavy Pulse Laser I");
    const overrides: FittingOverrides = { turretModuleReplacements: new Map([[original, replacement]]), turretChargeReplacements: new Map(), launcherModuleReplacements: new Map(), launcherChargeReplacements: new Map(), propulsionModuleReplacement: undefined };
    const result = applyFittingOverrides(state, overrides);
    expect(result.turretGroups.every((g) => g.moduleId !== original)).toBe(true);
    expect(result.turretGroups.some((g) => g.moduleId === replacement)).toBe(true);
    expect(result.turretGroups.find((g) => g.moduleId === replacement)!.count).toBe(2);
  });

  test("replaces turret charge in turret groups", () => {
    const state = baseState();
    const turretModule = moduleId("Heavy Pulse Laser II");
    const newCharge = chargeId("Scorch M");
    const overrides: FittingOverrides = { turretModuleReplacements: new Map(), turretChargeReplacements: new Map([[turretModule, newCharge]]), launcherModuleReplacements: new Map(), launcherChargeReplacements: new Map(), propulsionModuleReplacement: undefined };
    const result = applyFittingOverrides(state, overrides);
    expect(result.turretGroups[0].chargeId).toBe(newCharge);
  });

  test("replaces propulsion module", () => {
    const state = baseState();
    const newPropulsion = moduleId("100MN Afterburner II");
    const overrides: FittingOverrides = { turretModuleReplacements: new Map(), turretChargeReplacements: new Map(), launcherModuleReplacements: new Map(), launcherChargeReplacements: new Map(), propulsionModuleReplacement: newPropulsion };
    const result = applyFittingOverrides(state, overrides);
    expect(result.propulsionModule).toBeDefined();
    expect(result.propulsionModule!.moduleId).toBe(newPropulsion);
  });

  test("replaces launcher module in launcher groups", () => {
    const state = factory.create(profile, hullBonuses, [
      entry("Heavy Missile Launcher II", "Scourge Heavy Missile"),
      entry("Heavy Missile Launcher II", "Scourge Heavy Missile"),
    ], [], []);
    const original = moduleId("Heavy Missile Launcher II");
    const replacement = moduleId("Heavy Missile Launcher I");
    const overrides: FittingOverrides = { turretModuleReplacements: new Map(), turretChargeReplacements: new Map(), launcherModuleReplacements: new Map([[original, replacement]]), launcherChargeReplacements: new Map(), propulsionModuleReplacement: undefined };
    const result = applyFittingOverrides(state, overrides);
    expect(result.launcherGroups.every((g) => g.moduleId !== original)).toBe(true);
    expect(result.launcherGroups.some((g) => g.moduleId === replacement)).toBe(true);
    expect(result.launcherGroups.find((g) => g.moduleId === replacement)!.count).toBe(2);
  });

  test("replaces launcher charge in launcher groups", () => {
    const state = factory.create(profile, hullBonuses, [
      entry("Heavy Missile Launcher II", "Scourge Heavy Missile"),
    ], [], []);
    const launcherModule = moduleId("Heavy Missile Launcher II");
    const newCharge = chargeId("Nova Heavy Missile");
    const overrides: FittingOverrides = { turretModuleReplacements: new Map(), turretChargeReplacements: new Map(), launcherModuleReplacements: new Map(), launcherChargeReplacements: new Map([[launcherModule, newCharge]]), propulsionModuleReplacement: undefined };
    const result = applyFittingOverrides(state, overrides);
    expect(result.launcherGroups[0].chargeId).toBe(newCharge);
  });

  test("merges launcher groups with same module after replacement", () => {
    const state = factory.create(profile, hullBonuses, [
      entry("Heavy Missile Launcher II", "Scourge Heavy Missile"),
      entry("Heavy Missile Launcher I", "Nova Heavy Missile"),
    ], [], []);
    const overrides: FittingOverrides = { turretModuleReplacements: new Map(), turretChargeReplacements: new Map(), launcherModuleReplacements: new Map([[moduleId("Heavy Missile Launcher II"), moduleId("Heavy Missile Launcher I")]]), launcherChargeReplacements: new Map(), propulsionModuleReplacement: undefined };
    const result = applyFittingOverrides(state, overrides);
    expect(result.launcherGroups.length).toBe(1);
    expect(result.launcherGroups[0].moduleId).toBe(moduleId("Heavy Missile Launcher I"));
    expect(result.launcherGroups[0].count).toBe(2);
  });

  test("does not mutate original state", () => {
    const state = baseState();
    const originalGroups = state.turretGroups.map((g) => ({ ...g }));
    const overrides: FittingOverrides = { turretModuleReplacements: new Map([[moduleId("Heavy Pulse Laser II"), moduleId("Heavy Pulse Laser I")]]), turretChargeReplacements: new Map(), launcherModuleReplacements: new Map(), launcherChargeReplacements: new Map(), propulsionModuleReplacement: undefined };
    applyFittingOverrides(state, overrides);
    expect(state.turretGroups).toEqual(originalGroups);
  });

  test("merges turret groups with same module after replacement", () => {
    const state = factory.create(profile, hullBonuses, [
      entry("Heavy Pulse Laser II", "Conflagration M"),
      entry("Heavy Pulse Laser I", "Scorch M"),
    ], [], []);
    const overrides: FittingOverrides = { turretModuleReplacements: new Map([[moduleId("Heavy Pulse Laser II"), moduleId("Heavy Pulse Laser I")]]), turretChargeReplacements: new Map(), launcherModuleReplacements: new Map(), launcherChargeReplacements: new Map(), propulsionModuleReplacement: undefined };
    const result = applyFittingOverrides(state, overrides);
    expect(result.turretGroups.length).toBe(1);
    expect(result.turretGroups[0].moduleId).toBe(moduleId("Heavy Pulse Laser I"));
    expect(result.turretGroups[0].count).toBe(2);
  });
});
