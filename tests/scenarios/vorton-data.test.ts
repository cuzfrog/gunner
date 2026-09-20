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

// Medium Scoped Vorton Projector (54747): chargeSize 2, group 4060, damageMultiplier 1.1, cycleTime 9s,
// capacitorNeed 32, maxRange 42240, aoeCloudSize 143, aoeVelocity 105, aoeDamageReductionFactor 0.5, heatDamage 1,
// required skills Vorton Projector Operation (55033) + Medium Vorton Projector Specialization... (55035).
// GalvaSurge Condenser Pack M (54773): em 500 + kin 151, weaponRangeMultiplier 0.75 (SDE attr 2047).
// MesmerFlux Condenser Pack M (54774): em 250 + kin 77, weaponRangeMultiplier 1.5.
const STORMBRINGER_VORTON_FIT = `[Stormbringer, vorton data]

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

Medium Scoped Vorton Projector, GalvaSurge Condenser Pack M
`;

describe("vorton fitting data", () => {
  test("vorton module with condenser pack resolves db stats with charge range multiplier", () => {
    const fitting = importer.importFitting(STORMBRINGER_VORTON_FIT, conditions(0));
    expect(fitting).toBeDefined();
    expect(fitting!.fittingState.vortonGroups).toEqual([{ moduleId: toTypeId("54747"), chargeId: toTypeId("54773"), count: 1 }]);
    expect(fitting!.vortons).toEqual([{
      moduleId: toTypeId("54747"),
      count: 1,
      chargeId: toTypeId("54773"),
      damagePerShot: { em: 550, thermal: 0, kinetic: 151 * 1.1, explosive: 0 },
      cycleTime: 9,
      maxRange: 31680,
      explosionRadius: 143,
      explosionVelocity: 105,
      damageReductionFactor: 0.5,
      capacitorNeed: 32,
      heatDamagePerCycle: 1,
      requiredSkillIds: [toTypeId("55033"), toTypeId("55035")],
      damageBreakdown: { damageByType: { em: 500, kinetic: 151 }, factors: [{ kind: "base", multiplier: 1.1 }] },
    }]);
  });

  test("vorton module without charge falls back to the lowest compatible condenser pack", () => {
    const fitting = importer.importFitting(STORMBRINGER_VORTON_FIT.replace(", GalvaSurge Condenser Pack M", ""), conditions(0));
    expect(fitting).toBeDefined();
    expect(fitting!.vortons[0].chargeId).toBe(toTypeId("54773"));
  });

  test("vorton charge swap to MesmerFlux scales damage per shot and range", () => {
    const fitting = importer.importFitting(STORMBRINGER_VORTON_FIT.replace("GalvaSurge Condenser Pack M", "MesmerFlux Condenser Pack M"), conditions(0));
    expect(fitting).toBeDefined();
    expect(fitting!.vortons[0].chargeId).toBe(toTypeId("54774"));
    expect(fitting!.vortons[0].damagePerShot.em).toBeCloseTo(275);
    expect(fitting!.vortons[0].damagePerShot.kinetic).toBeCloseTo(84.7);
    expect(fitting!.vortons[0].maxRange).toBe(63360);
  });

  test("vortons are absent on a fitting without vorton modules", () => {
    const fitting = importer.importFitting(STORMBRINGER_VORTON_FIT.replace("Medium Scoped Vorton Projector, GalvaSurge Condenser Pack M", "[Empty High slot]"), conditions(0));
    expect(fitting).toBeDefined();
    expect(fitting!.vortons).toEqual([]);
  });
});
