import type { TrackingUnit } from "../../../appstate";
import { toTypeId } from "../../../gamedata/ids";
import type { FittingImport } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { TrackingInput } from "../trackingInput";
import type { Side } from "../side";
import type { DroneReadoutValues, MissileReadoutValues, NoWeaponReadoutValues } from "../../../sim";
import type { EffectiveReadout } from "./effectiveReadout";
import { EffectiveReadoutImpl } from "./effectiveReadout";
import { _formatSpeed, _isAffected as _isNegative, _readNumber } from "./effectiveReadout";
import { mockFittingImport } from "../../testing";

interface FakeReadout {
  textContent: string | null;
  dataHint: string;
  classList: { add(className: string): void; remove(className: string): void; };
  setAttribute(name: string, value: string): void;
}

interface FakeInput { value: string; }

interface FakeSideEls {
  speed: FakeInput;
  tracking: FakeInput;
  optimal: FakeInput;
  falloff: FakeInput;
  speedReadout: FakeReadout;
  trackingReadout: FakeReadout;
  optimalReadout: FakeReadout;
  falloffReadout: FakeReadout;
}

interface FakeEls {
  shipA: FakeSideEls;
  shipB: FakeSideEls;
}

function fakeInput(value: string): FakeInput { return { value }; }

function fakeReadout(): FakeReadout {
  const readout: FakeReadout = { textContent: null, dataHint: "", classList: { add: vi.fn(), remove: vi.fn() }, setAttribute: vi.fn((name: string, value: string) => { if (name === "data-hint") readout.dataHint = value; }) };
  return readout;
}

function fakeSideEls(speed = "400", tracking = "0.32", optimal = "5000", falloff = "3000"): FakeSideEls {
  return {
    speed: fakeInput(speed),
    tracking: fakeInput(tracking),
    optimal: fakeInput(optimal),
    falloff: fakeInput(falloff),
    speedReadout: fakeReadout(),
    trackingReadout: fakeReadout(),
    optimalReadout: fakeReadout(),
    falloffReadout: fakeReadout(),
  };
}

function fakeEls(): FakeEls {
  return { shipA: fakeSideEls(), shipB: fakeSideEls("250", "0.2", "4000", "2500") };
}

function fakeTrackingInput(rad = 0.32, unit: TrackingUnit = "rad"): TrackingInput {
  return {
    rad,
    unit,
    setRadValue: (_rad: number, _sigResolution: number) => 0,
    setUnit: (_unit: TrackingUnit, _sigResolution: number) => 0,
    setDisplayValue: (_displayValue: number, _sigResolution: number) => 0,
    displayValue: (_sigResolution: number) => 0,
    displayFor: (value: number, _sigResolution: number) => unit === "score" ? (value * 40000) / 40 : value,
  };
}

