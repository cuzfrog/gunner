import { fakeDocument, getFake } from "../../testing";
import type { EwarProjection } from "../../../sim";
import type { I18n, Language } from "../../i18n";
import { UiEventsImpl } from "../../events";
import type { EwarController, EwarEffectDescriber } from "../ewar";
import { RangeOverlayControllerImpl } from "./rangeOverlayController";
import type { RangeOverlayController, RangeOverlayEls } from "./rangeOverlayControllerContract";

const WEB = { moduleName: "Stasis Webifier I", maxRange: 10000, speedFactor: -0.5, overloadRangeBonusPercent: 15 };
const WEB2 = { moduleName: "Stasis Webifier II", maxRange: 12000, speedFactor: -0.55, overloadRangeBonusPercent: 15 };
const SCRAMBLER = { moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 };
const GRAPPLER = { moduleName: "Heavy Stasis Grappler I", optimal: 1000, falloff: 8000, speedFactor: 0.8, overloadOptimalBonusPercent: 300 };
const DISRUPTOR = { moduleName: "Tracking Disruptor I", optimal: 10000, falloff: 30000, disruption: -0.2, defaultScript: undefined, overloadStrengthBonusPercent: 20 };

function buildController(now: () => number = () => 0): {
  controller: RangeOverlayController;
  ewarController: EwarController;
  events: UiEventsImpl;
  emitDisplayInvalidated: ReturnType<typeof vi.spyOn>;
  ewarEffectDescriber: EwarEffectDescriber;
  legend: HTMLElement;
} {
  const document = fakeDocument();
  globalThis.document = document;
  const legend = getFake(document, "range-overlay-legend") as unknown as HTMLElement;
  const els: RangeOverlayEls = { legend };
  const i18n = vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  });
  const projections: Record<"attacker" | "target", EwarProjection | undefined> = { attacker: undefined, target: undefined };
  const ewarController = vi.mocked<EwarController>({
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn((side: "attacker" | "target") => projections[side]),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  });
  const ewarEffectDescriber = vi.mocked<EwarEffectDescriber>({
    webDescription: vi.fn(() => "web-title"),
    grapplerDescription: vi.fn(() => "grappler-title"),
    disruptorDescription: vi.fn(() => "disruptor-title"),
    scramblerDescription: vi.fn(() => "scrambler-title"),
  });
  const events = new UiEventsImpl();
  const emitDisplayInvalidated = vi.spyOn(events, "emitDisplayInvalidated");
  const controller = new RangeOverlayControllerImpl({
    els,
    i18n,
    ewarEffectDescriber,
    ewarController,
    events,
    now,
  });
  events.emitDistanceChanged(5000);
  return { controller, ewarController, events, emitDisplayInvalidated, ewarEffectDescriber, legend };
}

function projectionWithWeb(active = true, overloaded = false): EwarProjection {
  return {
    loadout: { webs: [WEB], grapplers: [], disruptors: [], scramblers: [], scripts: [] },
    activation: { webs: [{ active, overloaded }], grapplers: [], disruptors: [], scramblers: [] },
  };
}

function projectionWithGrappler(active = true, overloaded = false): EwarProjection {
  return {
    loadout: { webs: [], grapplers: [GRAPPLER], disruptors: [], scramblers: [], scripts: [] },
    activation: { webs: [], grapplers: [{ active, overloaded }], disruptors: [], scramblers: [] },
  };
}

function projectionWithScrambler(active = true, overloaded = false): EwarProjection {
  return {
    loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [SCRAMBLER], scripts: [] },
    activation: { webs: [], grapplers: [], disruptors: [], scramblers: [{ active, overloaded }] },
  };
}

function projectionWithDisruptor(active = true, overloaded = false): EwarProjection {
  return {
    loadout: { webs: [], grapplers: [], disruptors: [DISRUPTOR], scramblers: [], scripts: [] },
    activation: { webs: [], grapplers: [], disruptors: [{ active, overloaded, script: undefined }], scramblers: [] },
  };
}

