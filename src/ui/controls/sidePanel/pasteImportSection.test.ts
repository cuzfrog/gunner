import type { I18n, Language } from "../../i18n";
import type { Timer } from "../../timer";
import { fakeDocument, getFake, FakeElement, mockTimer } from "../testSupport";
import type { Popup } from "../popup";
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
    fittingName: getFake(document, "ship-a-fitting-name") as unknown as HTMLElement,
    pastePopup: getFake(document, "ship-a-paste-popup") as unknown as HTMLElement,
    pasteInput: getFake(document, "ship-a-paste-input") as unknown as HTMLTextAreaElement,
    importFitting: getFake(document, "ship-a-import-fitting") as unknown as HTMLButtonElement,
  };

  const host = vi.mocked<SidePanel["host"]>({
    persistConfigChange: vi.fn(),
    onConfigChange: vi.fn(),
    onDisplayChange: vi.fn(),
  });
  const importer = {
    autoLoadFittingTextFor: vi.fn(),
    importEftFitting: vi.fn(),
    importFromText: vi.fn(() => Promise.resolve()),
    importFromClipboard: vi.fn(() => Promise.resolve()),
  };

  const sections = vi.mocked<ISidePanelSections>({
    hull: {} as unknown as ISidePanelSections["hull"],
    stats: {} as unknown as ISidePanelSections["stats"],
    skill: {} as unknown as ISidePanelSections["skill"],
    propulsion: {} as unknown as ISidePanelSections["propulsion"],
    paste: {} as unknown as ISidePanelSections["paste"],
  } as unknown as ISidePanelSections);

  const panel = vi.mocked<SidePanel>({
    side: "shipA",
    host,
    sections,
    profile: undefined,
    fittedHull: undefined,
    importer,
  } as unknown as SidePanel);

  const i18n = mockI18n();
  const timer = vi.mocked<Timer>(mockTimer());
  const section = new PasteImportSection({ panel, els, i18n, timer });
  return { document, panel, section, host, timer };
}

describe("PasteImportSection", () => {
  test("onImportFittingClick imports from clipboard", () => {
    const { panel, section } = buildPasteSection();
    section.onImportFittingClick();
    expect(panel.importer.importFromClipboard).toHaveBeenCalled();
  });

  test("showImportHint renders a translated hint", () => {
    const { document, section } = buildPasteSection();
    section.showImportHint("status.fittingImported");
    const name = getFake(document, "ship-a-fitting-name");
    expect(name.hidden).toBe(false);
    expect(name.innerHTML).toContain("status.fittingImported");
  });

  test("clearImportHint hides the hint and cancels the timeout", () => {
    const { document, section } = buildPasteSection();
    section.showImportHint("status.fittingImported");
    section.clearImportHint();
    expect(getFake(document, "ship-a-fitting-name").hidden).toBe(true);
  });

  test("open and close paste popup toggles visibility", () => {
    const { document, section } = buildPasteSection();
    section.openPastePopup();
    expect(getFake(document, "ship-a-paste-popup").hidden).toBe(false);
    expect(section.isPastePopupOpen()).toBe(true);
    section.closePastePopup();
    expect(getFake(document, "ship-a-paste-popup").hidden).toBe(true);
    expect(section.isPastePopupOpen()).toBe(false);
  });

  test("popup contains returns true for the paste popup element", () => {
    const { document, section } = buildPasteSection();
    const popup = getFake(document, "ship-a-paste-popup");
    expect(section.popup.contains(popup as unknown as EventTarget)).toBe(true);
  });

  test("popup contains returns true for the import fitting trigger", () => {
    const { document, section } = buildPasteSection();
    const trigger = getFake(document, "ship-a-import-fitting");
    expect(section.popup.contains(trigger as unknown as EventTarget)).toBe(true);
  });

  test("popup contains returns false for an outside element", () => {
    const { document, section } = buildPasteSection();
    const outside = getFake(document, "ship-a-fitting-name");
    expect(section.popup.contains(outside as unknown as EventTarget)).toBe(false);
  });
});
