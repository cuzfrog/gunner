import { LocalProfileTextCodec } from "./profileTextCodec";
import { FULL_PROFILE, MINIMAL_PROFILE } from "./profileText.testSupport";
import type { ProfileSettings } from "../userSettings";

const codec = new LocalProfileTextCodec();

describe("profileTextCodec", () => {
  test("serialize starts with the v1 header", () => {
    const text = codec.serialize(MINIMAL_PROFILE);
    expect(text.split("\n")[0]).toBe("# gunner v1");
  });

  test("hasHeader detects the header with leading whitespace", () => {
    expect(codec.hasHeader("# gunner v1\nversion=8")).toBe(true);
    expect(codec.hasHeader("  # gunner v1")).toBe(true);
    expect(codec.hasHeader("not a profile")).toBe(false);
  });

  test("round-trips a full profile with fittings, overrides and fitted hulls", () => {
    const text = codec.serialize(FULL_PROFILE);
    expect(codec.parse(text)).toEqual(FULL_PROFILE);
  });

  test("round-trips a minimal profile without fittings or overrides", () => {
    const text = codec.serialize(MINIMAL_PROFILE);
    expect(codec.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("round-trips a profile with deselected propulsion modules", () => {
    const profile: ProfileSettings = { ...MINIMAL_PROFILE, attackerPropulsion: "none", targetPropulsion: "none" };
    expect(codec.parse(codec.serialize(profile))).toEqual(profile);
  });

  test("round-trips a profile with midships mode for both sides", () => {
    const profile: ProfileSettings = { ...MINIMAL_PROFILE, attackerMode: "midships", targetMode: "midships" };
    expect(codec.parse(codec.serialize(profile))).toEqual(profile);
  });

  test("fitting body preserves blank lines and empty slot stubs", () => {
    const fitting = `[Rifter, Brawler]
5MN Y-T8 Compact Microwarpdrive

[Empty Low slot]
[Empty Low slot]`;
    const profile = { ...MINIMAL_PROFILE, attackerFitting: fitting };
    expect(codec.parse(codec.serialize(profile))?.attackerFitting).toBe(fitting);
  });

  test("round-trips a profile with ewar activations", () => {
    const profile: ProfileSettings = {
      ...MINIMAL_PROFILE,
      attackerEwarActivation: {
        webs: [{ active: true, overloaded: false }, { active: false, overloaded: true }],
        disruptors: [{ active: true, overloaded: true, script: "Tracking Speed Disruption Script" }],
      },
      targetEwarActivation: {
        webs: [{ active: false, overloaded: false }],
        disruptors: [{ active: false, overloaded: true, script: "none" }],
      },
    };
    expect(codec.parse(codec.serialize(profile))).toEqual(profile);
  });

  test("migrates legacy v6 enum disruptor scripts in profile text", () => {
    const base = codec.serialize(MINIMAL_PROFILE);
    const attackerEwar = JSON.stringify({ webs: [true], disruptors: [{ active: true, script: "trackingSpeed" }] });
    const targetEwar = JSON.stringify({ webs: [false], disruptors: [{ active: true, script: "optimalRange" }] });
    const parsed = codec.parse(`${base}\nattacker.ewarActivation=${attackerEwar}\ntarget.ewarActivation=${targetEwar}`);
    expect(parsed?.attackerEwarActivation?.disruptors?.[0]?.script).toBe("Tracking Speed Disruption Script");
    expect(parsed?.attackerEwarActivation?.disruptors?.[0]?.overloaded).toBe(true);
    expect(parsed?.targetEwarActivation?.disruptors?.[0]?.script).toBe("Optimal Range Disruption Script");
    expect(parsed?.targetEwarActivation?.disruptors?.[0]?.overloaded).toBe(true);
  });

  test("migrates v5 boolean web activation and inherits side overload from the profile", () => {
    const base = codec.serialize(MINIMAL_PROFILE);
    const attackerEwar = JSON.stringify({ webs: [true] });
    const targetEwar = JSON.stringify({ webs: [false] });
    const parsed = codec.parse(`${base}\nattacker.overload=false\nattacker.ewarActivation=${attackerEwar}\ntarget.overload=false\ntarget.ewarActivation=${targetEwar}`);
    expect(parsed?.attackerEwarActivation?.webs?.[0]).toEqual({ active: true, overloaded: false });
    expect(parsed?.targetEwarActivation?.webs?.[0]).toEqual({ active: false, overloaded: false });
  });

  test("migrates missing per-module overload from explicit side overload", () => {
    const base = codec.serialize(MINIMAL_PROFILE);
    const attackerEwar = JSON.stringify({ webs: [{ active: true }], disruptors: [{ active: true, script: "none" }] });
    const targetEwar = JSON.stringify({ webs: [{ active: false }], disruptors: [{ active: true, script: "optimalRange" }] });
    const parsed = codec.parse(`${base}\nattacker.overload=false\nattacker.ewarActivation=${attackerEwar}\ntarget.overload=true\ntarget.ewarActivation=${targetEwar}`);
    expect(parsed?.attackerEwarActivation?.webs?.[0]).toEqual({ active: true, overloaded: false });
    expect(parsed?.attackerEwarActivation?.disruptors?.[0]).toEqual({ active: true, overloaded: false, script: "none" });
    expect(parsed?.targetEwarActivation?.webs?.[0]).toEqual({ active: false, overloaded: true });
    expect(parsed?.targetEwarActivation?.disruptors?.[0]).toEqual({ active: true, overloaded: true, script: "Optimal Range Disruption Script" });
  });

  test("migration is idempotent for already-migrated version 8 activation", () => {
    const base = codec.serialize(MINIMAL_PROFILE);
    const attackerEwar = JSON.stringify({ webs: [{ active: true, overloaded: false }], disruptors: [{ active: true, overloaded: false, script: "Tracking Speed Disruption Script" }] });
    const targetEwar = JSON.stringify({ webs: [{ active: false, overloaded: true }], disruptors: [{ active: false, overloaded: true, script: "none" }] });
    const parsed = codec.parse(`${base}\nattacker.overload=true\nattacker.ewarActivation=${attackerEwar}\ntarget.overload=true\ntarget.ewarActivation=${targetEwar}`);
    expect(parsed?.attackerEwarActivation).toEqual({ webs: [{ active: true, overloaded: false }], disruptors: [{ active: true, overloaded: false, script: "Tracking Speed Disruption Script" }] });
    expect(parsed?.targetEwarActivation).toEqual({ webs: [{ active: false, overloaded: true }], disruptors: [{ active: false, overloaded: true, script: "none" }] });
  });

  test("a legacy profile without ewar activations parses with defaults", () => {
    const text = `# gunner v1
version=9
tracking=0.32
sigRes=S
optimal=5000
falloff=5000
attacker.speed=0
attacker.mode=keepAtRange
attacker.range=5000
attacker.mass=1200000
attacker.inertia=3
initialDistance=5000
target.speed=1000
target.mode=orbit
target.range=5000
target.mass=10000000
target.inertia=0.45
target.sig=40`;
    const parsed = codec.parse(text);
    expect(parsed).not.toBeUndefined();
    expect(parsed?.attackerEwarActivation).toBeUndefined();
    expect(parsed?.targetEwarActivation).toBeUndefined();
  });
});
