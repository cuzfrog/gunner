import { buildSidePanel, getFake } from "../testSupport";

describe("PasteImportSection", () => {
  test("onImportFittingClick imports from clipboard", () => {
    const { panel } = buildSidePanel("attacker");
    panel.sections.paste.onImportFittingClick();
    expect(panel.host.importer.importFromClipboard).toHaveBeenCalled();
  });

  test("showImportHint renders a translated hint", () => {
    const { document, panel } = buildSidePanel("attacker");
    panel.sections.paste.showImportHint("status.fittingImported");
    const name = getFake(document, "attacker-fitting-name");
    expect(name.hidden).toBe(false);
    expect(name.innerHTML).toContain("status.fittingImported");
  });

  test("clearImportHint hides the hint and cancels the timeout", () => {
    const { document, panel } = buildSidePanel("attacker");
    panel.sections.paste.showImportHint("status.fittingImported");
    panel.sections.paste.clearImportHint();
    expect(getFake(document, "attacker-fitting-name").hidden).toBe(true);
  });

  test("open and close paste popup toggles visibility", () => {
    const { document, panel } = buildSidePanel("attacker");
    panel.sections.paste.openPastePopup();
    expect(getFake(document, "attacker-paste-popup").hidden).toBe(false);
    expect(panel.sections.paste.isPastePopupOpen()).toBe(true);
    panel.sections.paste.closePastePopup();
    expect(getFake(document, "attacker-paste-popup").hidden).toBe(true);
    expect(panel.sections.paste.isPastePopupOpen()).toBe(false);
  });
});
