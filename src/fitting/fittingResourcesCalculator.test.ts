import { FittingResourcesCalculatorImpl } from "./fittingResourcesCalculator";
import { StackingPenaltyImpl } from "../sim";
import type { CommandBurstStats, FittingDb, FittingModuleStats, FittingResources, HullBonus, LauncherStats, TurretStats } from "../gamedata/fittingDb";
import type { FittingState } from "./fittingState";
import { toTypeId, type FactionId, type HullTypeId, type ShipId, type TypeId } from "../gamedata/ids";
import { type ShipProfile, type SkillLevel, type StatConditions } from "../ships";

function profile(overrides: Partial<ShipProfile> = {}): ShipProfile {
  return {
    id: "24696" as ShipId,
    name: "Harbinger",
    factionId: "amarr-empire" as FactionId,
    hullTypeId: "419" as HullTypeId,
    mass: 15_500_000,
    inertiaModifier: 0.45,
    baseSpeed: 165,
    sigRadius: 270,
    scanResolution: 200,
    maxTargetingRange: 30000,
    maxLockedTargets: 4,
    sensorStrengths: { gravimetric: 16, ladar: 0, magnetometric: 0, radar: 0 },
    highSlots: 5,
    medSlots: 4,
    lowSlots: 5,
    rigSlots: 3,
    powerGrid: 1700,
    cpuOutput: 419,
    droneBandwidth: 75,
    droneCapacity: 100,
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
    ...overrides,
  };
}

function moduleStats(id: string, stats: Partial<FittingModuleStats>): FittingModuleStats {
  return { ...stats, id: toTypeId(id), name: `Module ${id}` } as FittingModuleStats;
}

function turretStats(id: string, stats: Partial<TurretStats>): TurretStats {
  return {
    tracking: 26, optimal: 12600, falloff: 5000, chargeSize: 2, chargeGroups: [86], damageMultiplier: 3, cycleTime: 5, capacitorNeed: 36,
    turretSkill: "Medium Energy Turret", requiredSkillIds: [toTypeId("3300")], groupID: 53, metaLevel: 5, metaGroupID: 2,
    id: toTypeId(id), name: `Turret ${id}`, ...stats,
  } as TurretStats;
}

function launcherStats(id: string, stats: Partial<LauncherStats>): LauncherStats {
  return { rateOfFire: 15, launcherGroup: 510, chargeGroups: [385], requiredSkillIds: [toTypeId("3319")], metaLevel: 0, metaGroupID: 1, id: toTypeId(id), name: `Launcher ${id}`, ...stats } as LauncherStats;
}

function burstStats(id: string, stats: Partial<CommandBurstStats>): CommandBurstStats {
  return { maxRange: 15000, cycleTime: 10, capacitorNeed: 100, reloadTime: 5, chargeGroup: 772, requiredSkillIds: [toTypeId("3348")], id: toTypeId(id), name: `Burst ${id}`, ...stats } as CommandBurstStats;
}

function emptyDb(): FittingDb {
  return {
    modules: {}, jammers: {}, needs: {}, turrets: {}, vortons: {}, charges: {}, commandBursts: {}, subsystems: {}, launchers: {}, missiles: {}, scripts: {},
    stasisWebs: {}, stasisGrapplers: {}, trackingComputers: {}, trackingDisruptors: {}, warpScramblers: {}, disruptionScripts: {},
    targetPainters: {}, missileGuidanceComputers: {}, missileGuidanceEnhancers: {}, missileScripts: {}, omnidirectionalTrackingLinks: {},
    omnidirectionalTrackingEnhancers: {}, sensorDampeners: {}, sensorBoosters: {}, signalAmplifiers: {}, sensorBoosterScripts: {},
    sensorDampenerScripts: {}, hullBonuses: {}, subsystemBonuses: {}, skillBonuses: [], rigDrawbackReductions: [], drones: {}, combatDrones: {}, fighters: {},
  };
}