function setProjections(ewarController: EwarController, attacker?: EwarProjection, target?: EwarProjection): void {
  const projections: Record<"attacker" | "target", EwarProjection | undefined> = { attacker, target };
  vi.mocked(ewarController.projection).mockImplementation((side) => projections[side]);
}

function setAllProjections(ewarController: EwarController, projection: EwarProjection | undefined): void {
  vi.mocked(ewarController.projection).mockImplementation(() => projection);
}

describe("RangeOverlayController", () => {
  test("descriptors returns the union of kinds present on either side", () => {
    const { controller, ewarController } = buildController();
    setProjections(ewarController, projectionWithWeb(), projectionWithScrambler());
    expect(controller.descriptors()).toEqual(["web", "scrambler"]);
  });

  test("descriptors returns an empty list when neither side has ewar", () => {
    const { controller, legend } = buildController();
    expect(controller.descriptors()).toEqual([]);
    expect(legend.hidden).toBe(true);
  });

  test("overlays returns visible descriptors for both sides", () => {
    const { controller, ewarController } = buildController();
    setProjections(ewarController, projectionWithWeb(), projectionWithDisruptor());
    const overlays = controller.overlays();
    expect(overlays).toHaveLength(2);
    expect(overlays[0]).toEqual({ side: "attacker", kind: "web", radius: 10000 });
    expect(overlays[1]).toEqual({ side: "target", kind: "disruptor", radius: 10000, falloffRadius: 30000 });
  });

  test("toggle hides a visible kind and excludes it from overlays", () => {
    const { controller, ewarController, emitDisplayInvalidated } = buildController();
    setProjections(ewarController, projectionWithWeb(), undefined);
    expect(controller.isVisible("web")).toBe(true);
    controller.toggle("web");
    expect(controller.isVisible("web")).toBe(false);
    expect(controller.overlays()).toEqual([]);
    expect(emitDisplayInvalidated).toHaveBeenCalled();
  });

  test("toggle shows a previously hidden kind", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithWeb());
    controller.toggle("web");
    controller.toggle("web");
    expect(controller.isVisible("web")).toBe(true);
    expect(controller.overlays().length).toBe(2);
  });

  test("web range is scaled by overload range bonus", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithWeb(true, true));
    expect(controller.overlays()[0]?.radius).toBe(11500);
  });

  test("inactive modules do not produce overlays", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithWeb(false, false));
    expect(controller.overlays()).toEqual([]);
  });

  test("grappler overlay uses scaled optimal and base falloff", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithGrappler(true, true));
    const overlays = controller.overlays();
    expect(overlays[0]?.radius).toBe(4000);
    expect(overlays[0]?.falloffRadius).toBe(8000);
  });

  test("scrambler range is scaled by overload range bonus", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithScrambler(true, true));
    expect(controller.overlays()[0]?.radius).toBe(10800);
  });

  test("disruptor overlay uses base optimal and falloff", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithDisruptor(true, true));
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
    expect(legend.children.length).toBe(1);
    setAllProjections(ewarController, projectionWithScrambler());
    controller.update();
    expect(legend.children.length).toBe(1);
    expect(legend.children[0].textContent).toBe("label.ewar.scrambler");
  });

  test("hidden kinds can be restored and read back", () => {
    const { controller, ewarController } = buildController();
    setAllProjections(ewarController, projectionWithWeb());
    controller.restoreHidden(["web"]);
    expect(controller.isVisible("web")).toBe(false);
    expect(controller.hiddenKinds()).toEqual(["web"]);
  });

  test("restoreHidden ignores invalid kind strings", () => {
    const { controller } = buildController();
    controller.restoreHidden(["web", "unknown"]);
    expect(controller.hiddenKinds()).toEqual(["web"]);
  });

  test("legend is hidden when the last ewar module is removed", () => {
    const { controller, ewarController, legend } = buildController();
    setAllProjections(ewarController, projectionWithWeb());
    controller.update();
    expect(legend.hidden).toBe(false);
    setAllProjections(ewarController, undefined);
    controller.update();
    expect(legend.hidden).toBe(true);
  });
});
