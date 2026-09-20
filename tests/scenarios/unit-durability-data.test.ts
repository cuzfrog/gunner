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

const CONDITIONS = { skillLevel: 5 as SkillLevel, overloaded: false, weaponOverloaded: false };

const HOBGOBLIN_FIT = `[Rupture, durability data]

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

[Empty Rig slot]
[Empty Rig slot]
[Empty Rig slot]

Hobgoblin I x5
`;

const ARCHON_FIT = `[Archon, durability data]

[Empty Low slot]
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
[Empty Med slot]

[Empty High slot]
[Empty High slot]
[Empty High slot]
[Empty High slot]
[Empty High slot]
[Empty High slot]

[Empty Rig slot]
[Empty Rig slot]
[Empty Rig slot]

[Empty Fighter hangar light slot]
[Empty Fighter hangar light slot]
[Empty Fighter hangar light slot]

Templar I x6
`;

describe("drone and fighter durability data through the fitting layer", () => {
  test("resolved drones carry their own hp pools and signature radius", () => {
    const result = importer.importFitting(HOBGOBLIN_FIT, CONDITIONS);
    expect(result).toBeDefined();
    const drone = result!.drones.find((d) => d.typeId === toTypeId("2454"));
    expect(drone).toBeDefined();
    expect(drone!.shieldHp).toBe(50);
    expect(drone!.armorHp).toBe(90);
    expect(drone!.hullHp).toBe(200);
    expect(drone!.signatureRadius).toBe(25);
  });

  test("resolved fighters carry their own hp pools and signature radius", () => {
    const result = importer.importFitting(ARCHON_FIT, CONDITIONS);
    expect(result).toBeDefined();
    const fighter = result!.fighters.find((f) => f.typeId === toTypeId("23055"));
    expect(fighter).toBeDefined();
    expect(fighter!.shieldHp).toBe(3285);
    expect(fighter!.armorHp).toBeUndefined();
    expect(fighter!.hullHp).toBe(100);
    expect(fighter!.signatureRadius).toBe(110);
  });
});
