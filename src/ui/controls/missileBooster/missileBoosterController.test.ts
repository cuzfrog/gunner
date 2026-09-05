import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { MissileBoosterLoadout, MissileScriptSpec } from "../../../sim";
import { EMPTY_MISSILE_BOOSTER_LOADOUT } from "../../../sim";
import type { Language, StoredMissileBoosterActivation } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { createControlsEls } from "../elements";
import type { Popup, PopupGroup } from "../popup";
import type { ModulesPopup } from "../modulesPopup";
import { FakeElement, fakeDocument, getFake, mockFittingImport } from "../../testing";
import { UiEventsImpl } from "../../events";
import { MissileBoosterControllerImpl } from "./missileBoosterController";
import { MissileBoosterEffectDescriberImpl } from "./missileBoosterEffectDescriber";
import type { MissileBoosterEls } from "./missileBoosterControllerContract";

const PRECISION_SCRIPT: MissileScriptSpec & { readonly moduleId: TypeId } = {
  name: "Missile Precision Script",
  moduleId: toTypeId("35795"),
  explosionRadiusMultiplier: 2,
  explosionVelocityMultiplier: 2,
  missileVelocityMultiplier: 0,
  flightTimeMultiplier: 0,
};

const RANGE_SCRIPT: MissileScriptSpec & { readonly moduleId: TypeId } = {
  name: "Missile Range Script",
  moduleId: toTypeId("35794"),
  explosionRadiusMultiplier: 0,
  explosionVelocityMultiplier: 0,
  missileVelocityMultiplier: 2,
  flightTimeMultiplier: 2,
};

const MGC_II = {
  moduleName: "Missile Guidance Computer II",
  moduleId: toTypeId("35790"),
  explosionRadiusBonusPercent: -8.25,
  explosionVelocityBonusPercent: 8.25,
  missileVelocityBonusPercent: 5.5,
  flightTimeBonusPercent: 5.5,
  overloadStrengthBonusPercent: 15,
  defaultScript: undefined,
};

const MGE_II = {
  moduleName: "Missile Guidance Enhancer II",
  moduleId: toTypeId("35771"),
  explosionRadiusBonusPercent: -6,
  explosionVelocityBonusPercent: 6,
  missileVelocityBonusPercent: 6,
  flightTimeBonusPercent: 6,
};

const LOADOUT: MissileBoosterLoadout = {
  computers: [MGC_II],
  enhancers: [MGE_II],
  scripts: [PRECISION_SCRIPT, RANGE_SCRIPT],
};

function buildMissileBoosterController() {
  const document = fakeDocument();
  globalThis.document = document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  globalThis.HTMLButtonElement = FakeElement as unknown as typeof HTMLButtonElement;
  const i18n = vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  });
  const imageCatalog = vi.mocked<ImageCatalog>({
    shipImageUrl: vi.fn((_shipId) => ""),
    itemIconUrl: vi.fn((id) => `icons/${String(id)}.png`),
  });
  const popupGroup = vi.mocked<PopupGroup>({
    register: vi.fn(),
    open: vi.fn(),
    toggle: vi.fn(),
    close: vi.fn(),
    closeAll: vi.fn(),
    hasOpen: vi.fn(),
    onPointerDown: vi.fn(),
    onKeyDown: vi.fn(),
  });
  const els = createControlsEls();
  getFake(document, "ship-a-ewar-popup").appendChild(els.shipA.missileBoosterSection as unknown as FakeElement);
  getFake(document, "ship-b-ewar-popup").appendChild(els.shipB.missileBoosterSection as unknown as FakeElement);
  getFake(document, "ship-a-missile-booster-section").hidden = true;
  getFake(document, "ship-b-missile-booster-section").hidden = true;
  const stubPopup: Popup = {
    isOpen: () => false,
    open: vi.fn(),
    close: vi.fn(),
    focusTrigger: vi.fn(),
    contains: vi.fn(() => false),
  };
  const modulesPopup = vi.mocked<ModulesPopup>({
    popup: vi.fn(() => stubPopup),
    registerOnClose: vi.fn(),
    syncEnabled: vi.fn(),
  });
  const missileBoosterEls: MissileBoosterEls = {
    sections: { shipA: els.shipA.missileBoosterSection, shipB: els.shipB.missileBoosterSection },
    summaries: { shipA: els.shipA.missileBoosterSummary, shipB: els.shipB.missileBoosterSummary },
    modulesFields: { shipA: els.shipA.ewar.field, shipB: els.shipB.ewar.field },
  };
  const NAME_FOR_ID: Record<string, string> = {
    "35790": "Missile Guidance Computer II",
    "35771": "Missile Guidance Enhancer II",
    "35795": "Missile Precision Script",
    "35794": "Missile Range Script",
  };
  const fittingImport = vi.mocked(mockFittingImport());
  fittingImport.itemNameForId = vi.fn((id: TypeId, lang: string) => {
    const name = NAME_FOR_ID[id] ?? id;
    return lang === "en" ? name : `${name} (${lang})`;
  });
  const events = new UiEventsImpl();
  const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
  const describer = new MissileBoosterEffectDescriberImpl({ i18n });
  const controller = new MissileBoosterControllerImpl({ els: missileBoosterEls, popupGroup, modulesPopup, imageCatalog, fittingImport, i18n, events, describer });
  return { document, controller, els, missileBoosterEls, i18n, imageCatalog, popupGroup, modulesPopup, fittingImport, events, emitConfigInvalidated };
}

