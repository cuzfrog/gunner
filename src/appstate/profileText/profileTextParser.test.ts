import { isAutopilotMode, isSigResolutionClass } from "../../sim";
import { ProfileTextParser } from "./profileTextParser";
import { ProfileTextSerializer } from "./profileTextSerializer";
import { MINIMAL_PROFILE, SHIP_A_FITTED_HULL } from "./profileText.testSupport";
import type { ProfileSettings } from "../userSettings";
import type { SettingGuards } from "../settingGuards";

const guards: SettingGuards = { isAutopilotMode, isSigResolutionClass };
const parser = new ProfileTextParser(guards);
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
    const text = `# gunner v1\noverride.shipA.foo=42`;
    expect(parser.parse(text)).toBeUndefined();
  });

  test("ignores leading blank lines", () => {
    const text = `\n\n${serializer.serialize(MINIMAL_PROFILE)}`;
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("rejects a missing version field", () => {
    const text = `# gunner v1\ntracking=0.32\nsigRes=S\noptimal=5000\nfalloff=5000\nshipA.speed=0\nshipA.mode=keepAtRange\nshipA.range=5000\nshipA.mass=1200000\nshipA.inertia=3\ninitialDistance=5000\nshipB.speed=1000\nshipB.mode=orbit\nshipB.range=5000\nshipB.mass=10000000\nshipB.inertia=0.45\nshipB.sig=40\nsimSpeed=4`;
    expect(parser.parse(text)).toBeUndefined();
  });

  test("accepts CRLF line endings", () => {
    const text = serializer.serialize(MINIMAL_PROFILE).split("\n").join("\r\n");
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("rejects prototype-polluting sigRes values", () => {
    const text = `# gunner v1\nversion=10\ntracking=0.32\nsigRes=toString\noptimal=5000\nfalloff=5000\nshipA.speed=0\nshipA.mode=keepAtRange\nshipA.range=5000\nshipA.mass=1200000\nshipA.inertia=3\ninitialDistance=5000\nshipB.speed=1000\nshipB.mode=orbit\nshipB.range=5000\nshipB.mass=10000000\nshipB.inertia=0.45\nshipB.sig=40\nsimSpeed=4`;
    expect(parser.parse(text)).toBeUndefined();
  });

  test("rejects a fitted hull with zero multipliers", () => {
    const badHull = { ...SHIP_A_FITTED_HULL, fitted: { ...SHIP_A_FITTED_HULL.fitted, massMultiplier: 0 } };
    const text = serializer.serialize(MINIMAL_PROFILE).replace("shipA.speed=", `shipA.fittedHull=${JSON.stringify(badHull)}\nshipA.speed=`);
    expect(parser.parse(text)).toBeUndefined();
  });

  test("rejects a fitted hull missing sigRadiusAdd", () => {
    const { sigRadiusAdd: _, ...fitted } = SHIP_A_FITTED_HULL.fitted;
    const badHull = { ...SHIP_A_FITTED_HULL, fitted };
    const text = serializer.serialize(MINIMAL_PROFILE).replace("shipA.speed=", `shipA.fittedHull=${JSON.stringify(badHull)}\nshipA.speed=`);
    expect(parser.parse(text)).toBeUndefined();
  });

  test("rejects an empty fitting block", () => {
    const text = `# gunner v1\nversion=10\nshipA.fitting:\n---`;
    expect(parser.parse(text)).toBeUndefined();
  });

  test("reads a global ammo line", () => {
    const text = `# gunner v1\nversion=10\nammo=Hail S\ntracking=0.32\nsigRes=S\noptimal=5000\nfalloff=5000\nshipA.speed=0\nshipA.mode=keepAtRange\nshipA.range=5000\nshipA.mass=1200000\nshipA.inertia=3\ninitialDistance=5000\nshipB.speed=1000\nshipB.mode=orbit\nshipB.range=5000\nshipB.mass=10000000\nshipB.inertia=0.45\nshipB.sig=40\nsimSpeed=4`;
    expect(parser.parse(text)).toEqual({ ...MINIMAL_PROFILE, shipAAmmo: "Hail S" });
  });

  test("ignores an ewar activation line with an invalid disruptor script", () => {
    const text = `${serializer.serialize(MINIMAL_PROFILE)}\nshipA.ewarActivation={"webs":[true],"disruptors":[{"active":true,"script":""}]}`;
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("ignores an ewar activation line with malformed JSON", () => {
    const text = `${serializer.serialize(MINIMAL_PROFILE)}\nshipA.ewarActivation={not json`;
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("still accepts a legacy shipA.ammo line", () => {
    const text = `# gunner v1\nversion=10\nshipA.ammo=Hail S\ntracking=0.32\nsigRes=S\noptimal=5000\nfalloff=5000\nshipA.speed=0\nshipA.mode=keepAtRange\nshipA.range=5000\nshipA.mass=1200000\nshipA.inertia=3\ninitialDistance=5000\nshipB.speed=1000\nshipB.mode=orbit\nshipB.range=5000\nshipB.mass=10000000\nshipB.inertia=0.45\nshipB.sig=40\nsimSpeed=4`;
    expect(parser.parse(text)).toEqual({ ...MINIMAL_PROFILE, shipAAmmo: "Hail S" });
  });

  test("normalizes legacy attacker and target dot keys to shipA and shipB", () => {
    const text = `# gunner v1
version=10
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
target.sig=40
simSpeed=4`;
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("normalizes legacy override dot keys to shipA and shipB", () => {
    const text = `# gunner v1
version=10
tracking=0.32
sigRes=S
optimal=5000
falloff=5000
shipA.speed=0
shipA.mode=keepAtRange
shipA.range=5000
shipA.mass=1200000
shipA.inertia=3
initialDistance=5000
shipB.speed=1000
shipB.mode=orbit
shipB.range=5000
shipB.mass=10000000
shipB.inertia=0.45
shipB.sig=40
override.attacker.speed=150
override.target.sig=80
override.target.tracking=0.1
simSpeed=4`;
    const parsed = parser.parse(text);
    expect(parsed).toEqual({
      ...MINIMAL_PROFILE,
      shipAOverrides: { shipASpeed: 150 },
      shipBOverrides: { shipBSig: 80, tracking: 0.1 },
    });
  });

  test("ewar activation can appear before the side overload field", () => {
    const base = `# gunner v1
version=10
tracking=0.32
sigRes=S
optimal=5000
falloff=5000
shipA.speed=0
shipA.mode=keepAtRange
shipA.range=5000
shipA.mass=1200000
shipA.inertia=3
initialDistance=5000
shipB.speed=1000
shipB.mode=orbit
shipB.range=5000
shipB.mass=10000000
shipB.inertia=0.45
shipB.sig=40`;
    const text = `${base}\nshipA.ewarActivation={"webs":[{"active":true}]}\nshipA.overload=false`;
    const parsed = parser.parse(text);
    expect(parsed?.shipAEwarActivation?.webs?.[0]).toEqual({ active: true, overloaded: false });
  });
});
