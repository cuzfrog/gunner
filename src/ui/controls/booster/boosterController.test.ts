import type { BoostLoadout, TurretScriptSpec } from "../../../sim";
import { EMPTY_BOOST_LOADOUT } from "../../../sim";
import type { Language } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { createControlsEls } from "../elements";
import type { PopupGroup } from "../popup";
import { FakeElement, fakeDocument, getFake, mockFittingImport } from "../../testing";
import { UiEventsImpl } from "../../events";
import { BoosterControllerImpl } from "./boosterController";
import type { BoosterEls } from "./boosterControllerContract";

const TRACKING_SCRIPT: TurretScriptSpec = { name: "Tracking Speed Script", trackingMultiplier: 2, optimalMultiplier: 0, falloffMultiplier: 0 };
const OPTIMAL_SCRIPT: TurretScriptSpec = { name: "Optimal Range Script", trackingMultiplier: 0, optimalMultiplier: 2, falloffMultiplier: 2 };

const LOADOUT: BoostLoadout = {
  computers: [
    { moduleName: "Tracking Computer I", trackingBonusPercent: 10, optimalBonusPercent: 5, falloffBonusPercent: 10, defaultScript: undefined },
    { moduleName: "Tracking Computer II", trackingBonusPercent: 15, optimalBonusPercent: 7.5, falloffBonusPercent: 15, defaultScript: TRACKING_SCRIPT },
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
    shipImageUrl: vi.fn(),
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
  getFake(document, "attacker-ewar-popup").appendChild(els.attackerBoosterSection as unknown as FakeElement);
  getFake(document, "target-ewar-popup").appendChild(els.targetBoosterSection as unknown as FakeElement);
  getFake(document, "attacker-booster-section").hidden = true;
  getFake(document, "target-booster-section").hidden = true;
  const boosterEls: BoosterEls = {
    sections: { attacker: els.attackerBoosterSection, target: els.targetBoosterSection },
    summaries: { attacker: els.attackerBoosterSummary, target: els.targetBoosterSummary },
  };
  const fittingImport = vi.mocked(mockFittingImport());
  fittingImport.itemName = vi.fn((name: string, lang: string) => (lang === "en" ? name : `${name} (${lang})`));
  const events = new UiEventsImpl();
  const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
  const controller = new BoosterControllerImpl({ els: boosterEls, popupGroup, imageCatalog, fittingImport, i18n, events });
  return { document, controller, els, boosterEls, i18n, imageCatalog, popupGroup, fittingImport, events, emitConfigInvalidated };
}

function scriptPopupFor(section: FakeElement): FakeElement | undefined {
  return section.children.find((child) => child.id === "attacker-booster-script-popup");
}

function firstRow(section: FakeElement): FakeElement | undefined {
  return section.children.find((child) => child.className.split(" ").includes("ewar-row"));
}

describe("BoosterController", () => {
  test("setLoadout renders active row and shows section", () => {
    const { controller, boosterEls } = buildBoosterController();
    controller.setLoadout("attacker", LOADOUT);
    const section = boosterEls.sections.attacker as unknown as FakeElement;
    expect(section.hidden).toBe(false);
    expect(section.children[0]?.id).toBe("attacker-booster-script-popup");
    expect(section.children[1]?.textContent).toBe("label.booster.computer");
    const rows = section.children.filter((child) => child.className.split(" ").includes("ewar-row"));
    expect(rows).toHaveLength(2);
    expect(rows[0]?.children[0]?.getAttribute("aria-pressed")).toBe("true");
  });

  test("setLoadout with empty loadout hides section and clears summary", () => {
    const { controller, boosterEls } = buildBoosterController();
    controller.setLoadout("attacker", EMPTY_BOOST_LOADOUT);
    const section = boosterEls.sections.attacker as unknown as FakeElement;
    expect(section.hidden).toBe(true);
    expect(boosterEls.summaries.attacker.innerHTML).toBe("");
  });

  test("toggleComputer deactivates a row and updates summary", () => {
    const { controller, boosterEls } = buildBoosterController();
    controller.setLoadout("attacker", LOADOUT);
    const section = boosterEls.sections.attacker as unknown as FakeElement;
    const firstRow = section.children.find((child) => child.className.split(" ").includes("ewar-row"))!;
    const button = firstRow.children[0] as FakeElement;
    button.trigger("click");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(firstRow.className).toBe("ewar-row ewar-row-inactive");
  });

  test("capture and restore round-trip activations and selected scripts", () => {
    const { controller } = buildBoosterController();
    controller.setLoadout("attacker", LOADOUT);
    const captured = controller.capture("attacker");
    expect(captured).toEqual([{ active: true, script: "none" }, { active: true, script: TRACKING_SCRIPT.name }]);
    const saved = [
      { active: false, script: OPTIMAL_SCRIPT.name },
      { active: true, script: "none" },
    ];
    controller.restore("attacker", LOADOUT, saved);
    const projection = controller.projection("attacker")!;
    expect(projection.activation?.computers[0].active).toBe(false);
    expect(projection.activation?.computers[0].script?.name).toBe(OPTIMAL_SCRIPT.name);
    expect(projection.activation?.computers[1].active).toBe(true);
    expect(projection.activation?.computers[1].script).toBeUndefined();
  });

  test("projection returns undefined for empty loadouts", () => {
    const { controller } = buildBoosterController();
    controller.setLoadout("attacker", EMPTY_BOOST_LOADOUT);
    expect(controller.projection("attacker")).toBeUndefined();
  });

  test("script popup is appended to the booster section and containment uses the ewar popup", () => {
    const { controller, boosterEls, popupGroup } = buildBoosterController();
    controller.setLoadout("attacker", LOADOUT);
    const section = boosterEls.sections.attacker as unknown as FakeElement;
    const popup = scriptPopupFor(section);
    expect(popup).toBeDefined();
    expect(popup?.parent).toBe(section);
    const ewarPopup = getFake(document, "attacker-ewar-popup");
    expect(section.parent).toBe(ewarPopup);
    expect(popupGroup.register).toHaveBeenCalled();
  });

  test("selecting a script persists and updates the gear title", () => {
    const { controller, boosterEls } = buildBoosterController();
    controller.setLoadout("attacker", LOADOUT);
    const section = boosterEls.sections.attacker as unknown as FakeElement;
    const row = firstRow(section)!;
    const gear = row.children.find((child) => child.className.split(" ").includes("ewar-script-gear"))!;
    gear.trigger("click");
    const popup = scriptPopupFor(section)!;
    const optimalOption = popup.children.find((child) => child.textContent?.includes(OPTIMAL_SCRIPT.name));
    expect(optimalOption).toBeDefined();
    optimalOption!.trigger("click");
    expect(controller.capture("attacker")?.[0]?.script).toBe(OPTIMAL_SCRIPT.name);
    expect(gear.getAttribute("title")).toContain(OPTIMAL_SCRIPT.name);
  });
});
