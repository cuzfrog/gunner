import type { I18n, Language } from "../../i18n";
import type { Timer } from "../../timer";
import { fakeDocument, getFake, FakeElement, mockTimer } from "../testSupport";
import type { Popup } from "./popup";
import { PasteImportSection, type PasteImportSectionEls } from "./pasteImportSection";
import type { SidePanel } from "./sidePanelContract";
import type { ISidePanelSections } from "./sidePanelSections";

function mockI18n(): I18n {
  return vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key: string) => key),
    translateDocument: vi.fn(),
  });
}

function buildPasteSection() {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;

  const els: PasteImportSectionEls = {
    fittingName: getFake(document, "attacker-fitting-name") as unknown as HTMLElement,
    pastePopup: getFake(document, "attacker-paste-popup") as unknown as HTMLElement,
    pasteInput: getFake(document, "attacker-paste-input") as unknown as HTMLTextAreaElement,
    importFitting: getFake(document, "attacker-import-fitting") as unknown as HTMLButtonElement,
  };

  const host = vi.mocked<SidePanel["host"]>({
    persistConfigChange: vi.fn(),
    attackerTurretHooks: { onFittedHullCleared: vi.fn(), restoreTurret: vi.fn() },
    importer: {
      mostRecentFittingFor: vi.fn(),
      importEftFitting: vi.fn(),
      importFromText: vi.fn(() => Promise.resolve()),
      importFromClipboard: vi.fn(() => Promise.resolve()),
    },
  });

  const sections = vi.mocked<ISidePanelSections>({
    hull: {} as unknown as ISidePanelSections["hull"],
    stats: {} as unknown as ISidePanelSections["stats"],
    skill: {} as unknown as ISidePanelSections["skill"],
    propulsion: {} as unknown as ISidePanelSections["propulsion"],
    paste: {} as unknown as ISidePanelSections["paste"],
  } as unknown as ISidePanelSections);

  const panel = vi.mocked<SidePanel>({
    side: "attacker",
    host,
    sections,
    profile: undefined,
    fittedHull: undefined,
  } as unknown as SidePanel);

  const i18n = mockI18n();
  const timer = vi.mocked<Timer>(mockTimer());
  const section = new PasteImportSection({ panel, els, i18n, timer });
  return { document, panel, section, host, timer };
}

describe("PasteImportSection", () => {
  test("onImportFittingClick imports from clipboard", () => {
    const { panel, section, host } = buildPasteSection();
    section.onImportFittingClick();
    expect(host.importer.importFromClipboard).toHaveBeenCalled();
  });

  test("showImportHint renders a translated hint", () => {
    const { document, section } = buildPasteSection();
    section.showImportHint("status.fittingImported");
    const name = getFake(document, "attacker-fitting-name");
    expect(name.hidden).toBe(false);
    expect(name.innerHTML).toContain("status.fittingImported");
  });

  test("clearImportHint hides the hint and cancels the timeout", () => {
    const { document, section } = buildPasteSection();
    section.showImportHint("status.fittingImported");
    section.clearImportHint();
    expect(getFake(document, "attacker-fitting-name").hidden).toBe(true);
  });

  test("open and close paste popup toggles visibility", () => {
    const { document, section } = buildPasteSection();
    section.openPastePopup();
    expect(getFake(document, "attacker-paste-popup").hidden).toBe(false);
    expect(section.isPastePopupOpen()).toBe(true);
    section.closePastePopup();
    expect(getFake(document, "attacker-paste-popup").hidden).toBe(true);
    expect(section.isPastePopupOpen()).toBe(false);
  });
});
