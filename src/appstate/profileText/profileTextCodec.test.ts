import { asClass, asFunction, createContainer, InjectionMode, type AwilixContainer } from "awilix";
import { createSimValueParser, type SimValueParser } from "../../sim";
import { toTypeId } from "../../gamedata/ids";
import { StaticItemNameResolver } from "../../gamedata/itemNames";
import type { ChargeCatalog } from "../../fitting";
import type { ItemNameResolver } from "../../gamedata/itemNames";
import type { Ships } from "../../ships";
import { LocalProfileTextCodec, type ProfileTextCodec } from "./profileTextCodec";
import { FULL_PROFILE, MINIMAL_PROFILE } from "./profileText.testSupport";
import type { ProfileSettings } from "../userSettings";
import { makeShips, makeChargeCatalog, RIFTER_PROFILE } from "../localSettingsStore.testSupport";

const simValueParser = createSimValueParser();
const ships = makeShips();
ships.findHull = vi.fn((name: string) => (name === "Rifter" ? RIFTER_PROFILE : undefined));
const chargeCatalog = makeChargeCatalog();
const itemNameResolver = new StaticItemNameResolver();
const codec = new LocalProfileTextCodec({ simValueParser, ships, chargeCatalog, itemNameResolver });

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

  test("golden profile text round-trip preserves FULL_PROFILE", () => {
    const text = codec.serialize(FULL_PROFILE);
    expect(codec.parse(text)).toEqual(FULL_PROFILE);
  });

  test("round-trips a minimal profile without fittings or overrides", () => {
    const text = codec.serialize(MINIMAL_PROFILE);
    expect(codec.parse(text)).toEqual(MINIMAL_PROFILE);
  });

  test("round-trips a profile with deselected propulsion modules", () => {
    const profile: ProfileSettings = { ...MINIMAL_PROFILE, shipAPropulsion: "none", shipBPropulsion: "none" };
    expect(codec.parse(codec.serialize(profile))).toEqual(profile);
  });

  test("round-trips a profile with midships mode for both sides", () => {
    const profile: ProfileSettings = { ...MINIMAL_PROFILE, shipAMode: "midships", shipBMode: "midships" };
    expect(codec.parse(codec.serialize(profile))).toEqual(profile);
  });

  test("fitting body preserves blank lines and empty slot stubs", () => {
    const fitting = `[Rifter, Brawler]
5MN Y-T8 Compact Microwarpdrive

[Empty Low slot]
[Empty Low slot]`;
    const profile = { ...MINIMAL_PROFILE, shipAFitting: fitting };
    expect(codec.parse(codec.serialize(profile))?.shipAFitting).toBe(fitting);
  });

  test("round-trips a profile with ewar activations", () => {
    const profile: ProfileSettings = {
      ...MINIMAL_PROFILE,
      shipAEwarActivation: {
        webs: [{ active: true, overloaded: false }, { active: false, overloaded: true }],
        disruptors: [{ active: true, overloaded: true, script: toTypeId("29007") }],
      },
      shipBEwarActivation: {
        webs: [{ active: false, overloaded: false }],
        disruptors: [{ active: false, overloaded: true, script: "none" }],
      },
    };
    expect(codec.parse(codec.serialize(profile))).toEqual(profile);
  });

  test("migrates legacy v6 enum disruptor scripts in profile text", () => {
    const base = codec.serialize(MINIMAL_PROFILE);
    const shipAEwar = JSON.stringify({ webs: [true], disruptors: [{ active: true, script: "trackingSpeed" }] });
    const shipBEwar = JSON.stringify({ webs: [false], disruptors: [{ active: true, script: "optimalRange" }] });
    const parsed = codec.parse(`${base}\nshipA.ewarActivation=${shipAEwar}\nshipB.ewarActivation=${shipBEwar}`);
    expect(parsed?.shipAEwarActivation?.disruptors?.[0]?.script).toBe(toTypeId("29007"));
    expect(parsed?.shipAEwarActivation?.disruptors?.[0]?.overloaded).toBe(true);
    expect(parsed?.shipBEwarActivation?.disruptors?.[0]?.script).toBe(toTypeId("29005"));
    expect(parsed?.shipBEwarActivation?.disruptors?.[0]?.overloaded).toBe(true);
  });

  test("migrates v5 boolean web activation and inherits side overload from the profile", () => {
    const base = codec.serialize(MINIMAL_PROFILE);
    const shipAEwar = JSON.stringify({ webs: [true] });
    const shipBEwar = JSON.stringify({ webs: [false] });
    const parsed = codec.parse(`${base}\nshipA.overload=false\nshipA.ewarActivation=${shipAEwar}\nshipB.overload=false\nshipB.ewarActivation=${shipBEwar}`);
    expect(parsed?.shipAEwarActivation?.webs?.[0]).toEqual({ active: true, overloaded: false });
    expect(parsed?.shipBEwarActivation?.webs?.[0]).toEqual({ active: false, overloaded: false });
  });

  test("migrates missing per-module overload from explicit side overload", () => {
    const base = codec.serialize(MINIMAL_PROFILE);
    const shipAEwar = JSON.stringify({ webs: [{ active: true }], disruptors: [{ active: true, script: "none" }] });
    const shipBEwar = JSON.stringify({ webs: [{ active: false }], disruptors: [{ active: true, script: "optimalRange" }] });
    const parsed = codec.parse(`${base}\nshipA.overload=false\nshipA.ewarActivation=${shipAEwar}\nshipB.overload=true\nshipB.ewarActivation=${shipBEwar}`);
    expect(parsed?.shipAEwarActivation?.webs?.[0]).toEqual({ active: true, overloaded: false });
    expect(parsed?.shipAEwarActivation?.disruptors?.[0]).toEqual({ active: true, overloaded: false, script: "none" });
    expect(parsed?.shipBEwarActivation?.webs?.[0]).toEqual({ active: false, overloaded: true });
    expect(parsed?.shipBEwarActivation?.disruptors?.[0]).toEqual({ active: true, overloaded: true, script: toTypeId("29005") });
  });

  test("migration is idempotent for already-migrated version 8 activation", () => {
    const base = codec.serialize(MINIMAL_PROFILE);
    const shipAEwar = JSON.stringify({ webs: [{ active: true, overloaded: false }], disruptors: [{ active: true, overloaded: false, script: "Tracking Speed Disruption Script" }] });
    const shipBEwar = JSON.stringify({ webs: [{ active: false, overloaded: true }], disruptors: [{ active: false, overloaded: true, script: "none" }] });
    const parsed = codec.parse(`${base}\nshipA.overload=true\nshipA.ewarActivation=${shipAEwar}\nshipB.overload=true\nshipB.ewarActivation=${shipBEwar}`);
    expect(parsed?.shipAEwarActivation).toEqual({ webs: [{ active: true, overloaded: false }], disruptors: [{ active: true, overloaded: false, script: toTypeId("29007") }] });
    expect(parsed?.shipBEwarActivation).toEqual({ webs: [{ active: false, overloaded: true }], disruptors: [{ active: false, overloaded: true, script: "none" }] });
  });

  test("a profile without ewar activations parses with defaults", () => {
    const text = `# gunner v1
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
    const parsed = codec.parse(text);
    expect(parsed).not.toBeUndefined();
    expect(parsed?.shipAEwarActivation).toBeUndefined();
    expect(parsed?.shipBEwarActivation).toBeUndefined();
  });

  test("round-trips grappler and booster activations with script and none sentinel", () => {
    const profile: ProfileSettings = {
      ...MINIMAL_PROFILE,
      shipAEwarActivation: {
        webs: [],
        grapplers: [{ active: true, overloaded: true }],
        disruptors: [],
        scramblers: [],
      },
      shipABoosterActivation: [{ active: false, script: toTypeId("28999") }, { active: true, script: "none" }],
      shipBBoosterActivation: [{ active: true, script: "none" }],
    };
    expect(codec.parse(codec.serialize(profile))).toEqual(profile);
  });

  test("parses profile text when constructed through the DI container", () => {
    interface RegressionCradle {
      readonly simValueParser: SimValueParser;
      readonly ships: Ships;
      readonly chargeCatalog: ChargeCatalog;
      readonly itemNameResolver: ItemNameResolver;
      readonly profileTextCodec: ProfileTextCodec;
    }
    const container: AwilixContainer<RegressionCradle> = createContainer<RegressionCradle>({ injectionMode: InjectionMode.PROXY });
    container.register({
      simValueParser: asFunction(createSimValueParser).singleton(),
      ships: asFunction(() => ships).singleton(),
      chargeCatalog: asFunction(() => chargeCatalog).singleton(),
      itemNameResolver: asFunction(() => itemNameResolver).singleton(),
      profileTextCodec: asClass(LocalProfileTextCodec).singleton(),
    });
    const parsed = container.cradle.profileTextCodec.parse(codec.serialize(MINIMAL_PROFILE));
    expect(parsed).toBeDefined();
  });
});
