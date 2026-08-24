import { ProfileTextParser } from "./profileTextParser";
import { ProfileTextSerializer } from "./profileTextSerializer";
import { MINIMAL_PROFILE, ATTACKER_FITTED_HULL } from "./profileText.testSupport";
import type { ProfileSettings } from "../userSettings";

const parser = new ProfileTextParser();
const serializer = new ProfileTextSerializer();

describe("profileTextParser", () => {
  test("returns undefined when the header is missing", () => {
    expect(parser.parse("not a profile")).toBeUndefined();
    expect(parser.parse("\n\n[Rifter, Brawler]")).toBeUndefined();
  });

  test("ignores unknown keys for forward compatibility", () => {
    const text = `${serializer.serialize(MINIMAL_PROFILE)}\nunknown.key=42`;
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("ignores display preference lines written by older versions", () => {
    const text = `${serializer.serialize(MINIMAL_PROFILE)}\nsim.speed=4\ngrid.brightness=0.2`;
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("returns undefined for an invalid override key", () => {
    const text = `# gunner v1\noverride.attacker.foo=42`;
    expect(parser.parse(text)).toBeUndefined();
  });

  test("ignores leading blank lines", () => {
    const text = `\n\n${serializer.serialize(MINIMAL_PROFILE)}`;
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("rejects a missing version field", () => {
    const text = `# gunner v1\ntracking=0.32\nsigRes=S\noptimal=5000\nfalloff=5000\nattacker.speed=0\nattacker.mode=keepAtRange\nattacker.range=5000\nattacker.mass=1200000\nattacker.inertia=3\ninitialDistance=5000\ntarget.speed=1000\ntarget.mode=orbit\ntarget.range=5000\ntarget.mass=10000000\ntarget.inertia=0.45\ntarget.sig=40\nsimSpeed=4`;
    expect(parser.parse(text)).toBeUndefined();
  });

  test("accepts CRLF line endings", () => {
    const text = serializer.serialize(MINIMAL_PROFILE).split("\n").join("\r\n");
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("rejects prototype-polluting sigRes values", () => {
    const text = `# gunner v1\nversion=8\ntracking=0.32\nsigRes=toString\noptimal=5000\nfalloff=5000\nattacker.speed=0\nattacker.mode=keepAtRange\nattacker.range=5000\nattacker.mass=1200000\nattacker.inertia=3\ninitialDistance=5000\ntarget.speed=1000\ntarget.mode=orbit\ntarget.range=5000\ntarget.mass=10000000\ntarget.inertia=0.45\ntarget.sig=40\nsimSpeed=4`;
    expect(parser.parse(text)).toBeUndefined();
  });

  test("rejects a fitted hull with zero multipliers", () => {
    const badHull = { ...ATTACKER_FITTED_HULL, fitted: { ...ATTACKER_FITTED_HULL.fitted, massMultiplier: 0 } };
    const text = serializer.serialize(MINIMAL_PROFILE).replace("attacker.speed=", `attacker.fittedHull=${JSON.stringify(badHull)}\nattacker.speed=`);
    expect(parser.parse(text)).toBeUndefined();
  });

  test("rejects a fitted hull missing sigRadiusAdd", () => {
    const { sigRadiusAdd: _, ...fitted } = ATTACKER_FITTED_HULL.fitted;
    const badHull = { ...ATTACKER_FITTED_HULL, fitted };
    const text = serializer.serialize(MINIMAL_PROFILE).replace("attacker.speed=", `attacker.fittedHull=${JSON.stringify(badHull)}\nattacker.speed=`);
    expect(parser.parse(text)).toBeUndefined();
  });

  test("rejects an empty fitting block", () => {
    const text = `# gunner v1\nversion=8\nattacker.fitting:\n---`;
    expect(parser.parse(text)).toBeUndefined();
  });

  test("reads a global ammo line", () => {
    const text = `# gunner v1\nversion=8\nammo=Hail S\ntracking=0.32\nsigRes=S\noptimal=5000\nfalloff=5000\nattacker.speed=0\nattacker.mode=keepAtRange\nattacker.range=5000\nattacker.mass=1200000\nattacker.inertia=3\ninitialDistance=5000\ntarget.speed=1000\ntarget.mode=orbit\ntarget.range=5000\ntarget.mass=10000000\ntarget.inertia=0.45\ntarget.sig=40\nsimSpeed=4`;
    expect(parser.parse(text)).toEqual({ ...MINIMAL_PROFILE, attackerAmmo: "Hail S" });
  });

  test("ignores an ewar activation line with an invalid disruptor script", () => {
    const text = `${serializer.serialize(MINIMAL_PROFILE)}\nattacker.ewarActivation={"webs":[true],"disruptors":[{"active":true,"script":""}]}`;
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("ignores an ewar activation line with malformed JSON", () => {
    const text = `${serializer.serialize(MINIMAL_PROFILE)}\nattacker.ewarActivation={not json`;
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("still accepts a legacy attacker.ammo line", () => {
    const text = `# gunner v1\nversion=8\nattacker.ammo=Hail S\ntracking=0.32\nsigRes=S\noptimal=5000\nfalloff=5000\nattacker.speed=0\nattacker.mode=keepAtRange\nattacker.range=5000\nattacker.mass=1200000\nattacker.inertia=3\ninitialDistance=5000\ntarget.speed=1000\ntarget.mode=orbit\ntarget.range=5000\ntarget.mass=10000000\ntarget.inertia=0.45\ntarget.sig=40\nsimSpeed=4`;
    expect(parser.parse(text)).toEqual({ ...MINIMAL_PROFILE, attackerAmmo: "Hail S" });
  });

  test("ewar activation can appear before the side overload field", () => {
    const base = `# gunner v1
version=8
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
    const text = `${base}\nattacker.ewarActivation={"webs":[{"active":true}]}\nattacker.overload=false`;
    const parsed = parser.parse(text);
    expect(parsed?.attackerEwarActivation?.webs?.[0]).toEqual({ active: true, overloaded: false });
  });
});
