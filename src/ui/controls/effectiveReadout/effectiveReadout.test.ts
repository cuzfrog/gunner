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
  shipASpeed: FakeInput;
  shipBSpeed: FakeInput;
  tracking: FakeInput;
  optimal: FakeInput;
  falloff: FakeInput;
  shipASpeedReadout: FakeReadout;
  shipBSpeedReadout: FakeReadout;
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
    shipASpeed: fakeInput("400"),
    shipBSpeed: fakeInput("250"),
    tracking: fakeInput("0.32"),
    optimal: fakeInput("5000"),
    falloff: fakeInput("3000"),
    shipASpeedReadout: fakeReadout(),
    shipBSpeedReadout: fakeReadout(),
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
  const t = (key: string): string => ({
    "unit.meter": "m",
    "unit.kilometer": "km",
    "label.trackingScore": "Score",
    "label.trackingSpeed": "Tracking speed",
    "label.optimalRange": "Optimal range",
    "label.falloffRange": "Falloff range",
    "readout.effectiveAffected": "Affected",
    "readout.stoppedMwd": "stopped MWD",
  }[key] ?? key);
  return { current: () => "en", setLanguage: () => {}, t, translateDocument: () => {} };
}

function fakeI18nWithEmptyAffected(): I18n {
  const t = (key: string): string => ({
    "unit.meter": "m",
    "unit.kilometer": "km",
    "label.trackingScore": "Score",
    "label.trackingSpeed": "Tracking speed",
    "label.optimalRange": "Optimal range",
    "label.falloffRange": "Falloff range",
    "readout.effectiveAffected": "",
    "readout.stoppedMwd": "stopped MWD",
  }[key] ?? key);
  return { current: () => "en", setLanguage: () => {}, t, translateDocument: () => {} };
}

describe("EffectiveReadoutImpl", () => {
  test("formats and displays all effective values without negative state when equal to raw inputs", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ shipASpeed: 400, shipBSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.shipASpeedReadout.textContent).toBe("400 m/s");
    expect(els.shipBSpeedReadout.textContent).toBe("250 m/s");
    expect(els.trackingReadout.textContent).toBe("0.32 rad/s");
    expect(els.optimalReadout.textContent).toBe("5,000 m");
    expect(els.falloffReadout.textContent).toBe("3,000 m");
    expect(els.shipASpeedReadout.classList.remove).toHaveBeenCalledWith("is-negative");
  });

  test("marks shipB speed and optimal as negative when effective values are below their baselines", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ shipASpeed: 400, shipBSpeed: 125, tracking: 0.32, optimal: 4000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.shipBSpeedReadout.classList.add).toHaveBeenCalledWith("is-negative");
    expect(els.shipBSpeedReadout.title).toBe("Affected");
    expect(els.optimalReadout.classList.add).toHaveBeenCalledWith("is-negative");
    expect(els.optimalReadout.textContent).toBe("4,000 m");
    expect(els.shipASpeedReadout.classList.remove).toHaveBeenCalledWith("is-negative");
  });

  test("does not mark speed as negative when the effective value exceeds the raw input", () => {
    const els = fakeEls();
    els.shipASpeed.value = "1000";
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ shipASpeed: 1500, shipBSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.shipASpeedReadout.classList.add).not.toHaveBeenCalled();
    expect(els.shipASpeedReadout.textContent).toBe("1,500 m/s");
  });

  test("renders tracking in score unit when tracking input is in score mode", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "score");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ shipASpeed: 400, shipBSpeed: 250, tracking: 0.16, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.trackingReadout.textContent).toBe("160 Score");
    expect(els.trackingReadout.classList.add).toHaveBeenCalledWith("is-negative");
  });

  test("uses kilometer formatting for long distances", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ shipASpeed: 400, shipBSpeed: 250, tracking: 0.32, optimal: 15000, falloff: 12000, boostedTracking: 0.32, boostedOptimal: 15000, boostedFalloff: 12000 });
    expect(els.optimalReadout.textContent).toBe("15.0 km");
    expect(els.falloffReadout.textContent).toBe("12.0 km");
  });

  test("does not mark turret values negative when only friendly boosts change the effective value", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ shipASpeed: 400, shipBSpeed: 250, tracking: 0.64, optimal: 7500, falloff: 4500, boostedTracking: 0.64, boostedOptimal: 7500, boostedFalloff: 4500 });
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
    readout.update({ shipASpeed: 400, shipBSpeed: 250, tracking: 0.16, optimal: 4000, falloff: 2500, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.trackingReadout.classList.add).toHaveBeenCalledWith("is-negative");
    expect(els.optimalReadout.classList.add).toHaveBeenCalledWith("is-negative");
    expect(els.falloffReadout.classList.add).toHaveBeenCalledWith("is-negative");
  });
});

