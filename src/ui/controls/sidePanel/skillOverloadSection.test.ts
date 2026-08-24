import type { I18n, Language } from "../../i18n";
import { fakeDocument, getFake, FakeElement } from "../testSupport";
import type { Popup, PopupGroup } from "./popup";
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
    skills: getFake(document, "attacker-skills") as unknown as HTMLSelectElement,
    skillOptions: getFake(document, "attacker-skill-options") as unknown as HTMLElement,
    skillSummary: getFake(document, "attacker-skill-summary") as unknown as HTMLElement,
    skillTrigger: getFake(document, "attacker-skill-trigger") as unknown as HTMLButtonElement,
    skillPopup: getFake(document, "attacker-skill-popup") as unknown as HTMLElement,
    overload: getFake(document, "attacker-overload") as unknown as HTMLInputElement,
    overloadButton: getFake(document, "attacker-overload-button") as unknown as HTMLButtonElement,
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

  const host = { persistConfigChange: vi.fn() };
  const panel = vi.mocked<SidePanel>({
    side: "attacker",
    host,
    sections,
    profile: undefined,
    fittedHull: undefined,
    fittingText: undefined,
    restoreTurret: vi.fn(),
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
    expect(getFake(document, "attacker-skills").value).toBe("3");
    expect(getFake(document, "attacker-skill-summary").textContent).not.toBe("");
  });

  test("skillConditions reflects the current inputs", () => {
    const { document, section } = buildSkillSection();
    getFake(document, "attacker-skills").value = "2";
    getFake(document, "attacker-overload").checked = true;
    expect(section.skillConditions()).toEqual({ skillLevel: 2, overloaded: true });
  });

  test("setOverloadActive toggles the overload input and button", () => {
    const { document, section } = buildSkillSection();
    section.setOverloadActive(true);
    expect(getFake(document, "attacker-overload").checked).toBe(true);
    expect(getFake(document, "attacker-overload-button").getAttribute("aria-pressed")).toBe("true");
  });

  test("onOverloadButtonClick toggles the overload state", () => {
    const { document, section } = buildSkillSection();
    getFake(document, "attacker-overload").checked = false;
    section.onOverloadButtonClick();
    expect(getFake(document, "attacker-overload").checked).toBe(true);
  });

  test("renderSkillOptions creates skill buttons for all levels", () => {
    const { document, section } = buildSkillSection();
    section.renderSkillOptions();
    expect(getFake(document, "attacker-skills").children.length).toBe(6);
    expect(getFake(document, "attacker-skill-options").children.length).toBe(6);
  });

  test("setOverloadDisabled disables the overload when no propulsion is selected", () => {
    const { document, section } = buildSkillSection();
    section.setOverloadDisabled();
    expect(getFake(document, "attacker-overload").disabled).toBe(true);
    expect(getFake(document, "attacker-overload-button").disabled).toBe(true);
  });

  test("setOverloadDisabled enables the overload when propulsion is selected", () => {
    const { document, section, panel } = buildSkillSection();
    panel.sections.propulsion.currentPropulsionId = vi.fn(() => "mwd-5mn" as const);
    section.setOverloadDisabled();
    expect(getFake(document, "attacker-overload").disabled).toBe(false);
    expect(getFake(document, "attacker-overload-button").disabled).toBe(false);
  });
});
