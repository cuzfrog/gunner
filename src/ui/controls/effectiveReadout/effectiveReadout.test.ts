import type { TrackingUnit } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { TrackingInput } from "../trackingInput";
import type { EffectiveReadout } from "./effectiveReadout";
import { EffectiveReadoutImpl } from "./effectiveReadout";
import { _formatSpeed, _isAffected as _isNegative, _readNumber } from "./effectiveReadout";

interface FakeReadout {
  textContent: string | null;
  title: string;
  classList: { add(className: string): void; remove(className: string): void; };
}

interface FakeInput { value: string; }

interface FakeEls {
  attackerSpeed: FakeInput;
  targetSpeed: FakeInput;
  tracking: FakeInput;
  optimal: FakeInput;
  falloff: FakeInput;
  attackerSpeedReadout: FakeReadout;
  targetSpeedReadout: FakeReadout;
  trackingReadout: FakeReadout;
  optimalReadout: FakeReadout;
  falloffReadout: FakeReadout;
}

function fakeInput(value: string): FakeInput { return { value }; }

function fakeReadout(): FakeReadout {
  return { textContent: null, title: "", classList: { add: vi.fn(), remove: vi.fn() } };
}

function fakeEls(): FakeEls {
  return {
    attackerSpeed: fakeInput("400"),
    targetSpeed: fakeInput("250"),
    tracking: fakeInput("0.32"),
    optimal: fakeInput("5000"),
    falloff: fakeInput("3000"),
    attackerSpeedReadout: fakeReadout(),
    targetSpeedReadout: fakeReadout(),
    trackingReadout: fakeReadout(),
    optimalReadout: fakeReadout(),
    falloffReadout: fakeReadout(),
  };
}

function fakeTrackingInput(rad = 0.32, unit: TrackingUnit = "rad"): TrackingInput {
  return {
    rad,
    unit,
    setRadValue: () => 0,
    setUnit: () => 0,
    setDisplayValue: () => 0,
    displayValue: () => 0,
    displayFor: (value: number, _sigResolution: number) => unit === "score" ? (value * 40000) / 40 : value,
  };
}

function fakeI18n(): I18n {
  const t = (key: string): string => ({ "unit.meter": "m", "unit.kilometer": "km", "label.trackingScore": "Score", "readout.effectiveAffected": "Affected" }[key] ?? key);
  return { current: () => "en", setLanguage: () => {}, t, translateDocument: () => {} };
}

function fakeI18nWithEmptyAffected(): I18n {
  const t = (key: string): string => ({ "unit.meter": "m", "unit.kilometer": "km", "label.trackingScore": "Score", "readout.effectiveAffected": "" }[key] ?? key);
  return { current: () => "en", setLanguage: () => {}, t, translateDocument: () => {} };
}

describe("EffectiveReadoutImpl", () => {
  test("formats and displays all effective values without negative state when equal to raw inputs", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ attackerSpeed: 400, targetSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.attackerSpeedReadout.textContent).toBe("400 m/s");
    expect(els.targetSpeedReadout.textContent).toBe("250 m/s");
    expect(els.trackingReadout.textContent).toBe("0.32 rad/s");
    expect(els.optimalReadout.textContent).toBe("5,000 m");
    expect(els.falloffReadout.textContent).toBe("3,000 m");
    expect(els.attackerSpeedReadout.classList.remove).toHaveBeenCalledWith("negative");
  });

  test("marks target speed and optimal as negative when effective values are below their baselines", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ attackerSpeed: 400, targetSpeed: 125, tracking: 0.32, optimal: 4000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.targetSpeedReadout.classList.add).toHaveBeenCalledWith("negative");
    expect(els.targetSpeedReadout.title).toBe("Affected");
    expect(els.optimalReadout.classList.add).toHaveBeenCalledWith("negative");
    expect(els.optimalReadout.textContent).toBe("4,000 m");
    expect(els.attackerSpeedReadout.classList.remove).toHaveBeenCalledWith("negative");
  });

  test("does not mark speed as negative when the effective value exceeds the raw input", () => {
    const els = fakeEls();
    els.attackerSpeed.value = "1000";
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ attackerSpeed: 1500, targetSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.attackerSpeedReadout.classList.add).not.toHaveBeenCalled();
    expect(els.attackerSpeedReadout.textContent).toBe("1,500 m/s");
  });

  test("renders tracking in score unit when tracking input is in score mode", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "score");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ attackerSpeed: 400, targetSpeed: 250, tracking: 0.16, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.trackingReadout.textContent).toBe("160 Score");
    expect(els.trackingReadout.classList.add).toHaveBeenCalledWith("negative");
  });

  test("uses kilometer formatting for long distances", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ attackerSpeed: 400, targetSpeed: 250, tracking: 0.32, optimal: 15000, falloff: 12000, boostedTracking: 0.32, boostedOptimal: 15000, boostedFalloff: 12000 });
    expect(els.optimalReadout.textContent).toBe("15.0 km");
    expect(els.falloffReadout.textContent).toBe("12.0 km");
  });

  test("does not mark turret values negative when only friendly boosts change the effective value", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ attackerSpeed: 400, targetSpeed: 250, tracking: 0.64, optimal: 7500, falloff: 4500, boostedTracking: 0.64, boostedOptimal: 7500, boostedFalloff: 4500 });
    expect(els.trackingReadout.textContent).toBe("0.64 rad/s");
    expect(els.optimalReadout.textContent).toBe("7,500 m");
    expect(els.trackingReadout.classList.add).not.toHaveBeenCalled();
    expect(els.optimalReadout.classList.add).not.toHaveBeenCalled();
  });

  test("marks turret values negative when effective is below the boosted baseline", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ attackerSpeed: 400, targetSpeed: 250, tracking: 0.16, optimal: 4000, falloff: 2500, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.trackingReadout.classList.add).toHaveBeenCalledWith("negative");
    expect(els.optimalReadout.classList.add).toHaveBeenCalledWith("negative");
    expect(els.falloffReadout.classList.add).toHaveBeenCalledWith("negative");
  });
});

