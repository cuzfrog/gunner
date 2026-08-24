import type { ProfileSettings } from "./userSettings";
import { isOptionalEwarActivation, profilesEqual } from "./validators";

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

describe("isOptionalEwarActivation", () => {
  test("accepts a valid activation with webs and scripted disruptors", () => {
    expect(isOptionalEwarActivation({
      webs: [{ active: true, overloaded: false }, { active: false, overloaded: true }],
      disruptors: [{ active: true, overloaded: true, script: "Optimal Range Disruption Script" }],
    })).toBe(true);
  });

  test("accepts legacy boolean webs and disruptors without overloaded", () => {
    expect(isOptionalEwarActivation({ webs: [true, false], disruptors: [{ active: true, script: "none" }] })).toBe(true);
  });

  test("accepts undefined", () => {
    expect(isOptionalEwarActivation(undefined)).toBe(true);
  });

  test("accepts empty activation", () => {
    expect(isOptionalEwarActivation({})).toBe(true);
  });

  test("rejects a non-boolean web entry", () => {
    expect(isOptionalEwarActivation({ webs: [true, "false"] })).toBe(false);
  });

  test("rejects a web object missing the active flag", () => {
    expect(isOptionalEwarActivation({ webs: [{ overloaded: true }] })).toBe(false);
  });

  test("rejects a non-string disruptor script", () => {
    expect(isOptionalEwarActivation({ disruptors: [{ active: true, script: 123 }] })).toBe(false);
  });

  test("rejects a disruptor row missing the active flag", () => {
    expect(isOptionalEwarActivation({ disruptors: [{ script: "none" }] })).toBe(false);
  });
});

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
