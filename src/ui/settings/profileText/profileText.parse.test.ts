import { PROFILE_TEXT_HEADER, parseProfile, serializeProfile } from "./profileText";
import { MINIMAL_PROFILE, ATTACKER_FITTED_HULL } from "./profileText.testSupport";
import type { ProfileSettings } from "../userSettings";

describe("profileText parsing", () => {
  test("parseProfile returns undefined when the header is missing", () => {
    expect(parseProfile("not a profile")).toBeUndefined();
    expect(parseProfile("\n\n[Rifter, Brawler]")).toBeUndefined();
  });

  test("parseProfile ignores unknown keys for forward compatibility", () => {
    const text = `${serializeProfile(MINIMAL_PROFILE)}\nunknown.key=42`;
    const parsed = parseProfile(text);
    expect(parsed).toEqual(MINIMAL_PROFILE);
  });

  test("parseProfile ignores display preference lines written by older versions", () => {
    const text = `${serializeProfile(MINIMAL_PROFILE)}\nsim.speed=4\ngrid.brightness=0.2`;
    expect(parseProfile(text)).toEqual(MINIMAL_PROFILE);
  });

  test("parseProfile returns undefined for an invalid override key", () => {
    const text = `${PROFILE_TEXT_HEADER}\noverride.attacker.foo=42`;
    expect(parseProfile(text)).toBeUndefined();
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
    const text = serializeProfile(MINIMAL_PROFILE).replace("attacker.speed=", `attacker.fittedHull=${JSON.stringify(badHull)}\nattacker.speed=`);
    expect(parseProfile(text)).toBeUndefined();
  });

  test("parseProfile rejects a fitted hull missing sigRadiusAdd", () => {
    const { sigRadiusAdd: _, ...fitted } = ATTACKER_FITTED_HULL.fitted;
    const badHull = { ...ATTACKER_FITTED_HULL, fitted };
    const text = serializeProfile(MINIMAL_PROFILE).replace("attacker.speed=", `attacker.fittedHull=${JSON.stringify(badHull)}\nattacker.speed=`);
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
    const profile = { ...MINIMAL_PROFILE, attackerAmmo: "Hail S" };
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
