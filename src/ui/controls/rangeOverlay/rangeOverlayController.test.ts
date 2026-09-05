import { fakeDocument, getFake } from "../../testing";
import { toTypeId } from "../../../gamedata/ids";
import { EwarResolverImpl, StackingPenaltyImpl, type EwarProjection, type EngagementView } from "../../../sim";
import type { I18n, Language } from "../../i18n";
import type { ViewStream } from "../../viewStream";
import { UiEventsImpl } from "../../events";
import type { EwarController, EwarEffectDescriber } from "../ewar";
import { RangeOverlayControllerImpl } from "./rangeOverlayController";
import type { RangeOverlayController, RangeOverlayEls } from "./rangeOverlayControllerContract";

const WEB = { moduleId: toTypeId("527"), moduleName: "Stasis Webifier I", maxRange: 10000, speedFactor: -0.5, overloadRangeBonusPercent: 15 };
const WEB2 = { moduleId: toTypeId("527"), moduleName: "Stasis Webifier II", maxRange: 12000, speedFactor: -0.55, overloadRangeBonusPercent: 15 };
const SCRAMBLER = { moduleId: toTypeId("448"), moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 };
const GRAPPLER = { moduleId: toTypeId("41040"), moduleName: "Heavy Stasis Grappler I", optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 };
const DISRUPTOR = { moduleId: toTypeId("2109"), moduleName: "Tracking Disruptor I", optimal: 10000, falloff: 30000, disruption: -0.2, defaultScript: undefined, overloadStrengthBonusPercent: 20 };

function buildController(now: () => number = () => 0): {
  controller: RangeOverlayController;
  ewarController: EwarController;
  events: UiEventsImpl;
  emitDisplayInvalidated: ReturnType<typeof vi.spyOn>;
  ewarEffectDescriber: EwarEffectDescriber;
  legend: HTMLElement;
  viewStreamListeners: Set<(view: EngagementView) => void>;
} {
  const document = fakeDocument();
  globalThis.document = document;
  const legend = getFake(document, "range-overlay-legend") as unknown as HTMLElement;
  const staticButton = document.createElement("button");
  staticButton.id = "weapon-range-button";
  legend.appendChild(staticButton);
  const els: RangeOverlayEls = { legend };
  const i18n = vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  });
  const projections: Record<"shipA" | "shipB", EwarProjection | undefined> = { shipA: undefined, shipB: undefined };
  const ewarController = vi.mocked<EwarController>({
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn((side: "shipA" | "shipB") => projections[side]),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  });
  const ewarEffectDescriber = vi.mocked<EwarEffectDescriber>({
    webDescription: vi.fn(() => "web-title"),
    webHint: vi.fn(() => "web-hint"),
    grapplerDescription: vi.fn(() => "grappler-title"),
    grapplerHint: vi.fn(() => "grappler-hint"),
    disruptorDescription: vi.fn(() => "disruptor-title"),
    disruptorHint: vi.fn(() => "disruptor-hint"),
    scramblerDescription: vi.fn(() => "scrambler-title"),
    scramblerHint: vi.fn(() => "scrambler-hint"),
    painterHint: vi.fn(() => "painter-hint"),
    dampenerHint: vi.fn(() => "dampener-hint"),
    painterModuleEffect: vi.fn(() => "painter-effect"),
    dampenerModuleEffect: vi.fn(() => "dampener-effect"),
    webModuleEffect: vi.fn(() => "web-effect"),
    grapplerModuleEffect: vi.fn(() => "grappler-effect"),
    disruptorModuleEffect: vi.fn(() => "disruptor-effect"),
    scramblerModuleEffect: vi.fn(() => "scrambler-effect"),
  });
  const events = new UiEventsImpl();
  const emitDisplayInvalidated = vi.spyOn(events, "emitDisplayInvalidated");
  const ewarResolver = new EwarResolverImpl({ stackingPenalty: new StackingPenaltyImpl() });
  const viewStreamListeners = new Set<(view: EngagementView) => void>();
  const viewStream = vi.mocked<ViewStream>({
    connect: vi.fn(),
    onViewUpdated: vi.fn((l: (view: EngagementView) => void) => viewStreamListeners.add(l)),
    offViewUpdated: vi.fn((l: (view: EngagementView) => void) => viewStreamListeners.delete(l)),
    currentView: vi.fn(() => undefined),
  });
  const controller = new RangeOverlayControllerImpl({
    els,
    i18n,
    ewarEffectDescriber,
    ewarController,
    ewarResolver,
    events,
    viewStream,
    now,
  });
  emitView(viewStreamListeners, 5000);
  return { controller, ewarController, events, emitDisplayInvalidated, ewarEffectDescriber, legend, viewStreamListeners };
}

function emitView(listeners: Set<(view: EngagementView) => void>, distance: number): void {
  const view = { frame: { distance } } as unknown as EngagementView;
  for (const listener of Array.from(listeners)) listener(view);
}

function projectionWithWeb(active = true, overloaded = false): EwarProjection {
  return {
    loadout: { webs: [WEB], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], },
    activation: { webs: [{ active, overloaded }], grapplers: [], disruptors: [], scramblers: []  , painters: [], dampeners: [] },
  };
}

