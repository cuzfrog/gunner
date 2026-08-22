import type { FittingImport } from "../../fitting";
import { ClipboardUnavailableError, serializeProfile, USER_SETTINGS_VERSION, type ClipboardProvider, type SavedFittings, type UserSettings } from "../settings";
import { PopupGroup } from "./popupGroup";
import type { Side, SidePanel } from "./sidePanel";
import type { TurretController } from "./turretController";
import type { PreferencesController } from "./preferencesController";
import type { ProfileController } from "./profileController";
import { ImportController } from "./importController";
import { FakeElement, fakeDocument, getFake, IMPORTED_RIFTER } from "./testSupport";

const DEFAULT_USER_SETTINGS: UserSettings = {
  version: USER_SETTINGS_VERSION,
  tracking: 0.32,
  trackingUnit: "rad",
  sigRes: "S",
  optimal: 5000,
  falloff: 5000,
  attackerSpeed: 1000,
  attackerMode: "keepAtRange",
  attackerRange: 5000,
  attackerMass: 1_200_000,
  attackerInertia: 3,
  initialDistance: 5000,
  targetSpeed: 1000,
  targetMode: "orbit",
  targetRange: 5000,
  targetMass: 10_000_000,
  targetInertia: 0.45,
  targetSig: 40,
  attackerAmmo: "Hail S",
  simSpeed: 4,
  language: "en",
};

function fakePopup(): {
  isOpen: ReturnType<typeof vi.fn>;
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  focusTrigger: ReturnType<typeof vi.fn>;
  contains: ReturnType<typeof vi.fn>;
} {
  return { isOpen: vi.fn(() => false), open: vi.fn(), close: vi.fn(), focusTrigger: vi.fn(), contains: vi.fn(() => false) };
}

class FakeSidePanel {
  clearImportHintTimeout = vi.fn();
  showImportHint = vi.fn();
  clearFittedHull = vi.fn();
  fittingText?: string;
  overrides: Record<string, unknown> = {};
  lastCommittedHull?: string;
  loadHull = vi.fn();
  applyImportedFitting = vi.fn();
  skillConditions = vi.fn(() => ({ skillLevel: 5 as const, overloaded: true }));
  pastePopup = fakePopup();
  getPastePopup = () => this.pastePopup;
}

function buildImportController(document: Document) {
  globalThis.Element = FakeElement as unknown as typeof Element;
  getFake(document, "import-side-popup").hidden = true;
  getFake(document, "import-profile").setAttribute("aria-expanded", "false");
  const attackerPanel = new FakeSidePanel();
  const targetPanel = new FakeSidePanel();
  const sidePanel = (side: Side) => (side === "attacker" ? attackerPanel : targetPanel);
  const clipboard = {
    readText: vi.fn(async () => ""),
    writeText: vi.fn(async (text: string) => {}),
  };
  const fittingImport = vi.mocked<FittingImport>({
    importFitting: vi.fn((text: string) => (text.startsWith("[Rifter") ? IMPORTED_RIFTER : undefined)),
    propulsionVariantNames: vi.fn(),
    propulsionStats: vi.fn(),
    summarize: vi.fn(),
  });
  const savedFittings = vi.mocked<SavedFittings>({
    listForHull: vi.fn(() => []),
    mostRecentFor: vi.fn(() => undefined),
    record: vi.fn(),
    remove: vi.fn(),
  });
  const turret = { applyImported: vi.fn(), ammo: vi.fn(() => "Hail S") };
  const preferences = { capture: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2 })) };
  const profileController = { showStatus: vi.fn() };
  const onConfigPersisted = vi.fn();
  const onProfileTextLoaded = vi.fn();
  const getSettings = vi.fn(() => DEFAULT_USER_SETTINGS);
  const controller = new ImportController({
    clipboard: clipboard as unknown as ClipboardProvider,
    fittingImport,
    savedFittings,
    popupGroup: new PopupGroup(),
    els: {
      importProfile: getFake(document, "import-profile") as unknown as HTMLButtonElement,
      importSidePopup: getFake(document, "import-side-popup") as unknown as HTMLElement,
      importSideAttacker: getFake(document, "import-side-attacker") as unknown as HTMLButtonElement,
      importSideTarget: getFake(document, "import-side-target") as unknown as HTMLButtonElement,
    },
    sidePanel: sidePanel as unknown as (side: Side) => SidePanel,
    turret: turret as unknown as TurretController,
    preferences: preferences as unknown as PreferencesController,
    profileController: profileController as unknown as ProfileController,
    getSettings,
    onConfigPersisted,
    onProfileTextLoaded,
  });
  return {
    controller, document, clipboard, fittingImport, savedFittings, attackerPanel, targetPanel, turret, preferences,
    profileController, onConfigPersisted, onProfileTextLoaded, getSettings,
  };
}

function gunnerProfileText(overrides: { attackerFitting?: string; targetFitting?: string } = {}): string {
  return serializeProfile({
    version: USER_SETTINGS_VERSION,
    tracking: 0.32,
    sigRes: "S",
    optimal: 5000,
    falloff: 5000,
    attackerSpeed: 1000,
    attackerMode: "keepAtRange",
    attackerRange: 5000,
    attackerMass: 1_200_000,
    attackerInertia: 3,
    attackerHull: "Rifter",
    targetHull: "Thrasher",
    initialDistance: 5000,
    targetSpeed: 1000,
    targetMode: "orbit",
    targetRange: 5000,
    targetMass: 10_000_000,
    targetInertia: 0.45,
    targetSig: 40,
    attackerAmmo: "Hail S",
    ...overrides,
  });
}

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
});

afterEach(() => {
  globalThis.document = undefined as unknown as Document;
  globalThis.Element = undefined as unknown as typeof Element;
});

describe("ImportController", () => {
  test("importFromClipboard reads a valid EFT fitting and applies it to the side", async () => {
    const { controller, clipboard, fittingImport, attackerPanel, turret, onConfigPersisted, savedFittings } =
      buildImportController(globalThis.document);
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
    expect(attackerPanel.fittingText).toBe("[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive");
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
