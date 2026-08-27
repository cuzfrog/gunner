import { fakeDocument, getFake, mockFittingImport } from "../../testing";
import { UiEventsImpl } from "../../events";
import type { EwarProjection, EwarResolver } from "../../../sim";
import type { EwarController } from "../ewar";
import type { ImageCatalog } from "../../icons";
import type { ShipProfile } from "../../../ships";
import { toTypeId, type FactionId, type HullTypeId, type ShipId } from "../../../gamedata/ids";
import type { I18n, Language } from "../../i18n";
import type { FittingImport } from "../../../fitting";
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
};

function createFakePortraitEls(document: Document): PortraitsEls {
  const shipARoot = getFake(document, "ship-a-portrait");
  const shipAImage = document.createElement("img");
  shipAImage.className = "portrait-image";
  shipARoot.appendChild(shipAImage);
  const shipAEffects = document.createElement("div");
  shipAEffects.className = "portrait-effects";
  shipARoot.appendChild(shipAEffects);
  const shipBRoot = getFake(document, "ship-b-portrait");
  const shipBImage = document.createElement("img");
  shipBImage.className = "portrait-image";
  shipBRoot.appendChild(shipBImage);
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
    speedMultiplierIgnoringRange: vi.fn(() => 1),
    disruptedTurret: vi.fn((turret) => turret),
    disruptedTurretIgnoringRange: vi.fn((turret) => turret),
    propulsionSuppressed: vi.fn(() => false),
    propulsionSuppressedIgnoringRange: vi.fn(() => false),
    appliedEffects: vi.fn(() => []),
    speedBreakdown: vi.fn(() => ({ effects: [], propulsionSuppressed: false })),
    disruptionBreakdown: vi.fn(() => ({ tracking: [], optimal: [], falloff: [] })),
  });
  const imageCatalog = vi.mocked<ImageCatalog>({
    shipImageUrl: vi.fn((_shipId) => "images/ships/Rifter.webp"),
    itemIconUrl: vi.fn((name) => (name === toTypeId("527") ? "images/icons/1234@1x.png" : undefined)),
    droneIconUrl: vi.fn(),
  });
  const NAME_FOR_ID: Record<string, string> = { "527": "Stasis Webifier II", "448": "Warp Scrambler II" };
  const fittingImport = vi.mocked<FittingImport>({ ...mockFittingImport(), itemNameForId: vi.fn((id, _language) => NAME_FOR_ID[id] ?? String(id)) });
  const events = new UiEventsImpl();
  const createElementSpy = vi.spyOn(document, "createElement");
  const i18n = vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key: string) => key),
    translateDocument: vi.fn(),
  });
  const controller = new PortraitsControllerImpl({
    els,
    imageCatalog,
    ewarController,
    ewarResolver,
    combatantProfiles,
    events,
    i18n,
    fittingImport,
  });
  return { controller, els, profiles, projections, ewarController, ewarResolver, imageCatalog, events, createElementSpy, i18n, fittingImport };
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
    ewarResolver.appliedEffects.mockReturnValue([]);
    controller.update();
    expect(els.shipA.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(0);
    expect(els.shipAEffects.hidden).toBe(true);
  });

  test("one web in range shows a visible icon with a localized tooltip", () => {
    const { controller, els, profiles, projections, ewarResolver } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    projections.shipB = {
      loadout: {
        webs: [{ moduleName: "Stasis Webifier II", moduleId: toTypeId("527"), maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 }],
        grapplers: [], disruptors: [], scramblers: [], scripts: [],
      },
      activation: {
        webs: [{ active: true, overloaded: false }],
        grapplers: [], disruptors: [], scramblers: [],
      },
    };
    ewarResolver.appliedEffects.mockReturnValue([{ family: "web", moduleId: toTypeId("527") }]);
    controller.update();
    expect(els.shipA.hidden).toBe(false);
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    const icon = els.shipAEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.tagName).toBe("IMG");
    expect(icon.src).toBe("images/icons/1234@1x.png");
    expect(icon.title).toBe("label.ewar.web: Stasis Webifier II");
  });

  test("shipB projection web at current distance shows icon under shipA portrait", () => {
    const { controller, els, profiles, projections, ewarResolver } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    projections.shipB = {
      loadout: {
        webs: [{ moduleName: "Stasis Webifier II", moduleId: toTypeId("527"), maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 }],
        grapplers: [], disruptors: [], scramblers: [], scripts: [],
      },
      activation: {
        webs: [{ active: true, overloaded: false }],
        grapplers: [], disruptors: [], scramblers: [],
      },
    };
    ewarResolver.appliedEffects.mockReturnValue([{ family: "web", moduleId: toTypeId("527") }]);
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
    projections.shipA = {
      loadout: {
        webs: [], grapplers: [], disruptors: [],
        scramblers: [{ moduleName: "Warp Scrambler II", moduleId: toTypeId("448"), maxRange: 9000, overloadRangeBonusPercent: 20 }],
        scripts: [],
      },
      activation: {
        webs: [], grapplers: [], disruptors: [],
        scramblers: [{ active: true, overloaded: false }],
      },
    };
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === toTypeId("448") ? "images/icons/5678@1x.png" : undefined));
    ewarResolver.appliedEffects.mockImplementation((projection) => {
      if (projection === projections.shipA) return [{ family: "scrambler", moduleId: toTypeId("448") }];
      return [];
    });
    controller.update();
    expect(els.shipB.hidden).toBe(false);
    expect(els.shipBEffects.hidden).toBe(false);
    expect(els.shipBEffects.children.length).toBe(1);
    const icon = els.shipBEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.src).toBe("images/icons/5678@1x.png");
    expect(icon.title).toBe("label.ewar.scrambler: Warp Scrambler II");
  });

  test("out-of-range projection leaves effect rows empty while portraits stay visible", () => {
    const { controller, els, profiles, ewarResolver } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    ewarResolver.appliedEffects.mockReturnValue([]);
    controller.update();
    expect(els.shipA.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(0);
    expect(els.shipAEffects.hidden).toBe(true);
  });

  test("all applied families resolving to undefined icon urls hide the effects row", () => {
    const { controller, els, profiles, ewarResolver, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    imageCatalog.itemIconUrl.mockReturnValue(undefined);
    ewarResolver.appliedEffects.mockReturnValue([
      { family: "web", moduleId: toTypeId("527") },
      { family: "scrambler", moduleId: toTypeId("448") },
    ]);
    controller.update();
    expect(els.shipAEffects.children.length).toBe(0);
    expect(els.shipAEffects.hidden).toBe(true);
  });

  test("resolver returning a single web for a loadout with two webs appends one icon", () => {
    const { controller, els, profiles, ewarResolver } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    ewarResolver.appliedEffects.mockReturnValue([{ family: "web", moduleId: toTypeId("527") }]);
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
  });

  test("itemIconUrl returning undefined skips that icon but appends the rest", () => {
    const { controller, els, profiles, ewarResolver, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === toTypeId("527") ? undefined : "images/icons/2@1x.png"));
    ewarResolver.appliedEffects.mockReturnValue([
      { family: "web", moduleId: toTypeId("527") },
      { family: "scrambler", moduleId: toTypeId("448") },
    ]);
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
    ewarResolver.appliedEffects.mockReturnValue([{ family: "web", moduleId: toTypeId("527") }]);
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
        grapplers: [], disruptors: [], scramblers: [], scripts: [],
      },
      activation: {
        webs: [{ active: true, overloaded: false }],
        grapplers: [], disruptors: [], scramblers: [],
      },
    };
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === toTypeId("527") ? "images/icons/1234@1x.png" : undefined));
    ewarResolver.appliedEffects.mockImplementation((projection, distance) =>
      projection === projections.shipB && distance <= 10000 ? [{ family: "web", moduleId: toTypeId("527") }] : []
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
    expect(icon.title).toBe("label.ewar.web: Stasis Webifier II");
  });

  test("distance changes that do not change the applied set do not create new img elements", () => {
    const { controller, els, profiles, ewarResolver, events, createElementSpy } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    ewarResolver.appliedEffects.mockReturnValue([{ family: "web", moduleId: toTypeId("527") }]);
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
    ewarResolver.appliedEffects.mockReturnValue([{ family: "web", moduleId: toTypeId("527") }]);
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    expect((els.shipAEffects.children[0] as unknown as HTMLImageElement).src).toBe("images/icons/1234@1x.png");
    ewarResolver.appliedEffects.mockReturnValue([{ family: "web", moduleId: toTypeId("14270") }]);
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    expect((els.shipAEffects.children[0] as unknown as HTMLImageElement).src).toBe("images/icons/fallback@1x.png");
  });

  test("name unchanged but families changed rebuilds effects without rewriting image src", () => {
    const { controller, els, profiles, ewarResolver, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    imageCatalog.shipImageUrl.mockClear();
    ewarResolver.appliedEffects.mockReturnValue([{ family: "web", moduleId: toTypeId("527") }]);
    controller.update();
    expect(els.shipAImage.src).toBe("images/ships/Rifter.webp");
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    imageCatalog.shipImageUrl.mockClear();
    ewarResolver.appliedEffects.mockReturnValue([
      { family: "web", moduleId: toTypeId("527") },
      { family: "scrambler", moduleId: toTypeId("448") },
    ]);
    controller.update();
    expect(imageCatalog.shipImageUrl).not.toHaveBeenCalled();
    expect(els.shipAImage.src).toBe("images/ships/Rifter.webp");
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
  });
});
