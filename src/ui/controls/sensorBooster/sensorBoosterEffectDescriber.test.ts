import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { SensorBoostProjection, SensorBoosterSpec, SensorBoosterScriptSpec, SignalAmplifierSpec } from "../../../sim";
import type { I18n } from "../../i18n";
import { SensorBoosterEffectDescriberImpl } from "./sensorBoosterEffectDescriber";

const SCAN_SCRIPT: SensorBoosterScriptSpec & { readonly moduleId: TypeId } = {
  name: "Scan Resolution Script",
  moduleId: toTypeId("29011"),
  scanResolutionMultiplier: 2,
  maxTargetRangeMultiplier: 0,
};

const RANGE_SCRIPT: SensorBoosterScriptSpec & { readonly moduleId: TypeId } = {
  name: "Targeting Range Script",
  moduleId: toTypeId("29009"),
  scanResolutionMultiplier: 0,
  maxTargetRangeMultiplier: 2,
};

const SB_II: SensorBoosterSpec = {
  moduleName: "Sensor Booster II",
  moduleId: toTypeId("1952"),
  scanResolutionBonusPercent: 30,
  maxTargetRangeBonusPercent: 30,
  overloadStrengthBonusPercent: 15,
  defaultScript: undefined,
};

const SA_II: SignalAmplifierSpec = {
  moduleName: "Signal Amplifier II",
  moduleId: toTypeId("1987"),
  scanResolutionBonusPercent: 15,
  maxTargetRangeBonusPercent: 30,
  maxLockedTargetsBonus: 2,
};

const LABELS: Record<string, string> = {
  "sensorBooster.hover.scanResolution": "Scan resolution",
  "sensorBooster.hover.maxTargetRange": "Targeting range",
  "sensorBooster.hover.maxLockedTargets": "Max locked targets",
  "ewar.hover.outOfRange": "No effect",
};

const i18n = vi.mocked<I18n>({
  current: vi.fn(),
  setLanguage: vi.fn(),
  t: vi.fn((key) => LABELS[key] ?? key),
  translateDocument: vi.fn(),
});

const describer = new SensorBoosterEffectDescriberImpl({ i18n });

describe("SensorBoosterEffectDescriber", () => {
  test("boosterHint reports aggregate bonuses from active boosters", () => {
    const projection: SensorBoostProjection = {
      loadout: { boosters: [SB_II], amplifiers: [], boosterScripts: [RANGE_SCRIPT, SCAN_SCRIPT] },
      activation: [{ active: true, overloaded: false, script: undefined }],
    };
    const hint = describer.boosterHint(projection);
    expect(hint).toContain("Scan resolution");
    expect(hint).toContain("Targeting range");
  });

  test("boosterHint applies overload factor", () => {
    const projection: SensorBoostProjection = {
      loadout: { boosters: [SB_II], amplifiers: [], boosterScripts: [RANGE_SCRIPT, SCAN_SCRIPT] },
      activation: [{ active: true, overloaded: false, script: undefined }],
    };
    const projectionOverloaded: SensorBoostProjection = {
      loadout: { boosters: [SB_II], amplifiers: [], boosterScripts: [RANGE_SCRIPT, SCAN_SCRIPT] },
      activation: [{ active: true, overloaded: true, script: undefined }],
    };
    const hint = describer.boosterHint(projection);
    const hintOverloaded = describer.boosterHint(projectionOverloaded);
    expect(hint).not.toBe(hintOverloaded);
  });

  test("boosterHint reports no effect when no boosters are active", () => {
    const projection: SensorBoostProjection = {
      loadout: { boosters: [SB_II], amplifiers: [], boosterScripts: [RANGE_SCRIPT, SCAN_SCRIPT] },
      activation: [{ active: false, overloaded: false, script: undefined }],
    };
    expect(describer.boosterHint(projection)).toBe("No effect");
  });

  test("boosterHint applies script multipliers", () => {
    const projectionNoScript: SensorBoostProjection = {
      loadout: { boosters: [SB_II], amplifiers: [], boosterScripts: [RANGE_SCRIPT, SCAN_SCRIPT] },
      activation: [{ active: true, overloaded: false, script: undefined }],
    };
    const projectionScan: SensorBoostProjection = {
      loadout: { boosters: [SB_II], amplifiers: [], boosterScripts: [RANGE_SCRIPT, SCAN_SCRIPT] },
      activation: [{ active: true, overloaded: false, script: SCAN_SCRIPT }],
    };
    const hintNoScript = describer.boosterHint(projectionNoScript);
    const hintScan = describer.boosterHint(projectionScan);
    expect(hintNoScript).not.toBe(hintScan);
  });

  test("amplifierHint reports aggregate bonuses from all amplifiers", () => {
    const projection: SensorBoostProjection = {
      loadout: { boosters: [], amplifiers: [SA_II], boosterScripts: [] },
      activation: [],
    };
    const hint = describer.amplifierHint(projection);
    expect(hint).toContain("Scan resolution");
    expect(hint).toContain("Targeting range");
    expect(hint).toContain("Max locked targets");
  });

  test("amplifierHint reports no effect when no amplifiers are fitted", () => {
    const projection: SensorBoostProjection = {
      loadout: { boosters: [], amplifiers: [], boosterScripts: [] },
      activation: [],
    };
    expect(describer.amplifierHint(projection)).toBe("No effect");
  });

  test("boosterModuleEffect reports per-spec bonuses with overload", () => {
    const effect = describer.boosterModuleEffect(SB_II, undefined, false);
    expect(effect).toContain("Scan resolution");
    expect(effect).toContain("+30.0%");

    const effectOverloaded = describer.boosterModuleEffect(SB_II, undefined, true);
    expect(effectOverloaded).not.toBe(effect);
  });

  test("boosterModuleEffect applies script multipliers", () => {
    const effectNoScript = describer.boosterModuleEffect(SB_II, undefined, false);
    const effectScan = describer.boosterModuleEffect(SB_II, SCAN_SCRIPT, false);
    expect(effectNoScript).not.toBe(effectScan);
  });

  test("amplifierModuleEffect reports per-spec bonuses", () => {
    const effect = describer.amplifierModuleEffect(SA_II);
    expect(effect).toContain("Scan resolution");
    expect(effect).toContain("+15.0%");
    expect(effect).toContain("Targeting range");
    expect(effect).toContain("+30.0%");
    expect(effect).toContain("Max locked targets");
    expect(effect).toContain("+2");
  });
});
