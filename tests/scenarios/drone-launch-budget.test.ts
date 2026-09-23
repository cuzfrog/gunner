import { describe, expect, test } from "bun:test";
import { ChargeCatalogImpl } from "../../src/fitting/chargeCatalog";
import { DroneCatalogImpl } from "../../src/fitting/droneCatalog";
import { DroneLoadoutResolverImpl, type DroneLoadoutContext } from "../../src/fitting/droneLoadoutResolver";
import { DroneSkillModelImpl } from "../../src/fitting/droneStats";
import { FighterSkillModelImpl } from "../../src/fitting/fighterStats";
import { FittingCalculatorImpl } from "../../src/fitting/fittingCalculator";
import { FittingImportImpl } from "../../src/fitting/fittingImport";
import { GunFamiliesImpl } from "../../src/fitting/gunFamilies";
import { MissileCatalogImpl } from "../../src/fitting/missileCatalog";
import { MissileSkillModelImpl } from "../../src/fitting/missileStats";
import { FITTING_DB } from "../../src/gamedata/fittingDb";
import { StaticItemNameCatalog, StaticItemNameResolver } from "../../src/gamedata/itemNames";
import { MODULE_SLOT_CATALOG } from "../../src/gamedata/moduleSlots";
import { StaticNameI18nCatalog } from "../../src/gamedata/nameI18n";
import { StaticShipProfileCatalog } from "../../src/gamedata/shipProfiles";
import { ShipsImpl, type StatConditions, type SkillLevel } from "../../src/ships/ships";
import { StackingPenaltyImpl } from "../../src/sim";

const ships = new ShipsImpl({ shipProfileCatalog: new StaticShipProfileCatalog(), nameI18nCatalog: new StaticNameI18nCatalog() });
const gunFamilies = new GunFamiliesImpl({ fittingDb: FITTING_DB });
const chargeCatalog = new ChargeCatalogImpl({ fittingDb: FITTING_DB });
const stacking = new StackingPenaltyImpl();
const missileSkillModel = new MissileSkillModelImpl({ stackingPenalty: stacking, skillBonuses: FITTING_DB.skillBonuses });
const missileCatalog = new MissileCatalogImpl({ fittingDb: FITTING_DB, missileSkillModel });
const droneSkillModel = new DroneSkillModelImpl({ skillBonuses: FITTING_DB.skillBonuses });
const fighterSkillModel = new FighterSkillModelImpl({ skillBonuses: FITTING_DB.skillBonuses });
const droneCatalog = new DroneCatalogImpl({ fittingDb: FITTING_DB });
const itemNameCatalog = new StaticItemNameCatalog();
const itemNameResolver = new StaticItemNameResolver();

const calculator = new FittingCalculatorImpl({ fittingDb: FITTING_DB, ships, chargeCatalog, gunFamilies, missileCatalog, missileSkillModel, droneCatalog, droneSkillModel, fighterSkillModel, stackingPenalty: stacking, itemNameCatalog });
const resolver = new DroneLoadoutResolverImpl({ fittingCalculator: calculator, fittingDb: FITTING_DB });

const importer = new FittingImportImpl({
  ships, fittingDb: FITTING_DB, chargeCatalog, gunFamilies, missileCatalog, missileSkillModel, droneCatalog, droneSkillModel, fighterSkillModel,
  stackingPenalty: stacking, itemNameCatalog, itemNameResolver,
  moduleSlotCatalog: MODULE_SLOT_CATALOG,
});

const CONDITIONS: StatConditions = { skillLevel: 5 as SkillLevel, overloaded: false, weaponOverloaded: false };

const ISHTAR_10_OGRE = `[Ishtar, Launch budget]

Ogre II x10`;

const ISHTAR_10_ACOLYTE = `[Ishtar, Launch budget]

Acolyte I x10`;

const ISHTAR_5_OGRE = `[Ishtar, Launch budget]

Ogre II x5`;

function resolveLaunched(imported: NonNullable<ReturnType<typeof importer.importFitting>>) {
  const context: DroneLoadoutContext = { profile: imported.profile, hullBonuses: imported.fittingState.hullBonuses, droneBoosterModules: imported.fittingState.droneBoosterModules };
  const groups = imported.drones.map((drone) => ({ typeId: drone.typeId, count: drone.count, activeCount: drone.count }));
  return resolver.resolve(groups, context, CONDITIONS);
}

function launchedBandwidth(launched: ReturnType<typeof resolveLaunched>): number {
  return launched.reduce((sum, drone) => sum + drone.count * drone.bandwidth, 0);
}

describe("Drone launch budget (drones sent to attack never exceed the drone bandwidth)", () => {
  test("the import keeps the full bay loadout", () => {
    const imported = importer.importFitting(ISHTAR_10_OGRE, CONDITIONS);
    expect(imported).toBeDefined();
    expect(imported!.drones).toHaveLength(1);
    expect(imported!.drones[0].count).toBe(10);
  });

  test("ten heavy drones on a 125 bandwidth Ishtar launch five", () => {
    const imported = importer.importFitting(ISHTAR_10_OGRE, CONDITIONS)!;
    const launched = resolveLaunched(imported);
    expect(launched).toHaveLength(1);
    expect(launched[0].count).toBe(5);
    expect(launchedBandwidth(launched)).toBeLessThanOrEqual(imported.profile.droneBandwidth);
  });

  test("ten light drones launch five because maxActiveDrones caps the wing", () => {
    const imported = importer.importFitting(ISHTAR_10_ACOLYTE, CONDITIONS)!;
    const launched = resolveLaunched(imported);
    expect(launched).toHaveLength(1);
    expect(launched[0].count).toBe(5);
    expect(launchedBandwidth(launched)).toBeLessThanOrEqual(imported.profile.droneBandwidth);
  });

  test("a loadout within the launch budget launches unchanged", () => {
    const imported = importer.importFitting(ISHTAR_5_OGRE, CONDITIONS)!;
    const launched = resolveLaunched(imported);
    expect(launched).toHaveLength(1);
    expect(launched[0].count).toBe(5);
    expect(launchedBandwidth(launched)).toBe(125);
  });

  test("an explicit launch subset below the bay stock is respected", () => {
    const imported = importer.importFitting(ISHTAR_10_OGRE, CONDITIONS)!;
    const context: DroneLoadoutContext = { profile: imported.profile, hullBonuses: imported.fittingState.hullBonuses, droneBoosterModules: imported.fittingState.droneBoosterModules };
    const launched = resolver.resolve([{ typeId: imported.drones[0].typeId, count: 10, activeCount: 4 }], context, CONDITIONS);
    expect(launched).toHaveLength(1);
    expect(launched[0].count).toBe(4);
  });
});
