import { describe, expect, test } from "bun:test";
import { toTypeId } from "../gamedata/ids";
import { EMPTY_MISSILE_BOOSTER_LOADOUT, EMPTY_SENSOR_BOOST_LOADOUT } from "./types";
import { scheduledDrainsFromProjections } from "./scheduledDrains";
import type { CommandBurstSpec, EwarProjection, MissileBoosterProjection, ScheduledDrain, SensorBoostProjection, TurretBoostProjection } from "./types";

const WEB: EwarProjection["loadout"]["webs"][number] = { moduleName: "Stasis Web II", moduleId: toTypeId("1"), maxRange: 10000, speedFactor: 0.4, overloadRangeBonusPercent: 0, capacitorNeed: 10, cycleTime: 5 };
const PAINTER: EwarProjection["loadout"]["painters"][number] = { moduleName: "Target Painter II", moduleId: toTypeId("2"), maxRange: 30000, falloff: 30000, signatureRadiusBonusPercent: 30, overloadStrengthBonusPercent: 0, capacitorNeed: 8, cycleTime: 6 };
const NEUTRALIZER: EwarProjection["loadout"]["neutralizers"][number] = { moduleName: "Heavy Energy Neutralizer II", moduleId: toTypeId("3"), amount: 600, cycleTime: 24, capacitorNeed: 500, maxRange: 20000, falloff: 10000 };
const COMPUTER: TurretBoostProjection["loadout"]["computers"][number] = { moduleName: "Tracking Computer II", moduleId: toTypeId("4"), trackingBonusPercent: 40, optimalBonusPercent: 40, falloffBonusPercent: 40, defaultScript: undefined, capacitorNeed: 12, cycleTime: 10 };
const SENSOR_BOOSTER: SensorBoostProjection["loadout"]["boosters"][number] = { moduleName: "Sensor Booster II", moduleId: toTypeId("5"), scanResolutionBonusPercent: 10, maxTargetRangeBonusPercent: 10, overloadStrengthBonusPercent: 0, defaultScript: undefined, capacitorNeed: 11, cycleTime: 8 };
const MISSILE_COMPUTER: MissileBoosterProjection["loadout"]["computers"][number] = { moduleName: "Missile Guidance Computer II", moduleId: toTypeId("6"), explosionRadiusBonusPercent: 20, explosionVelocityBonusPercent: 20, missileVelocityBonusPercent: 20, flightTimeBonusPercent: 20, overloadStrengthBonusPercent: 0, defaultScript: undefined, capacitorNeed: 9, cycleTime: 12 };
const COMMAND_BURST: CommandBurstSpec = { moduleName: "Armor Command Burst II", moduleId: toTypeId("7"), capacitorNeed: 25, cycleTime: 60 };

function ewarProjection(loadout: Partial<EwarProjection["loadout"]>, activation?: EwarProjection["activation"]): EwarProjection {
  return {
    loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [], ...loadout },
    activation: activation ?? { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], neutralizers: [], nosferatu: [] },
  };
}

describe("scheduledDrainsFromProjections", () => {
  test("collects active ewar, booster, and neutralizer drains", () => {
    const ewar = ewarProjection({ webs: [WEB], painters: [PAINTER], neutralizers: [NEUTRALIZER] });
    const boosts: TurretBoostProjection = { loadout: { computers: [COMPUTER], scripts: [] }, activation: { computers: [{ active: true, overloaded: false, script: undefined }] } };
    const missileBoosts: MissileBoosterProjection = { loadout: { computers: [], enhancers: [], scripts: [] }, activation: undefined };
    const sensorBoosts: SensorBoostProjection = { loadout: { boosters: [], amplifiers: [], boosterScripts: [] }, activation: [] };
    const drains = scheduledDrainsFromProjections(ewar, boosts, missileBoosts, sensorBoosts, []);
    expect(drains).toEqual([
      { moduleId: toTypeId("1"), amount: 10, interval: 5, active: true },
      { moduleId: toTypeId("2"), amount: 8, interval: 6, active: true },
      { moduleId: toTypeId("3"), amount: 500, interval: 24, active: true },
      { moduleId: toTypeId("4"), amount: 12, interval: 10, active: true },
    ] satisfies ScheduledDrain[]);
  });

  test("skips modules without capacitor need and honors inactive activations", () => {
    const ewar = ewarProjection({ webs: [{ ...WEB, capacitorNeed: undefined }], painters: [PAINTER] });
    const sensorBoosts: SensorBoostProjection = { loadout: { boosters: [SENSOR_BOOSTER], amplifiers: [], boosterScripts: [] }, activation: [{ active: false, overloaded: false, script: undefined }] };
    const missileBoosts: MissileBoosterProjection = { loadout: { computers: [MISSILE_COMPUTER], enhancers: [], scripts: [] }, activation: { computers: [{ active: false, overloaded: false, script: undefined }] } };
    const drains = scheduledDrainsFromProjections(ewar, { loadout: { computers: [], scripts: [] }, activation: undefined }, missileBoosts, sensorBoosts, []);
    expect(drains).toEqual([
      { moduleId: toTypeId("2"), amount: 8, interval: 6, active: true },
      { moduleId: toTypeId("6"), amount: 9, interval: 12, active: false },
      { moduleId: toTypeId("5"), amount: 11, interval: 8, active: false },
    ] satisfies ScheduledDrain[]);
  });

  test("active ewar entries follow per-instance activation flags", () => {
    const ewar = ewarProjection({ webs: [WEB] }, { webs: [{ active: false, overloaded: false }], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], neutralizers: [], nosferatu: [] });
    const drains = scheduledDrainsFromProjections(ewar, { loadout: { computers: [], scripts: [] }, activation: undefined }, { loadout: { computers: [], enhancers: [], scripts: [] }, activation: undefined }, { loadout: EMPTY_SENSOR_BOOST_LOADOUT, activation: [] }, []);
    expect(drains).toEqual([{ moduleId: toTypeId("1"), amount: 10, interval: 5, active: false }] satisfies ScheduledDrain[]);
  });

  test("collects command burst drains", () => {
    const drains = scheduledDrainsFromProjections(ewarProjection({}), { loadout: { computers: [], scripts: [] }, activation: undefined }, { loadout: { computers: [], enhancers: [], scripts: [] }, activation: undefined }, { loadout: EMPTY_SENSOR_BOOST_LOADOUT, activation: [] }, [COMMAND_BURST, { ...COMMAND_BURST, capacitorNeed: 0 }]);
    expect(drains).toEqual([{ moduleId: toTypeId("7"), amount: 25, interval: 60, active: true }] satisfies ScheduledDrain[]);
  });
});
