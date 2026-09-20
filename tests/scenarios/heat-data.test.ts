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

function conditions(skillLevel: SkillLevel) {
  return { skillLevel, overloaded: false, weaponOverloaded: false };
}

// 250mm Railgun II: db heatDamage 1.0. Heavy Missile Launcher II: db heatDamage 1.8.
// Medium Armor Repairer II: db heatDamage 5.3. Multispectrum Shield Hardener II: db heatDamage 3.4 (hardeners).
// Thermodynamics reduces heat damage by 5% per level (pyfa thermodynamicsSkillDamageBonus boost -5 per level).
const RAILGUN_FIT = `[Rupture, heat data]

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

250mm Railgun II
250mm Railgun II
[Empty High slot]
[Empty High slot]
[Empty High slot]

[Empty Rig slot]
[Empty Rig slot]
[Empty Rig slot]

Fusion M x200
`;

const LAUNCHER_FIT = `[Rupture, heat data]

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

Heavy Missile Launcher II
[Empty High slot]
[Empty High slot]
[Empty High slot]
[Empty High slot]

[Empty Rig slot]
[Empty Rig slot]
[Empty Rig slot]

Mjolnir Heavy Missile x100
`;

const REPAIRER_FIT = `[Rupture, heat data]

Medium Armor Repairer II
[Empty Low slot]
[Empty Low slot]
[Empty Low slot]
[Empty Low slot]

Multispectrum Shield Hardener II
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
`;

describe("module heat damage through the fitting layer", () => {
  test("resolved turrets carry per-module heat damage scaled by the thermodynamics level", () => {
    const result = importer.importFitting(RAILGUN_FIT, conditions(4));
    expect(result).toBeDefined();
    const turret = result!.turrets?.find((t) => t.moduleId === toTypeId("3082"));
    expect(turret).toBeDefined();
    expect(turret!.heatDamagePerCycle).toBeCloseTo(0.8, 5);
  });

  test("turret heat damage is unmodified at thermodynamics level zero", () => {
    const result = importer.importFitting(RAILGUN_FIT, conditions(0));
    expect(result).toBeDefined();
    const turret = result!.turrets?.find((t) => t.moduleId === toTypeId("3082"));
    expect(turret).toBeDefined();
    expect(turret!.heatDamagePerCycle).toBeCloseTo(1.0, 5);
  });

  test("resolved launchers carry per-launcher heat damage scaled by the thermodynamics level", () => {
    const result = importer.importFitting(LAUNCHER_FIT, conditions(5));
    expect(result).toBeDefined();
    const launcher = result!.launcher;
    expect(launcher).toBeDefined();
    expect(launcher!.moduleId === toTypeId("2410") || launcher!.moduleId === toTypeId("2874")).toBe(true);
    expect(launcher!.heatDamagePerCycle).toBeCloseTo(1.8 * 0.75, 5);
  });

  test("resolved defense specs carry thermo-scaled repairer and hardener heat damage", () => {
    const result = importer.importFitting(REPAIRER_FIT, conditions(4));
    expect(result).toBeDefined();
    const defense = result!.defense;
    const repairer = defense.repairers.find((r) => r.moduleId === toTypeId("3530"));
    expect(repairer).toBeDefined();
    expect(repairer!.heatDamage).toBeCloseTo(5.3 * 0.8, 5);
    const hardener = defense.hardeners.find((h) => h.moduleId === toTypeId("2281"));
    expect(hardener).toBeDefined();
    expect(hardener!.heatDamage).toBeCloseTo(3.4 * 0.8, 5);
  });
});