function projectionWithGrappler(active = true, overloaded = false): EwarProjection {
  return {
    loadout: { webs: [], grapplers: [GRAPPLER], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], },
    activation: { webs: [], grapplers: [{ active, overloaded }], disruptors: [], scramblers: []  , painters: [], dampeners: [] },
  };
}

function projectionWithScrambler(active = true, overloaded = false): EwarProjection {
  return {
    loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [SCRAMBLER], painters: [], dampeners: [], scripts: [], dampenerScripts: [], },
    activation: { webs: [], grapplers: [], disruptors: [], scramblers: [{ active, overloaded  }], painters: [], dampeners: [] },
  };
}

function projectionWithDisruptor(active = true, overloaded = false): EwarProjection {
  return {
    loadout: { webs: [], grapplers: [], disruptors: [DISRUPTOR], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], },
    activation: { webs: [], grapplers: [], disruptors: [{ active, overloaded, script: undefined }], scramblers: []  , painters: [], dampeners: [] },
  };
}

function setProjections(ewarController: EwarController, shipA?: EwarProjection, shipB?: EwarProjection): void {
  const projections: Record<"shipA" | "shipB", EwarProjection | undefined> = { shipA, shipB };
  vi.mocked(ewarController.projection).mockImplementation((side) => projections[side]);
}

function setAllProjections(ewarController: EwarController, projection: EwarProjection | undefined): void {
  vi.mocked(ewarController.projection).mockImplementation(() => projection);
}

const ALL_BOTH = { web: "both", grappler: "both", scrambler: "both", disruptor: "both" } as const;
const ALL_NONE = { web: "none", grappler: "none", scrambler: "none", disruptor: "none" } as const;

