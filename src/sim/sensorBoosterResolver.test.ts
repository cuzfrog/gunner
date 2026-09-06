import type { SensorBoosterActivation, SensorBoosterScriptSpec, SensorBoosterSpec, SensorBoostLoadout, SensorBoostProjection, SensorSpec, SignalAmplifierSpec } from "./types";
import { SensorBoosterResolverImpl } from "./sensorBoosterResolver";
import { StackingPenaltyImpl } from "./stackingPenalty";

const stacking = new StackingPenaltyImpl();
const resolver = new SensorBoosterResolverImpl({ stackingPenalty: stacking });

const baseSpec: SensorSpec = { scanResolution: 200, maxTargetingRange: 30000, maxLockedTargets: 4 };

function makeBoosterSpec(overrides: Partial<SensorBoosterSpec> = {}): SensorBoosterSpec {
  return { moduleName: "Sensor Booster II", moduleId: "1952" as never, scanResolutionBonusPercent: 30, maxTargetRangeBonusPercent: 30, overloadStrengthBonusPercent: 15, defaultScript: undefined, ...overrides };
}

function makeAmplifierSpec(overrides: Partial<SignalAmplifierSpec> = {}): SignalAmplifierSpec {
  return { moduleName: "Signal Amplifier II", moduleId: "1987" as never, scanResolutionBonusPercent: 15, maxTargetRangeBonusPercent: 30, maxLockedTargetsBonus: 2, ...overrides };
}

function makeScript(overrides: Partial<SensorBoosterScriptSpec> = {}): SensorBoosterScriptSpec {
  return { name: "Scan Resolution Script", moduleId: "29011" as never, scanResolutionMultiplier: 2, maxTargetRangeMultiplier: 0, ...overrides };
}

function projection(loadout: Partial<SensorBoostLoadout>, activation?: readonly SensorBoosterActivation[]): SensorBoostProjection {
  return { loadout: { boosters: [], amplifiers: [], boosterScripts: [], ...loadout }, activation };
}

describe("SensorBoosterResolverImpl", () => {
  test("returns spec unchanged when projection is undefined", () => {
    expect(resolver.boostedSensorSpec(baseSpec, undefined)).toEqual(baseSpec);
  });

  test("applies a single active sensor booster with stacking", () => {
    const loadout = { boosters: [makeBoosterSpec()], amplifiers: [], boosterScripts: [] };
    const activation: SensorBoosterActivation[] = [{ active: true, overloaded: false, script: undefined }];
    const result = resolver.boostedSensorSpec(baseSpec, projection(loadout, activation));
    expect(result.scanResolution).toBe(260);
    expect(result.maxTargetingRange).toBe(39000);
    expect(result.maxLockedTargets).toBe(4);
  });

  test("skips inactive boosters", () => {
    const loadout = { boosters: [makeBoosterSpec()], amplifiers: [], boosterScripts: [] };
    const activation: SensorBoosterActivation[] = [{ active: false, overloaded: false, script: undefined }];
    const result = resolver.boostedSensorSpec(baseSpec, projection(loadout, activation));
    expect(result).toEqual(baseSpec);
  });

  test("applies overload bonus to booster strength", () => {
    const loadout = { boosters: [makeBoosterSpec()], amplifiers: [], boosterScripts: [] };
    const activation: SensorBoosterActivation[] = [{ active: true, overloaded: true, script: undefined }];
    const result = resolver.boostedSensorSpec(baseSpec, projection(loadout, activation));
    const expectedPercent = 30 * 1.15;
    expect(result.scanResolution).toBe(Math.round(200 * (1 + expectedPercent / 100)));
    expect(result.maxTargetingRange).toBe(Math.round(30000 * (1 + expectedPercent / 100)));
  });

  test("applies scan resolution script to booster, zeroing range bonus", () => {
    const script = makeScript();
    const loadout = { boosters: [makeBoosterSpec({ defaultScript: script })], amplifiers: [], boosterScripts: [] };
    const activation: SensorBoosterActivation[] = [{ active: true, overloaded: false, script }];
    const result = resolver.boostedSensorSpec(baseSpec, projection(loadout, activation));
    expect(result.scanResolution).toBe(Math.round(200 * (1 + (30 * 2) / 100)));
    expect(result.maxTargetingRange).toBe(30000);
  });

  test("applies signal amplifier passively (always on)", () => {
    const loadout = { boosters: [], amplifiers: [makeAmplifierSpec()], boosterScripts: [] };
    const result = resolver.boostedSensorSpec(baseSpec, projection(loadout));
    expect(result.scanResolution).toBe(Math.round(200 * 1.15));
    expect(result.maxTargetingRange).toBe(Math.round(30000 * 1.30));
    expect(result.maxLockedTargets).toBe(6);
  });

  test("stacks boosters and amplifiers together in one group", () => {
    const loadout = { boosters: [makeBoosterSpec()], amplifiers: [makeAmplifierSpec()], boosterScripts: [] };
    const activation: SensorBoosterActivation[] = [{ active: true, overloaded: false, script: undefined }];
    const result = resolver.boostedSensorSpec(baseSpec, projection(loadout, activation));
    const scanResMultipliers = [1 + 15 / 100, 1 + 30 / 100];
    const expectedScanRes = Math.round(200 * stacking.apply(scanResMultipliers));
    const rangeMultipliers = [1 + 30 / 100, 1 + 30 / 100];
    const expectedRange = Math.round(30000 * stacking.apply(rangeMultipliers));
    expect(result.scanResolution).toBe(expectedScanRes);
    expect(result.maxTargetingRange).toBe(expectedRange);
    expect(result.maxLockedTargets).toBe(6);
  });

  test("applies unscripted bonus when activation has no script even if defaultScript exists", () => {
    const script = makeScript();
    const loadout = { boosters: [makeBoosterSpec({ defaultScript: script })], amplifiers: [], boosterScripts: [] };
    const activation: SensorBoosterActivation[] = [{ active: true, overloaded: false, script: undefined }];
    const result = resolver.boostedSensorSpec(baseSpec, projection(loadout, activation));
    expect(result.scanResolution).toBe(260);
    expect(result.maxTargetingRange).toBe(39000);
  });

  test("skips boosters when activation array is missing entirely", () => {
    const script = makeScript();
    const loadout = { boosters: [makeBoosterSpec({ defaultScript: script })], amplifiers: [], boosterScripts: [] };
    const result = resolver.boostedSensorSpec(baseSpec, projection(loadout));
    expect(result).toEqual(baseSpec);
  });
});
