import { fakeDocument, getFake, FakeElement } from "../../testing";
import { UiEventsImpl } from "../../events";
import type { EwarProjection, EwarResolver, SpeedBreakdown, DisruptionBreakdown } from "../../../sim";
import type { EwarController } from "../ewar";
import type { DefenseController } from "../defense";
import type { ImageCatalog } from "../../icons";
import type { ShipProfile } from "../../../ships";
import { toTypeId, type FactionId, type HullTypeId, type ShipId } from "../../../gamedata/ids";
import type { I18n, Language } from "../../i18n";
import { PortraitsControllerImpl } from "./portraitsController";
import type { PortraitsController, PortraitsEls, CombatantProfiles } from "./portraitsControllerContract";

const SHIP_A_PROFILE: ShipProfile = {
  id: "587" as ShipId,
  name: "Rifter",
  factionId: "minmatar-republic" as FactionId,
  hullTypeId: "25" as HullTypeId,
  mass: 1_000_000,
  inertiaModifier: 3,
  baseSpeed: 300,
  sigRadius: 36,
  droneBandwidth: 0,
  droneCapacity: 0,
  maxActiveDrones: 5,
  shieldHp: 0,
  shieldRechargeTime: 0,
  armorHp: 0,
  hullHp: 0,
  shieldResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  armorResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
};
const SHIP_B_PROFILE: ShipProfile = {
  id: "603" as ShipId,
  name: "Merlin",
  factionId: "caldari-state" as FactionId,
  hullTypeId: "25" as HullTypeId,
  mass: 1_000_000,
  inertiaModifier: 3,
  baseSpeed: 300,
  sigRadius: 36,
  droneBandwidth: 0,
  droneCapacity: 0,
  maxActiveDrones: 5,
  shieldHp: 0,
  shieldRechargeTime: 0,
  armorHp: 0,
  hullHp: 0,
  shieldResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  armorResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
};

function createFakePortraitEls(document: Document): PortraitsEls {
  const shipARoot = getFake(document, "ship-a-portrait");
  const shipAImage = document.createElement("img");
  shipAImage.className = "portrait-image";
  shipARoot.appendChild(shipAImage);
  const shipAHpBars = document.createElement("div");
  shipAHpBars.className = "portrait-hp-bars";
  for (const layer of ["shield", "armor", "hull"]) {
    const bar = document.createElement("div");
    bar.className = `portrait-hp-bar portrait-hp-bar-${layer}`;
    const fill = document.createElement("span");
    fill.className = "portrait-hp-fill";
    bar.appendChild(fill);
    shipAHpBars.appendChild(bar);
  }
  shipARoot.appendChild(shipAHpBars);
  const shipAEffects = document.createElement("div");
  shipAEffects.className = "portrait-effects";
  shipARoot.appendChild(shipAEffects);
  const shipBRoot = getFake(document, "ship-b-portrait");
  const shipBImage = document.createElement("img");
  shipBImage.className = "portrait-image";
  shipBRoot.appendChild(shipBImage);
  const shipBHpBars = document.createElement("div");
  shipBHpBars.className = "portrait-hp-bars";
  for (const layer of ["shield", "armor", "hull"]) {
    const bar = document.createElement("div");
    bar.className = `portrait-hp-bar portrait-hp-bar-${layer}`;
    const fill = document.createElement("span");
    fill.className = "portrait-hp-fill";
    bar.appendChild(fill);
    shipBHpBars.appendChild(bar);
  }
  shipBRoot.appendChild(shipBHpBars);
  const shipBEffects = document.createElement("div");
  shipBEffects.className = "portrait-effects";
  shipBRoot.appendChild(shipBEffects);
  return {
    shipA: shipARoot as unknown as HTMLElement,
    shipB: shipBRoot as unknown as HTMLElement,
    shipAImage: shipAImage as unknown as HTMLImageElement,
    shipBImage: shipBImage as unknown as HTMLImageElement,
    shipAEffects,
    shipBEffects,
    shipAHpBars,
    shipBHpBars,
  };
}

