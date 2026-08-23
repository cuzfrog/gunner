import type { ProfileSettings } from "./userSettings";
import { profilesEqual } from "./validators";

function baseProfileSettings(overrides: Partial<ProfileSettings> = {}): ProfileSettings {
  return {
    version: 6,
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

describe("profilesEqual", () => {
  test("detects equality independent of key order", () => {
    const a = baseProfileSettings();
    const b = { ...Object.fromEntries([...Object.entries(a)].reverse()) } as ProfileSettings;
    expect(profilesEqual(a, b)).toBe(true);
  });

  test("detects inequality for differing profile values", () => {
    const a = baseProfileSettings();
    const b = baseProfileSettings({ attackerSpeed: 2000 });
    expect(profilesEqual(a, b)).toBe(false);
  });
});
