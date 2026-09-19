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
import { StaticItemNameCatalog, StaticItemNameResolver } from "../../src/gamedata/itemNames";
import { MODULE_SLOT_CATALOG } from "../../src/gamedata/moduleSlots";
import { StaticNameI18nCatalog } from "../../src/gamedata/nameI18n";
import { StaticShipProfileCatalog } from "../../src/gamedata/shipProfiles";
import { ShipsImpl } from "../../src/ships/ships";
import { StackingPenaltyImpl } from "../../src/sim";
import { damageVectorSum } from "../../src/sim/types";
import { toTypeId } from "../../src/gamedata/ids";
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

const TENGU_FIT = `[Tengu, KEM]

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
Heavy Missile Launcher II, Scourge Heavy Missile
[Empty High slot]
[Empty High slot]
[Empty High slot]

[Empty Rig slot]
[Empty Rig slot]
[Empty Rig slot]

Tengu Offensive - Accelerated Ejection Bay
Tengu Core - Subversion Integrator
`;

const CONDITIONS = { skillLevel: 5 as SkillLevel, overloaded: false, weaponOverloaded: false };

// Skill multipliers at level 5 established by the MissileSkillModel (Heavy Missiles, Warhead Upgrades, launcher skills).
const SKILL_DAMAGE_MULTIPLIER = 1.375;
const BASE_CYCLE_TIME = 8.262;
// Tengu Offensive - Accelerated Ejection Bay per level 5: +5%/lvl kinetic damage, -7.5%/lvl launcher rate of fire.
const SUBSYSTEM_DAMAGE_MULTIPLIER = 1.25;
const SUBSYSTEM_ROF_MULTIPLIER = 0.625;

describe("Tengu subsystem bonus cross-check (all skills 5, no overload)", () => {
  test("imports a Tengu with offensive subsystem and applies kinetic damage per level", () => {
    const result = importer.importFitting(TENGU_FIT, CONDITIONS);
    expect(result).toBeDefined();
    expect(result!.launcher).toBeDefined();
    const damageSum = damageVectorSum(result!.launcher!.damagePerMissile);
    expect(damageSum).toBeCloseTo(149 * SKILL_DAMAGE_MULTIPLIER * SUBSYSTEM_DAMAGE_MULTIPLIER, 4);
    expect(result!.launcher!.cycleTime).toBeCloseTo(BASE_CYCLE_TIME * SUBSYSTEM_ROF_MULTIPLIER, 4);
  });

  test("attributes the damage factor to the subsystem", () => {
    const result = importer.importFitting(TENGU_FIT, CONDITIONS);
    const factors = result!.launcher!.damageBreakdown.factors;
    const subsystem = factors.find((f) => f.kind === "subsystem");
    expect(subsystem).toBeDefined();
    expect(subsystem!.multiplier).toBeCloseTo(SUBSYSTEM_DAMAGE_MULTIPLIER, 6);
    expect(subsystem!.moduleIds).toEqual([toTypeId("45601")]);
    expect(subsystem!.damageType).toBe("kinetic");
  });

  test("does not apply subsystem bonuses without the offensive subsystem", () => {
    const plainFit = TENGU_FIT.replace("Tengu Offensive - Accelerated Ejection Bay\n", "");
    const result = importer.importFitting(plainFit, CONDITIONS);
    expect(result!.launcher).toBeDefined();
    const damageSum = damageVectorSum(result!.launcher!.damagePerMissile);
    expect(damageSum).toBeCloseTo(149 * SKILL_DAMAGE_MULTIPLIER, 4);
    const factors = result!.launcher!.damageBreakdown.factors;
    expect(factors.find((f) => f.kind === "subsystem")).toBeUndefined();
  });

  test("summarize places subsystems in the subsystem section", () => {
    const summary = importer.summarize(TENGU_FIT);
    expect(summary).toBeDefined();
  });
});
