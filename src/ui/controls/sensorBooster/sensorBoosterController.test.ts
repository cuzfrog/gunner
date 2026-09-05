import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { SensorBoostLoadout, SensorBoosterScriptSpec } from "../../../sim";
import { EMPTY_SENSOR_BOOST_LOADOUT } from "../../../sim";
import type { Language, StoredSensorBoosterActivation } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { createControlsEls } from "../elements";
import type { PopupGroup } from "../popup";
import { FakeElement, fakeDocument, getFake, mockFittingImport } from "../../testing";
import { UiEventsImpl } from "../../events";
import { SensorBoosterControllerImpl } from "./sensorBoosterController";
import { SensorBoosterEffectDescriberImpl } from "./sensorBoosterEffectDescriber";
import type { SensorBoosterEls } from "./sensorBoosterControllerContract";

const SCAN_SCRIPT: SensorBoosterScriptSpec & { readonly moduleId: TypeId } = {
  name: "Scan Resolution Script",
  moduleId: toTypeId("29011"),
  scanResolutionMultiplier: 2,
  maxTargetRangeMultiplier: 0,
};

const RANGE_SCRIPT: SensorBoosterScriptSpec & { readonly moduleId: TypeId } = {
  name: "Targeting Range Script",
  moduleId: toTypeId("29009"),
  scanResolutionMultiplier: 0,
  maxTargetRangeMultiplier: 2,
};

const ECCM_SCRIPT: SensorBoosterScriptSpec & { readonly moduleId: TypeId } = {
  name: "ECCM Script",
  moduleId: toTypeId("41155"),
  scanResolutionMultiplier: 0,
  maxTargetRangeMultiplier: 0,
};

const SB_II = {
  moduleName: "Sensor Booster II",
  moduleId: toTypeId("1952"),
  scanResolutionBonusPercent: 30,
  maxTargetRangeBonusPercent: 30,
  overloadStrengthBonusPercent: 15,
  defaultScript: undefined,
};

const SA_II = {
  moduleName: "Signal Amplifier II",
  moduleId: toTypeId("1987"),
  scanResolutionBonusPercent: 15,
  maxTargetRangeBonusPercent: 30,
  maxLockedTargetsBonus: 2,
};

const LOADOUT: SensorBoostLoadout = {
  boosters: [SB_II],
  amplifiers: [SA_II],
  boosterScripts: [RANGE_SCRIPT, SCAN_SCRIPT, ECCM_SCRIPT],
};

function buildSensorBoosterController() {
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
  getFake(document, "ship-a-ewar-popup").appendChild(els.shipA.sensorBoosterSection as unknown as FakeElement);
  getFake(document, "ship-b-ewar-popup").appendChild(els.shipB.sensorBoosterSection as unknown as FakeElement);
  getFake(document, "ship-a-sensor-booster-section").hidden = true;
  getFake(document, "ship-b-sensor-booster-section").hidden = true;
  const sensorBoosterEls: SensorBoosterEls = {
    sections: { shipA: els.shipA.sensorBoosterSection, shipB: els.shipB.sensorBoosterSection },
    summaries: { shipA: els.shipA.sensorBoosterSummary, shipB: els.shipB.sensorBoosterSummary },
  };
  const NAME_FOR_ID: Record<string, string> = {
    "1952": "Sensor Booster II",
    "1987": "Signal Amplifier II",
    "29009": "Targeting Range Script",
    "29011": "Scan Resolution Script",
    "41155": "ECCM Script",
  };
  const fittingImport = vi.mocked(mockFittingImport());
  fittingImport.itemNameForId = vi.fn((id: TypeId, lang: string) => {
    const name = NAME_FOR_ID[id] ?? id;
    return lang === "en" ? name : `${name} (${lang})`;
  });
  const events = new UiEventsImpl();
  const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
  const describer = new SensorBoosterEffectDescriberImpl({ i18n });
  const controller = new SensorBoosterControllerImpl({ els: sensorBoosterEls, popupGroup, imageCatalog, fittingImport, i18n, events, describer });
  return { document, controller, els, sensorBoosterEls, i18n, imageCatalog, popupGroup, fittingImport, events, emitConfigInvalidated };
}

