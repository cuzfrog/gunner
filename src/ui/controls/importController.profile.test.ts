import { ClipboardUnavailableError } from "../settings";
import { fakeDocument, getFake, IMPORTED_RIFTER } from "./testSupport";
import { buildImportController, gunnerProfileText } from "./importController.testSupport";

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
});

afterEach(() => {
  globalThis.document = undefined as unknown as Document;
  globalThis.Element = undefined as unknown as typeof Element;
});

describe("ImportController profile import", () => {
  test("importProfileClicked loads a full gunner profile", async () => {
    const { controller, clipboard, onProfileTextLoaded } = buildImportController(globalThis.document);
    const text = gunnerProfileText();
    clipboard.readText.mockResolvedValue(text);
    await controller.importProfileClicked();
    expect(onProfileTextLoaded).toHaveBeenCalledWith(expect.objectContaining({ attackerHull: "Rifter", targetHull: "Thrasher" }));
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
    const { controller, clipboard, document, fittingImport, attackerPanel, savedFittings } = buildImportController(globalThis.document);
    const text = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
    clipboard.readText.mockResolvedValue(text);
    fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
    await controller.importProfileClicked();
    expect(getFake(document, "import-side-popup").hidden).toBe(false);
    expect(getFake(document, "import-side-attacker").focus).toHaveBeenCalled();
    await controller.onImportSideClick("attacker");
    expect(getFake(document, "import-side-popup").hidden).toBe(true);
    expect(attackerPanel.fittingText).toBe(text);
    expect(savedFittings.record).toHaveBeenCalledWith(expect.objectContaining({ hull: "Rifter", name: "Brawler" }));
  });

  test("copyProfile writes the serialized current settings to the clipboard", async () => {
    const { controller, clipboard, profileController, getSettings } = buildImportController(globalThis.document);
    await controller.copyProfile();
    const [text] = clipboard.writeText.mock.calls[0];
    expect(text).toContain("# gunner v1");
    expect(getSettings).toHaveBeenCalled();
    expect(profileController.showStatus).toHaveBeenCalledWith("status.copied");
  });
});
