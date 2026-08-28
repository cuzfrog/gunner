import type { I18n, Language } from "../../i18n";
import { fakeDocument, getFake, FakeElement } from "../testSupport";
import type { Popup, PopupGroup } from "../popup";
import type { SidePanel } from "./sidePanelContract";
import type { ISidePanelSections } from "./sidePanelSections";
import { SkillOverloadSection, type SkillOverloadSectionEls } from "./skillOverloadSection";

function mockI18n(): I18n {
  return vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key: string) => key),
    translateDocument: vi.fn(),
  });
}

function buildSkillSection() {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;

  const els: SkillOverloadSectionEls = {
    skills: getFake(document, "ship-a-skills") as unknown as HTMLSelectElement,
    skillOptions: getFake(document, "ship-a-skill-options") as unknown as HTMLElement,
    skillSummary: getFake(document, "ship-a-skill-summary") as unknown as HTMLElement,
    skillTrigger: getFake(document, "ship-a-skill-trigger") as unknown as HTMLButtonElement,
    skillPopup: getFake(document, "ship-a-skill-popup") as unknown as HTMLElement,
    overload: getFake(document, "ship-a-overload") as unknown as HTMLInputElement,
    overloadButton: getFake(document, "ship-a-overload-button") as unknown as HTMLButtonElement,
  };

  const sections = vi.mocked<ISidePanelSections>({
    hull: {} as unknown as ISidePanelSections["hull"],
    stats: { updateShipStats: vi.fn() } as unknown as ISidePanelSections["stats"],
    skill: {} as unknown as ISidePanelSections["skill"],
    propulsion: {
      currentPropulsionId: vi.fn(),
    } as unknown as ISidePanelSections["propulsion"],
    paste: {
      popup: {} as unknown as Popup,
    } as unknown as ISidePanelSections["paste"],
  } as unknown as ISidePanelSections);

  const host = {
    persistConfigChange: vi.fn(),
    onConfigChange: vi.fn(),
    onDisplayChange: vi.fn(),
  };
  const panel = vi.mocked<SidePanel>({
    side: "shipA",
    host,
    sections,
    profile: undefined,
    fittedHull: undefined,
    fittingText: undefined,
    restoreTurret: vi.fn(),
    restoreLauncher: vi.fn(),
  } as unknown as SidePanel);

  const i18n = mockI18n();
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
  const section = new SkillOverloadSection({ panel, els, i18n, popupGroup });
  return { document, panel, section, host, popupGroup };
}

describe("SkillOverloadSection", () => {
  test("setSkillLevel updates the skill select and summary", () => {
    const { document, section } = buildSkillSection();
    section.setSkillLevel(3);
    expect(getFake(document, "ship-a-skills").value).toBe("3");
    expect(getFake(document, "ship-a-skill-summary").textContent).not.toBe("");
  });

  test("skillConditions reflects the current inputs", () => {
    const { document, section } = buildSkillSection();
    getFake(document, "ship-a-skills").value = "2";
    getFake(document, "ship-a-overload").checked = true;
    expect(section.skillConditions()).toEqual({ skillLevel: 2, overloaded: true });
  });

  test("setOverloadActive toggles the overload input and button", () => {
    const { document, section } = buildSkillSection();
    section.setOverloadActive(true);
    expect(getFake(document, "ship-a-overload").checked).toBe(true);
    expect(getFake(document, "ship-a-overload-button").getAttribute("aria-pressed")).toBe("true");
  });

  test("onOverloadButtonClick toggles the overload state", () => {
    const { document, section } = buildSkillSection();
    getFake(document, "ship-a-overload").checked = false;
    section.onOverloadButtonClick();
    expect(getFake(document, "ship-a-overload").checked).toBe(true);
  });

  test("renderSkillOptions creates skill buttons for all levels", () => {
    const { document, section } = buildSkillSection();
    section.renderSkillOptions();
    expect(getFake(document, "ship-a-skills").children.length).toBe(6);
    expect(getFake(document, "ship-a-skill-options").children.length).toBe(6);
  });

  test("setOverloadDisabled disables the overload when no propulsion is selected", () => {
    const { document, section } = buildSkillSection();
    section.setOverloadDisabled();
    expect(getFake(document, "ship-a-overload").disabled).toBe(true);
    expect(getFake(document, "ship-a-overload-button").disabled).toBe(true);
  });

  test("setOverloadDisabled enables the overload when propulsion is selected", () => {
    const { document, section, panel } = buildSkillSection();
    panel.sections.propulsion.currentPropulsionId = vi.fn(() => "mwd-5mn" as const);
    section.setOverloadDisabled();
    expect(getFake(document, "ship-a-overload").disabled).toBe(false);
    expect(getFake(document, "ship-a-overload-button").disabled).toBe(false);
  });

  test("popup contains returns true for the skill field element", () => {
    const { document, section } = buildSkillSection();
    const field = getFake(document, "ship-a-skill-field");
    expect(section.popup.contains(field as unknown as EventTarget)).toBe(true);
  });

  test("popup contains returns true for a child inside the skill field", () => {
    const { document, section } = buildSkillSection();
    const field = getFake(document, "ship-a-skill-field");
    const trigger = getFake(document, "ship-a-skill-trigger");
    trigger.parent = field;
    expect(section.popup.contains(trigger as unknown as EventTarget)).toBe(true);
  });

  test("popup contains returns false for an outside element", () => {
    const { document, section } = buildSkillSection();
    const outside = getFake(document, "ship-a-overload");
    expect(section.popup.contains(outside as unknown as EventTarget)).toBe(false);
  });
});
