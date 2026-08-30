import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { MissileBoosterProjection, MissileBoosterSpec, MissileEnhancerSpec, MissileScriptSpec } from "../../../sim";
import type { I18n } from "../../i18n";
import { MissileBoosterEffectDescriberImpl } from "./missileBoosterEffectDescriber";

const PRECISION_SCRIPT: MissileScriptSpec & { readonly moduleId: TypeId } = {
  name: "Missile Precision Script",
  moduleId: toTypeId("35795"),
  explosionRadiusMultiplier: 2,
  explosionVelocityMultiplier: 2,
  missileVelocityMultiplier: 0,
  flightTimeMultiplier: 0,
};

const RANGE_SCRIPT: MissileScriptSpec & { readonly moduleId: TypeId } = {
  name: "Missile Range Script",
  moduleId: toTypeId("35794"),
  explosionRadiusMultiplier: 0,
  explosionVelocityMultiplier: 0,
  missileVelocityMultiplier: 2,
  flightTimeMultiplier: 2,
};

const MGC_II: MissileBoosterSpec = {
  moduleName: "Missile Guidance Computer II",
  moduleId: toTypeId("35790"),
  explosionRadiusBonusPercent: -8.25,
  explosionVelocityBonusPercent: 8.25,
  missileVelocityBonusPercent: 5.5,
  flightTimeBonusPercent: 5.5,
  overloadStrengthBonusPercent: 15,
  defaultScript: undefined,
};

const MGE_II: MissileEnhancerSpec = {
  moduleName: "Missile Guidance Enhancer II",
  moduleId: toTypeId("35771"),
  explosionRadiusBonusPercent: -6,
  explosionVelocityBonusPercent: 6,
  missileVelocityBonusPercent: 6,
  flightTimeBonusPercent: 6,
};

const LABELS: Record<string, string> = {
  "missileBooster.hover.explosionRadius": "Explosion radius",
  "missileBooster.hover.explosionVelocity": "Explosion velocity",
  "missileBooster.hover.missileVelocity": "Missile velocity",
  "missileBooster.hover.flightTime": "Flight time",
  "ewar.hover.outOfRange": "No effect",
};

const i18n = vi.mocked<I18n>({
  current: vi.fn(),
  setLanguage: vi.fn(),
  t: vi.fn((key) => LABELS[key] ?? key),
  translateDocument: vi.fn(),
});

const describer = new MissileBoosterEffectDescriberImpl({ i18n });

describe("MissileBoosterEffectDescriber", () => {
  test("computerHint reports aggregate bonuses from active computers", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [MGC_II], enhancers: [], scripts: [PRECISION_SCRIPT, RANGE_SCRIPT] },
      activation: { computers: [{ active: true, overloaded: false, script: undefined }] },
    };
    const hint = describer.computerHint(projection);
    expect(hint).toContain("Explosion radius");
    expect(hint).toContain("Explosion velocity");
    expect(hint).toContain("Missile velocity");
    expect(hint).toContain("Flight time");
  });

  test("computerHint applies overload factor", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [MGC_II], enhancers: [], scripts: [PRECISION_SCRIPT, RANGE_SCRIPT] },
      activation: { computers: [{ active: true, overloaded: false, script: undefined }] },
    };
    const projectionOverloaded: MissileBoosterProjection = {
      loadout: { computers: [MGC_II], enhancers: [], scripts: [PRECISION_SCRIPT, RANGE_SCRIPT] },
      activation: { computers: [{ active: true, overloaded: true, script: undefined }] },
    };
    const hint = describer.computerHint(projection);
    const hintOverloaded = describer.computerHint(projectionOverloaded);
    expect(hint).not.toBe(hintOverloaded);
  });

  test("computerHint reports no effect when no computers are active", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [MGC_II], enhancers: [], scripts: [PRECISION_SCRIPT, RANGE_SCRIPT] },
      activation: { computers: [{ active: false, overloaded: false, script: undefined }] },
    };
    expect(describer.computerHint(projection)).toBe("No effect");
  });

  test("computerHint applies script multipliers", () => {
    const projectionNoScript: MissileBoosterProjection = {
      loadout: { computers: [MGC_II], enhancers: [], scripts: [PRECISION_SCRIPT, RANGE_SCRIPT] },
      activation: { computers: [{ active: true, overloaded: false, script: undefined }] },
    };
    const projectionPrecision: MissileBoosterProjection = {
      loadout: { computers: [MGC_II], enhancers: [], scripts: [PRECISION_SCRIPT, RANGE_SCRIPT] },
      activation: { computers: [{ active: true, overloaded: false, script: PRECISION_SCRIPT }] },
    };
    const hintNoScript = describer.computerHint(projectionNoScript);
    const hintPrecision = describer.computerHint(projectionPrecision);
    expect(hintNoScript).not.toBe(hintPrecision);
  });

  test("enhancerHint reports aggregate bonuses from all enhancers", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [], enhancers: [MGE_II], scripts: [] },
      activation: { computers: [] },
    };
    const hint = describer.enhancerHint(projection);
    expect(hint).toContain("Explosion radius");
    expect(hint).toContain("Explosion velocity");
  });

  test("enhancerHint reports no effect when no enhancers are fitted", () => {
    const projection: MissileBoosterProjection = {
      loadout: { computers: [], enhancers: [], scripts: [] },
      activation: { computers: [] },
    };
    expect(describer.enhancerHint(projection)).toBe("No effect");
  });

  test("computerModuleEffect reports per-spec bonuses with overload", () => {
    const effect = describer.computerModuleEffect(MGC_II, undefined, false);
    expect(effect).toContain("Explosion radius");
    expect(effect).toContain("-8.3%");

    const effectOverloaded = describer.computerModuleEffect(MGC_II, undefined, true);
    expect(effectOverloaded).not.toBe(effect);
  });

  test("computerModuleEffect applies script multipliers", () => {
    const effectNoScript = describer.computerModuleEffect(MGC_II, undefined, false);
    const effectPrecision = describer.computerModuleEffect(MGC_II, PRECISION_SCRIPT, false);
    expect(effectNoScript).not.toBe(effectPrecision);
  });

  test("enhancerModuleEffect reports per-spec bonuses", () => {
    const effect = describer.enhancerModuleEffect(MGE_II);
    expect(effect).toContain("Explosion radius");
    expect(effect).toContain("-6.0%");
    expect(effect).toContain("Explosion velocity");
    expect(effect).toContain("+6.0%");
  });
});
