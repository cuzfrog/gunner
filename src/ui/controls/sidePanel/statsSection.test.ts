import { createContainer, InjectionMode } from "awilix";
import type { Ships, StatConditions, ShipsCradle } from "../../../ships";
import { registerShipsModule } from "../../../ships";
import type { I18n, Language } from "../../i18n";
import { fakeDocument, getFake, FakeElement, mockShips, RIFTER } from "../testSupport";
import type { ProfileParamOverrides } from "../../../appstate";
import type { Popup } from "./popup";
import type { SidePanel } from "./sidePanelContract";
import type { ISidePanelSections } from "./sidePanelSections";
import { StatsSection, type StatsSectionEls } from "./statsSection";

function shipsWithStats(): Ships {
  const ships = vi.mocked<Ships>(mockShips());
  ships.hullView = vi.fn((profile) => ({ name: profile.name, hullType: "Frigate", faction: "Minmatar Republic" }));
  ships.fittedStats = vi.fn(() => ({ mass: 1_000_000, inertiaModifier: 2, sigRadius: 30, maxSpeed: 0, baseMaxSpeed: 0, alignTime: 0 }));
  ships.maxSpeedForFittedMass = vi.fn(() => 450);
  ships.alignTime = vi.fn(() => 2.5);
  return ships;
}

function realShips(): Ships {
  const cradle = createContainer<ShipsCradle>({ injectionMode: InjectionMode.PROXY });
  registerShipsModule(cradle);
  return cradle.cradle.ships;
}

function mockI18n(): I18n {
  return vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key: string) => key),
    translateDocument: vi.fn(),
  });
}

function buildStatsSection(ships: Ships = shipsWithStats()) {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;

  const els: StatsSectionEls = {
    speed: getFake(document, "attacker-speed") as unknown as HTMLInputElement,
    mass: getFake(document, "attacker-mass") as unknown as HTMLInputElement,
    inertia: getFake(document, "attacker-inertia") as unknown as HTMLInputElement,
    alignTime: getFake(document, "attacker-align-time") as unknown as HTMLElement,
  };

  const skillConditions: StatConditions = { skillLevel: 5, overloaded: true };

  const sections = vi.mocked<ISidePanelSections>({
    hull: {
      updateHullHint: vi.fn(),
    } as unknown as ISidePanelSections["hull"],
    stats: {} as unknown as ISidePanelSections["stats"],
    skill: {
      skillConditions: vi.fn(() => skillConditions),
    } as unknown as ISidePanelSections["skill"],
    propulsion: {
      currentPropulsionModule: vi.fn(),
      currentPropulsionId: vi.fn(),
      currentPropulsionSelection: vi.fn(),
    } as unknown as ISidePanelSections["propulsion"],
    paste: {
      popup: {} as unknown as Popup,
    } as unknown as ISidePanelSections["paste"],
  } as unknown as ISidePanelSections);

  const overrides: Partial<ProfileParamOverrides> = {};
  const panel = vi.mocked<SidePanel>({
    side: "attacker",
    sections,
    profile: undefined,
    fittedHull: undefined,
    isOverridden: vi.fn((key: keyof ProfileParamOverrides) => overrides[key] !== undefined),
  } as unknown as SidePanel);

  const i18n = mockI18n();
  const section = new StatsSection({ panel, els, ships, i18n });
  return { document, panel, section, overrides };
}