function fakeTrackingDisplays(rad = 0.32, unit: TrackingUnit = "rad"): Readonly<Record<Side, TrackingInput>> {
  const input = fakeTrackingInput(rad, unit);
  return { shipA: input, shipB: input };
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

function fakeFittingImport(): FittingImport {
  const NAME_FOR_ID: Record<string, string> = { "527": "Stasis Webifier II", "448": "Warp Scrambler II", "2109": "Tracking Disruptor II", "29007": "Tracking Speed Disruption Script", "29005": "Optimal Range Disruption Script" };
  return { ...mockFittingImport(), itemNameForId: vi.fn((id, _language) => NAME_FOR_ID[id] ?? String(id)) };
}

function sideValues(tracking = 0.32, optimal = 5000, falloff = 3000, boostedTracking = 0.32, boostedOptimal = 5000, boostedFalloff = 3000, speed = 400) {
  return {
    kind: "turret" as const,
    speed,
    tracking,
    optimal,
    falloff,
    boostedTracking,
    boostedOptimal,
    boostedFalloff,
    sigResolution: 40,
  };
}

describe("EffectiveReadoutImpl", () => {
  test("formats and displays all effective values without negative state when equal to raw inputs", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    readout.update({ shipA: sideValues(), shipB: sideValues(0.2, 4000, 2500, 0.2, 4000, 2500, 250) });
    expect(els.shipA.speedReadout.textContent).toBe("400 m/s");
    expect(els.shipB.speedReadout.textContent).toBe("250 m/s");
    expect(els.shipA.trackingReadout.textContent).toBe("0.32 rad/s");
    expect(els.shipA.optimalReadout.textContent).toBe("5,000 m");
    expect(els.shipA.falloffReadout.textContent).toBe("3,000 m");
    expect(els.shipA.speedReadout.classList.remove).toHaveBeenCalledWith("is-negative");
  });

  test("marks shipB speed and optimal as negative when effective values are below their baselines", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    readout.update({
      shipA: sideValues(),
      shipB: { speed: 125, tracking: 0.2, optimal: 4000, falloff: 2500, boostedTracking: 0.2, boostedOptimal: 5000, boostedFalloff: 2500, sigResolution: 40, kind: "turret" },
    });
    expect(els.shipB.speedReadout.classList.add).toHaveBeenCalledWith("is-negative");
    expect(els.shipB.speedReadout.dataHint).toBe("Affected");
    expect(els.shipB.optimalReadout.classList.add).toHaveBeenCalledWith("is-negative");
    expect(els.shipB.optimalReadout.textContent).toBe("4,000 m");
    expect(els.shipA.speedReadout.classList.remove).toHaveBeenCalledWith("is-negative");
  });

  test("does not mark speed as negative when the effective value exceeds the raw input", () => {
    const els = fakeEls();
    els.shipA.speed.value = "1000";
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    readout.update({
      shipA: { speed: 1500, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000, sigResolution: 40, kind: "turret" },
      shipB: sideValues(),
    });
    expect(els.shipA.speedReadout.classList.add).not.toHaveBeenCalled();
    expect(els.shipA.speedReadout.textContent).toBe("1,500 m/s");
  });

  test("renders tracking in score unit when tracking input is in score mode", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "score");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    readout.update({
      shipA: { speed: 400, tracking: 0.16, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000, sigResolution: 40, kind: "turret" },
      shipB: sideValues(),
    });
    expect(els.shipA.trackingReadout.textContent).toBe("160 Score");
    expect(els.shipA.trackingReadout.classList.add).toHaveBeenCalledWith("is-negative");
  });

  test("uses per-side tracking unit so shipB score mode does not affect shipA rad/s display", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays: Readonly<Record<Side, TrackingInput>> = {
      shipA: fakeTrackingInput(0.32, "rad"),
      shipB: fakeTrackingInput(0.32, "score"),
    };
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    readout.update({
      shipA: { speed: 400, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000, sigResolution: 40, kind: "turret" },
      shipB: { speed: 400, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000, sigResolution: 40, kind: "turret" },
    });
    expect(els.shipA.trackingReadout.textContent).toBe("0.32 rad/s");
    expect(els.shipB.trackingReadout.textContent).toBe("320 Score");
  });

  test("uses kilometer formatting for long distances", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    readout.update({
      shipA: { speed: 400, tracking: 0.32, optimal: 15000, falloff: 12000, boostedTracking: 0.32, boostedOptimal: 15000, boostedFalloff: 12000, sigResolution: 40, kind: "turret" },
      shipB: sideValues(),
    });
    expect(els.shipA.optimalReadout.textContent).toBe("15.0 km");
    expect(els.shipA.falloffReadout.textContent).toBe("12.0 km");
  });

  test("does not mark turret values negative when only friendly boosts change the effective value", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    readout.update({
      shipA: { speed: 400, tracking: 0.64, optimal: 7500, falloff: 4500, boostedTracking: 0.64, boostedOptimal: 7500, boostedFalloff: 4500, sigResolution: 40, kind: "turret" },
      shipB: sideValues(),
    });
    expect(els.shipA.trackingReadout.textContent).toBe("0.64 rad/s");
    expect(els.shipA.optimalReadout.textContent).toBe("7,500 m");
    expect(els.shipA.trackingReadout.classList.add).not.toHaveBeenCalled();
    expect(els.shipA.optimalReadout.classList.add).not.toHaveBeenCalled();
  });

  test("marks turret values negative when effective is below the boosted baseline", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    readout.update({
      shipA: { speed: 400, tracking: 0.16, optimal: 4000, falloff: 2500, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000, sigResolution: 40, kind: "turret" },
      shipB: sideValues(),
    });
    expect(els.shipA.trackingReadout.classList.add).toHaveBeenCalledWith("is-negative");
    expect(els.shipA.optimalReadout.classList.add).toHaveBeenCalledWith("is-negative");
    expect(els.shipA.falloffReadout.classList.add).toHaveBeenCalledWith("is-negative");
  });
});

