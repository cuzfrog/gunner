import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { BoostLoadout, TurretScriptSpec } from "../../../sim";
import { EMPTY_BOOST_LOADOUT } from "../../../sim";
import type { Language, StoredBoosterActivation } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { createControlsEls } from "../elements";
import type { PopupGroup } from "../popup";
import { FakeElement, fakeDocument, getFake, mockFittingImport } from "../../testing";
import { UiEventsImpl } from "../../events";
import { BoosterControllerImpl } from "./boosterController";
import type { BoosterEls } from "./boosterControllerContract";

function asTypeId(value: string): TypeId { return value as TypeId; }

const TRACKING_SCRIPT: TurretScriptSpec & { readonly moduleId: TypeId } = { name: "Tracking Speed Script", moduleId: toTypeId("29001"), trackingMultiplier: 2, optimalMultiplier: 0, falloffMultiplier: 0 };
const OPTIMAL_SCRIPT: TurretScriptSpec & { readonly moduleId: TypeId } = { name: "Optimal Range Script", moduleId: toTypeId("28999"), trackingMultiplier: 0, optimalMultiplier: 2, falloffMultiplier: 2 };

const LOADOUT: BoostLoadout = {
  computers: [
    { moduleName: "Tracking Computer I", moduleId: asTypeId("Tracking Computer I"), trackingBonusPercent: 10, optimalBonusPercent: 5, falloffBonusPercent: 10, defaultScript: undefined },
    { moduleName: "Tracking Computer II", moduleId: asTypeId("Tracking Computer II"), trackingBonusPercent: 15, optimalBonusPercent: 7.5, falloffBonusPercent: 15, defaultScript: TRACKING_SCRIPT },
  ],
  scripts: [TRACKING_SCRIPT, OPTIMAL_SCRIPT],
};

function buildBoosterController() {
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
    shipImageUrl: vi.fn((_shipId, _shipName) => ""),
    itemIconUrl: vi.fn(),
    droneIconUrl: vi.fn(),
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
  getFake(document, "ship-a-ewar-popup").appendChild(els.shipA.boosterSection as unknown as FakeElement);
  getFake(document, "ship-b-ewar-popup").appendChild(els.shipB.boosterSection as unknown as FakeElement);
  getFake(document, "ship-a-booster-section").hidden = true;
  getFake(document, "ship-b-booster-section").hidden = true;
  const boosterEls: BoosterEls = {
    sections: { shipA: els.shipA.boosterSection, shipB: els.shipB.boosterSection },
    summaries: { shipA: els.shipA.boosterSummary, shipB: els.shipB.boosterSummary },
  };
  const NAME_FOR_ID: Record<string, string> = {
    "28999": "Optimal Range Script",
    "29001": "Tracking Speed Script",
  };
  const fittingImport = vi.mocked(mockFittingImport());
  fittingImport.itemNameForId = vi.fn((id: TypeId, lang: string) => {
    const name = NAME_FOR_ID[id] ?? id;
    return lang === "en" ? name : `${name} (${lang})`;
  });
  const events = new UiEventsImpl();
  const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
  const controller = new BoosterControllerImpl({ els: boosterEls, popupGroup, imageCatalog, fittingImport, i18n, events });
  return { document, controller, els, boosterEls, i18n, imageCatalog, popupGroup, fittingImport, events, emitConfigInvalidated };
}

function scriptPopupFor(section: FakeElement): FakeElement | undefined {
  return section.children.find((child) => child.id === "ship-a-booster-script-popup");
}

function firstRow(section: FakeElement): FakeElement | undefined {
  return section.children.find((child) => child.className.split(" ").includes("ewar-row"));
}

describe("BoosterController", () => {
  test("setLoadout renders active row and shows section", () => {
    const { controller, boosterEls } = buildBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const section = boosterEls.sections.shipA as unknown as FakeElement;
    expect(section.hidden).toBe(false);
    expect(section.children[0]?.id).toBe("ship-a-booster-script-popup");
    expect(section.children[1]?.textContent).toBe("label.booster.computer");
    const rows = section.children.filter((child) => child.className.split(" ").includes("ewar-row"));
    expect(rows).toHaveLength(2);
    expect(rows[0]?.children[0]?.getAttribute("aria-pressed")).toBe("true");
  });

  test("setLoadout with empty loadout hides section and clears summary", () => {
    const { controller, boosterEls } = buildBoosterController();
    controller.setLoadout("shipA", EMPTY_BOOST_LOADOUT);
    const section = boosterEls.sections.shipA as unknown as FakeElement;
    expect(section.hidden).toBe(true);
    expect(boosterEls.summaries.shipA.innerHTML).toBe("");
  });

  test("toggleComputer deactivates a row and updates summary", () => {
    const { controller, boosterEls } = buildBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const section = boosterEls.sections.shipA as unknown as FakeElement;
    const firstRow = section.children.find((child) => child.className.split(" ").includes("ewar-row"))!;
    const button = firstRow.children[0] as FakeElement;
    button.trigger("click");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(firstRow.className).toBe("ewar-row ewar-row-inactive");
  });

  test("capture and restore round-trip activations and selected scripts", () => {
    const { controller } = buildBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const captured = controller.capture("shipA");
    expect(captured).toEqual([{ active: true, script: "none" }, { active: true, script: TRACKING_SCRIPT.moduleId }]);
    const saved: StoredBoosterActivation[] = [
      { active: false, script: OPTIMAL_SCRIPT.moduleId },
      { active: true, script: "none" },
    ];
    controller.restore("shipA", LOADOUT, saved);
    const projection = controller.projection("shipA")!;
    expect(projection.activation?.computers[0].active).toBe(false);
    expect(projection.activation?.computers[0].script?.moduleId).toBe(OPTIMAL_SCRIPT.moduleId);
    expect(projection.activation?.computers[1].active).toBe(true);
    expect(projection.activation?.computers[1].script).toBeUndefined();
  });

  test("projection returns undefined for empty loadouts", () => {
    const { controller } = buildBoosterController();
    controller.setLoadout("shipA", EMPTY_BOOST_LOADOUT);
    expect(controller.projection("shipA")).toBeUndefined();
  });

  test("script popup is appended to the booster section and containment uses the ewar popup", () => {
    const { controller, boosterEls, popupGroup } = buildBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const section = boosterEls.sections.shipA as unknown as FakeElement;
    const popup = scriptPopupFor(section);
    expect(popup).toBeDefined();
    expect(popup?.parent).toBe(section);
    const ewarPopup = getFake(document, "ship-a-ewar-popup");
    expect(section.parent).toBe(ewarPopup);
    expect(popupGroup.register).toHaveBeenCalled();
  });

  test("selecting a script persists and updates the gear title", () => {
    const { controller, boosterEls } = buildBoosterController();
    controller.setLoadout("shipA", LOADOUT);
    const section = boosterEls.sections.shipA as unknown as FakeElement;
    const row = firstRow(section)!;
    const gear = row.children.find((child) => child.className.split(" ").includes("ewar-script-gear"))!;
    gear.trigger("click");
    const popup = scriptPopupFor(section)!;
    const optimalOption = popup.children.find((child) => child.textContent?.includes(OPTIMAL_SCRIPT.name));
    expect(optimalOption).toBeDefined();
    optimalOption!.trigger("click");
    expect(controller.capture("shipA")?.[0]?.script).toBe(OPTIMAL_SCRIPT.moduleId);
    expect(gear.getAttribute("title")).toContain(OPTIMAL_SCRIPT.name);
  });
});