function db(overrides: Partial<FittingDb> = {}): FittingDb {
  return { ...emptyDb(), ...overrides };
}

function fittingState(overrides: Partial<FittingState> = {}): FittingState {
  return {
    profile: profile(),
    hullBonuses: [],
    supportModules: [],
    defenseModules: [],
    turretGroups: [],
    launcherGroups: [],
    vortonGroups: [],
    ewarModules: [],
    boosterModules: [],
    missileBoosterModules: [],
    droneBoosterModules: [],
    sensorBoosterModules: [],
    sensorAmplifierModules: [],
    commandBurstModules: [],
    droneGroups: [],
    fighterGroups: [],
    drones: [],
    cargo: [],
    ...overrides,
  };
}

function conditions(skillLevel: number): StatConditions {
  return { skillLevel: skillLevel as SkillLevel, overloaded: false, weaponOverloaded: false };
}

function fitted(moduleId: string): { moduleId: TypeId; offline: boolean } {
  return { moduleId: toTypeId(moduleId), offline: false };
}

function resolve(state: FittingState, testDb: FittingDb = db(), skillLevel = 5): FittingResources {
  const calc = new FittingResourcesCalculatorImpl({ fittingDb: testDb, stackingPenalty: new StackingPenaltyImpl() });
  return calc.resolve(state, conditions(skillLevel));
}

