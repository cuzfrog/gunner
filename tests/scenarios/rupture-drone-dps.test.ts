import { describe, expect, test } from "bun:test";
import { ChargeCatalogImpl } from "../../src/fitting/chargeCatalog";
import { DroneCatalogImpl } from "../../src/fitting/droneCatalog";
import { DroneSkillModelImpl } from "../../src/fitting/droneStats";
import { FighterSkillModelImpl } from "../../src/fitting/fighterStats";
import { FittingImportImpl } from "../../src/fitting/fittingImport";
import { GunFamiliesImpl } from "../../src/fitting/gunFamilies";
import { MissileCatalogImpl } from "../../src/fitting/missileCatalog";
import { MissileSkillModelImpl } from "../../src/fitting/missileStats";
import { FITTING_DB } from "../../src/gamedata/fittingDb";
import { toTypeId } from "../../src/gamedata/ids";
import { StaticItemNameCatalog, StaticItemNameResolver } from "../../src/gamedata/itemNames";
import { MODULE_SLOT_CATALOG } from "../../src/gamedata/moduleSlots";
import { StaticNameI18nCatalog } from "../../src/gamedata/nameI18n";
import { StaticShipProfileCatalog } from "../../src/gamedata/shipProfiles";
import { ShipsImpl } from "../../src/ships/ships";
import { StackingPenaltyImpl } from "../../src/sim";
import type { SkillLevel } from "../../src/ships";

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

const importer = new FittingImportImpl({
  ships, fittingDb: FITTING_DB, chargeCatalog, gunFamilies, missileCatalog, missileSkillModel, droneCatalog, droneSkillModel, fighterSkillModel,
  stackingPenalty: stacking, itemNameCatalog, itemNameResolver,
  moduleSlotCatalog: MODULE_SLOT_CATALOG,
});

// pyfa headless reference (eos) for Rupture + 5x Acolyte II, all skills at 5:
//   damageMultiplier = Drone Interfacing 1.5 x Amarr Drone Specialization 1.1 x Light Drone Operation 1.25 = 2.0625
//   final = 1.68 x 2.0625 = 3.465, per-drone DPS = 20 x 3.465 / 4 = 17.325, x5 drones = 86.625.
const RUPTURE_DRONE_FIT = `[Rupture, drone dps check]

[Empty Low slot]
[Empty Low slot]
[Empty Low slot]
[Empty Low slot]
[Empty Low slot]
[Empty Low slot]

[Empty Med slot]
[Empty Med slot]
[Empty Med slot]
[Empty Med slot]
[Empty Med slot]

[Empty High slot]
[Empty High slot]
[Empty High slot]
[Empty High slot]
[Empty High slot]
[Empty High slot]
[Empty High slot]
[Empty High slot]

[Empty Rig slot]
[Empty Rig slot]
[Empty Rig slot]

Acolyte II x5
`;

const CONDITIONS = { skillLevel: 5 as SkillLevel, overloaded: false, weaponOverloaded: false };

describe("Rupture drone DPS cross-check (all skills 5)", () => {
  test("applies interfacing, specialization and operation to Acolyte II", () => {
    const result = importer.importFitting(RUPTURE_DRONE_FIT, CONDITIONS);
    expect(result).toBeDefined();
    const acolyte = result!.drones.find((d) => d.typeId === toTypeId("2205"));
    expect(acolyte).toBeDefined();
    expect(acolyte!.count).toBe(5);
    expect(acolyte!.damageMultiplier).toBeCloseTo(3.465, 9);
    expect(acolyte!.damageBreakdown.damageByType.em).toBeCloseTo(20, 9);
  });

  test("per-drone DPS matches pyfa (17.325), five drones total 86.625", () => {
    const result = importer.importFitting(RUPTURE_DRONE_FIT, CONDITIONS);
    const acolyte = result!.drones.find((d) => d.typeId === toTypeId("2205"));
    const perDrone = (acolyte!.damageBreakdown.damageByType.em ?? 0) * acolyte!.damageMultiplier / acolyte!.cycleTime;
    expect(perDrone).toBeCloseTo(17.325, 9);
    expect(perDrone * acolyte!.count).toBeCloseTo(86.625, 9);
  });

  test("attributes skill factors to Drone Interfacing, Amarr specialization and Light Drone Operation", () => {
    const result = importer.importFitting(RUPTURE_DRONE_FIT, CONDITIONS);
    const acolyte = result!.drones.find((d) => d.typeId === toTypeId("2205"));
    const skillFactors = acolyte!.damageBreakdown.factors.filter((f) => f.kind === "skill");
    expect(skillFactors.map((f) => f.skillIds)).toEqual([[toTypeId("3442"), toTypeId("12484"), toTypeId("24241")]]);
    expect(skillFactors.map((f) => f.multiplier)).toEqual([2.0625]);
  });
});
