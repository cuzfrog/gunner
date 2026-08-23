import type { FittingImport } from "../../../fitting";
import { serializeProfile, USER_SETTINGS_VERSION, type ClipboardProvider, type SavedFittings, type UserSettings } from "../../../appstate";
import type { Side, SidePanel } from "../sidePanel";
import type { PreferencesController } from "../preferencesController";
import type { ProfileController } from "../profileController";
import type { Popup, PopupGroup } from "../popup";
import type { AttackerTurret } from "./attackerTurret";
import { ImportControllerImpl } from "./importController";
import { FakeElement, fakeDocument, getFake, IMPORTED_RIFTER } from "../testSupport";

class FakePopupGroup implements PopupGroup {
  register(): void {}
  open(popup: Popup): void { if (!popup.isOpen()) popup.open(); }
  toggle(popup: Popup): void { if (popup.isOpen()) popup.close(); else popup.open(); }
  close(popup: Popup): void { if (popup.isOpen()) popup.close(); }
  closeAll(): void {}
  hasOpen(): boolean { return false; }
  onPointerDown(): void {}
  onKeyDown(): void {}
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
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

export function gunnerProfileText(overrides: { attackerFitting?: string; targetFitting?: string } = {}): string {
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

export class FakeSidePanel {
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

interface FakePopup {
  isOpen: ReturnType<typeof vi.fn>;
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  focusTrigger: ReturnType<typeof vi.fn>;
  contains: ReturnType<typeof vi.fn>;
}

export function fakePopup(): FakePopup {
  return { isOpen: vi.fn(() => false), open: vi.fn(), close: vi.fn(), focusTrigger: vi.fn(), contains: vi.fn(() => false) };
}

export function buildImportController(document: Document) {
  globalThis.Element = FakeElement as unknown as typeof Element;
  getFake(document, "import-side-popup").hidden = true;
  getFake(document, "import-profile").setAttribute("aria-expanded", "false");
  const attackerPanel = new FakeSidePanel();
  const targetPanel = new FakeSidePanel();
  const sidePanel = (side: Side) => (side === "attacker" ? attackerPanel : targetPanel);
  const clipboard = { readText: vi.fn(async () => ""), writeText: vi.fn(async (text: string) => {}) };
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
  const turret: AttackerTurret = { applyImported: vi.fn(), ammo: vi.fn(() => "Hail S") };
  const preferences = { capture: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2 })) };
  const profileController = { showStatus: vi.fn() };
  const onConfigPersisted = vi.fn();
  const onProfileTextLoaded = vi.fn();
  const getSettings = vi.fn(() => DEFAULT_USER_SETTINGS);
  const popupGroup: PopupGroup = new FakePopupGroup();
  const controller = new ImportControllerImpl({
    clipboard: clipboard as unknown as ClipboardProvider,
    fittingImport,
    savedFittings,
    popupGroup,
    els: {
      importProfile: getFake(document, "import-profile") as unknown as HTMLButtonElement,
      importSidePopup: getFake(document, "import-side-popup") as unknown as HTMLElement,
      importSideAttacker: getFake(document, "import-side-attacker") as unknown as HTMLButtonElement,
      importSideTarget: getFake(document, "import-side-target") as unknown as HTMLButtonElement,
    },
    sidePanel: sidePanel as unknown as (side: Side) => SidePanel,
    turret,
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
