import { ClipboardUnavailableError } from "../../../appstate";
import { fakeDocument, getFake, IMPORTED_RIFTER } from "../testSupport";
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
    const { controller, clipboard, fittingImport, shipAPanel, turrets, onConfigPersisted, savedFittings } =
      buildImportController(globalThis.document);
    const text = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
    clipboard.readText.mockResolvedValue(text);
    await controller.importFromClipboard("shipA");
    expect(fittingImport.importFitting).toHaveBeenCalledWith(text, { skillLevel: 5, overloaded: true });
    expect(shipAPanel.fittingText).toBe(text);
    expect(turrets.shipA.applyImported).toHaveBeenCalledWith(IMPORTED_RIFTER);
    expect(shipAPanel.sections.paste.showImportHint).toHaveBeenCalledWith("status.fittingImported");
    expect(onConfigPersisted).toHaveBeenCalled();
    expect(savedFittings.record).toHaveBeenCalledWith(expect.objectContaining({ hull: "Rifter", name: "Brawler" }));
  });

  test("importFromClipboard applies a valid EFT fitting to shipB", async () => {
    const { controller, clipboard, fittingImport, shipBPanel, turrets, savedFittings } = buildImportController(globalThis.document);
    const text = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
    clipboard.readText.mockResolvedValue(text);
    fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
    await controller.importFromClipboard("shipB");
    expect(fittingImport.importFitting).toHaveBeenCalledWith(text, { skillLevel: 5, overloaded: true });
    expect(shipBPanel.fittingText).toBe(text);
    expect(turrets.shipB.applyImported).toHaveBeenCalledWith(IMPORTED_RIFTER);
    expect(savedFittings.record).toHaveBeenCalledWith(expect.objectContaining({ hull: "Rifter", name: "Brawler" }));
  });

  test("importFromClipboard opens the paste popup when the clipboard is unavailable", async () => {
    const { controller, clipboard, shipAPanel } = buildImportController(globalThis.document);
    clipboard.readText.mockRejectedValue(new ClipboardUnavailableError());
    await controller.importFromClipboard("shipA");
    expect(shipAPanel.pastePopup.open).toHaveBeenCalled();
    expect(shipAPanel.sections.paste.showImportHint).not.toHaveBeenCalled();
  });

  test("importFromClipboard shows a denied hint for a non-unavailable clipboard error", async () => {
    const { controller, clipboard, shipAPanel } = buildImportController(globalThis.document);
    clipboard.readText.mockRejectedValue(new Error("denied"));
    await controller.importFromClipboard("shipA");
    expect(shipAPanel.pastePopup.open).not.toHaveBeenCalled();
    expect(shipAPanel.sections.paste.showImportHint).toHaveBeenCalledWith("status.clipboardDenied", true);
  });

  test("importFromClipboard closes an already-open paste popup and returns", async () => {
    const { controller, clipboard, shipAPanel } = buildImportController(globalThis.document);
    shipAPanel.pastePopup.isOpen.mockReturnValue(true);
    await controller.importFromClipboard("shipA");
    expect(shipAPanel.pastePopup.close).toHaveBeenCalled();
    expect(clipboard.readText).not.toHaveBeenCalled();
  });

  test("importFromText with raw EFT applies and records the fitting", async () => {
    const { controller, fittingImport, shipAPanel, savedFittings } = buildImportController(globalThis.document);
    const text = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
    await controller.importFromText("shipA", text);
    expect(fittingImport.importFitting).toHaveBeenCalledWith(text, { skillLevel: 5, overloaded: true });
    expect(shipAPanel.fittingText).toBe(text);
    expect(shipAPanel.sections.paste.showImportHint).toHaveBeenCalledWith("status.fittingImported");
    expect(savedFittings.record).toHaveBeenCalledWith(expect.objectContaining({ hull: "Rifter", name: "Brawler" }));
  });

  test("importEftFitting can suppress the imported hint for auto-load", () => {
    const { controller, fittingImport, shipAPanel, savedFittings } = buildImportController(globalThis.document);
    const text = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
    controller.importEftFitting("shipA", text, { persist: false, showImportedHint: false });
    expect(fittingImport.importFitting).toHaveBeenCalledWith(text, { skillLevel: 5, overloaded: true });
    expect(shipAPanel.sections.paste.showImportHint).not.toHaveBeenCalledWith("status.fittingImported");
    expect(savedFittings.record).not.toHaveBeenCalled();
  });

  test("importFromText emits fittingImported with the imported fitting", async () => {
    const { controller, fittingImport, events } = buildImportController(globalThis.document);
    const onFittingImported = vi.fn();
    const text = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
    events.onFittingImported(onFittingImported);
    await controller.importFromText("shipA", text);
    expect(fittingImport.importFitting).toHaveBeenCalledWith(text, { skillLevel: 5, overloaded: true });
    expect(onFittingImported).toHaveBeenCalledWith("shipA", IMPORTED_RIFTER);
  });

  test("importFromText with an invalid fit shows an invalid hint and does not record", async () => {
    const { controller, fittingImport, shipAPanel, savedFittings } = buildImportController(globalThis.document);
    fittingImport.importFitting.mockReturnValue(undefined);
    await controller.importFromText("shipA", "garbage");
    expect(shipAPanel.sections.paste.showImportHint).toHaveBeenCalledWith("status.fittingInvalid", true);
    expect(savedFittings.record).not.toHaveBeenCalled();
  });

  test("importFromText with a gunner profile extracts the requested side's fitting", async () => {
    const { controller, shipAPanel, shipBPanel, savedFittings } = buildImportController(globalThis.document);
    const text = gunnerProfileText({
      shipAFitting: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
    });
    await controller.importFromText("shipA", text);
    expect(shipAPanel.fittingText).toContain("[Rifter, Brawler]");
    expect(shipBPanel.fittingText).toBeUndefined();
    expect(savedFittings.record).toHaveBeenCalledWith(expect.objectContaining({ hull: "Rifter", name: "Brawler" }));
  });

  test("importFromText with a gunner profile missing the requested fitting shows invalid", async () => {
    const { controller, shipAPanel, savedFittings } = buildImportController(globalThis.document);
    const text = gunnerProfileText({
      shipBFitting: "[Thrasher, Sniper]\n5MN Y-T8 Compact Microwarpdrive",
    });
    await controller.importFromText("shipA", text);
    expect(shipAPanel.sections.paste.showImportHint).toHaveBeenCalledWith("status.fittingInvalid", true);
    expect(savedFittings.record).not.toHaveBeenCalled();
  });

  test("importProfileClicked loads a full gunner profile", async () => {
    const { controller, clipboard, onProfileTextLoaded } = buildImportController(globalThis.document);
    const text = gunnerProfileText();
    clipboard.readText.mockResolvedValue(text);
    await controller.importProfileClicked();
    expect(onProfileTextLoaded).toHaveBeenCalledWith(expect.objectContaining({ shipAHull: "Rifter", shipBHull: "Thrasher" }));
  });

  test("importProfileClicked shows invalid status for non-gunner non-fitting text", async () => {
    const { controller, clipboard, profileController } = buildImportController(globalThis.document);
    clipboard.readText.mockResolvedValue("hello world");
    await controller.importProfileClicked();
    expect(profileController.showStatus).toHaveBeenCalledWith("status.importInvalid");
  });

  test("importProfileClicked shows clipboard denied status", async () => {
    const { controller, clipboard, profileController } = buildImportController(globalThis.document);
    clipboard.readText.mockRejectedValue(new ClipboardUnavailableError());
    await controller.importProfileClicked();
    expect(profileController.showStatus).toHaveBeenCalledWith("status.clipboardDenied");
  });

  test("importProfileClicked opens the side popup for a valid EFT and imports the chosen side", async () => {
    const { controller, clipboard, document, fittingImport, shipAPanel, savedFittings } =
      buildImportController(globalThis.document);
    const text = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
    clipboard.readText.mockResolvedValue(text);
    fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
    await controller.importProfileClicked();
    expect(getFake(document, "import-side-popup").hidden).toBe(false);
    expect(getFake(document, "import-side-ship-a").focus).toHaveBeenCalled();
    await controller.onImportSideClick("shipA");
    expect(getFake(document, "import-side-popup").hidden).toBe(true);
    expect(shipAPanel.fittingText).toBe(text);
    expect(savedFittings.record).toHaveBeenCalledWith(expect.objectContaining({ hull: "Rifter", name: "Brawler" }));
  });
});