describe("EffectiveReadoutImpl hover tooltips", () => {
  test("builds a speed tooltip with web and scrambler attribution", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    const shipASpeedBreakdown = {
      effects: [
        { family: "web" as const, moduleName: "Stasis Webifier II", multiplier: 0.45 },
        { family: "scrambler" as const, moduleName: "Warp Scrambler II", multiplier: 1 },
      ],
      propulsionSuppressed: true,
    };
    readout.update({
      shipASpeed: 225, shipBSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000,
      boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000,
      shipASpeedBreakdown,
    });
    expect(els.shipASpeedReadout.title).toBe("Stasis Webifier II -55%; Warp Scrambler II stopped MWD");
  });

  test("uses the generic attribution title when a speed breakdown is undefined", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({
      shipASpeed: 225, shipBSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000,
      boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000,
    });
    expect(els.shipASpeedReadout.title).toBe("Affected");
  });

  test("leaves the speed tooltip empty when the breakdown has no effects", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    const shipASpeedBreakdown = { effects: [] as const, propulsionSuppressed: false };
    readout.update({
      shipASpeed: 225, shipBSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000,
      boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000,
      shipASpeedBreakdown,
    });
    expect(els.shipASpeedReadout.title).toBe("");
  });

  test("builds stat tooltips including script names for disruptors", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    const disruptionBreakdown = {
      tracking: [{ moduleName: "Tracking Disruptor II", scriptName: "Tracking Speed Disruption Script", multiplier: 0.6562 }],
      optimal: [{ moduleName: "Tracking Disruptor II", scriptName: "Optimal Range Disruption Script", multiplier: 0.6562 }],
      falloff: [{ moduleName: "Tracking Disruptor II", scriptName: "Optimal Range Disruption Script", multiplier: 0.6562 }],
    };
    readout.update({
      shipASpeed: 400, shipBSpeed: 250, tracking: 0.16, optimal: 4000, falloff: 2500,
      boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000,
      trackingBreakdown: disruptionBreakdown, optimalBreakdown: disruptionBreakdown, falloffBreakdown: disruptionBreakdown,
    });
    expect(els.trackingReadout.title).toBe("Tracking Disruptor II (Tracking Speed Disruption Script) -34% Tracking speed");
    expect(els.optimalReadout.title).toBe("Tracking Disruptor II (Optimal Range Disruption Script) -34% Optimal range");
    expect(els.falloffReadout.title).toBe("Tracking Disruptor II (Optimal Range Disruption Script) -34% Falloff range");
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
    const values = { shipASpeed: 400, shipBSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 };
    readout.update(values);
    const addCount = (els.shipASpeedReadout.classList.add as ReturnType<typeof vi.fn>).mock.calls.length;
    const removeCount = (els.shipASpeedReadout.classList.remove as ReturnType<typeof vi.fn>).mock.calls.length;
    (els.shipASpeedReadout.classList.add as ReturnType<typeof vi.fn>).mockClear();
    (els.shipASpeedReadout.classList.remove as ReturnType<typeof vi.fn>).mockClear();
    readout.update(values);
    expect((els.shipASpeedReadout.classList.add as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect((els.shipASpeedReadout.classList.remove as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect(addCount + removeCount).toBe(1);
  });

  test("re-writes DOM when negative state changes even with the same text", () => {
    const els = fakeEls();
    els.shipASpeed.value = "200";
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ shipASpeed: 200, shipBSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    (els.shipASpeedReadout.classList.add as ReturnType<typeof vi.fn>).mockClear();
    (els.shipASpeedReadout.classList.remove as ReturnType<typeof vi.fn>).mockClear();
    readout.update({ shipASpeed: 100, shipBSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.shipASpeedReadout.classList.add).toHaveBeenCalledWith("is-negative");
  });

  test("does not mark speed as negative when the raw input is not a valid non-negative number", () => {
    const els = fakeEls();
    els.shipASpeed.value = "abc";
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ shipASpeed: 400, shipBSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.shipASpeedReadout.classList.add).not.toHaveBeenCalled();
    expect(els.shipASpeedReadout.classList.remove).toHaveBeenCalledWith("is-negative");
  });

  test("re-writes negative class when negative state changes and the affected title is empty", () => {
    const els = fakeEls();
    els.shipASpeed.value = "99.5";
    const i18n = fakeI18nWithEmptyAffected();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ shipASpeed: 99.5, shipBSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    (els.shipASpeedReadout.classList.add as ReturnType<typeof vi.fn>).mockClear();
    (els.shipASpeedReadout.classList.remove as ReturnType<typeof vi.fn>).mockClear();
    readout.update({ shipASpeed: 98.4, shipBSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000 });
    expect(els.shipASpeedReadout.textContent).toBe("98 m/s");
    expect(els.shipASpeedReadout.classList.add).toHaveBeenCalledWith("is-negative");
  });
});