function buildController() {
  const document = fakeDocument();
  globalThis.document = document;
  const els = createFakePortraitEls(document);
  const profiles: Record<"shipA" | "shipB", ShipProfile | undefined> = { shipA: undefined, shipB: undefined };
  const combatantProfiles: CombatantProfiles = { profile: (side) => profiles[side] };
  const projections: Record<"shipA" | "shipB", EwarProjection | undefined> = { shipA: undefined, shipB: undefined };
  const ewarController = vi.mocked<EwarController>({
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn((side: "shipA" | "shipB") => projections[side]),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  });
  const ewarResolver = vi.mocked<EwarResolver>({
    speedMultiplier: vi.fn(() => 1),
    speedMultiplierIgnoringRange: vi.fn(() => 1), sigMultiplier: vi.fn(() => 1), sigMultiplierIgnoringRange: vi.fn(() => 1),
    disruptedTurret: vi.fn((turret) => turret),
    disruptedTurretIgnoringRange: vi.fn((turret) => turret),
    propulsionSuppressed: vi.fn(() => false),
    propulsionSuppressedIgnoringRange: vi.fn(() => false),
    appliedEffects: vi.fn(() => []),
    speedBreakdown: vi.fn((): SpeedBreakdown => ({ effects: [], propulsionSuppressed: false })),
    disruptionBreakdown: vi.fn((): DisruptionBreakdown => ({ tracking: [], optimal: [], falloff: [] })),
  });
  const imageCatalog = vi.mocked<ImageCatalog>({
    shipImageUrl: vi.fn((_shipId) => "images/ships/Rifter.webp"),
    itemIconUrl: vi.fn((name) => (name === toTypeId("527") ? "images/icons/1234@1x.png" : undefined)),
  });
  const events = new UiEventsImpl();
  const createElementSpy = vi.spyOn(document, "createElement");
  const i18n = vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key: string) => key),
    translateDocument: vi.fn(),
  });
  const defenseController = vi.mocked<DefenseController>({
    setDefenseSpec: vi.fn(),
    spec: vi.fn(() => undefined),
    updateAssessments: vi.fn(),
    updateDefenseView: vi.fn(),
    updateSummaries: vi.fn(),
    render: vi.fn(),
    signaturePenalty: vi.fn(() => 0),
    updateEffectiveSig: vi.fn(),
    damageEnabled: vi.fn(() => true),
    setDamageEnabled: vi.fn(),
    repairMode: vi.fn(() => "auto" as const),
    setRepairMode: vi.fn(),
    repairerActivation: vi.fn(() => []),
    setRepairerActivation: vi.fn(),
    rahActivation: vi.fn(() => undefined),
    setRahActivation: vi.fn(),
    restore: vi.fn(),
    cyclingEffects: vi.fn(() => []),
    hpPercentages: vi.fn(() => undefined),
  });
  const controller = new PortraitsControllerImpl({
    els,
    imageCatalog,
    ewarController,
    ewarResolver,
    defenseController,
    combatantProfiles,
    events,
    i18n,
  });
  return { controller, els, profiles, projections, ewarController, ewarResolver, defenseController, imageCatalog, events, createElementSpy, i18n };
}

