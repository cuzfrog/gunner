import { fakeDocument, getFake, FakeElement } from "../../testing";
import { UiEventsImpl } from "../../events";
import type { ActiveOffensiveModule, EngagementView, EngineView, LockState } from "../../../sim";
import { IDLE_LOCK } from "../../../sim";
import type { DefenseController } from "../defense";
import type { ViewStream } from "../../viewStream";
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
  scanResolution: 200,
  maxTargetingRange: 30000,
  maxLockedTargets: 4,
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
  scanResolution: 200,
  maxTargetingRange: 30000,
  maxLockedTargets: 4,
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
  const shipALockBadge = document.createElement("div");
  shipALockBadge.className = "portrait-lock-badge";
  shipALockBadge.hidden = true;
  shipARoot.appendChild(shipALockBadge);
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
  const shipBLockBadge = document.createElement("div");
  shipBLockBadge.className = "portrait-lock-badge";
  shipBLockBadge.hidden = true;
  shipBRoot.appendChild(shipBLockBadge);
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
    shipALockBadge,
    shipBLockBadge,
  };
}

function makeView(offensive: { shipA: readonly ActiveOffensiveModule[]; shipB: readonly ActiveOffensiveModule[] }, locks?: { shipA: LockState; shipB: LockState }): EngineView {
  return { incomingOffensiveModules: offensive, locks: locks ?? { shipA: IDLE_LOCK, shipB: IDLE_LOCK }, frame: {} as unknown as EngagementView["frame"], attacks: { shipA: undefined, shipB: undefined }, weaponAttacks: { shipA: [], shipB: [] }, effectiveWeapons: { shipA: undefined, shipB: undefined }, defenses: { shipA: {} as unknown, shipB: {} as unknown } } as unknown as EngineView;
}

function emitView(listeners: Set<(view: EngineView) => void>): void {
  for (const listener of Array.from(listeners)) listener({} as unknown as EngineView);
}

