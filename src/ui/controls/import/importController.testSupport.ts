import type { FittingImport } from "../../../fitting";
import type { ShipId, TypeId } from "../../../gamedata/ids";
import type { ClipboardProvider, ProfileTextCodec, ProfileSettings, SavedFittings } from "../../../appstate";
import type { ProfileController } from "../profile";
import type { Popup, PopupGroup } from "../popup";
import type { SidePanel, WeaponSystemSwitch } from "../sidePanel";
import type { Side } from "../side";
import type { ShipATurret } from "./shipATurret";
import { ImportControllerImpl } from "./importController";
import { FakeElement, fakeDocument, getFake, IMPORTED_RIFTER } from "../testSupport";
import { UiEventsImpl } from "../../events";

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
shipA.tracking=0.32
shipA.sigRes=S
shipA.optimal=5000
shipA.falloff=5000
shipA.ammo=Hail S
initialDistance=5000
shipA.speed=1000
shipA.mode=keepAtRange
shipA.range=5000
shipA.mass=1200000
shipA.inertia=3
shipA.hullId=Rifter
shipB.speed=1000
shipB.mode=orbit
shipB.range=5000
shipB.mass=10000000
shipB.inertia=0.45
shipB.sig=40
shipB.hullId=Thrasher`;

export function gunnerProfileText(overrides: { shipAFitting?: string; shipBFitting?: string } = {}): string {
  let text = GUNNER_PROFILE_BODY;
  if (overrides.shipAFitting !== undefined) {
    text = `${text}\nshipA.fitting:\n${overrides.shipAFitting}\n---`;
  }
  if (overrides.shipBFitting !== undefined) {
    text = `${text}\nshipB.fitting:\n${overrides.shipBFitting}\n---`;
  }
  return text;
}

function makeMockProfileTextCodec(): ProfileTextCodec {
  function extractFitting(text: string, side: "shipA" | "shipB"): string | undefined {
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
        version: 13,
        shipATracking: 0.32,
        shipASigRes: "S",
        shipAOptimal: 5000,
        shipAFalloff: 5000,
        shipBTracking: 0.32,
        shipBSigRes: "S",
        shipBOptimal: 5000,
        shipBFalloff: 5000,
        shipASpeed: 1000,
        shipAMode: "keepAtRange",
        shipARange: 5000,
        shipAMass: 1_200_000,
        shipAInertia: 3,
        initialDistance: 5000,
        shipBSpeed: 1000,
        shipBMode: "orbit",
        shipBRange: 5000,
        shipBMass: 10_000_000,
        shipBInertia: 0.45,
        shipBSig: 40,
        shipAAmmo: "12608" as TypeId,
        shipAHullId: "587" as ShipId,
        shipBHullId: "16242" as ShipId,
        shipAFitting: extractFitting(trimmed, "shipA"),
        shipBFitting: extractFitting(trimmed, "shipB"),
      };
    },
    serialize: () => "",
  };
}

export class FakeSidePanel {
  clearOverrides = vi.fn();
  fittingText?: string;
  overrides: Record<string, unknown> = {};
  lastCommittedHull?: ShipId;
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
  const shipAPanel = new FakeSidePanel();
  const shipBPanel = new FakeSidePanel();
  const clipboard = { readText: vi.fn(async () => ""), writeText: vi.fn(async (text: string) => {}) };
  const fittingImport = vi.mocked<FittingImport>({
    importFitting: vi.fn((text: string) => (text.startsWith("[Rifter") ? IMPORTED_RIFTER : undefined)),
    propulsionVariantNames: vi.fn(),
    propulsionStats: vi.fn(),
    propulsionStatsById: vi.fn(),
    summarize: vi.fn(),
    canonicalEftText: vi.fn(),
    itemNameForId: vi.fn((id: TypeId) => String(id)),
    detectLanguageFromText: vi.fn(() => "en" as const),
  });
  const savedFittings = vi.mocked<SavedFittings>({
    listForHull: vi.fn(() => []),
    mostRecentFor: vi.fn(() => undefined),
    record: vi.fn(),
    remove: vi.fn(),
  });
  const shipATurret: ShipATurret = { applyImported: vi.fn(), ammoId: vi.fn(() => "12608" as TypeId) };
  const shipBTurret: ShipATurret = { applyImported: vi.fn(), ammoId: vi.fn(() => "12608" as TypeId) };
  const turrets = { shipA: shipATurret, shipB: shipBTurret };
  const shipALauncher = { applyImported: vi.fn() };
  const shipBLauncher = { applyImported: vi.fn() };
  const launchers = { shipA: shipALauncher, shipB: shipBLauncher };
  const weaponSystemSwitches: Record<Side, WeaponSystemSwitch> = {
    shipA: { side: "shipA", activeKind: vi.fn(() => "turret" as const), setActiveKind: vi.fn(), autoToggle: vi.fn(), refresh: vi.fn(), clear: vi.fn() },
    shipB: { side: "shipB", activeKind: vi.fn(() => "turret" as const), setActiveKind: vi.fn(), autoToggle: vi.fn(), refresh: vi.fn(), clear: vi.fn() },
  };
  const profileController = { showStatus: vi.fn() };
  const profileTextCodec = makeMockProfileTextCodec();
  const events = new UiEventsImpl();
  const onConfigPersisted = vi.fn();
  const onProfileTextLoaded = vi.fn();
  events.onConfigInvalidated(onConfigPersisted);
  events.onProfileTextLoaded(onProfileTextLoaded);
  const popupGroup: PopupGroup = new FakePopupGroup();
  const controller = new ImportControllerImpl({
    clipboard,
    fittingImport,
    savedFittings,
    popupGroup,
    els: {
      importProfile: getFake(document, "import-profile") as unknown as HTMLButtonElement,
      importSidePopup: getFake(document, "import-side-popup") as unknown as HTMLElement,
      importSideShipA: getFake(document, "import-side-ship-a") as unknown as HTMLButtonElement,
      importSideShipB: getFake(document, "import-side-ship-b") as unknown as HTMLButtonElement,
    },
    shipASide: shipAPanel as unknown as SidePanel,
    shipBSide: shipBPanel as unknown as SidePanel,
    turrets,
    launchers,
    weaponSystemSwitches,
    profileController: profileController as unknown as ProfileController,
    profileTextCodec,
    events,
    itemNameLoader: { ensureLoaded: vi.fn(), isLoaded: vi.fn(() => true), load: vi.fn(() => Promise.resolve()) },
  });
  return {
    controller, document, clipboard, fittingImport, savedFittings, shipAPanel, shipBPanel, turrets, launchers, weaponSystemSwitches,
    profileController, events, onConfigPersisted, onProfileTextLoaded,
  };
}