describe("EffectiveReadoutImpl hover tooltips", () => {
  test("builds a speed tooltip with web and scrambler attribution", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    const shipASpeedBreakdown = {
      effects: [
        { family: "web" as const, moduleId: toTypeId("527"), multiplier: 0.45 },
        { family: "scrambler" as const, moduleId: toTypeId("448"), multiplier: 1 },
      ],
      propulsionSuppressed: true,
    };
    readout.update({
      shipA: { speed: 225, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000, sigResolution: 40, kind: "turret", speedBreakdown: shipASpeedBreakdown },
      shipB: sideValues(),
    });
    expect(els.shipA.speedReadout.dataHint).toBe("Stasis Webifier II -55%; Warp Scrambler II stopped MWD");
  });

  test("uses the generic attribution title when a speed breakdown is undefined", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    readout.update({
      shipA: { speed: 225, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000, sigResolution: 40, kind: "turret" },
      shipB: sideValues(),
    });
    expect(els.shipA.speedReadout.dataHint).toBe("Affected");
  });

  test("leaves the speed tooltip empty when the breakdown has no effects", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    const shipASpeedBreakdown = { effects: [] as const, propulsionSuppressed: false };
    readout.update({
      shipA: { speed: 225, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000, sigResolution: 40, kind: "turret", speedBreakdown: shipASpeedBreakdown },
      shipB: sideValues(),
    });
    expect(els.shipA.speedReadout.dataHint).toBe("");
  });

  test("builds stat tooltips including script names for disruptors", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout: EffectiveReadout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    const disruptionBreakdown = {
      tracking: [{ moduleId: toTypeId("2109"), scriptId: toTypeId("29007"), multiplier: 0.6562 }],
      optimal: [{ moduleId: toTypeId("2109"), scriptId: toTypeId("29005"), multiplier: 0.6562 }],
      falloff: [{ moduleId: toTypeId("2109"), scriptId: toTypeId("29005"), multiplier: 0.6562 }],
    };
    readout.update({
      shipA: { speed: 400, tracking: 0.16, optimal: 4000, falloff: 2500, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000, sigResolution: 40, kind: "turret", trackingBreakdown: disruptionBreakdown, optimalBreakdown: disruptionBreakdown, falloffBreakdown: disruptionBreakdown },
      shipB: sideValues(),
    });
    expect(els.shipA.trackingReadout.dataHint).toBe("Tracking Disruptor II (Tracking Speed Disruption Script) -34% Tracking speed");
    expect(els.shipA.optimalReadout.dataHint).toBe("Tracking Disruptor II (Optimal Range Disruption Script) -34% Optimal range");
    expect(els.shipA.falloffReadout.dataHint).toBe("Tracking Disruptor II (Optimal Range Disruption Script) -34% Falloff range");
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
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    const values = { shipA: sideValues(), shipB: sideValues(0.2, 4000, 2500, 0.2, 4000, 2500, 250) };
    readout.update(values);
    const addCount = (els.shipA.speedReadout.classList.add as ReturnType<typeof vi.fn>).mock.calls.length;
    const removeCount = (els.shipA.speedReadout.classList.remove as ReturnType<typeof vi.fn>).mock.calls.length;
    (els.shipA.speedReadout.classList.add as ReturnType<typeof vi.fn>).mockClear();
    (els.shipA.speedReadout.classList.remove as ReturnType<typeof vi.fn>).mockClear();
    readout.update(values);
    expect((els.shipA.speedReadout.classList.add as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect((els.shipA.speedReadout.classList.remove as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect(addCount + removeCount).toBe(1);
  });

  test("re-writes DOM when negative state changes even with the same text", () => {
    const els = fakeEls();
    els.shipA.speed.value = "200";
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    readout.update({
      shipA: { speed: 200, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000, sigResolution: 40, kind: "turret" },
      shipB: sideValues(),
    });
    (els.shipA.speedReadout.classList.add as ReturnType<typeof vi.fn>).mockClear();
    (els.shipA.speedReadout.classList.remove as ReturnType<typeof vi.fn>).mockClear();
    readout.update({
      shipA: { speed: 100, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000, sigResolution: 40, kind: "turret" },
      shipB: sideValues(),
    });
    expect(els.shipA.speedReadout.classList.add).toHaveBeenCalledWith("is-negative");
  });

  test("does not mark speed as negative when the raw input is not a valid non-negative number", () => {
    const els = fakeEls();
    els.shipA.speed.value = "abc";
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    readout.update({
      shipA: { speed: 400, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000, sigResolution: 40, kind: "turret" },
      shipB: sideValues(),
    });
    expect(els.shipA.speedReadout.classList.add).not.toHaveBeenCalled();
    expect(els.shipA.speedReadout.classList.remove).toHaveBeenCalledWith("is-negative");
  });

  test("re-writes negative class when negative state changes and the affected title is empty", () => {
    const els = fakeEls();
    els.shipA.speed.value = "99.5";
    const i18n = fakeI18nWithEmptyAffected();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    readout.update({
      shipA: { speed: 99.5, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000, sigResolution: 40, kind: "turret" },
      shipB: sideValues(),
    });
    (els.shipA.speedReadout.classList.add as ReturnType<typeof vi.fn>).mockClear();
    (els.shipA.speedReadout.classList.remove as ReturnType<typeof vi.fn>).mockClear();
    readout.update({
      shipA: { speed: 98.4, tracking: 0.32, optimal: 5000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 3000, sigResolution: 40, kind: "turret" },
      shipB: sideValues(),
    });
    expect(els.shipA.speedReadout.textContent).toBe("98 m/s");
    expect(els.shipA.speedReadout.classList.add).toHaveBeenCalledWith("is-negative");
  });
});

describe("EffectiveReadoutImpl missile branch", () => {
  test("renders missile attributes in tracking/optimal/falloff slots", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    const missile: MissileReadoutValues = {
      kind: "missile", speed: 400,
      explosionRadius: 40, explosionVelocity: 170, maxVelocity: 3750, flightTime: 5, flightRange: 18750,
    };
    readout.update({ shipA: missile, shipB: sideValues() });
    expect(els.shipA.trackingReadout.textContent).toBe("40 m");
    expect(els.shipA.optimalReadout.textContent).toBe("170 m/s");
    expect(els.shipA.falloffReadout.textContent).toBe("18.8 km");
  });
});

