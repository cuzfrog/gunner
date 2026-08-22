import { ClipboardUnavailableError } from "../settings";
import { fakeDocument, IMPORTED_RIFTER } from "./testSupport";
import { buildImportController, gunnerProfileText } from "./importController.testSupport";

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
});

afterEach(() => {
  globalThis.document = undefined as unknown as Document;
  globalThis.Element = undefined as unknown as typeof Element;
});

describe("ImportController", () => {
  test("importFromClipboard reads a valid EFT fitting and applies it to the side", async () => {
    const { controller, clipboard, fittingImport, attackerPanel, turret, onConfigPersisted, savedFittings } = buildImportController(globalThis.document);
    const text = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
    clipboard.readText.mockResolvedValue(text);
    await controller.importFromClipboard("attacker");
    expect(fittingImport.importFitting).toHaveBeenCalledWith(text, { skillLevel: 5, overloaded: true });
    expect(attackerPanel.fittingText).toBe(text);
    expect(turret.applyImported).toHaveBeenCalledWith(IMPORTED_RIFTER);
    expect(onConfigPersisted).toHaveBeenCalled();
    expect(savedFittings.record).toHaveBeenCalledWith(expect.objectContaining({ hull: "Rifter", name: "Brawler" }));
  });

  test("importFromClipboard opens the paste popup when the clipboard is unavailable", async () => {
    const { controller, clipboard, attackerPanel } = buildImportController(globalThis.document);
    clipboard.readText.mockRejectedValue(new ClipboardUnavailableError());
    await controller.importFromClipboard("attacker");
    expect(attackerPanel.pastePopup.open).toHaveBeenCalled();
    expect(attackerPanel.showImportHint).not.toHaveBeenCalled();
  });

  test("importFromClipboard shows a denied hint for a non-unavailable clipboard error", async () => {
    const { controller, clipboard, attackerPanel } = buildImportController(globalThis.document);
    clipboard.readText.mockRejectedValue(new Error("denied"));
    await controller.importFromClipboard("attacker");
    expect(attackerPanel.pastePopup.open).not.toHaveBeenCalled();
    expect(attackerPanel.showImportHint).toHaveBeenCalledWith("status.clipboardDenied", true);
  });

  test("importFromClipboard closes an already-open paste popup and returns", async () => {
    const { controller, clipboard, attackerPanel } = buildImportController(globalThis.document);
    attackerPanel.pastePopup.isOpen.mockReturnValue(true);
    await controller.importFromClipboard("attacker");
    expect(attackerPanel.pastePopup.close).toHaveBeenCalled();
    expect(clipboard.readText).not.toHaveBeenCalled();
  });

  test("importFromText with raw EFT applies and records the fitting", async () => {
    const { controller, fittingImport, attackerPanel, savedFittings } = buildImportController(globalThis.document);
    const text = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
    await controller.importFromText("attacker", text);
    expect(fittingImport.importFitting).toHaveBeenCalledWith(text, { skillLevel: 5, overloaded: true });
    expect(attackerPanel.fittingText).toBe(text);
    expect(savedFittings.record).toHaveBeenCalledWith(expect.objectContaining({ hull: "Rifter", name: "Brawler" }));
  });

  test("importFromText with an invalid fit shows an invalid hint and does not record", async () => {
    const { controller, fittingImport, attackerPanel, savedFittings } = buildImportController(globalThis.document);
    fittingImport.importFitting.mockReturnValue(undefined);
    await controller.importFromText("attacker", "garbage");
    expect(attackerPanel.showImportHint).toHaveBeenCalledWith("status.fittingInvalid", true);
    expect(savedFittings.record).not.toHaveBeenCalled();
  });

  test("importFromText with a gunner profile extracts the requested side's fitting", async () => {
    const { controller, attackerPanel, targetPanel, savedFittings } = buildImportController(globalThis.document);
    const text = gunnerProfileText({ attackerFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive" });
    await controller.importFromText("attacker", text);
    expect(attackerPanel.fittingText).toContain("[Rifter, Brawler]");
    expect(targetPanel.fittingText).toBeUndefined();
    expect(savedFittings.record).toHaveBeenCalledWith(expect.objectContaining({ hull: "Rifter", name: "Brawler" }));
  });

  test("importFromText with a gunner profile missing the requested fitting shows invalid", async () => {
    const { controller, attackerPanel, savedFittings } = buildImportController(globalThis.document);
    const text = gunnerProfileText({ targetFitting: "[Thrasher, Sniper]\n5MN Y-T8 Compact Microwarpdrive" });
    await controller.importFromText("attacker", text);
    expect(attackerPanel.showImportHint).toHaveBeenCalledWith("status.fittingInvalid", true);
    expect(savedFittings.record).not.toHaveBeenCalled();
  });
});
