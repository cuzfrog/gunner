import type { FittedHullSummary, ProfileSettings } from "./settings";
import { PROFILE_TEXT_HEADER, parseProfile, serializeProfile } from "./profileText";

const RIFTER_FITTING = `[Rifter, Brawler]
5MN Y-T8 Compact Microwarpdrive
150mm Light AutoCannon II, Hail S`;

const THRASHER_FITTING = `[Thrasher, Sniper]
280mm Howitzer Artillery I, Republic Fleet EMP S
5MN Y-T8 Compact Microwarpdrive`;

const ATTACKER_FITTED_HULL: FittedHullSummary = {
  fittingName: "Brawler",
  propulsionId: "mwd-5mn",
  fitted: {
    mass: 1_000_000,
    massMultiplier: 1,
    speedMultiplier: 1,
    inertiaMultiplier: 1,
    sigMultiplier: 1,
    sigRadiusAdd: 0,
  },
  propulsion: {
    thrust: 1_500_000,
    speedBonus: 5,
    massAddition: 500_000,
    sigBloom: 5,
  },
};

const TARGET_FITTED_HULL: FittedHullSummary = {
  fittingName: "Sniper",
  propulsionId: "mwd-5mn",
  fitted: {
    mass: 1_500_000,
    massMultiplier: 1,
    speedMultiplier: 1,
    inertiaMultiplier: 1,
    sigMultiplier: 1,
    sigRadiusAdd: 0,
  },
  propulsion: {
    thrust: 1_500_000,
    speedBonus: 5,
    massAddition: 500_000,
    sigBloom: 5,
  },
};

const FULL_PROFILE: ProfileSettings = {
  version: 6,
  tracking: 0.315,
  sigRes: "S",
  optimal: 600,
  falloff: 3000,
  attackerSpeed: 4649.72,
  attackerMode: "keepAtRange",
  attackerRange: 5000,
  maneuverAggressivity: 1,
  gridBrightness: 0.2,
  attackerMass: 1_500_000,
  attackerInertia: 2,
  attackerSkillLevel: 5,
  attackerOverload: true,
  initialDistance: 5000,
  targetSpeed: 1000,
  targetMode: "orbit",
  targetRange: 5000,
  targetMass: 10_000_000,
  targetInertia: 0.45,
  targetSig: 40,
  targetSkillLevel: 5,
  targetOverload: true,
  attackerHull: "Rifter",
  attackerPropulsion: "mwd-5mn",
  targetHull: "Thrasher",
  targetPropulsion: "mwd-5mn",
  attackerFitting: RIFTER_FITTING,
  attackerOverrides: { attackerMass: 2_000_000, tracking: 0.12 },
  targetFitting: THRASHER_FITTING,
  targetOverrides: { targetMass: 11_000_000 },
  attackerFittedHull: ATTACKER_FITTED_HULL,
  targetFittedHull: TARGET_FITTED_HULL,
  simSpeed: 4,
};

const MINIMAL_PROFILE: ProfileSettings = {
  version: 6,
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
  simSpeed: 4,
};