describe("StatsSection", () => {
  test("updateShipStats fills speed, mass and inertia from fitted stats", () => {
    const { document, panel, section } = buildStatsSection();
    panel.profile = RIFTER;
    getFake(document, "attacker-mass").value = "0";
    getFake(document, "attacker-inertia").value = "0";
    getFake(document, "attacker-speed").value = "0";
    section.updateShipStats({ updateInertia: true, updateMass: true, updateSig: true });
    expect(getFake(document, "attacker-mass").value).toBe("1000000");
    expect(getFake(document, "attacker-inertia").value).toBe("2");
    expect(getFake(document, "attacker-speed").value).toBe("450");
  });

  test("updateShipStats respects mass override", () => {
    const { document, panel, section, overrides } = buildStatsSection();
    panel.profile = RIFTER;
    overrides.attackerMass = 800_000;
    getFake(document, "attacker-mass").value = "800000";
    section.updateShipStats({ updateInertia: true, updateMass: true, updateSig: true });
    expect(getFake(document, "attacker-mass").value).toBe("800000");
  });

  test("updateSpeedFromMass recalculates speed", () => {
    const { document, panel, section } = buildStatsSection();
    panel.profile = RIFTER;
    getFake(document, "attacker-mass").value = "500000";
    section.updateSpeedFromMass();
    expect(getFake(document, "attacker-speed").value).toBe("450");
  });

  test("updateAlignTime writes the align time suffix", () => {
    const { document, panel, section } = buildStatsSection();
    panel.profile = RIFTER;
    getFake(document, "attacker-mass").value = "1000000";
    getFake(document, "attacker-inertia").value = "2";
    section.updateAlignTime();
    expect(getFake(document, "attacker-align-time").textContent).toContain("2.5");
  });

  test("isOverridden reads the panel overrides", () => {
    const { section, overrides } = buildStatsSection();
    overrides.attackerSpeed = 300;
    expect(section.isOverridden("attackerSpeed")).toBe(true);
    expect(section.isOverridden("attackerMass")).toBe(false);
  });

  describe("currentBaseMaxSpeed", () => {
    test("manual hull plus MWD yields the naked-hull base, below the displayed speed", () => {
      const ships = realShips();
      const { document, panel, section } = buildStatsSection(ships);
      const rifter = ships.findHull("Rifter")!;
      const mwd5 = ships.fittingOption(rifter, "mwd-5mn")!;
      panel.profile = rifter;
      panel.sections.propulsion.currentPropulsionModule = vi.fn(() => mwd5);
      getFake(document, "attacker-speed").value = "0";
      section.updateShipStats({ updateInertia: true, updateMass: true, updateSig: true });

      const displayed = Number(getFake(document, "attacker-speed").value);
      const base = section.currentBaseMaxSpeed();
      const naked = ships.fittedStats(rifter, undefined, undefined, { skillLevel: 5, overloaded: true }).baseMaxSpeed;
      expect(base).toBeCloseTo(naked, 6);
      expect(base).toBeLessThan(displayed);
    });

    test("overridden speed scales the base proportionally", () => {
      const ships = realShips();
      const { document, panel, section, overrides } = buildStatsSection(ships);
      const rifter = ships.findHull("Rifter")!;
      const mwd5 = ships.fittingOption(rifter, "mwd-5mn")!;
      panel.profile = rifter;
      panel.sections.propulsion.currentPropulsionModule = vi.fn(() => mwd5);
      const override = 1000;
      overrides.attackerSpeed = override;
      getFake(document, "attacker-speed").value = String(override);

      const expected = ships.fittedStats(rifter, undefined, mwd5, { skillLevel: 5, overloaded: true }, override).baseMaxSpeed;
      expect(section.currentBaseMaxSpeed()).toBeCloseTo(expected, 6);
    });

    test("a stale non-overridden speed input does not distort the base", () => {
      const ships = realShips();
      const { document, panel, section } = buildStatsSection(ships);
      const rifter = ships.findHull("Rifter")!;
      const mwd5 = ships.fittingOption(rifter, "mwd-5mn")!;
      panel.profile = rifter;
      panel.sections.propulsion.currentPropulsionModule = vi.fn(() => mwd5);
      getFake(document, "attacker-speed").value = "99999";

      const expected = ships.fittedStats(rifter, undefined, mwd5, { skillLevel: 5, overloaded: true }).baseMaxSpeed;
      expect(section.currentBaseMaxSpeed()).toBeCloseTo(expected, 6);
    });
  });
});
