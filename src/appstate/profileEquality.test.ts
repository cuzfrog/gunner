import type { FittedHull } from "../ships";
import type { FittedHullSummary, ProfileSettings, StoredEwarActivation } from "./userSettings";
import { CanonicalProfileEquality } from "./profileEquality";

const baseFittedHull: FittedHull = {
  mass: 1_000_000,
  massMultiplier: 1,
  speedMultiplier: 1,
  inertiaMultiplier: 1,
  sigMultiplier: 1,
  sigRadiusAdd: 0,
};

const baseFittedHullSummary: FittedHullSummary = {
  fittingName: "Test Hull",
  fitted: baseFittedHull,
};

const baseEwarActivation: StoredEwarActivation = {
  disruptors: [{ active: true, overloaded: false, script: "Script A" }],
};

function baseProfileSettings(overrides: Partial<ProfileSettings> = {}): ProfileSettings {
  return {
    version: 10,
    shipATracking: 0.32,
    shipASigRes: "S",
    shipAOptimal: 5000,
    shipAFalloff: 5000,
    shipBTracking: 0.32,
    shipBSigRes: "S",
    shipBOptimal: 5000,
    shipBFalloff: 5000,
    shipASpeed: 1000,
    shipAMode: "keepAtRange",
    shipARange: 5000,
    shipAMass: 1_000_000,
    shipAInertia: 2,
    initialDistance: 5000,
    shipBSpeed: 1000,
    shipBMode: "orbit",
    shipBRange: 5000,
    shipBMass: 1_000_000,
    shipBInertia: 2,
    shipBSig: 40,
    shipAAmmo: "Hail S",
    ...overrides,
  };
}

describe("CanonicalProfileEquality", () => {
  test("detects equality independent of key order", () => {
    const equality = new CanonicalProfileEquality();
    const a = baseProfileSettings();
    const b = { ...Object.fromEntries([...Object.entries(a)].reverse()) } as ProfileSettings;
    expect(equality.equal(a, b)).toBe(true);
  });

  test("detects inequality for differing profile values", () => {
    const equality = new CanonicalProfileEquality();
    const a = baseProfileSettings();
    const b = baseProfileSettings({ shipASpeed: 2000 });
    expect(equality.equal(a, b)).toBe(false);
  });

  test("detects inequality for differing nested fitted hull mass", () => {
    const equality = new CanonicalProfileEquality();
    const a = baseProfileSettings({
      shipAFittedHull: { ...baseFittedHullSummary, fitted: { ...baseFittedHull, mass: 1_000_000 } },
    });
    const b = baseProfileSettings({
      shipAFittedHull: { ...baseFittedHullSummary, fitted: { ...baseFittedHull, mass: 2_000_000 } },
    });
    expect(equality.equal(a, b)).toBe(false);
  });

  test("detects inequality for differing nested e-war activation script", () => {
    const equality = new CanonicalProfileEquality();
    const a = baseProfileSettings({ shipBEwarActivation: baseEwarActivation });
    const b = baseProfileSettings({
      shipBEwarActivation: { disruptors: [{ active: true, overloaded: false, script: "Script B" }] },
    });
    expect(equality.equal(a, b)).toBe(false);
  });

  test("detects equality independent of nested key order", () => {
    const equality = new CanonicalProfileEquality();
    const fittedA: FittedHull = {
      mass: 1_000_000,
      massMultiplier: 1,
      speedMultiplier: 1,
      inertiaMultiplier: 1,
      sigMultiplier: 1,
      sigRadiusAdd: 0,
    };
    const fittedB: FittedHull = {
      sigRadiusAdd: 0,
      sigMultiplier: 1,
      inertiaMultiplier: 1,
      speedMultiplier: 1,
      massMultiplier: 1,
      mass: 1_000_000,
    };
    const a = baseProfileSettings({ shipAFittedHull: { ...baseFittedHullSummary, fitted: fittedA } });
    const b = baseProfileSettings({ shipAFittedHull: { ...baseFittedHullSummary, fitted: fittedB } });
    expect(equality.equal(a, b)).toBe(true);
  });
});