describe("EffectiveReadoutImpl no-weapon branch", () => {
  test("renders em-dash in tracking/optimal/falloff slots", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    const noWeapon: NoWeaponReadoutValues = { kind: "none", speed: 400 };
    readout.update({ shipA: noWeapon, shipB: sideValues() });
    expect(els.shipA.trackingReadout.textContent).toBe("-");
    expect(els.shipA.optimalReadout.textContent).toBe("-");
    expect(els.shipA.falloffReadout.textContent).toBe("-");
  });
});

describe("EffectiveReadoutImpl drone branch", () => {
  test("renders drone tracking/optimal/falloff without negative state", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "rad");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    const drone: DroneReadoutValues = {
      kind: "drone", speed: 400, tracking: 0.15, optimal: 1000, falloff: 500, sigResolution: 40,
    };
    readout.update({ shipA: drone, shipB: sideValues() });
    expect(els.shipA.trackingReadout.textContent).toBe("0.15 rad/s");
    expect(els.shipA.optimalReadout.textContent).toBe("1,000 m");
    expect(els.shipA.falloffReadout.textContent).toBe("500 m");
    expect(els.shipA.trackingReadout.classList.add).not.toHaveBeenCalled();
  });

  test("renders drone tracking in score unit when tracking display is in score mode", () => {
    const els = fakeEls();
    const i18n = fakeI18n();
    const trackingDisplays = fakeTrackingDisplays(0.32, "score");
    const readout = new EffectiveReadoutImpl({ els, i18n, trackingDisplays, fittingImport: fakeFittingImport() });
    const drone: DroneReadoutValues = {
      kind: "drone", speed: 400, tracking: 0.15, optimal: 1000, falloff: 500, sigResolution: 40,
    };
    readout.update({ shipA: drone, shipB: sideValues() });
    expect(els.shipA.trackingReadout.textContent).toBe("150 Score");
  });
});
