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
    version: 8,
    tracking: 0.32,
    sigRes: "S",
    optimal: 5000,
    falloff: 5000,
    attackerSpeed: 1000,
    attackerMode: "keepAtRange",
    attackerRange: 5000,
    attackerMass: 1_000_000,
    attackerInertia: 2,
    initialDistance: 5000,
    targetSpeed: 1000,
    targetMode: "orbit",
    targetRange: 5000,
    targetMass: 1_000_000,
    targetInertia: 2,
    targetSig: 40,
    attackerAmmo: "Hail S",
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
    const b = baseProfileSettings({ attackerSpeed: 2000 });
    expect(equality.equal(a, b)).toBe(false);
  });

  test("detects inequality for differing nested fitted hull mass", () => {
    const equality = new CanonicalProfileEquality();
    const a = baseProfileSettings({
      attackerFittedHull: { ...baseFittedHullSummary, fitted: { ...baseFittedHull, mass: 1_000_000 } },
    });
    const b = baseProfileSettings({
      attackerFittedHull: { ...baseFittedHullSummary, fitted: { ...baseFittedHull, mass: 2_000_000 } },
    });
    expect(equality.equal(a, b)).toBe(false);
  });

  test("detects inequality for differing nested e-war activation script", () => {
    const equality = new CanonicalProfileEquality();
    const a = baseProfileSettings({ targetEwarActivation: baseEwarActivation });
    const b = baseProfileSettings({
      targetEwarActivation: { disruptors: [{ active: true, overloaded: false, script: "Script B" }] },
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
    const a = baseProfileSettings({ attackerFittedHull: { ...baseFittedHullSummary, fitted: fittedA } });
    const b = baseProfileSettings({ attackerFittedHull: { ...baseFittedHullSummary, fitted: fittedB } });
    expect(equality.equal(a, b)).toBe(true);
  });
});
