import { describe, expect, test } from "bun:test";
import { ChargeCatalogImpl } from "../../src/fitting/chargeCatalog";
import { DroneCatalogImpl } from "../../src/fitting/droneCatalog";
import { DroneSkillModelImpl } from "../../src/fitting/droneStats";
import { FittingImportImpl } from "../../src/fitting/fittingImport";
import { GunFamiliesImpl } from "../../src/fitting/gunFamilies";
import { MissileCatalogImpl } from "../../src/fitting/missileCatalog";
import { MissileSkillModelImpl } from "../../src/fitting/missileStats";
import { FITTING_DB } from "../../src/gamedata/fittingDb";
import { StaticItemNameCatalog, StaticItemNameResolver } from "../../src/gamedata/itemNames";
import { MODULE_SLOT_CATALOG } from "../../src/gamedata/moduleSlots";
import { StaticNameI18nCatalog } from "../../src/gamedata/nameI18n";
import { StaticShipProfileCatalog } from "../../src/gamedata/shipProfiles";
import { ShipsImpl } from "../../src/ships/ships";
import { StackingPenaltyImpl } from "../../src/sim/stackingPenalty";
import { damageVectorSum } from "../../src/sim/types";

const ships = new ShipsImpl({ shipProfileCatalog: new StaticShipProfileCatalog(), nameI18nCatalog: new StaticNameI18nCatalog() });
const gunFamilies = new GunFamiliesImpl({ fittingDb: FITTING_DB });
const chargeCatalog = new ChargeCatalogImpl({ fittingDb: FITTING_DB, gunFamilies });
const stacking = new StackingPenaltyImpl();
const missileSkillModel = new MissileSkillModelImpl({ stackingPenalty: stacking, skillBonuses: FITTING_DB.skillBonuses });
const missileCatalog = new MissileCatalogImpl({ fittingDb: FITTING_DB, missileSkillModel });
const droneSkillModel = new DroneSkillModelImpl();
const droneCatalog = new DroneCatalogImpl({ fittingDb: FITTING_DB });
const itemNameCatalog = new StaticItemNameCatalog();
const itemNameResolver = new StaticItemNameResolver();

const importer = new FittingImportImpl({
  ships, fittingDb: FITTING_DB, chargeCatalog, gunFamilies, missileCatalog, missileSkillModel, droneCatalog, droneSkillModel,
  stackingPenalty: stacking, itemNameCatalog, itemNameResolver,
  moduleSlotCatalog: MODULE_SLOT_CATALOG,
});

const GARMUR_FIT = `[Garmur, Garmur fit]

[Empty Low slot]
Ballistic Control System II
[Empty Low slot]

[Empty Med slot]
[Empty Med slot]
[Empty Med slot]
[Empty Med slot]

Light Missile Launcher II, Caldari Navy Mjolnir Light Missile
Light Missile Launcher II, Caldari Navy Mjolnir Light Missile
Light Missile Launcher II, Caldari Navy Mjolnir Light Missile

[Empty Rig slot]
[Empty Rig slot]
[Empty Rig slot]`;

describe("Garmur DPS cross-check (all skills 5, no overload)", () => {
  test("matches pyfa nominal DPS for 3x Light Missile Launcher II + Caldari Navy Mjolnir + BCS II", () => {
    const result = importer.importFitting(GARMUR_FIT, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    expect(result).toBeDefined();
    expect(result!.launcher).toBeDefined();
    expect(result!.launcher!.count).toBe(3);
    const damageSum = damageVectorSum(result!.launcher!.damagePerMissile);
    const nominalDps = (damageSum * result!.launcher!.count) / result!.launcher!.cycleTime;
    expect(nominalDps).toBeCloseTo(123, 0);
  });

  test("damage per missile includes Light Missiles skill, Warhead Upgrades, Garmur hull bonus, and BCS II", () => {
    const result = importer.importFitting(GARMUR_FIT, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    expect(result).toBeDefined();
    expect(result!.launcher).toBeDefined();
    const damageSum = damageVectorSum(result!.launcher!.damagePerMissile);
    expect(damageSum).toBeGreaterThan(100);
  });

  test("cycle time includes Missile Launcher Operation, Rapid Launch, and BCS II cycle time bonus", () => {
    const result = importer.importFitting(GARMUR_FIT, { skillLevel: 5, overloaded: false, weaponOverloaded: false });
    expect(result).toBeDefined();
    expect(result!.launcher).toBeDefined();
    expect(result!.launcher!.cycleTime).toBeLessThan(8);
  });
});
