import type { BoostLoadout, TurretScriptSpec } from "../../../sim";
import { EMPTY_BOOST_LOADOUT } from "../../../sim";
import type { Language } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { collectBoosterEls } from "../elementCollectors";
import { createControlsEls } from "../elements";
import type { PopupGroup } from "../popup";
import { FakeElement, fakeDocument, getFake, mockFittingImport } from "../../testing";
import { BoosterControllerImpl } from "./boosterController";

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
  const els = collectBoosterEls(createControlsEls());
  getFake(document, "attacker-booster-popup").hidden = true;
  getFake(document, "target-booster-popup").hidden = true;
  const host = { onConfigChange: vi.fn() };
  const fittingImport = vi.mocked(mockFittingImport());
  fittingImport.itemName = vi.fn((name: string, lang: string) => (lang === "en" ? name : `${name} (${lang})`));
  const controller = new BoosterControllerImpl({ els, popupGroup, imageCatalog, fittingImport, i18n });
  controller.setHost(host);
  return { document, controller, els, i18n, imageCatalog, popupGroup, host, fittingImport };
}

describe("BoosterController", () => {
  test("setLoadout renders active row and enables trigger", () => {
    const { controller, els } = buildBoosterController();
    controller.setLoadout("attacker", LOADOUT);
    expect(els.attackerBoosterTrigger.disabled).toBe(false);
    const popup = els.attackerBoosterPopup as unknown as FakeElement;
    const rows = popup.children[0]?.children.slice(1);
    expect(rows).toHaveLength(2);
    expect(rows?.[0]?.children[0]?.getAttribute("aria-pressed")).toBe("true");
  });

  test("setLoadout with empty loadout disables trigger", () => {
    const { controller, els } = buildBoosterController();
    controller.setLoadout("attacker", EMPTY_BOOST_LOADOUT);
    expect(els.attackerBoosterTrigger.disabled).toBe(true);
    expect(els.attackerBoosterSummary.innerHTML).toBe("");
  });

  test("toggleComputer deactivates a row and updates summary", () => {
    const { controller, els } = buildBoosterController();
    controller.setLoadout("attacker", LOADOUT);
    const popup = els.attackerBoosterPopup as unknown as FakeElement;
    const firstRow = popup.children[0]?.children[1];
    const button = firstRow?.children[0] as FakeElement;
    button.trigger("click");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(firstRow?.className).toBe("ewar-row ewar-row-inactive");
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
});
