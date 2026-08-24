import type { ProfileSettings } from "../../appstate";
import { USER_SETTINGS_VERSION } from "../../appstate";
import { ProfileChangeTrackerImpl } from "./profileChangeTracker";

const BASE_PROFILE: ProfileSettings = {
  version: USER_SETTINGS_VERSION,
  tracking: 0.32,
  sigRes: "S",
  optimal: 5000,
  falloff: 5000,
  attackerSpeed: 0,
  attackerMode: "keepAtRange",
  attackerRange: 5000,
  attackerMass: 1_200_000,
  attackerInertia: 3,
  initialDistance: 5000,
  targetSpeed: 1000,
  targetMode: "orbit",
  targetRange: 5000,
  targetMass: 10_000_000,
  targetInertia: 0.45,
  targetSig: 40,
  attackerAmmo: "Hail S",
};

function fakeEquality(result: boolean) {
  return { equal: () => result };
}

describe("ProfileChangeTracker", () => {
  test("hasUnsavedChanges is false when no baseline is set", () => {
    const tracker = new ProfileChangeTrackerImpl({ equality: fakeEquality(false) });
    expect(tracker.hasUnsavedChanges(BASE_PROFILE)).toBe(false);
  });

  test("hasUnsavedChanges is false when current is undefined", () => {
    const tracker = new ProfileChangeTrackerImpl({ equality: fakeEquality(false) });
    tracker.setBaseline(BASE_PROFILE);
    expect(tracker.hasUnsavedChanges(undefined)).toBe(false);
  });

  test("hasUnsavedChanges is true when baseline is set and equality reports unequal", () => {
    const tracker = new ProfileChangeTrackerImpl({ equality: fakeEquality(false) });
    tracker.setBaseline(BASE_PROFILE);
    expect(tracker.hasUnsavedChanges({ ...BASE_PROFILE, optimal: 9999 })).toBe(true);
  });

  test("hasUnsavedChanges is false when equality reports equal", () => {
    const tracker = new ProfileChangeTrackerImpl({ equality: fakeEquality(true) });
    tracker.setBaseline(BASE_PROFILE);
    expect(tracker.hasUnsavedChanges({ ...BASE_PROFILE, optimal: 9999 })).toBe(false);
  });

  test("setBaseline(undefined) clears the baseline", () => {
    const tracker = new ProfileChangeTrackerImpl({ equality: fakeEquality(false) });
    tracker.setBaseline(BASE_PROFILE);
    expect(tracker.hasUnsavedChanges({ ...BASE_PROFILE, optimal: 9999 })).toBe(true);
    tracker.setBaseline(undefined);
    expect(tracker.hasUnsavedChanges({ ...BASE_PROFILE, optimal: 9999 })).toBe(false);
  });

  test("clearBaseline clears the baseline", () => {
    const tracker = new ProfileChangeTrackerImpl({ equality: fakeEquality(false) });
    tracker.setBaseline(BASE_PROFILE);
    expect(tracker.hasUnsavedChanges({ ...BASE_PROFILE, optimal: 9999 })).toBe(true);
    tracker.clearBaseline();
    expect(tracker.hasUnsavedChanges({ ...BASE_PROFILE, optimal: 9999 })).toBe(false);
  });
});