describe("profileText", () => {
  test("serializeProfile starts with the v1 header", () => {
    const text = serializeProfile(MINIMAL_PROFILE);
    expect(text.split("\n")[0]).toBe(PROFILE_TEXT_HEADER);
  });

  test("round-trips a full profile with fittings, overrides and fitted hulls", () => {
    const text = serializeProfile(FULL_PROFILE);
    const parsed = parseProfile(text);
    expect(parsed).toEqual(FULL_PROFILE);
  });

  test("round-trips a minimal profile without fittings or overrides", () => {
    const text = serializeProfile(MINIMAL_PROFILE);
    const parsed = parseProfile(text);
    expect(parsed).toEqual(MINIMAL_PROFILE);
  });

  test("round-trips a profile with deselected propulsion modules", () => {
    const profile: ProfileSettings = { ...MINIMAL_PROFILE, attackerPropulsion: "none", targetPropulsion: "none" };
    const text = serializeProfile(profile);
    const parsed = parseProfile(text);
    expect(parsed).toEqual(profile);
  });

  test("parseProfile returns undefined when the header is missing", () => {
    expect(parseProfile("not a profile")).toBeUndefined();
    expect(parseProfile("\n\n[Rifter, Brawler]")).toBeUndefined();
  });

  test("parseProfile returns undefined for an unknown key", () => {
    const text = `${PROFILE_TEXT_HEADER}\nattacker.mass=1000\nunknown.key=42`;
    expect(parseProfile(text)).toBeUndefined();
  });

  test("parseProfile returns undefined for an invalid override key", () => {
    const text = `${PROFILE_TEXT_HEADER}\noverride.attacker.foo=42`;
    expect(parseProfile(text)).toBeUndefined();
  });

  test("fitting body preserves blank lines and empty slot stubs", () => {
    const fitting = `[Rifter, Brawler]
5MN Y-T8 Compact Microwarpdrive

[Empty Low slot]
[Empty Low slot]`;
    const profile: ProfileSettings = { ...MINIMAL_PROFILE, attackerFitting: fitting };
    const text = serializeProfile(profile);
    const parsed = parseProfile(text);
    expect(parsed?.attackerFitting).toBe(fitting);
  });

  test("fitting body rejects the terminator inside the body", () => {
    const fitting = `[Rifter, Brawler]\n---\n5MN Microwarpdrive`;
    expect(() => serializeProfile({ ...MINIMAL_PROFILE, attackerFitting: fitting })).toThrow();
  });

  test("parseProfile ignores leading blank lines", () => {
    const text = `\n\n${serializeProfile(MINIMAL_PROFILE)}`;
    const parsed = parseProfile(text);
    expect(parsed).toEqual(MINIMAL_PROFILE);
  });

  test("parseProfile rejects a missing version field", () => {
    const text = `${PROFILE_TEXT_HEADER}\ntracking=0.32\nsigRes=S\noptimal=5000\nfalloff=5000\nattacker.speed=0\nattacker.mode=keepAtRange\nattacker.range=5000\nattacker.mass=1200000\nattacker.inertia=3\ninitialDistance=5000\ntarget.speed=1000\ntarget.mode=orbit\ntarget.range=5000\ntarget.mass=10000000\ntarget.inertia=0.45\ntarget.sig=40\nsimSpeed=4`;
    expect(parseProfile(text)).toBeUndefined();
  });

  test("parseProfile accepts CRLF line endings", () => {
    const text = serializeProfile(MINIMAL_PROFILE).split("\n").join("\r\n");
    const parsed = parseProfile(text);
    expect(parsed).toEqual(MINIMAL_PROFILE);
  });

  test("parseProfile rejects prototype-polluting sigRes values", () => {
    const text = `${PROFILE_TEXT_HEADER}\nversion=6\ntracking=0.32\nsigRes=toString\noptimal=5000\nfalloff=5000\nattacker.speed=0\nattacker.mode=keepAtRange\nattacker.range=5000\nattacker.mass=1200000\nattacker.inertia=3\ninitialDistance=5000\ntarget.speed=1000\ntarget.mode=orbit\ntarget.range=5000\ntarget.mass=10000000\ntarget.inertia=0.45\ntarget.sig=40\nsimSpeed=4`;
    expect(parseProfile(text)).toBeUndefined();
  });

  test("parseProfile rejects a fitted hull with zero multipliers", () => {
    const badHull = { ...ATTACKER_FITTED_HULL, fitted: { ...ATTACKER_FITTED_HULL.fitted, massMultiplier: 0 } };
    const text = serializeProfile(MINIMAL_PROFILE).replace(
      "attacker.speed=",
      `attacker.fittedHull=${JSON.stringify(badHull)}\nattacker.speed=`,
    );
    expect(parseProfile(text)).toBeUndefined();
  });

  test("parseProfile rejects a fitted hull missing sigRadiusAdd", () => {
    const { sigRadiusAdd: _, ...fitted } = ATTACKER_FITTED_HULL.fitted;
    const badHull = { ...ATTACKER_FITTED_HULL, fitted };
    const text = serializeProfile(MINIMAL_PROFILE).replace(
      "attacker.speed=",
      `attacker.fittedHull=${JSON.stringify(badHull)}\nattacker.speed=`,
    );
    expect(parseProfile(text)).toBeUndefined();
  });

  test("round-trips a profile with midships mode for both sides", () => {
    const profile: ProfileSettings = { ...MINIMAL_PROFILE, attackerMode: "midships", targetMode: "midships" };
    const text = serializeProfile(profile);
    const parsed = parseProfile(text);
    expect(parsed).toEqual(profile);
  });

  test("parseProfile rejects an empty fitting block", () => {
    const text = `${PROFILE_TEXT_HEADER}\nversion=6\nattacker.fitting:\n---`;
    expect(parseProfile(text)).toBeUndefined();
  });

  test("serializeProfile emits a global ammo line", () => {
    const profile: ProfileSettings = { ...MINIMAL_PROFILE, attackerAmmo: "Hail S" };
    const text = serializeProfile(profile);
    expect(text).toContain("ammo=Hail S");
    expect(text).not.toContain("attacker.ammo=");
  });

  test("parseProfile reads a global ammo line", () => {
    const text = `${PROFILE_TEXT_HEADER}\nversion=6\nammo=Hail S\ntracking=0.32\nsigRes=S\noptimal=5000\nfalloff=5000\nattacker.speed=0\nattacker.mode=keepAtRange\nattacker.range=5000\nattacker.mass=1200000\nattacker.inertia=3\ninitialDistance=5000\ntarget.speed=1000\ntarget.mode=orbit\ntarget.range=5000\ntarget.mass=10000000\ntarget.inertia=0.45\ntarget.sig=40\nsimSpeed=4`;
    const parsed = parseProfile(text);
    expect(parsed).toEqual({ ...MINIMAL_PROFILE, attackerAmmo: "Hail S" });
  });

  test("parseProfile still accepts a legacy attacker.ammo line", () => {
    const text = `${PROFILE_TEXT_HEADER}\nversion=6\nattacker.ammo=Hail S\ntracking=0.32\nsigRes=S\noptimal=5000\nfalloff=5000\nattacker.speed=0\nattacker.mode=keepAtRange\nattacker.range=5000\nattacker.mass=1200000\nattacker.inertia=3\ninitialDistance=5000\ntarget.speed=1000\ntarget.mode=orbit\ntarget.range=5000\ntarget.mass=10000000\ntarget.inertia=0.45\ntarget.sig=40\nsimSpeed=4`;
    const parsed = parseProfile(text);
    expect(parsed).toEqual({ ...MINIMAL_PROFILE, attackerAmmo: "Hail S" });
  });
});
