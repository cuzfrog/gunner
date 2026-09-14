import { createContainer, InjectionMode } from "awilix";
import { registerGameDataModule } from "../gamedata";
import { registerSimModule, type SimCradle } from "../sim";
import { registerShipsModule, type ShipsCradle } from "../ships";
import { registerFittingModule, type FittingCradle } from "../fitting";
import { registerAppstateModule, type AppstateCradle, type SettingsParser } from "../appstate";
import {
  buildMatchupPages,
  buildShipPages,
  eftTextFor,
  firstPresetEft,
  matchupSlug,
  matchupWire,
  presetFitTexts,
  shipProfileCatalog,
  shipWire,
  simulatorDeepLink,
  slugify,
  type ShipPageData,
} from "./_seo";

type SeoCradle = SimCradle & FittingCradle & ShipsCradle & AppstateCradle;

function realParser(): SettingsParser {
  const container = createContainer<SeoCradle>({ injectionMode: InjectionMode.PROXY });
  registerGameDataModule(container);
  registerSimModule(container);
  registerShipsModule(container);
  registerFittingModule(container);
  registerAppstateModule(container);
  return container.cradle.parser;
}

describe("slugify", () => {
  test("lowercases and hyphenates ship names", () => {
    expect(slugify("Thrasher")).toBe("thrasher");
    expect(slugify("Inner Zone Shipping Catalyst")).toBe("inner-zone-shipping-catalyst");
    expect(slugify("Omen  Navy Issue")).toBe("omen-navy-issue");
  });

  test("throws on names that produce no slug", () => {
    expect(() => slugify("***")).toThrow();
  });
});

describe("matchupSlug", () => {
  test("sorts pair sides for a canonical slug", () => {
    expect(matchupSlug("thrasher", "merlin")).toBe("merlin-vs-thrasher");
    expect(matchupSlug("merlin", "thrasher")).toBe("merlin-vs-thrasher");
  });
});

describe("eftTextFor", () => {
  test("prepends the EFT header to the preset body", () => {
    const text = eftTextFor("Thrasher", { name: "Artillery", body: "280mm Artillery Cannon I" });
    expect(text).toBe("[Thrasher, Artillery]\n280mm Artillery Cannon I");
  });
});

describe("buildShipPages", () => {
  const catalog = shipProfileCatalog();
  const presets = presetFitTexts();
  const pages = buildShipPages(catalog, presets);

  test("creates one page per ship profile", () => {
    expect(pages.length).toBe(catalog.all().length);
  });

  test("attaches presets to ships that have them", () => {
    const withPresets = pages.filter((page) => page.presets.length > 0);
    expect(withPresets.length).toBe(presets.listHulls().length);
    const thrasher = requirePage(pages, "Thrasher");
    expect(thrasher.presets.length).toBeGreaterThan(0);
    expect(thrasher.slug).toBe("thrasher");
  });

  test("preset hull names resolve to the same-named ship profile", () => {
    const nameById = new Map(pages.map((page) => [page.profile.id, page.profile.name]));
    for (const hull of presets.listHulls()) {
      const profileName = nameById.get(hull.id);
      const presetName = presets.hullNameFor(hull.id);
      if (profileName === undefined || presetName === undefined) throw new Error(`Preset hull ${hull.id} has no ship profile`);
      expect(profileName).toBe(presetName);
    }
  });
});

describe("buildMatchupPages", () => {
  const catalog = shipProfileCatalog();
  const presets = presetFitTexts();
  const pages = buildShipPages(catalog, presets);
  const matchups = buildMatchupPages(pages);

  test("pairs ships with presets within the same hull class", () => {
    for (const matchup of matchups) {
      expect(matchup.shipA.profile.hullTypeId).toBe(matchup.shipB.profile.hullTypeId);
      expect(matchup.slug).toBe(matchupSlug(matchup.shipA.slug, matchup.shipB.slug));
    }
  });

  test("contains the Ashimmu vs Omen Navy Issue cruiser matchup", () => {
    const ashimmu = requirePage(pages, "Ashimmu");
    const omen = requirePage(pages, "Omen Navy Issue");
    const expected = matchupSlug(ashimmu.slug, omen.slug);
    expect(matchups.some((matchup) => matchup.slug === expected)).toBe(true);
  });
});

describe("deep link wires decode through the real parser", () => {
  const catalog = shipProfileCatalog();
  const presets = presetFitTexts();
  const pages = buildShipPages(catalog, presets);
  const parser = realParser();

  test("matchup wire loads both fittings on first load", () => {
    const thrasher = requirePage(pages, "Thrasher");
    const merlin = requirePage(pages, "Merlin");
    const wire = matchupWire(requireEft(thrasher, presets), requireEft(merlin, presets));
    const session = parser.decodeUrlSettings(encodedQuery(simulatorDeepLink(wire)));
    expect(session?.shipA.hull).toBe(thrasher.profile.id);
    expect(session?.shipA.fittedHull?.fittingName).toBe(thrasher.presets[0]?.name);
    expect(session?.shipA.mass).toBeGreaterThan(0);
    expect(session?.shipB.hull).toBe(merlin.profile.id);
    expect(session?.shipB.fittedHull?.fittingName).toBe(merlin.presets[0]?.name);
    expect(session?.shipB.mass).toBeGreaterThan(0);
  });

  test("ship wire without preset still selects the hull with profile stats", () => {
    const page = requirePage(pages, "Gila");
    const wire = shipWire(page.profile, undefined);
    const session = parser.decodeUrlSettings(encodedQuery(simulatorDeepLink(wire)));
    expect(session?.shipA.hull).toBe(page.profile.id);
    expect(session?.shipA.mass).toBe(page.profile.mass);
    expect(session?.shipA.speed).toBe(page.profile.baseSpeed);
    expect(session?.shipA.fittedHull).toBeUndefined();
  });

  test("ship wire with preset loads the fitting on first load", () => {
    const page = requirePage(pages, "Thrasher");
    const wire = shipWire(page.profile, requireEft(page, presets));
    const session = parser.decodeUrlSettings(encodedQuery(simulatorDeepLink(wire)));
    expect(session?.shipA.hull).toBe(page.profile.id);
    expect(session?.shipA.fittedHull?.fittingName).toBe(page.presets[0]?.name);
  });
});

function requirePage(pages: readonly ShipPageData[], name: string): ShipPageData {
  const page = pages.find((candidate) => candidate.profile.name === name);
  if (page === undefined) throw new Error(`No ship page for "${name}"`);
  return page;
}

function requireEft(page: ShipPageData, presets: ReturnType<typeof presetFitTexts>): string {
  const text = firstPresetEft(page, presets);
  if (text === undefined) throw new Error(`No preset fitting for "${page.profile.name}"`);
  return text;
}

function encodedQuery(url: string): string {
  const query = new URL(url).searchParams.get("c");
  if (query === null) throw new Error("Deep link is missing the settings query parameter");
  return query;
}
