import { USER_SETTINGS_VERSION, type ProfileEquality, type ProfileSettings } from "../../../appstate";
import type { TypeId } from "../../../gamedata/ids";
import { ProfileChangeTrackerImpl } from "./profileChangeTracker";

const BASE_PROFILE: ProfileSettings = {
  version: USER_SETTINGS_VERSION,
  shipATracking: 0.32,
  shipASigRes: "S",
  shipAOptimal: 5000,
  shipAFalloff: 5000,
  shipBTracking: 0.32,
  shipBSigRes: "S",
  shipBOptimal: 5000,
  shipBFalloff: 5000,
  shipASpeed: 0,
  shipAMode: "keepAtRange",
  shipARange: 5000,
  shipAMass: 1_200_000,
  shipAInertia: 3,
  initialDistance: 5000,
  shipBSpeed: 1000,
  shipBMode: "orbit",
  shipBRange: 5000,
  shipBMass: 10_000_000,
  shipBInertia: 0.45,
  shipBSig: 40,
  shipAAmmo: "12608" as TypeId,
};

function fakeEquality(result: boolean): ProfileEquality {
  return { equal() { return result; } };
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
    expect(tracker.hasUnsavedChanges({ ...BASE_PROFILE, shipAOptimal: 9999 })).toBe(true);
  });

  test("hasUnsavedChanges is false when equality reports equal", () => {
    const tracker = new ProfileChangeTrackerImpl({ equality: fakeEquality(true) });
    tracker.setBaseline(BASE_PROFILE);
    expect(tracker.hasUnsavedChanges({ ...BASE_PROFILE, shipAOptimal: 9999 })).toBe(false);
  });

  test("setBaseline(undefined) clears the baseline", () => {
    const tracker = new ProfileChangeTrackerImpl({ equality: fakeEquality(false) });
    tracker.setBaseline(BASE_PROFILE);
    expect(tracker.hasUnsavedChanges({ ...BASE_PROFILE, shipAOptimal: 9999 })).toBe(true);
    tracker.setBaseline(undefined);
    expect(tracker.hasUnsavedChanges({ ...BASE_PROFILE, shipAOptimal: 9999 })).toBe(false);
  });

  test("clearBaseline clears the baseline", () => {
    const tracker = new ProfileChangeTrackerImpl({ equality: fakeEquality(false) });
    tracker.setBaseline(BASE_PROFILE);
    expect(tracker.hasUnsavedChanges({ ...BASE_PROFILE, shipAOptimal: 9999 })).toBe(true);
    tracker.clearBaseline();
    expect(tracker.hasUnsavedChanges({ ...BASE_PROFILE, shipAOptimal: 9999 })).toBe(false);
  });
});
