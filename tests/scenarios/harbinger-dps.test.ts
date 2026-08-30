import { describe, expect, test } from "bun:test";
import { ChargeCatalogImpl } from "../../src/fitting/chargeCatalog";
import { FittingImportImpl } from "../../src/fitting/fittingImport";
import { GunFamiliesImpl } from "../../src/fitting/gunFamilies";
import { MissileCatalogImpl } from "../../src/fitting/missileCatalog";
import { MissileSkillModelImpl } from "../../src/fitting/missileStats";
import { StaticItemNameCatalog, StaticItemNameResolver } from "../../src/gamedata/itemNames";
import { MODULE_SLOT_CATALOG } from "../../src/gamedata/moduleSlots";
import { FITTING_DB } from "../../src/gamedata/fittingDb";
import { StaticShipProfileCatalog } from "../../src/gamedata/shipProfiles";
import { StaticNameI18nCatalog } from "../../src/gamedata/nameI18n";
import { ShipsImpl } from "../../src/ships/ships";
import { StackingPenaltyImpl } from "../../src/sim/stackingPenalty";
import { EngagementEvaluatorImpl } from "../../src/sim/fireControl";
import { EngagementFrameComposerImpl } from "../../src/sim/engagementFrameComposer";
import { HitChanceImpl } from "../../src/sim/hitChance";
import { KinematicsImpl } from "../../src/sim/kinematics";
import { MissileApplicationImpl } from "../../src/sim/missileApplication";
import { TurretDamageImpl } from "../../src/sim/turretDamage";
import { Vec2 } from "../../src/sim/vec2";
import { SIG_RESOLUTIONS, type ShipState, type SimSnapshot, type TurretSpec, type MissileSpec } from "../../src/sim/types";
import type { EwarResolver } from "../../src/sim/ewarResolver";
import type { TurretBoosterResolver } from "../../src/sim/turretBoosterResolver";

const ships = new ShipsImpl({ shipProfileCatalog: new StaticShipProfileCatalog(), nameI18nCatalog: new StaticNameI18nCatalog() });
const gunFamilies = new GunFamiliesImpl({ fittingDb: FITTING_DB });
const chargeCatalog = new ChargeCatalogImpl({ fittingDb: FITTING_DB, gunFamilies });
const stacking = new StackingPenaltyImpl();
const missileSkillModel = new MissileSkillModelImpl({ stackingPenalty: stacking });
const missileCatalog = new MissileCatalogImpl({ fittingDb: FITTING_DB, missileSkillModel });
const itemNameCatalog = new StaticItemNameCatalog();
const itemNameResolver = new StaticItemNameResolver();

const importer = new FittingImportImpl({
  ships, fittingDb: FITTING_DB, chargeCatalog, gunFamilies, missileCatalog, missileSkillModel,
  stackingPenalty: stacking, itemNameCatalog, itemNameResolver,
  moduleSlotCatalog: MODULE_SLOT_CATALOG,
});

const HARBINGER_FIT = `[Harbinger, Killmail 137572701]

Damage Control II
Heat Sink II
Heat Sink II
Mark I Compact Reinforced Bulkheads
Reinforced Bulkheads II
Reinforced Bulkheads II

100MN Y-S8 Compact Afterburner
Fleeting Compact Stasis Webifier
Initiated Compact Warp Disruptor
Fleeting Compact Stasis Webifier

Heavy Pulse Laser II, Conflagration M
Heavy Pulse Laser II, Conflagration M
Heavy Pulse Laser II, Conflagration M
Heavy Pulse Laser II, Conflagration M
Heavy Pulse Laser II, Conflagration M
Heavy Pulse Laser II, Conflagration M`;

const turretBoosterResolver: TurretBoosterResolver = { boostedTurret: (t) => t };
const noEwarResolver: EwarResolver = {
  speedMultiplier: () => 1, speedMultiplierIgnoringRange: () => 1,
  disruptedTurret: (t) => t, disruptedTurretIgnoringRange: (t) => t,
  propulsionSuppressed: () => false, propulsionSuppressedIgnoringRange: () => false,
  appliedEffects: () => [], speedBreakdown: () => ({ effects: [], propulsionSuppressed: false }),
  disruptionBreakdown: () => ({ tracking: [], optimal: [], falloff: [] }),
};

function makeComposer() {
  const hitChance = new HitChanceImpl();
  const kinematics = new KinematicsImpl();
  const turretDamage = new TurretDamageImpl();
  const missileApplication = new MissileApplicationImpl();
  const engagementEvaluator = new EngagementEvaluatorImpl({ hitChance, ewarResolver: noEwarResolver, turretBoosterResolver, turretDamage, missileApplication });
  return new EngagementFrameComposerImpl({ kinematics, engagementEvaluator });
}