describe("RangeOverlayController", () => {
  test("descriptors returns the union of kinds present on either side", () => {
    const { controller, ewarController } = buildController();
    setProjections(ewarController, projectionWithWeb(), projectionWithScrambler());
    expect(controller.descriptors()).toEqual(["web", "scrambler"]);
  });

  test("descriptors returns an empty list when neither side has ewar", () => {
    const { controller } = buildController();
    expect(controller.descriptors()).toEqual([]);
  });

  test("overlays returns visible descriptors for both sides", () => {
    const { controller, ewarController } = buildController();
    setProjections(ewarController, projectionWithWeb(), projectionWithDisruptor());
    controller.restoreVisibility(ALL_BOTH);
    const overlays = controller.overlays();
    expect(overlays).toHaveLength(2);
    expect(overlays[0]).toEqual({ side: "shipA", kind: "web", radius: 10000 });
    expect(overlays[1]).toEqual({ side: "shipB", kind: "disruptor", radius: 10000, falloffRadius: 30000 });
  });

  test("toggle cycles visibility through both, shipA, shipB, none", () => {
    const { controller, ewarController, emitDisplayInvalidated } = buildController();
    setProjections(ewarController, projectionWithWeb(), projectionWithWeb());
    controller.restoreVisibility(ALL_NONE);
    expect(controller.visibilityFor("web")).toBe("none");
    controller.toggle("web");
    expect(controller.visibilityFor("web")).toBe("both");
    expect(controller.overlays()).toHaveLength(2);
    controller.toggle("web");
    expect(controller.visibilityFor("web")).toBe("shipA");
    expect(controller.overlays()).toEqual([{ side: "shipA", kind: "web", radius: 10000 }]);
    controller.toggle("web");
    expect(controller.visibilityFor("web")).toBe("shipB");
    expect(controller.overlays()).toEqual([{ side: "shipB", kind: "web", radius: 10000 }]);
    controller.toggle("web");
    expect(controller.visibilityFor("web")).toBe("none");
    expect(controller.overlays()).toEqual([]);
    expect(emitDisplayInvalidated).toHaveBeenCalled();
  });

  test("toggle skips the ship that does not have the module", () => {
    const { controller, ewarController } = buildController();
    setProjections(ewarController, projectionWithWeb(), undefined);
    controller.restoreVisibility(ALL_NONE);
    expect(controller.visibilityFor("web")).toBe("none");
    controller.toggle("web");
    expect(controller.visibilityFor("web")).toBe("both");
    expect(controller.overlays()).toEqual([{ side: "shipA", kind: "web", radius: 10000 }]);
    controller.toggle("web");
    expect(controller.visibilityFor("web")).toBe("none");
    expect(controller.overlays()).toEqual([]);
  });

  test("toggle skips shipA when only shipB has the module", () => {
    const { controller, ewarController } = buildController();
    setProjections(ewarController, undefined, projectionWithWeb());
    controller.restoreVisibility(ALL_NONE);
    controller.toggle("web");
    expect(controller.visibilityFor("web")).toBe("both");
    expect(controller.overlays()).toEqual([{ side: "shipB", kind: "web", radius: 10000 }]);
    controller.toggle("web");
    expect(controller.visibilityFor("web")).toBe("none");
  });

  test("web range is scaled by overload range bonus", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithWeb(true, true));
    controller.restoreVisibility(ALL_BOTH);
    expect(controller.overlays()[0]?.radius).toBe(11500);
  });

  test("inactive modules do not produce overlays", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithWeb(false, false));
    controller.restoreVisibility(ALL_BOTH);
    expect(controller.overlays()).toEqual([]);
  });

  test("grappler overlay uses scaled optimal and base falloff", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithGrappler(true, true));
    controller.restoreVisibility(ALL_BOTH);
    const overlays = controller.overlays();
    expect(overlays[0]?.radius).toBe(4000);
    expect(overlays[0]?.falloffRadius).toBe(8000);
  });

  test("scrambler range is scaled by overload range bonus", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithScrambler(true, true));
    controller.restoreVisibility(ALL_BOTH);
    expect(controller.overlays()[0]?.radius).toBe(10800);
  });

  test("disruptor overlay uses base optimal and falloff", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithDisruptor(true, true));
    controller.restoreVisibility(ALL_BOTH);
    const overlays = controller.overlays();
    expect(overlays[0]?.radius).toBe(10000);
    expect(overlays[0]?.falloffRadius).toBe(30000);
  });

  test("describe delegates to the effect describer with the current distance", () => {
    const { controller, ewarController, ewarEffectDescriber } = buildController();
    setAllProjections(ewarController, projectionWithWeb());
    expect(controller.describe("web")).toBe("web-title");
    expect(ewarEffectDescriber.webDescription).toHaveBeenCalled();
  });

  test("title refresh is throttled and not run every update", () => {
    let time = 0;
    const { controller, ewarController, ewarEffectDescriber } = buildController(() => time);
    setAllProjections(ewarController, projectionWithWeb());
    controller.update();
    expect(ewarEffectDescriber.webDescription).toHaveBeenCalledTimes(1);
    time += 100;
    controller.update();
    expect(ewarEffectDescriber.webDescription).toHaveBeenCalledTimes(1);
    time += 200;
    controller.update();
    expect(ewarEffectDescriber.webDescription).toHaveBeenCalledTimes(2);
  });

  test("update rebuilds the legend when the descriptor set changes", () => {
    let time = 0;
    const { controller, ewarController, legend } = buildController(() => time);
    setAllProjections(ewarController, projectionWithWeb());
    controller.update();
    expect(legend.children.length).toBe(2);
    setAllProjections(ewarController, projectionWithScrambler());
    controller.update();
    expect(legend.children.length).toBe(2);
    expect(legend.children[1].textContent).toBe("label.ewar.scrambler");
  });

  test("overlayVisibility returns the current visibility for all kinds", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithWeb());
    controller.restoreVisibility({ web: "shipA", grappler: "both" });
    const visibility = controller.overlayVisibility();
    expect(visibility.web).toBe("shipA");
    expect(visibility.grappler).toBe("both");
    expect(visibility.scrambler).toBe("none");
    expect(visibility.disruptor).toBe("none");
  });

  test("restoreVisibility ignores invalid kind keys and visibility values", () => {
    const { controller } = buildController();
    controller.restoreVisibility({ web: "shipA", unknown: "both", grappler: "invalid" as never });
    expect(controller.visibilityFor("web")).toBe("shipA");
    expect(controller.visibilityFor("grappler")).toBe("none");
  });

  test("all kinds default to none and produce no overlays", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithWeb());
    for (const kind of ["web", "grappler", "scrambler", "disruptor"] as const) {
      expect(controller.visibilityFor(kind)).toBe("none");
    }
    expect(controller.overlays()).toEqual([]);
  });

  test("restoreVisibility with all both shows all kinds", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithDisruptor());
    controller.restoreVisibility(ALL_BOTH);
    expect(controller.visibilityFor("disruptor")).toBe("both");
    expect(controller.overlays().length).toBeGreaterThan(0);
  });

  test("shipA visibility shows only shipA overlays", () => {
    const { controller, ewarController } = buildController();
    setProjections(ewarController, projectionWithWeb(), projectionWithWeb());
    controller.restoreVisibility({ web: "shipA" });
    const overlays = controller.overlays();
    expect(overlays).toEqual([{ side: "shipA", kind: "web", radius: 10000 }]);
  });

  test("shipB visibility shows only shipB overlays", () => {
    const { controller, ewarController } = buildController();
    setProjections(ewarController, projectionWithWeb(), projectionWithWeb());
    controller.restoreVisibility({ web: "shipB" });
    const overlays = controller.overlays();
    expect(overlays).toEqual([{ side: "shipB", kind: "web", radius: 10000 }]);
  });

  test("chips are removed when the last ewar module is removed, preserving the static weapon range button", () => {
    const { controller, ewarController, legend } = buildController();
    setAllProjections(ewarController, projectionWithWeb());
    controller.update();
    expect(legend.children.length).toBe(2);
    setAllProjections(ewarController, undefined);
    controller.update();
    expect(legend.children.length).toBe(1);
    expect(legend.children[0].id).toBe("weapon-range-button");
  });
});