function sensorBoosterSection(document: Document, side: "shipA" | "shipB"): FakeElement {
  return getFake(document, side === "shipA" ? "ship-a-sensor-booster-section" : "ship-b-sensor-booster-section");
}

function boosterRows(section: FakeElement): FakeElement[] {
  const boosterBlock = section.children.find((block) => block.children[0]?.textContent === "label.sensorBooster.booster");
  if (!boosterBlock) return [];
  return boosterBlock.children.filter((c) => c.className.includes("ewar-row"));
}

function amplifierRows(section: FakeElement): FakeElement[] {
  const amplifierBlock = section.children.find((block) => block.children[0]?.textContent === "label.sensorBooster.amplifier");
  if (!amplifierBlock) return [];
  return amplifierBlock.children.filter((c) => c.className.includes("ewar-row"));
}

describe("SensorBoosterController", () => {
  test("setLoadout renders booster and amplifier sections", () => {
    const { controller, document } = buildSensorBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const section = sensorBoosterSection(document, "shipA");
    expect(section.hidden).toBe(false);
    expect(boosterRows(section).length).toBe(1);
    expect(amplifierRows(section).length).toBe(1);
  });

  test("setLoadout hides section for empty loadout", () => {
    const { controller, document } = buildSensorBoosterController();
    controller.setLoadout("shipA", EMPTY_SENSOR_BOOST_LOADOUT);
    const section = sensorBoosterSection(document, "shipA");
    expect(section.hidden).toBe(true);
  });

  test("booster row has toggle, overload, and script gear buttons", () => {
    const { controller, document } = buildSensorBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const row = boosterRows(sensorBoosterSection(document, "shipA"))[0];
    expect(row.children.find((c) => c.className === "ewar-module-toggle")).toBeDefined();
    expect(row.children.find((c) => c.className.split(" ").includes("ewar-overload-button"))).toBeDefined();
    expect(row.children.find((c) => c.className.split(" ").includes("ewar-script-gear"))).toBeDefined();
  });

  test("amplifier row has only toggle button (passive display)", () => {
    const { controller, document } = buildSensorBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const row = amplifierRows(sensorBoosterSection(document, "shipA"))[0];
    expect(row.children.find((c) => c.className === "ewar-module-toggle")).toBeDefined();
    expect(row.children.find((c) => c.className.split(" ").includes("ewar-overload-button"))).toBeUndefined();
    expect(row.children.find((c) => c.className.split(" ").includes("ewar-script-gear"))).toBeUndefined();
  });

  test("toggleBooster deactivates the row and emits configInvalidated", () => {
    const { controller, document, emitConfigInvalidated } = buildSensorBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const row = boosterRows(sensorBoosterSection(document, "shipA"))[0];
    const button = row.children.find((c) => c.className === "ewar-module-toggle")!;
    button.dispatchEvent(new Event("click"));
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(emitConfigInvalidated).toHaveBeenCalled();
  });

  test("overload toggle flips aria-pressed", () => {
    const { controller, document } = buildSensorBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const row = boosterRows(sensorBoosterSection(document, "shipA"))[0];
    const overloadButton = row.children.find((c) => c.className.split(" ").includes("ewar-overload-button"))!;
    expect(overloadButton.getAttribute("aria-pressed")).toBe("false");
    overloadButton.dispatchEvent(new Event("click"));
    expect(overloadButton.getAttribute("aria-pressed")).toBe("true");
  });

  test("capture and restore round-trips activation with script and overload", () => {
    const { controller } = buildSensorBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const captured = controller.capture("shipA");
    expect(captured).toEqual([{ active: true, overloaded: false, script: "none" }]);

    const saved: StoredSensorBoosterActivation[] = [{ active: false, overloaded: true, script: toTypeId("29011") }];
    controller.restore("shipA", LOADOUT, saved);
    const restored = controller.capture("shipA");
    expect(restored).toEqual([{ active: false, overloaded: true, script: toTypeId("29011") }]);
  });

  test("restore defaults to active when no saved activation is provided", () => {
    const { controller } = buildSensorBoosterController();
    controller.restore("shipA", LOADOUT);
    const captured = controller.capture("shipA");
    expect(captured).toEqual([{ active: true, overloaded: false, script: "none" }]);
  });

  test("restore clamps invalid saved script to defaultScript", () => {
    const { controller } = buildSensorBoosterController();
    const loadoutWithDefault: SensorBoostLoadout = {
      boosters: [{ ...SB_II, defaultScript: SCAN_SCRIPT }],
      amplifiers: [],
      boosterScripts: [RANGE_SCRIPT, SCAN_SCRIPT, ECCM_SCRIPT],
    };
    controller.restore("shipA", loadoutWithDefault, [{ active: true, overloaded: false, script: toTypeId("99999") }]);
    const captured = controller.capture("shipA");
    expect(captured![0].script).toBe(toTypeId("29011"));
  });

  test("restore with saved script 'none' sets script to none", () => {
    const { controller } = buildSensorBoosterController();
    const loadoutWithDefault: SensorBoostLoadout = {
      boosters: [{ ...SB_II, defaultScript: SCAN_SCRIPT }],
      amplifiers: [],
      boosterScripts: [RANGE_SCRIPT, SCAN_SCRIPT, ECCM_SCRIPT],
    };
    controller.restore("shipA", loadoutWithDefault, [{ active: true, overloaded: false, script: "none" }]);
    const captured = controller.capture("shipA");
    expect(captured).toEqual([{ active: true, overloaded: false, script: "none" }]);
  });

  test("projection returns undefined for empty loadout", () => {
    const { controller } = buildSensorBoosterController();
    controller.setLoadout("shipA", EMPTY_SENSOR_BOOST_LOADOUT);
    expect(controller.projection("shipA")).toBeUndefined();
  });

  test("projection returns loadout and activation for non-empty loadout", () => {
    const { controller } = buildSensorBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const projection = controller.projection("shipA");
    expect(projection).toBeDefined();
    expect(projection!.loadout.boosters.length).toBe(1);
    expect(projection!.loadout.amplifiers.length).toBe(1);
    expect(projection!.activation?.length).toBe(1);
  });

  test("summary shows booster and amplifier counts", () => {
    const { controller, document } = buildSensorBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const summary = getFake(document, "ship-a-sensor-booster-summary");
    expect(summary.children.length).toBe(2);
    const boosterSummary = summary.children[0];
    expect(boosterSummary.children[1].textContent).toBe("1/1");
    const amplifierSummary = summary.children[1];
    expect(amplifierSummary.children[1].textContent).toBe("1/1");
  });

  test("script gear opens popup and selecting a script persists", () => {
    const { controller, document } = buildSensorBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const section = sensorBoosterSection(document, "shipA");
    const row = boosterRows(section)[0];
    const gear = row.children.find((c) => c.className.split(" ").includes("ewar-script-gear"))!;
    gear.dispatchEvent(new Event("click"));
    const popup = section.children.find((c) => c.id === "ship-a-sensor-booster-script-popup");
    expect(popup).toBeDefined();
    const scanOption = popup!.children.find((c) => c.getAttribute("data-value") === String(toTypeId("29011")));
    expect(scanOption).toBeDefined();
    scanOption!.dispatchEvent(new Event("click"));
    const captured = controller.capture("shipA");
    expect(captured![0].script).toBe(toTypeId("29011"));
  });

  test("amplifier-only loadout still displays section", () => {
    const { controller, document } = buildSensorBoosterController();
    controller.setLoadout("shipA", { boosters: [], amplifiers: [SA_II], boosterScripts: [] });
    const section = sensorBoosterSection(document, "shipA");
    expect(section.hidden).toBe(false);
    expect(boosterRows(section).length).toBe(0);
    expect(amplifierRows(section).length).toBe(1);
  });
});