describe("FittingResourcesCalculatorImpl", () => {
  test("empty fitting uses no resources and applies skill output bonus at level 5", () => {
    const resources = resolve(fittingState());
    expect(resources.powerGrid).toEqual({ used: 0, output: 2125 });
    expect(resources.cpu).toEqual({ used: 0, output: 523.75 });
  });

  test("skill level 0 leaves base output unmultiplied", () => {
    const resources = resolve(fittingState(), db(), 0);
    expect(resources.powerGrid.output).toBe(1700);
    expect(resources.cpu.output).toBe(419);
  });

  test("counts turret and launcher group needs multiplied by count", () => {
    const testDb = db({
      turrets: { "1": turretStats("1", {}) },
      launchers: { "2": launcherStats("2", {}) },
      needs: { "1": { powerGrid: 9, cpu: 24 }, "2": { powerGrid: 5, cpu: 30 } },
    });
    const state = fittingState({ turretGroups: [{ moduleId: toTypeId("1"), count: 2 }], launcherGroups: [{ moduleId: toTypeId("2"), count: 3 }] });
    const resources = resolve(state, testDb);
    expect(resources.powerGrid.used).toBe(18 + 15);
    expect(resources.cpu.used).toBe(48 + 90);
  });

  test("counts fitted module needs once each", () => {
    const testDb = db({ modules: { "10": moduleStats("10", {}) }, needs: { "10": { powerGrid: 40, cpu: 25 } } });
    const state = fittingState({ supportModules: [fitted("10")], defenseModules: [fitted("10")], ewarModules: [fitted("10")] });
    const resources = resolve(state, testDb);
    expect(resources.powerGrid.used).toBe(120);
    expect(resources.cpu.used).toBe(75);
  });

  test("counts propulsion and command burst needs", () => {
    const testDb = db({
      modules: { "20": moduleStats("20", {}) },
      commandBursts: { "21": burstStats("21", {}) },
      needs: { "20": { powerGrid: 11, cpu: 15 }, "21": { powerGrid: 1, cpu: 36 } },
    });
    const state = fittingState({ propulsionModule: fitted("20"), commandBurstModules: [fitted("21")] });
    const resources = resolve(state, testDb);
    expect(resources.powerGrid.used).toBe(12);
    expect(resources.cpu.used).toBe(51);
  });

  test("modules missing from the needs table count as zero", () => {
    const testDb = db({ modules: { "30": moduleStats("30", {}) } });
    const state = fittingState({ supportModules: [fitted("30")] });
    const resources = resolve(state, testDb);
    expect(resources.powerGrid.used).toBe(0);
    expect(resources.cpu.used).toBe(0);
  });

  test("module powergrid output percent multiplies powergrid output", () => {
    const testDb = db({ modules: { "1355": moduleStats("1355", { powerGridOutputPercent: 15 }) } });
    const state = fittingState({ supportModules: [fitted("1355")] });
    const resources = resolve(state, testDb);
    expect(resources.powerGrid.output).toBeCloseTo(1700 * 1.15 * 1.25, 6);
    expect(resources.cpu.output).toBeCloseTo(523.75, 6);
  });

  test("module cpu output percent multiplies cpu output", () => {
    const testDb = db({ modules: { "3888": moduleStats("3888", { cpuOutputPercent: 10 }) } });
    const state = fittingState({ supportModules: [fitted("3888")] });
    const resources = resolve(state, testDb);
    expect(resources.cpu.output).toBeCloseTo(419 * 1.1 * 1.25, 6);
  });

  test("repeated output modules are stacking penalized", () => {
    const testDb = db({ modules: { "1355": moduleStats("1355", { powerGridOutputPercent: 15 }) } });
    const state = fittingState({ supportModules: [fitted("1355"), fitted("1355")] });
    const resources = resolve(state, testDb);
    const unpenalized = 1700 * 1.15 * 1.15 * 1.25;
    expect(resources.powerGrid.output).toBeLessThan(unpenalized);
    expect(resources.powerGrid.output).toBeGreaterThan(1700 * 1.15 * 1.25);
  });

  test("subsystem flat output adds to the base before multipliers", () => {
    const testDb = db({ modules: { "1355": moduleStats("1355", { powerGridOutputPercent: 15 }) } });
    const hullBonuses: readonly HullBonus[] = [
      { attribute: "powerGridFlat", magnitude: 400, scalesWithHullSkill: false, sourceId: toTypeId("45598") },
    ];
    const state = fittingState({ supportModules: [fitted("1355")], hullBonuses });
    const resources = resolve(state, testDb);
    expect(resources.powerGrid.output).toBeCloseTo((1700 + 400) * 1.15 * 1.25, 6);
  });

  test("subsystem percent output hull rows multiply the output without skill scaling", () => {
    const hullBonuses: readonly HullBonus[] = [{ attribute: "powerGridOutputPercent", magnitude: 20, scalesWithHullSkill: false, sourceId: toTypeId("45623") }];
    const state = fittingState({ hullBonuses });
    const resources = resolve(state, db());
    expect(resources.powerGrid.output).toBeCloseTo(1700 * 1.2 * 1.25, 6);
  });

  test("skill cpuNeed reduction applies to modules requiring the scoped skill", () => {
    const testDb = db({
      turrets: { "1": turretStats("1", { requiredSkillIds: [toTypeId("3300")] }) },
      needs: { "1": { powerGrid: 9, cpu: 24 } },
      skillBonuses: [{ skillId: toTypeId("3318"), bonusType: "cpuNeed", magnitudePerLevel: -5, appliesTo: "module", requiredSkillId: toTypeId("3300") }],
    });
    const state = fittingState({ turretGroups: [{ moduleId: toTypeId("1"), count: 1 }] });
    expect(resolve(state, testDb, 5).cpu.used).toBeCloseTo(24 * 0.75, 6);
    expect(resolve(state, testDb, 0).cpu.used).toBe(24);
  });

  test("hull need rows scope by module skill and scale with skill level", () => {
    const testDb = db({ turrets: { "1": turretStats("1", { requiredSkillIds: [toTypeId("3300"), toTypeId("3306")] }) }, needs: { "1": { powerGrid: 9, cpu: 24 } } });
    const hullBonuses: readonly HullBonus[] = [{ attribute: "powerGridNeed", magnitude: -5, scalesWithHullSkill: true, moduleSkillId: toTypeId("3306") }];
    const scoped = fittingState({ turretGroups: [{ moduleId: toTypeId("1"), count: 1 }], hullBonuses });
    expect(resolve(scoped, testDb, 5).powerGrid.used).toBeCloseTo(9 * 0.75, 6);
    const unscoped = fittingState({ turretGroups: [{ moduleId: toTypeId("1"), count: 1 }], hullBonuses: [{ attribute: "powerGridNeed", magnitude: -5, scalesWithHullSkill: true, moduleSkillId: toTypeId("3319") }] });
    expect(resolve(unscoped, testDb).powerGrid.used).toBe(9);
  });

  test("need reduction beyond 100% floors the need at zero", () => {
    const testDb = db({ turrets: { "1": turretStats("1", { requiredSkillIds: [toTypeId("3300")] }) }, needs: { "1": { powerGrid: 9, cpu: 24 } } });
    const hullBonuses: readonly HullBonus[] = [{ attribute: "cpuNeed", magnitude: -25, scalesWithHullSkill: true, moduleSkillId: toTypeId("3300") }];
    const state = fittingState({ turretGroups: [{ moduleId: toTypeId("1"), count: 2 }], hullBonuses });
    expect(resolve(state, testDb, 5).cpu.used).toBe(0);
  });

  test("power need rig drawback raises repairer powergrid need with rigging skill reduction", () => {
    const testDb = db({
      modules: {
        "100": moduleStats("100", { groupID: 53, requiredSkillIds: [] }),
        "200": moduleStats("200", { groupID: 55, requiredSkillIds: [] }),
        "300": moduleStats("300", { rigDrawback: { kind: "powerNeed", percent: 10, groupId: 775, targetGroupId: 53 } }),
      },
      needs: { "100": { powerGrid: 40, cpu: 0 }, "200": { powerGrid: 40, cpu: 0 }, "300": { powerGrid: 0, cpu: 0 } },
    });
    const base = fittingState({ defenseModules: [fitted("100")], supportModules: [fitted("200")], });
    expect(resolve(base, testDb).powerGrid.used).toBe(80);
    const withRig = fittingState({ defenseModules: [fitted("100")], supportModules: [fitted("200"), fitted("300")] });
    expect(resolve(withRig, testDb).powerGrid.used).toBeCloseTo(40 * 1.1 + 40, 6);
    const reducedDb = db({ ...testDb, rigDrawbackReductions: [{ skillId: toTypeId("26253"), groupId: 775, magnitudePerLevel: -10 }] });
    expect(resolve(withRig, reducedDb).powerGrid.used).toBeCloseTo(40 * 1.05 + 40, 6);
  });

  test("cpu need rig drawback scoped by target skill raises the matching module cpu need", () => {
    const testDb = db({
      modules: {
        "101": moduleStats("101", { groupID: 60, requiredSkillIds: [toTypeId("11579")] }),
        "102": moduleStats("102", { groupID: 60, requiredSkillIds: [toTypeId("3300")] }),
        "301": moduleStats("301", { rigDrawback: { kind: "cpuNeed", percent: 10, groupId: 776, targetSkillId: toTypeId("11579") } }),
      },
      needs: { "101": { powerGrid: 0, cpu: 20 }, "102": { powerGrid: 0, cpu: 20 }, "301": { powerGrid: 0, cpu: 0 } },
    });
    const state = fittingState({ supportModules: [fitted("101"), fitted("102"), fitted("301")] });
    expect(resolve(state, testDb).cpu.used).toBeCloseTo(20 * 1.1 + 20, 6);
  });

  test("cpu output rig drawback multiplies cpu output", () => {
    const testDb = db({ modules: { "400": moduleStats("400", { rigDrawback: { kind: "cpu", percent: -10, groupId: 776 } }) } });
    const state = fittingState({ supportModules: [fitted("400")] });
    expect(resolve(state, testDb).cpu.output).toBeCloseTo(419 * 0.9 * 1.25, 6);
  });
});