describe("PortraitsController", () => {
  test("both sides without profiles stay hidden with empty effect rows", () => {
    const { els } = buildController();
    expect(els.shipA.hidden).toBe(true);
    expect(els.shipB.hidden).toBe(true);
    expect(els.shipAEffects.children.length).toBe(0);
    expect(els.shipBEffects.children.length).toBe(0);
    expect(els.shipAEffects.hidden).toBe(true);
    expect(els.shipBEffects.hidden).toBe(true);
  });

  test("shipA profile becomes visible and sets the ship image", () => {
    const { controller, els, profiles } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    controller.update();
    expect(els.shipA.hidden).toBe(false);
    expect(els.shipAImage.src).toBe("images/ships/Rifter.webp");
    expect(els.shipAEffects.hidden).toBe(true);
  });

  test("shipImageUrl returning undefined sets an empty src without crashing", () => {
    const { controller, els, profiles, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    imageCatalog.shipImageUrl.mockReturnValue(undefined);
    controller.update();
    expect(els.shipA.hidden).toBe(false);
    expect(els.shipAImage.src).toBe("");
  });

  test("applied empty hides the effects row", () => {
    const { controller, els, profiles, ewarResolver } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    ewarResolver.speedBreakdown.mockReturnValue({ effects: [], propulsionSuppressed: false });
    controller.update();
    expect(els.shipA.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(0);
    expect(els.shipAEffects.hidden).toBe(true);
  });

  test("one web in range shows a visible icon with a localized tooltip", () => {
    const { controller, els, profiles, ewarResolver } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    ewarResolver.speedBreakdown.mockReturnValue({
      effects: [{ family: "web", moduleId: toTypeId("527"), multiplier: 0.4 }],
      propulsionSuppressed: false,
    });
    controller.update();
    expect(els.shipA.hidden).toBe(false);
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    const icon = els.shipAEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.tagName).toBe("IMG");
    expect(icon.src).toBe("images/icons/1234@1x.png");
    expect(icon.getAttribute("data-hint")).toBe("ewar.hover.web 60%");
  });

  test("shipB projection web at current distance shows icon under shipA portrait", () => {
    const { controller, els, profiles, ewarResolver } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    ewarResolver.speedBreakdown.mockReturnValue({
      effects: [{ family: "web", moduleId: toTypeId("527"), multiplier: 0.4 }],
      propulsionSuppressed: false,
    });
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    expect(els.shipAEffects.children[0].tagName).toBe("IMG");
    expect((els.shipAEffects.children[0] as unknown as HTMLImageElement).src).toBe("images/icons/1234@1x.png");
    expect(els.shipBEffects.children.length).toBe(0);
    expect(els.shipBEffects.hidden).toBe(true);
  });

  test("shipA projection scrambler at current distance shows icon under shipB portrait", () => {
    const { controller, els, profiles, projections, ewarResolver, imageCatalog } = buildController();
    profiles.shipB = SHIP_B_PROFILE;
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === toTypeId("448") ? "images/icons/5678@1x.png" : undefined));
    ewarResolver.speedBreakdown.mockImplementation((projection) => {
      if (projection === projections.shipA) return { effects: [{ family: "scrambler", moduleId: toTypeId("448"), multiplier: 1 }], propulsionSuppressed: true };
      return { effects: [], propulsionSuppressed: false };
    });
    controller.update();
    expect(els.shipB.hidden).toBe(false);
    expect(els.shipBEffects.hidden).toBe(false);
    expect(els.shipBEffects.children.length).toBe(1);
    const icon = els.shipBEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.src).toBe("images/icons/5678@1x.png");
    expect(icon.getAttribute("data-hint")).toBe("ewar.hover.scrambler");
  });

  test("out-of-range projection leaves effect rows empty while portraits stay visible", () => {
    const { controller, els, profiles, ewarResolver } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    ewarResolver.speedBreakdown.mockReturnValue({ effects: [], propulsionSuppressed: false });
    controller.update();
    expect(els.shipA.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(0);
    expect(els.shipAEffects.hidden).toBe(true);
  });

  test("all applied families resolving to undefined icon urls hide the effects row", () => {
    const { controller, els, profiles, ewarResolver, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    imageCatalog.itemIconUrl.mockReturnValue(undefined);
    ewarResolver.speedBreakdown.mockReturnValue({
      effects: [
        { family: "web", moduleId: toTypeId("527"), multiplier: 0.4 },
        { family: "scrambler", moduleId: toTypeId("448"), multiplier: 1 },
      ],
      propulsionSuppressed: true,
    });
    controller.update();
    expect(els.shipAEffects.children.length).toBe(0);
    expect(els.shipAEffects.hidden).toBe(true);
  });

  test("resolver returning a single web for a loadout with two webs appends one icon", () => {
    const { controller, els, profiles, ewarResolver } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    ewarResolver.speedBreakdown.mockReturnValue({
      effects: [{ family: "web", moduleId: toTypeId("527"), multiplier: 0.4 }],
      propulsionSuppressed: false,
    });
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
  });

  test("itemIconUrl returning undefined skips that icon but appends the rest", () => {
    const { controller, els, profiles, ewarResolver, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === toTypeId("527") ? undefined : "images/icons/2@1x.png"));
    ewarResolver.speedBreakdown.mockReturnValue({
      effects: [
        { family: "web", moduleId: toTypeId("527"), multiplier: 0.4 },
        { family: "scrambler", moduleId: toTypeId("448"), multiplier: 1 },
      ],
      propulsionSuppressed: true,
    });
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    expect((els.shipAEffects.children[0] as unknown as HTMLImageElement).src).toBe("images/icons/2@1x.png");
  });

  test("removing a profile hides the portrait on the next update", () => {
    const { controller, els, profiles } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    controller.update();
    expect(els.shipA.hidden).toBe(false);
    profiles.shipA = undefined;
    controller.update();
    expect(els.shipA.hidden).toBe(true);
    expect(els.shipAEffects.hidden).toBe(true);
  });

  test("re-adding the same profile after removal shows the portrait and effects again", () => {
    const { controller, els, profiles, ewarResolver } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    ewarResolver.speedBreakdown.mockReturnValue({
      effects: [{ family: "web", moduleId: toTypeId("527"), multiplier: 0.4 }],
      propulsionSuppressed: false,
    });
    controller.update();
    expect(els.shipA.hidden).toBe(false);
    expect(els.shipAImage.src).toBe("images/ships/Rifter.webp");
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    profiles.shipA = undefined;
    controller.update();
    expect(els.shipA.hidden).toBe(true);
    profiles.shipA = SHIP_A_PROFILE;
    controller.update();
    expect(els.shipA.hidden).toBe(false);
    expect(els.shipAImage.src).toBe("images/ships/Rifter.webp");
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
  });

  test("distance change crossing into range flips the effects row from hidden to visible", () => {
    const { controller, els, profiles, projections, ewarResolver, imageCatalog, events } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    projections.shipB = {
      loadout: {
        webs: [{ moduleName: "Stasis Webifier II", moduleId: toTypeId("527"), maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 0 }],
        grapplers: [], disruptors: [], scramblers: [], painters: [], scripts: [],
      },
      activation: {
        webs: [{ active: true, overloaded: false }],
        grapplers: [], disruptors: [], scramblers: [],
      painters: [],
      },
    };
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === toTypeId("527") ? "images/icons/1234@1x.png" : undefined));
    ewarResolver.speedBreakdown.mockImplementation((_projection, distance) =>
      distance <= 10000 ? { effects: [{ family: "web", moduleId: toTypeId("527"), multiplier: 0.4 }], propulsionSuppressed: false } : { effects: [], propulsionSuppressed: false }
    );
    events.emitDistanceChanged(15000);
    controller.update();
    expect(els.shipAEffects.children.length).toBe(0);
    expect(els.shipAEffects.hidden).toBe(true);
    events.emitDistanceChanged(10000);
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    const icon = els.shipAEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.src).toBe("images/icons/1234@1x.png");
    expect(icon.getAttribute("data-hint")).toBe("ewar.hover.web 60%");
  });

  test("distance changes that do not change the applied set do not create new img elements", () => {
    const { controller, els, profiles, ewarResolver, events, createElementSpy } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    ewarResolver.speedBreakdown.mockReturnValue({
      effects: [{ family: "web", moduleId: toTypeId("527"), multiplier: 0.4 }],
      propulsionSuppressed: false,
    });
    events.emitDistanceChanged(5000);
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    const imageCount = createElementSpy.mock.calls.filter(([tag]) => tag === "img").length;
    events.emitDistanceChanged(6000);
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    expect(createElementSpy.mock.calls.filter(([tag]) => tag === "img").length).toBe(imageCount);
  });

  test("same family with a different representative module rewrites the icon", () => {
    const { controller, els, profiles, ewarResolver, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    imageCatalog.itemIconUrl.mockImplementation((name) =>
      name === toTypeId("527") ? "images/icons/1234@1x.png" : "images/icons/fallback@1x.png"
    );
    ewarResolver.speedBreakdown.mockReturnValue({
      effects: [{ family: "web", moduleId: toTypeId("527"), multiplier: 0.4 }],
      propulsionSuppressed: false,
    });
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    expect((els.shipAEffects.children[0] as unknown as HTMLImageElement).src).toBe("images/icons/1234@1x.png");
    ewarResolver.speedBreakdown.mockReturnValue({
      effects: [{ family: "web", moduleId: toTypeId("14270"), multiplier: 0.4 }],
      propulsionSuppressed: false,
    });
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    expect((els.shipAEffects.children[0] as unknown as HTMLImageElement).src).toBe("images/icons/fallback@1x.png");
  });

  test("name unchanged but families changed rebuilds effects without rewriting image src", () => {
    const { controller, els, profiles, ewarResolver, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    imageCatalog.shipImageUrl.mockClear();
    ewarResolver.speedBreakdown.mockReturnValue({
      effects: [{ family: "web", moduleId: toTypeId("527"), multiplier: 0.4 }],
      propulsionSuppressed: false,
    });
    controller.update();
    expect(els.shipAImage.src).toBe("images/ships/Rifter.webp");
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    imageCatalog.shipImageUrl.mockClear();
    ewarResolver.speedBreakdown.mockReturnValue({
      effects: [
        { family: "web", moduleId: toTypeId("527"), multiplier: 0.4 },
        { family: "scrambler", moduleId: toTypeId("448"), multiplier: 1 },
      ],
      propulsionSuppressed: true,
    });
    controller.update();
    expect(imageCatalog.shipImageUrl).not.toHaveBeenCalled();
    expect(els.shipAImage.src).toBe("images/ships/Rifter.webp");
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
  });

  test("web effect title shows speed reduction percentage instead of module name", () => {
    const { controller, els, profiles, ewarResolver } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    ewarResolver.speedBreakdown.mockReturnValue({
      effects: [{ family: "web", moduleId: toTypeId("527"), multiplier: 0.4 }],
      propulsionSuppressed: false,
    });
    controller.update();
    expect(els.shipAEffects.children.length).toBe(1);
    const icon = els.shipAEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.getAttribute("data-hint")).toBe("ewar.hover.web 60%");
  });

  test("scrambler effect title shows scrambler hover label", () => {
    const { controller, els, profiles, ewarResolver, imageCatalog } = buildController();
    profiles.shipB = SHIP_B_PROFILE;
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === toTypeId("448") ? "images/icons/5678@1x.png" : undefined));
    ewarResolver.speedBreakdown.mockReturnValue({
      effects: [{ family: "scrambler", moduleId: toTypeId("448"), multiplier: 1 }],
      propulsionSuppressed: true,
    });
    controller.update();
    expect(els.shipBEffects.children.length).toBe(1);
    const icon = els.shipBEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.getAttribute("data-hint")).toBe("ewar.hover.scrambler");
  });

  test("disruptor effect title shows tracking and optimal range reductions", () => {
    const { controller, els, profiles, ewarResolver, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    const disruptorId = toTypeId("3456");
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === disruptorId ? "images/icons/disruptor@1x.png" : undefined));
    ewarResolver.disruptionBreakdown.mockReturnValue({
      tracking: [{ moduleId: disruptorId, scriptId: undefined, multiplier: 0.55 }],
      optimal: [{ moduleId: disruptorId, scriptId: undefined, multiplier: 0.83 }],
      falloff: [],
    });
    controller.update();
    expect(els.shipAEffects.children.length).toBe(1);
    const icon = els.shipAEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.getAttribute("data-hint")).toBe("ewar.hover.tracking -45% · ewar.hover.optimal -17%");
  });

  describe("HP bars", () => {
    function hpFillWidth(els: PortraitsEls, side: "shipA" | "shipB", layerIndex: number): string {
      const container = side === "shipA" ? els.shipAHpBars : els.shipBHpBars;
      const bars = container.querySelectorAll(".portrait-hp-bar");
      const fill = bars[layerIndex].querySelector(".portrait-hp-fill") as unknown as FakeElement;
      return (fill.style as unknown as Record<string, string>).width ?? "";
    }

    test("undefined hpPercentages hides HP bars", () => {
      const { controller, els, profiles, defenseController } = buildController();
      profiles.shipA = SHIP_A_PROFILE;
      defenseController.hpPercentages.mockReturnValue(undefined);
      controller.update();
      expect(els.shipAHpBars.hidden).toBe(true);
    });

    test("defined hpPercentages shows HP bars", () => {
      const { controller, els, profiles, defenseController } = buildController();
      profiles.shipA = SHIP_A_PROFILE;
      defenseController.hpPercentages.mockReturnValue({ shield: 1, armor: 1, hull: 1 });
      controller.update();
      expect(els.shipAHpBars.hidden).toBe(false);
    });

    test("full HP sets all fill widths to 0%", () => {
      const { controller, els, profiles, defenseController } = buildController();
      profiles.shipA = SHIP_A_PROFILE;
      defenseController.hpPercentages.mockReturnValue({ shield: 1, armor: 1, hull: 1 });
      controller.update();
      expect(hpFillWidth(els, "shipA", 0)).toBe("0%");
      expect(hpFillWidth(els, "shipA", 1)).toBe("0%");
      expect(hpFillWidth(els, "shipA", 2)).toBe("0%");
    });

    test("partial damage sets fill widths to lost percentage", () => {
      const { controller, els, profiles, defenseController } = buildController();
      profiles.shipA = SHIP_A_PROFILE;
      defenseController.hpPercentages.mockReturnValue({ shield: 0.5, armor: 1, hull: 0.25 });
      controller.update();
      expect(hpFillWidth(els, "shipA", 0)).toBe("50%");
      expect(hpFillWidth(els, "shipA", 1)).toBe("0%");
      expect(hpFillWidth(els, "shipA", 2)).toBe("75%");
    });

    test("dead ship (all 0) sets all fill widths to 100%", () => {
      const { controller, els, profiles, defenseController } = buildController();
      profiles.shipA = SHIP_A_PROFILE;
      defenseController.hpPercentages.mockReturnValue({ shield: 0, armor: 0, hull: 0 });
      controller.update();
      expect(hpFillWidth(els, "shipA", 0)).toBe("100%");
      expect(hpFillWidth(els, "shipA", 1)).toBe("100%");
      expect(hpFillWidth(els, "shipA", 2)).toBe("100%");
    });

    test("transition from undefined to defined shows bars and updates fills", () => {
      const { controller, els, profiles, defenseController } = buildController();
      profiles.shipA = SHIP_A_PROFILE;
      defenseController.hpPercentages.mockReturnValue(undefined);
      controller.update();
      expect(els.shipAHpBars.hidden).toBe(true);
      defenseController.hpPercentages.mockReturnValue({ shield: 0.5, armor: 0.5, hull: 0.5 });
      controller.update();
      expect(els.shipAHpBars.hidden).toBe(false);
      expect(hpFillWidth(els, "shipA", 0)).toBe("50%");
      expect(hpFillWidth(els, "shipA", 1)).toBe("50%");
      expect(hpFillWidth(els, "shipA", 2)).toBe("50%");
    });
  });
});
