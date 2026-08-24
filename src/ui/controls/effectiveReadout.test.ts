import type { TrackingUnit } from "../../appstate";
import type { I18n } from "../i18n";
import type { TrackingInput } from "./trackingInput";
import type { EffectiveReadoutEls, EffectiveReadout } from "./effectiveReadout";
import { EffectiveReadoutImpl } from "./effectiveReadout";
import { _formatSpeed, _isAffected, _readNumber } from "./effectiveReadout";

interface FakeReadout {
  textContent: string | null;
  title: string;
  style: { color: string };
  classList: { add(className: string): void; remove(className: string): void; };
}

interface FakeInput { value: string; }

function fakeInput(value: string): FakeInput { return { value }; }

function fakeReadout(): FakeReadout {
  return {
    textContent: null,
    title: "",
    style: { color: "" },
    classList: { add: vi.fn(), remove: vi.fn() },
  };
}

function fakeEls(): EffectiveReadoutEls {
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

describe("EffectiveReadoutImpl", () => {
  test("formats and displays all effective values without affected state when equal to raw inputs", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ attackerSpeed: 400, targetSpeed: 250, tracking: 0.32, optimal: 5000, falloff: 3000 });
    expect(els.attackerSpeedReadout.textContent).toBe("400 m/s");
    expect(els.targetSpeedReadout.textContent).toBe("250 m/s");
    expect(els.trackingReadout.textContent).toBe("0.32 rad/s");
    expect(els.optimalReadout.textContent).toBe("5,000 m");
    expect(els.falloffReadout.textContent).toBe("3,000 m");
    expect(els.attackerSpeedReadout.classList.remove).toHaveBeenCalledWith("affected");
  });

  test("marks target speed and optimal as affected when effective values differ from raw inputs", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ attackerSpeed: 400, targetSpeed: 125, tracking: 0.32, optimal: 6000, falloff: 3000 });
    expect(els.targetSpeedReadout.classList.add).toHaveBeenCalledWith("affected");
    expect(els.targetSpeedReadout.title).toBe("Affected");
    expect(els.optimalReadout.classList.add).toHaveBeenCalledWith("affected");
    expect(els.optimalReadout.textContent).toBe("6,000 m");
    expect(els.attackerSpeedReadout.classList.remove).toHaveBeenCalledWith("affected");
  });

  test("renders tracking in score unit when tracking input is in score mode", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "score");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ attackerSpeed: 400, targetSpeed: 250, tracking: 0.16, optimal: 5000, falloff: 3000 });
    expect(els.trackingReadout.textContent).toBe("160 Score");
    expect(els.trackingReadout.classList.add).toHaveBeenCalledWith("affected");
  });

  test("uses kilometer formatting for long distances", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingInput = fakeTrackingInput(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingInput, sigResolution: () => 40 });
    readout.update({ attackerSpeed: 400, targetSpeed: 250, tracking: 0.32, optimal: 15000, falloff: 12000 });
    expect(els.optimalReadout.textContent).toBe("15.0 km");
    expect(els.falloffReadout.textContent).toBe("12.0 km");
  });
});

describe("_formatSpeed", () => {
  test("adds comma separators and appends m/s", () => {
    expect(_formatSpeed(1234.5)).toBe("1,235 m/s");
    expect(_formatSpeed(214)).toBe("214 m/s");
  });
});

describe("_isAffected", () => {
  test("detects differences above the relative threshold", () => {
    expect(_isAffected(100, 99.5, { absolute: 0.5, relative: 0.005 })).toBe(false);
    expect(_isAffected(100, 99, { absolute: 0.5, relative: 0.005 })).toBe(true);
  });

  test("respects the absolute floor for small values", () => {
    expect(_isAffected(0.32, 0.32, { absolute: 0.0001, relative: 0.005 })).toBe(false);
    expect(_isAffected(0.32, 0.3198, { absolute: 0.0001, relative: 0.005 })).toBe(false);
    expect(_isAffected(0.32, 0.318, { absolute: 0.0001, relative: 0.005 })).toBe(true);
  });
});

describe("_readNumber", () => {
  test("parses the input value and clamps at zero", () => {
    expect(_readNumber({ value: "123.4" })).toBe(123.4);
    expect(_readNumber({ value: "abc" })).toBe(0);
    expect(_readNumber({ value: "-5" })).toBe(0);
  });
});