describe("_formatSpeed", () => {
  test("adds comma separators and appends m/s", () => {
    expect(_formatSpeed(1234.5)).toBe("1,235 m/s");
    expect(_formatSpeed(214)).toBe("214 m/s");
  });
});

describe("_isNegative", () => {
  test("detects values below the baseline by more than the relative threshold", () => {
    expect(_isNegative(100, 99.5, { absolute: 0.5, relative: 0.005 })).toBe(false);
    expect(_isNegative(99, 100, { absolute: 0.5, relative: 0.005 })).toBe(true);
  });

  test("respects the absolute floor for small values", () => {
    expect(_isNegative(0.32, 0.32, { absolute: 0.0001, relative: 0.005 })).toBe(false);
    expect(_isNegative(0.32, 0.3198, { absolute: 0.0001, relative: 0.005 })).toBe(false);
    expect(_isNegative(0.318, 0.32, { absolute: 0.0001, relative: 0.005 })).toBe(true);
  });
});

describe("_readNumber", () => {
  test("parses a finite non-negative input value", () => {
    expect(_readNumber({ value: "123.4" })).toBe(123.4);
    expect(_readNumber({ value: "0" })).toBe(0);
  });

  test("returns undefined for non-numeric, empty or negative input", () => {
    expect(_readNumber({ value: "abc" })).toBeUndefined();
    expect(_readNumber({ value: "" })).toBeUndefined();
    expect(_readNumber({ value: "-5" })).toBeUndefined();
  });
});

describe("EffectiveReadoutImpl redundant write skipping", () => {
  test("skips DOM writes when text and negative state are unchanged", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    const values = { attackerSpeed: 400, targetSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 };
    readout.update(values);
    const addCount = (els.attackerSpeedReadout.classList.add as ReturnType<typeof vi.fn>).mock.calls.length;
    const removeCount = (els.attackerSpeedReadout.classList.remove as ReturnType<typeof vi.fn>).mock.calls.length;
    (els.attackerSpeedReadout.classList.add as ReturnType<typeof vi.fn>).mockClear();
    (els.attackerSpeedReadout.classList.remove as ReturnType<typeof vi.fn>).mockClear();
    readout.update(values);
    expect((els.attackerSpeedReadout.classList.add as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect((els.attackerSpeedReadout.classList.remove as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect(addCount + removeCount).toBe(1);
  });

  test("re-writes DOM when negative state changes even with the same text", () => {
    const els = fakeEls();
    els.attackerSpeed.value = "200";
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ attackerSpeed: 200, targetSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    (els.attackerSpeedReadout.classList.add as ReturnType<typeof vi.fn>).mockClear();
    (els.attackerSpeedReadout.classList.remove as ReturnType<typeof vi.fn>).mockClear();
    readout.update({ attackerSpeed: 100, targetSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.attackerSpeedReadout.classList.add).toHaveBeenCalledWith("negative");
  });

  test("does not mark speed as negative when the raw input is not a valid non-negative number", () => {
    const els = fakeEls();
    els.attackerSpeed.value = "abc";
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ attackerSpeed: 400, targetSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.attackerSpeedReadout.classList.add).not.toHaveBeenCalled();
    expect(els.attackerSpeedReadout.classList.remove).toHaveBeenCalledWith("negative");
  });

  test("re-writes negative class when negative state changes and the affected title is empty", () => {
    const els = fakeEls();
    els.attackerSpeed.value = "99.5";
    const i18n = fakeI18nWithEmptyAffected();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ attackerSpeed: 99.5, targetSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    (els.attackerSpeedReadout.classList.add as ReturnType<typeof vi.fn>).mockClear();
    (els.attackerSpeedReadout.classList.remove as ReturnType<typeof vi.fn>).mockClear();
    readout.update({ attackerSpeed: 98.4, targetSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.attackerSpeedReadout.textContent).toBe("98 m/s");
    expect(els.attackerSpeedReadout.classList.add).toHaveBeenCalledWith("negative");
  });
});