function stationaryShip(id: "shipA" | "shipB"): ShipState {
  return { id, maxSpeed: 0, mass: 1_000_000, inertiaModifier: 1, mode: "orbit", desiredRange: 1000, aggressivity: 1, position: new Vec2(0, 0), velocity: new Vec2(0, 0) };
}

function snapshot(): SimSnapshot {
  return { time: 0, shipA: stationaryShip("shipA"), shipB: stationaryShip("shipB"), commands: { shipA: new Vec2(0, 0), shipB: new Vec2(0, 0) } };
}

function turretSpecFromImported(t: NonNullable<NonNullable<ReturnType<typeof importer.importFitting>>["turret"]>): TurretSpec {
  return { kind: "turret", tracking: t.tracking, sigResolution: SIG_RESOLUTIONS[t.sigResolutionClass], optimal: t.optimal, falloff: t.falloff, damagePerShot: t.damagePerShot, cycleTime: t.cycleTime, turretCount: t.turretCount };
}

describe("Harbinger DPS cross-check (all skills 5, no overload)", () => {
  test("matches pyfa nominal DPS for 6x HPL II + Conflagration M + 2x Heat Sink II", () => {
    const result = importer.importFitting(HARBINGER_FIT, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    expect(result).toBeDefined();
    expect(result!.turret).toBeDefined();
    expect(result!.turret!.turretCount).toBe(6);

    const nominalDps = (result!.turret!.damagePerShot * result!.turret!.turretCount) / result!.turret!.cycleTime;
    expect(nominalDps).toBeCloseTo(705.31, 1);
  });

  test("damage multiplier includes hull, skill, specialization, and stacking-penalized module bonuses", () => {
    const result = importer.importFitting(HARBINGER_FIT, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    const heatSinkStacking = stacking.apply([1.1, 1.1]);
    const expectedDamageMultiplier = 3.6 * heatSinkStacking * 1.5 * 1.15 * 1.25 * 1.1;
    expect(result!.turret!.damageMultiplier).toBeCloseTo(expectedDamageMultiplier, 6);
  });

  test("cycle time includes stacking-penalized module and unpenalized skill RoF bonuses", () => {
    const result = importer.importFitting(HARBINGER_FIT, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    const heatSinkSpeedStacking = stacking.apply([0.895, 0.895]);
    const expectedCycleTime = 5.25 * heatSinkSpeedStacking * 0.9 * 0.8;
    expect(result!.turret!.cycleTime).toBeCloseTo(expectedCycleTime, 6);
  });

  test("engagement composer nominalDps matches import-layer DPS at zero range", () => {
    const result = importer.importFitting(HARBINGER_FIT, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    const turret = turretSpecFromImported(result!.turret!);
    const composer = makeComposer();
    const view = composer.compose(snapshot(), { weapons: { shipA: [turret], shipB: [] }, sigRadii: { shipA: 300, shipB: 300 } });
    expect(view.attacks.shipA).toBeDefined();
    const expectedNominalDps = (turret.damagePerShot * turret.turretCount) / turret.cycleTime;
    expect(view.attacks.shipA!.damage.nominalDps).toBeCloseTo(expectedNominalDps, 6);
  });
});

describe("mixed turret + launcher DPS summation through sim", () => {
  test("sums nominalDps across a turret group and a missile group", () => {
    const turret: TurretSpec = { kind: "turret", tracking: 0.1, sigResolution: 125, optimal: 10_000, falloff: 5_000, damagePerShot: 100, cycleTime: 5, turretCount: 4 };
    const missile: MissileSpec = { kind: "missile", damagePerMissile: 150, cycleTime: 10, launcherCount: 2, explosionRadius: 50, explosionVelocity: 100, damageReductionFactor: 4.5, maxVelocity: 5000, flightTime: 10, flightRange: 50_000 };
    const composer = makeComposer();
    const view = composer.compose(snapshot(), { weapons: { shipA: [turret, missile], shipB: [] }, sigRadii: { shipA: 300, shipB: 300 } });
    expect(view.attacks.shipA).toBeDefined();
    const expectedTurretDps = (100 * 4) / 5;
    const expectedMissileDps = (150 * 2) / 10;
    expect(view.attacks.shipA!.damage.nominalDps).toBeCloseTo(expectedTurretDps + expectedMissileDps, 6);
  });
});