function missileBoosterSection(document: Document, side: "shipA" | "shipB"): FakeElement {
  return getFake(document, side === "shipA" ? "ship-a-missile-booster-section" : "ship-b-missile-booster-section");
}

function computerRows(section: FakeElement): FakeElement[] {
  const computerBlock = section.children.find((block) => block.children[0]?.textContent === "label.missileBooster.computer");
  if (!computerBlock) return [];
  return computerBlock.children.filter((c) => c.className.includes("ewar-row"));
}

function enhancerRows(section: FakeElement): FakeElement[] {
  const enhancerBlock = section.children.find((block) => block.children[0]?.textContent === "label.missileBooster.enhancer");
  if (!enhancerBlock) return [];
  return enhancerBlock.children.filter((c) => c.className.includes("ewar-row"));
}

describe("MissileBoosterController", () => {
  test("setLoadout renders computer and enhancer sections", () => {
    const { controller, document } = buildMissileBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const section = missileBoosterSection(document, "shipA");
    expect(section.hidden).toBe(false);
    expect(computerRows(section).length).toBe(1);
    expect(enhancerRows(section).length).toBe(1);
  });

  test("setLoadout hides section for empty loadout", () => {
    const { controller, document } = buildMissileBoosterController();
    controller.setLoadout("shipA", EMPTY_MISSILE_BOOSTER_LOADOUT);
    const section = missileBoosterSection(document, "shipA");
    expect(section.hidden).toBe(true);
  });

  test("computer row has toggle, overload, and script gear buttons", () => {
    const { controller, document } = buildMissileBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const row = computerRows(missileBoosterSection(document, "shipA"))[0];
    expect(row.children.find((c) => c.className === "ewar-module-toggle")).toBeDefined();
    expect(row.children.find((c) => c.className.split(" ").includes("ewar-overload-button"))).toBeDefined();
    expect(row.children.find((c) => c.className.split(" ").includes("ewar-script-gear"))).toBeDefined();
  });

  test("enhancer row has only toggle button", () => {
    const { controller, document } = buildMissileBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const row = enhancerRows(missileBoosterSection(document, "shipA"))[0];
    expect(row.children.find((c) => c.className === "ewar-module-toggle")).toBeDefined();
    expect(row.children.find((c) => c.className.split(" ").includes("ewar-overload-button"))).toBeUndefined();
    expect(row.children.find((c) => c.className.split(" ").includes("ewar-script-gear"))).toBeUndefined();
  });

  test("toggleComputer deactivates the row and updates summary", () => {
    const { controller, document, emitConfigInvalidated } = buildMissileBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const row = computerRows(missileBoosterSection(document, "shipA"))[0];
    const button = row.children.find((c) => c.className === "ewar-module-toggle")!;
    button.dispatchEvent(new Event("click"));
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(emitConfigInvalidated).toHaveBeenCalled();
  });

  test("overload toggle flips aria-pressed", () => {
    const { controller, document } = buildMissileBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const row = computerRows(missileBoosterSection(document, "shipA"))[0];
    const overloadButton = row.children.find((c) => c.className.split(" ").includes("ewar-overload-button"))!;
    expect(overloadButton.getAttribute("aria-pressed")).toBe("false");
    overloadButton.dispatchEvent(new Event("click"));
    expect(overloadButton.getAttribute("aria-pressed")).toBe("true");
  });

  test("overload toggle updates summary tooltip to reflect overload bonus", () => {
    const { controller, document } = buildMissileBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const summary = getFake(document, "ship-a-missile-booster-summary");
    const computerSummaryBefore = summary.children[0];
    const titleBefore = computerSummaryBefore.getAttribute("data-hint") ?? "";
    const row = computerRows(missileBoosterSection(document, "shipA"))[0];
    const overloadButton = row.children.find((c) => c.className.split(" ").includes("ewar-overload-button"))!;
    overloadButton.dispatchEvent(new Event("click"));
    const computerSummaryAfter = getFake(document, "ship-a-missile-booster-summary").children[0];
    const titleAfter = computerSummaryAfter.getAttribute("data-hint") ?? "";
    expect(titleBefore).not.toBe(titleAfter);
    expect(titleAfter).toContain("missileBooster.hover.explosionRadius");
  });

  test("capture and restore round-trips activation with script and overload", () => {
    const { controller } = buildMissileBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const captured = controller.capture("shipA");
    expect(captured).toEqual([{ active: true, overloaded: false, script: "none" }]);

    const saved: StoredMissileBoosterActivation[] = [{ active: false, overloaded: true, script: toTypeId("35795") }];
    controller.restore("shipA", LOADOUT, saved);
    const restored = controller.capture("shipA");
    expect(restored).toEqual([{ active: false, overloaded: true, script: toTypeId("35795") }]);
  });

  test("restore defaults to spec defaultScript when saved script is undefined", () => {
    const { controller } = buildMissileBoosterController();
    const loadoutWithDefault: MissileBoosterLoadout = {
      computers: [{ ...MGC_II, defaultScript: PRECISION_SCRIPT }],
      enhancers: [],
      scripts: [PRECISION_SCRIPT, RANGE_SCRIPT],
    };
    controller.restore("shipA", loadoutWithDefault, [{ active: true, overloaded: false, script: "none" }]);
    const captured = controller.capture("shipA");
    expect(captured).toEqual([{ active: true, overloaded: false, script: "none" }]);
  });

  test("projection returns undefined for empty loadout", () => {
    const { controller } = buildMissileBoosterController();
    controller.setLoadout("shipA", EMPTY_MISSILE_BOOSTER_LOADOUT);
    expect(controller.projection("shipA")).toBeUndefined();
  });

  test("projection returns loadout and activation for non-empty loadout", () => {
    const { controller } = buildMissileBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const projection = controller.projection("shipA");
    expect(projection).toBeDefined();
    expect(projection!.loadout.computers.length).toBe(1);
    expect(projection!.loadout.enhancers.length).toBe(1);
    expect(projection!.activation?.computers.length).toBe(1);
  });

  test("summary shows computer and enhancer counts", () => {
    const { controller, document } = buildMissileBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const summary = getFake(document, "ship-a-missile-booster-summary");
    expect(summary.children.length).toBe(2);
    const computerSummary = summary.children[0];
    expect(computerSummary.children[1].textContent).toBe("1/1");
    const enhancerSummary = summary.children[1];
    expect(enhancerSummary.children[1].textContent).toBe("1/1");
  });

  test("script gear opens popup and selecting a script persists", () => {
    const { controller, document } = buildMissileBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const section = missileBoosterSection(document, "shipA");
    const row = computerRows(section)[0];
    const gear = row.children.find((c) => c.className.split(" ").includes("ewar-script-gear"))!;
    gear.dispatchEvent(new Event("click"));
    const field = getFake(document, "ship-a-ewar-field");
    const popup = field.children.find((c) => c.id === "ship-a-missile-booster-script-popup");
    expect(popup).toBeDefined();
    const precisionOption = popup!.children.find((c) => c.getAttribute("data-value") === String(toTypeId("35795")));
    expect(precisionOption).toBeDefined();
    precisionOption!.dispatchEvent(new Event("click"));
    const captured = controller.capture("shipA");
    expect(captured![0].script).toBe(toTypeId("35795"));
  });
});
