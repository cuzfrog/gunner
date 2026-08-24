import type { FittingImport } from "../../../fitting";
import type { ClipboardProvider, ProfileTextCodec, ProfileSettings, SavedFittings } from "../../../appstate";
import type { PreferencesController } from "../preferencesController";
import type { ProfileController } from "../profileController";
import type { Popup, PopupGroup } from "../popup";
import type { SidePanel } from "../sidePanel";
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

const GUNNER_PROFILE_BODY = `# gunner v1
version=8
tracking=0.32
sigRes=S
optimal=5000
falloff=5000
ammo=Hail S
initialDistance=5000
attacker.speed=1000
attacker.mode=keepAtRange
attacker.range=5000
attacker.mass=1200000
attacker.inertia=3
attacker.hull=Rifter
target.speed=1000
target.mode=orbit
target.range=5000
target.mass=10000000
target.inertia=0.45
target.sig=40
target.hull=Thrasher`;

export function gunnerProfileText(overrides: { attackerFitting?: string; targetFitting?: string } = {}): string {
  let text = GUNNER_PROFILE_BODY;
  if (overrides.attackerFitting !== undefined) {
    text = `${text}\nattacker.fitting:\n${overrides.attackerFitting}\n---`;
  }
  if (overrides.targetFitting !== undefined) {
    text = `${text}\ntarget.fitting:\n${overrides.targetFitting}\n---`;
  }
  return text;
}

function makeMockProfileTextCodec(): ProfileTextCodec {
  function extractFitting(text: string, side: "attacker" | "target"): string | undefined {
    const marker = `${side}.fitting:\n`;
    const startIdx = text.indexOf(marker);
    if (startIdx < 0) return undefined;
    const bodyStart = startIdx + marker.length;
    const endIdx = text.indexOf("\n---", bodyStart);
    return endIdx < 0 ? text.slice(bodyStart).trim() : text.slice(bodyStart, endIdx);
  }
  return {
    hasHeader: (text: string) => text.trimStart().startsWith("# gunner v1"),
    parse: (text: string): ProfileSettings | undefined => {
      const trimmed = text.trimStart();
      if (!trimmed.startsWith("# gunner v1")) return undefined;
      return {
        version: 8,
        tracking: 0.32,
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
        attackerHull: "Rifter",
        targetHull: "Thrasher",
        attackerFitting: extractFitting(trimmed, "attacker"),
        targetFitting: extractFitting(trimmed, "target"),
      };
    },
    serialize: () => "",
  };
}

export class FakeSidePanel {
  clearOverrides = vi.fn();
  fittingText?: string;
  overrides: Record<string, unknown> = {};
  lastCommittedHull?: string;
  skillConditions = vi.fn(() => ({ skillLevel: 5 as const, overloaded: true }));
  pastePopup = fakePopup();
  getPastePopup = () => this.pastePopup;
  sections = {
    paste: { clearImportHintTimeout: vi.fn(), showImportHint: vi.fn() },
    hull: { clearFittedHull: vi.fn(), loadHull: vi.fn(), applyImportedFitting: vi.fn() },
  };
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
  const clipboard = { readText: vi.fn(async () => ""), writeText: vi.fn(async (text: string) => {}) };
  const fittingImport = vi.mocked<FittingImport>({
    importFitting: vi.fn((text: string) => (text.startsWith("[Rifter") ? IMPORTED_RIFTER : undefined)),
    propulsionVariantNames: vi.fn(),
    propulsionStats: vi.fn(),
    summarize: vi.fn(),
    canonicalEftText: vi.fn(),
    itemName: vi.fn((name: string) => name),
    canonicalName: vi.fn((name: string) => name),
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
  const profileTextCodec = makeMockProfileTextCodec();
  const onConfigPersisted = vi.fn();
  const onProfileTextLoaded = vi.fn();
  const popupGroup: PopupGroup = new FakePopupGroup();
  const controller = new ImportControllerImpl({
    clipboard,
    fittingImport,
    savedFittings,
    popupGroup,
    els: {
      importProfile: getFake(document, "import-profile") as unknown as HTMLButtonElement,
      importSidePopup: getFake(document, "import-side-popup") as unknown as HTMLElement,
      importSideAttacker: getFake(document, "import-side-attacker") as unknown as HTMLButtonElement,
      importSideTarget: getFake(document, "import-side-target") as unknown as HTMLButtonElement,
    },
    attackerSide: attackerPanel as unknown as SidePanel,
    targetSide: targetPanel as unknown as SidePanel,
    turret,
    preferences: preferences as unknown as PreferencesController,
    profileController: profileController as unknown as ProfileController,
    profileTextCodec,
  });
  controller.setOnConfigPersisted(onConfigPersisted);
  controller.setOnProfileTextLoaded(onProfileTextLoaded);
  return {
    controller, document, clipboard, fittingImport, savedFittings, attackerPanel, targetPanel, turret, preferences,
    profileController, onConfigPersisted, onProfileTextLoaded,
  };
}