function buildController() {
  const document = fakeDocument();
  globalThis.document = document;
  const els = createFakePortraitEls(document);
  const profiles: Record<"shipA" | "shipB", ShipProfile | undefined> = { shipA: undefined, shipB: undefined };
  const combatantProfiles: CombatantProfiles = { profile: (side) => profiles[side] };
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
  const viewStreamListeners = new Set<(view: EngineView) => void>();
  const viewStream = vi.mocked<ViewStream>({
    connect: vi.fn(),
    onViewUpdated: vi.fn((l: (view: EngineView) => void) => viewStreamListeners.add(l)),
    offViewUpdated: vi.fn((l: (view: EngineView) => void) => viewStreamListeners.delete(l)),
    currentView: vi.fn(() => undefined),
  });
  const controller = new PortraitsControllerImpl({
    els,
    imageCatalog,
    defenseController,
    combatantProfiles,
    events,
    i18n,
    viewStream,
  });
  return { controller, els, profiles, defenseController, imageCatalog, events, createElementSpy, i18n, viewStream, viewStreamListeners };
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

  test("empty offensive modules hides the effects row", () => {
    const { controller, els, profiles, viewStream } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    viewStream.currentView.mockReturnValue(makeView({ shipA: [], shipB: [] }));
    controller.update();
    expect(els.shipA.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(0);
    expect(els.shipAEffects.hidden).toBe(true);
  });

  test("one web ewar module shows a visible icon with a localized tooltip", () => {
    const { controller, els, profiles, viewStream } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "ewar", family: "web", moduleId: toTypeId("527"), speedMultiplier: 0.4 }], shipB: [] }));
    controller.update();
    expect(els.shipA.hidden).toBe(false);
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    const icon = els.shipAEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.tagName).toBe("IMG");
    expect(icon.src).toBe("images/icons/1234@1x.png");
    expect(icon.getAttribute("data-hint")).toBe("ewar.hover.web 60%");
  });

  test("shipB web module shows icon under shipA portrait", () => {
    const { controller, els, profiles, viewStream } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "ewar", family: "web", moduleId: toTypeId("527"), speedMultiplier: 0.4 }], shipB: [] }));
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    expect(els.shipAEffects.children[0].tagName).toBe("IMG");
    expect((els.shipAEffects.children[0] as unknown as HTMLImageElement).src).toBe("images/icons/1234@1x.png");
    expect(els.shipBEffects.children.length).toBe(0);
    expect(els.shipBEffects.hidden).toBe(true);
  });

  test("shipA scrambler module shows icon under shipB portrait", () => {
    const { controller, els, profiles, viewStream, imageCatalog } = buildController();
    profiles.shipB = SHIP_B_PROFILE;
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === toTypeId("448") ? "images/icons/5678@1x.png" : undefined));
    viewStream.currentView.mockReturnValue(makeView({ shipA: [], shipB: [{ category: "ewar", family: "scrambler", moduleId: toTypeId("448") }] }));
    controller.update();
    expect(els.shipB.hidden).toBe(false);
    expect(els.shipBEffects.hidden).toBe(false);
    expect(els.shipBEffects.children.length).toBe(1);
    const icon = els.shipBEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.src).toBe("images/icons/5678@1x.png");
    expect(icon.getAttribute("data-hint")).toBe("ewar.hover.scrambler");
  });

  test("no offensive modules leaves effect rows empty while portraits stay visible", () => {
    const { controller, els, profiles, viewStream } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    viewStream.currentView.mockReturnValue(makeView({ shipA: [], shipB: [] }));
    controller.update();
    expect(els.shipA.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(0);
    expect(els.shipAEffects.hidden).toBe(true);
  });

  test("all modules resolving to undefined icon urls hide the effects row", () => {
    const { controller, els, profiles, viewStream, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    imageCatalog.itemIconUrl.mockReturnValue(undefined);
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "ewar", family: "web", moduleId: toTypeId("527"), speedMultiplier: 0.4 }, { category: "ewar", family: "scrambler", moduleId: toTypeId("448") }], shipB: [] }));
    controller.update();
    expect(els.shipAEffects.children.length).toBe(0);
    expect(els.shipAEffects.hidden).toBe(true);
  });

  test("itemIconUrl returning undefined skips that icon but appends the rest", () => {
    const { controller, els, profiles, viewStream, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === toTypeId("527") ? undefined : "images/icons/2@1x.png"));
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "ewar", family: "web", moduleId: toTypeId("527"), speedMultiplier: 0.4 }, { category: "ewar", family: "scrambler", moduleId: toTypeId("448") }], shipB: [] }));
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
    const { controller, els, profiles, viewStream } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "ewar", family: "web", moduleId: toTypeId("527"), speedMultiplier: 0.4 }], shipB: [] }));
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

  test("view change from empty to populated flips the effects row from hidden to visible", () => {
    const { els, profiles, viewStream, imageCatalog, viewStreamListeners } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === toTypeId("527") ? "images/icons/1234@1x.png" : undefined));
    viewStream.currentView.mockReturnValue(makeView({ shipA: [], shipB: [] }));
    emitView(viewStreamListeners);
    expect(els.shipAEffects.children.length).toBe(0);
    expect(els.shipAEffects.hidden).toBe(true);
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "ewar", family: "web", moduleId: toTypeId("527"), speedMultiplier: 0.4 }], shipB: [] }));
    emitView(viewStreamListeners);
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    const icon = els.shipAEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.src).toBe("images/icons/1234@1x.png");
    expect(icon.getAttribute("data-hint")).toBe("ewar.hover.web 60%");
  });

  test("view changes that do not change the module set do not create new img elements", () => {
    const { els, profiles, viewStream, createElementSpy, viewStreamListeners } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "ewar", family: "web", moduleId: toTypeId("527"), speedMultiplier: 0.4 }], shipB: [] }));
    emitView(viewStreamListeners);
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    const imageCount = createElementSpy.mock.calls.filter(([tag]) => tag === "img").length;
    emitView(viewStreamListeners);
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    expect(createElementSpy.mock.calls.filter(([tag]) => tag === "img").length).toBe(imageCount);
  });

  test("same family with a different representative module rewrites the icon", () => {
    const { controller, els, profiles, viewStream, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    imageCatalog.itemIconUrl.mockImplementation((name) =>
      name === toTypeId("527") ? "images/icons/1234@1x.png" : "images/icons/fallback@1x.png"
    );
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "ewar", family: "web", moduleId: toTypeId("527"), speedMultiplier: 0.4 }], shipB: [] }));
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    expect((els.shipAEffects.children[0] as unknown as HTMLImageElement).src).toBe("images/icons/1234@1x.png");
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "ewar", family: "web", moduleId: toTypeId("14270"), speedMultiplier: 0.4 }], shipB: [] }));
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    expect((els.shipAEffects.children[0] as unknown as HTMLImageElement).src).toBe("images/icons/fallback@1x.png");
  });

  test("name unchanged but modules changed rebuilds effects without rewriting image src", () => {
    const { controller, els, profiles, viewStream, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    imageCatalog.shipImageUrl.mockClear();
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "ewar", family: "web", moduleId: toTypeId("527"), speedMultiplier: 0.4 }], shipB: [] }));
    controller.update();
    expect(els.shipAImage.src).toBe("images/ships/Rifter.webp");
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    imageCatalog.shipImageUrl.mockClear();
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "ewar", family: "web", moduleId: toTypeId("527"), speedMultiplier: 0.4 }, { category: "ewar", family: "scrambler", moduleId: toTypeId("448") }], shipB: [] }));
    controller.update();
    expect(imageCatalog.shipImageUrl).not.toHaveBeenCalled();
    expect(els.shipAImage.src).toBe("images/ships/Rifter.webp");
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
  });

  test("web effect title shows speed reduction percentage instead of module name", () => {
    const { controller, els, profiles, viewStream } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "ewar", family: "web", moduleId: toTypeId("527"), speedMultiplier: 0.4 }], shipB: [] }));
    controller.update();
    expect(els.shipAEffects.children.length).toBe(1);
    const icon = els.shipAEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.getAttribute("data-hint")).toBe("ewar.hover.web 60%");
  });

  test("scrambler effect title shows scrambler hover label", () => {
    const { controller, els, profiles, viewStream, imageCatalog } = buildController();
    profiles.shipB = SHIP_B_PROFILE;
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === toTypeId("448") ? "images/icons/5678@1x.png" : undefined));
    viewStream.currentView.mockReturnValue(makeView({ shipA: [], shipB: [{ category: "ewar", family: "scrambler", moduleId: toTypeId("448") }] }));
    controller.update();
    expect(els.shipBEffects.children.length).toBe(1);
    const icon = els.shipBEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.getAttribute("data-hint")).toBe("ewar.hover.scrambler");
  });

  test("disruptor effect title shows tracking and optimal range reductions", () => {
    const { controller, els, profiles, viewStream, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    const disruptorId = toTypeId("3456");
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === disruptorId ? "images/icons/disruptor@1x.png" : undefined));
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "ewar", family: "disruptor", moduleId: disruptorId, trackingMultiplier: 0.55, optimalMultiplier: 0.83, falloffMultiplier: 1 }], shipB: [] }));
    controller.update();
    expect(els.shipAEffects.children.length).toBe(1);
    const icon = els.shipAEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.getAttribute("data-hint")).toBe("ewar.hover.tracking -45% · ewar.hover.optimal -17%");
  });

  test("weapon module from the view is rendered as an icon", () => {
    const { controller, els, profiles, viewStream, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    const weaponModuleId = toTypeId("100");
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === weaponModuleId ? "images/icons/weapon@1x.png" : undefined));
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "weapon", weaponKind: "turret", moduleId: weaponModuleId }], shipB: [] }));
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(1);
    const icon = els.shipAEffects.children[0] as unknown as HTMLImageElement;
    expect(icon.src).toBe("images/icons/weapon@1x.png");
    expect(icon.getAttribute("data-hint")).toBe("portrait.weapon.turret");
  });

  test("defense cycling effects appear after offensive modules", () => {
    const { controller, els, profiles, viewStream, defenseController, imageCatalog } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    const weaponModuleId = toTypeId("100");
    const defenseModuleId = toTypeId("200");
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === weaponModuleId ? "images/icons/weapon@1x.png" : name === defenseModuleId ? "images/icons/defense@1x.png" : undefined));
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "weapon", weaponKind: "turret", moduleId: weaponModuleId }], shipB: [] }));
    defenseController.cyclingEffects.mockReturnValue([{ moduleId: defenseModuleId, hint: "defense.cycling" }]);
    controller.update();
    expect(els.shipAEffects.hidden).toBe(false);
    expect(els.shipAEffects.children.length).toBe(2);
    const weaponIcon = els.shipAEffects.children[0] as unknown as HTMLImageElement;
    expect(weaponIcon.src).toBe("images/icons/weapon@1x.png");
    expect(weaponIcon.getAttribute("data-hint")).toBe("portrait.weapon.turret");
    const defenseIcon = els.shipAEffects.children[1] as unknown as HTMLImageElement;
    expect(defenseIcon.src).toBe("images/icons/defense@1x.png");
    expect(defenseIcon.getAttribute("data-hint")).toBe("defense.cycling");
  });

  test("onLanguageChanged subscription triggers update and re-renders effects", () => {
    const { els, profiles, viewStream, events, viewStreamListeners } = buildController();
    profiles.shipA = SHIP_A_PROFILE;
    viewStream.currentView.mockReturnValue(makeView({ shipA: [{ category: "ewar", family: "web", moduleId: toTypeId("527"), speedMultiplier: 0.4 }], shipB: [] }));
    emitView(viewStreamListeners);
    expect(els.shipAEffects.children.length).toBe(1);
    viewStream.currentView.mockReturnValue(makeView({ shipA: [], shipB: [] }));
    events.emitLanguageChanged();
    expect(els.shipAEffects.children.length).toBe(0);
    expect(els.shipAEffects.hidden).toBe(true);
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

    test("sub-percent damage updates fill widths without other state changes", () => {
      const { controller, els, profiles, defenseController } = buildController();
      profiles.shipA = SHIP_A_PROFILE;
      defenseController.hpPercentages.mockReturnValue({ shield: 0.9999, armor: 1, hull: 1 });
      controller.update();
      const before = hpFillWidth(els, "shipA", 0);
      expect(before).toContain("0.00999");
      defenseController.hpPercentages.mockReturnValue({ shield: 0.999, armor: 1, hull: 1 });
      controller.update();
      const after = hpFillWidth(els, "shipA", 0);
      expect(after).toContain("0.1000");
      expect(after).not.toBe(before);
    });
  });

  describe("lock badge", () => {
    const LOCKED: LockState = { status: "locked", progress: 1, remaining: 0, lockTime: 5, inRange: true };
    const LOCKING: LockState = { status: "locking", progress: 0.5, remaining: 5, lockTime: 10, inRange: true };
    const IDLE: LockState = { status: "idle", progress: 0, remaining: 0, lockTime: 0, inRange: false };

    test("hidden when no view is available", () => {
      const { controller, els, profiles } = buildController();
      profiles.shipA = SHIP_A_PROFILE;
      controller.update();
      expect(els.shipALockBadge.hidden).toBe(true);
    });

    test("hidden when lock status is idle", () => {
      const { controller, els, profiles, viewStream } = buildController();
      profiles.shipA = SHIP_A_PROFILE;
      viewStream.currentView.mockReturnValue(makeView({ shipA: [], shipB: [] }, { shipA: IDLE, shipB: IDLE }));
      controller.update();
      expect(els.shipALockBadge.hidden).toBe(true);
    });

    test("hidden when lock status is locking", () => {
      const { controller, els, profiles, viewStream } = buildController();
      profiles.shipA = SHIP_A_PROFILE;
      viewStream.currentView.mockReturnValue(makeView({ shipA: [], shipB: [] }, { shipA: LOCKING, shipB: IDLE }));
      controller.update();
      expect(els.shipALockBadge.hidden).toBe(true);
    });

    test("visible when lock status is locked with non-zero lockTime", () => {
      const { controller, els, profiles, viewStream } = buildController();
      profiles.shipA = SHIP_A_PROFILE;
      viewStream.currentView.mockReturnValue(makeView({ shipA: [], shipB: [] }, { shipA: LOCKED, shipB: IDLE }));
      controller.update();
      expect(els.shipALockBadge.hidden).toBe(false);
    });

    test("hidden when locked but lockTime is zero (backward-compatible)", () => {
      const { controller, els, profiles, viewStream } = buildController();
      profiles.shipA = SHIP_A_PROFILE;
      viewStream.currentView.mockReturnValue(makeView({ shipA: [], shipB: [] }, { shipA: { ...LOCKED, lockTime: 0 }, shipB: IDLE }));
      controller.update();
      expect(els.shipALockBadge.hidden).toBe(true);
    });

    test("hidden when profile is undefined even if locked", () => {
      const { controller, els, viewStream } = buildController();
      viewStream.currentView.mockReturnValue(makeView({ shipA: [], shipB: [] }, { shipA: LOCKED, shipB: IDLE }));
      controller.update();
      expect(els.shipALockBadge.hidden).toBe(true);
    });
  });
});
