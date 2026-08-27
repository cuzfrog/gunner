import { toShipId, toTypeId } from "../../gamedata/ids";
import { StaticItemNameResolver } from "../../gamedata/itemNames";
import { createSimValueParser } from "../../sim";
import { ProfileTextParser } from "./profileTextParser";
import { ProfileTextSerializer } from "./profileTextSerializer";
import { MINIMAL_PROFILE, SHIP_A_FITTED_HULL } from "./profileText.testSupport";
import type { ProfileSettings } from "../userSettings";
import { makeShips, makeChargeCatalog, RIFTER_PROFILE } from "../localSettingsStore.testSupport";

const simValueParser = createSimValueParser();
const ships = makeShips();
ships.findHull = vi.fn((name: string) => (name === "Rifter" ? RIFTER_PROFILE : undefined));
const chargeCatalog = makeChargeCatalog();
const itemNameResolver = new StaticItemNameResolver();
const parser = new ProfileTextParser({ simValueParser, ships, chargeCatalog, itemNameResolver });
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
    const text = `# gunner v1\nshipA.tracking=0.32\nshipA.sigRes=S\nshipA.optimal=5000\nshipA.falloff=5000\nshipA.speed=0\nshipA.mode=keepAtRange\nshipA.range=5000\nshipA.mass=1200000\nshipA.inertia=3\ninitialDistance=5000\nshipB.speed=1000\nshipB.mode=orbit\nshipB.range=5000\nshipB.mass=10000000\nshipB.inertia=0.45\nshipB.sig=40`;
    expect(parser.parse(text)).toBeUndefined();
  });

  test("accepts CRLF line endings", () => {
    const text = serializer.serialize(MINIMAL_PROFILE).split("\n").join("\r\n");
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("rejects prototype-polluting sigRes values", () => {
    const text = `# gunner v1\nversion=12\nshipA.tracking=0.32\nshipA.sigRes=toString\nshipA.optimal=5000\nshipA.falloff=5000\nshipA.speed=0\nshipA.mode=keepAtRange\nshipA.range=5000\nshipA.mass=1200000\nshipA.inertia=3\ninitialDistance=5000\nshipB.speed=1000\nshipB.mode=orbit\nshipB.range=5000\nshipB.mass=10000000\nshipB.inertia=0.45\nshipB.sig=40`;
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
    const text = `# gunner v1\nversion=12\nshipA.fitting:\n---`;
    expect(parser.parse(text)).toBeUndefined();
  });

  test("reads a shipA ammo line", () => {
    const text = `# gunner v1\nversion=12\nshipA.ammo=Hail S\nshipA.tracking=0.32\nshipA.sigRes=S\nshipA.optimal=5000\nshipA.falloff=5000\nshipA.speed=0\nshipA.mode=keepAtRange\nshipA.range=5000\nshipA.mass=1200000\nshipA.inertia=3\ninitialDistance=5000\nshipB.speed=1000\nshipB.mode=orbit\nshipB.range=5000\nshipB.mass=10000000\nshipB.inertia=0.45\nshipB.sig=40`;
    expect(parser.parse(text)).toEqual({ ...MINIMAL_PROFILE, shipAAmmo: toTypeId("12608") });
  });

  test("reads a shipB ammo line", () => {
    const text = `# gunner v1\nversion=12\nshipB.ammo=Republic Fleet EMP S\nshipA.tracking=0.32\nshipA.sigRes=S\nshipA.optimal=5000\nshipA.falloff=5000\nshipA.speed=0\nshipA.mode=keepAtRange\nshipA.range=5000\nshipA.mass=1200000\nshipA.inertia=3\ninitialDistance=5000\nshipB.speed=1000\nshipB.mode=orbit\nshipB.range=5000\nshipB.mass=10000000\nshipB.inertia=0.45\nshipB.sig=40`;
    expect(parser.parse(text)).toEqual({ ...MINIMAL_PROFILE, shipBAmmo: toTypeId("21898") });
  });

  test("ignores an ewar activation line with an invalid disruptor script", () => {
    const text = `${serializer.serialize(MINIMAL_PROFILE)}\nshipA.ewarActivation={"webs":[true],"disruptors":[{"active":true,"script":""}]}`;
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("ignores an ewar activation line with malformed JSON", () => {
    const text = `${serializer.serialize(MINIMAL_PROFILE)}\nshipA.ewarActivation={not json`;
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("resolves a legacy-wraith hull id in profile text", () => {
    const text = `# gunner v1
version=12
shipA.tracking=0.32
shipA.sigRes=S
shipA.optimal=5000
shipA.falloff=5000
shipA.hullId=legacy-wraith
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
    expect(parser.parse(text)).toEqual({
      ...MINIMAL_PROFILE,
      shipAHullId: toShipId("legacy-wraith"),
    });
  });

  test("degrades a garbage shipA hull id while keeping the rest of the profile", () => {
    const text = `# gunner v1
version=12
shipA.tracking=0.32
shipA.sigRes=S
shipA.optimal=5000
shipA.falloff=5000
shipA.hullId=999999999
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
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("degrades a garbage shipA hull id while keeping shipB hull", () => {
    const text = `# gunner v1
version=12
shipA.tracking=0.32
shipA.sigRes=S
shipA.optimal=5000
shipA.falloff=5000
shipA.hullId=999999999
shipB.hullId=16242
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
    expect(parser.parse(text)).toEqual({
      ...MINIMAL_PROFILE,
      shipBHullId: toShipId("16242"),
    });
  });

  test("degrades an invalid propulsion id in profile text", () => {
    const text = `${serializer.serialize(MINIMAL_PROFILE)}
shipA.propulsion=ab-5mn`;
    expect(parser.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("rejects a structurally invalid numeric field even when a hull is resolvable", () => {
    const text = `# gunner v1
version=12
shipA.tracking=0.32
shipA.sigRes=S
shipA.optimal=5000
shipA.falloff=5000
shipA.hullId=Rifter
shipA.speed=0
shipA.mode=keepAtRange
shipA.range=5000
shipA.mass=1200000
shipA.inertia=3
initialDistance=abc
shipB.speed=1000
shipB.mode=orbit
shipB.range=5000
shipB.mass=10000000
shipB.inertia=0.45
shipB.sig=40`;
    expect(parser.parse(text)).toBeUndefined();
  });

  test("resolves legacy hull and ammo names to stable IDs", () => {
    const text = `# gunner v1
version=12
shipA.tracking=0.32
shipA.sigRes=S
shipA.optimal=5000
shipA.falloff=5000
shipA.hullId=Rifter
shipA.ammo=Hail S
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
    expect(parser.parse(text)).toEqual({
      ...MINIMAL_PROFILE,
      shipAHullId: toShipId("587"),
      shipAAmmo: toTypeId("12608"),
    });
  });

  test("ewar activation can appear before the side overload field", () => {
    const base = `# gunner v1
version=12
shipA.tracking=0.32
shipA.sigRes=S
shipA.optimal=5000
shipA.falloff=5000
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
