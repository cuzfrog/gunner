import type { ChargeCatalog, FittingImport, GunFamilies, PresetFittings } from "../../fitting";
import type { Ships } from "../../ships";
import type { HitChance } from "../../sim";
import type { I18n, Language } from "../i18n";
import type { ImageCatalog } from "../icons";
import type { ClipboardProvider, ProfileParamOverrides, SavedFittings, SettingsStore } from "../settings";
import { TrackingInput } from "./trackingInput";
import { TurretControllerImpl } from "./turret/turretController";
import { TurretStateResolver } from "./turret/turretStateResolver";
import { DomControls } from "./domControls";
import { DomControlsFactory } from "./domControlsFactory";
import type { TurretEls } from "./turret/turretEls";
import { createSidePanel, type Side, collectSideEls } from "./sidePanel";
import type { Popup, PopupGroup } from "./popup";
import { createControlsEls } from "./elements";
import { fakeDocument, getFake } from "./fakeDocument";
import { FakeElement } from "./fakeElement";
import { CHARGE_OPTIONS, IMPORTED_RIFTER, IMPORTED_RIFTER_WITH_CARGO, RIFTER, TURRET } from "./testConstants";
import {
  mockChargeCatalog,
  mockClipboard,
  mockFittingImport,
  mockGunFamilies,
  mockHitChance,
  mockPresetFittings,
  mockSavedFittings,
  mockSettingsStore,
  mockShips,
  mockTimer,
} from "./mockFactories";

export { FakeElement } from "./fakeElement";
export { fakeDocument, getFake } from "./fakeDocument";
export {
  mockShips,
  mockFittingImport,
  mockChargeCatalog,
  mockPresetFittings,
  mockSavedFittings,
  mockClipboard,
  mockTimer,
  mockHitChance,
  mockSettingsStore,
  mockGunFamilies,
} from "./mockFactories";
export {
  RIFTER,
  FITTED,
  TURRET,
  MOCK_REPRESENTATIVES,
  IMPORTED_RIFTER,
  IMPORTED_RIFTER_WITH_CARGO,
  CHARGE_OPTIONS,
} from "./testConstants";

export function collectTurretEls(document: Document): TurretEls {
  return {
    tracking: getFake(document, "tracking") as unknown as HTMLInputElement,
    sigRes: getFake(document, "sigRes") as unknown as HTMLSelectElement,
    sigResOptions: getFake(document, "sig-res-options") as unknown as HTMLElement,
    optimal: getFake(document, "optimal") as unknown as HTMLInputElement,
    falloff: getFake(document, "falloff") as unknown as HTMLInputElement,
    attackerAmmoTrigger: getFake(document, "attacker-ammo-trigger") as unknown as HTMLButtonElement,
    attackerAmmoSummary: getFake(document, "attacker-ammo-summary") as unknown as HTMLElement,
    attackerAmmoSummaryIcon: getFake(document, "attacker-ammo-summary-icon") as unknown as HTMLImageElement,
    attackerAmmoPopup: getFake(document, "attacker-ammo-popup") as unknown as HTMLElement,
    attackerAmmoCargoLabel: getFake(document, "attacker-ammo-cargo-label") as unknown as HTMLElement,
    attackerAmmoCargoList: getFake(document, "attacker-ammo-cargo-list") as unknown as HTMLElement,
    attackerAmmoExpand: getFake(document, "attacker-ammo-expand") as unknown as HTMLButtonElement,
    attackerAmmoAllSection: getFake(document, "attacker-ammo-all-section") as unknown as HTMLElement,
    attackerAmmoAllList: getFake(document, "attacker-ammo-all-list") as unknown as HTMLElement,
  };
}

export function setTurretInputs(document: Document): void {
  getFake(document, "tracking").value = "0.42";
  getFake(document, "sigRes").value = "S";
  getFake(document, "optimal").value = "5000";
  getFake(document, "falloff").value = "5000";
  getFake(document, "attacker-ammo-all-section").hidden = true;
  getFake(document, "attacker-ammo-trigger").setAttribute("aria-expanded", "false");
  getFake(document, "attacker-ammo-popup").hidden = true;
}

export function addSigResButtons(document: Document): void {
  const group = getFake(document, "sig-res-options");
  for (const value of ["S", "M", "L", "XL"]) {
    const button = new FakeElement();
    button.tagName = "BUTTON";
    button.setAttribute("data-value", value);
    button.setAttribute("aria-pressed", String(value === "S"));
    button.title = `Original ${value}`;
    group.appendChild(button);
  }
}

function setControlDefaults(document: Document): void {
  const defaults: Record<string, string> = {
    sigRes: "S",
    tracking: "0.32",
    optimal: "1000",
    falloff: "3000",
    "attacker-speed": "300",
    "attacker-mass": "1000000",
    "attacker-inertia": "3",
    "attacker-range": "5000",
    "attacker-mode": "orbit",
    "attacker-skills": "5",
    "target-speed": "300",
    "target-mass": "1000000",
    "target-inertia": "3",
    "target-range": "5000",
    "target-sig": "36",
    "target-mode": "orbit",
    "target-skills": "5",
    "initial-distance": "5000",
    "maneuver-aggressivity": "1",
    "maneuver-aggressivity-slider": "0.5",
    "grid-brightness-slider": "0.2",
    "sim-speed": "4",
    "profile-name": "",
  };
  for (const [id, value] of Object.entries(defaults)) {
    const el = getFake(document, id);
    el.value = value;
  }
  getFake(document, "attacker-overload").checked = true;
  getFake(document, "target-overload").checked = true;
  addSigResButtons(document);
}

interface BuildDomControlsOptions {
  i18n?: Partial<I18n>;
  hitChance?: Partial<HitChance>;
  ships?: Partial<Ships>;
  settingsStore?: Partial<SettingsStore>;
  chargeCatalog?: Partial<ChargeCatalog>;
  fittingImport?: Partial<FittingImport>;
  presetFittings?: Partial<PresetFittings>;
  savedFittings?: Partial<SavedFittings>;
}

export function buildDomControls(options: BuildDomControlsOptions = {}) {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  setControlDefaults(document);
  const i18n = vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
    ...options.i18n,
  });
  const imageCatalog = vi.mocked<ImageCatalog>({
    shipImageUrl: vi.fn(),
    itemIconUrl: vi.fn(() => undefined),
    droneIconUrl: vi.fn(),
  });
  const gunFamilies = mockGunFamilies();
  const settingsStore = vi.mocked<SettingsStore>({ ...mockSettingsStore(), ...options.settingsStore });
  const chargeCatalog = vi.mocked<ChargeCatalog>({ ...mockChargeCatalog(), ...options.chargeCatalog });
  const fittingImport = vi.mocked<FittingImport>({ ...mockFittingImport(), ...options.fittingImport });
  const hitChance = vi.mocked<HitChance>({ ...mockHitChance(), ...options.hitChance });
  const ships = vi.mocked<Ships>({ ...mockShips(), ...options.ships });
  const clipboard = mockClipboard();
  const presetFittings = vi.mocked<PresetFittings>({ ...mockPresetFittings(), ...options.presetFittings });
  const savedFittings = vi.mocked<SavedFittings>({ ...mockSavedFittings(), ...options.savedFittings });
  const { parts, host } = new DomControlsFactory().buildParts({
    hitChance,
    i18n,
    settingsStore,
    ships,
    fittingImport,
    gunFamilies,
    presetFittings,
    savedFittings,
    clipboard,
    timer: mockTimer(),
    chargeCatalog,
    imageCatalog,
  });
  const controls = new DomControls(parts, host);
  return { document, controls, settingsStore, hitChance, i18n, clipboard };
}

export function buildTurret(
  options: {
    overrides?: Partial<ProfileParamOverrides>;
    imageCatalog?: Partial<ImageCatalog>;
    chargeCatalog?: Partial<ChargeCatalog>;
    fittingImport?: Partial<FittingImport>;
  } = {},
) {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  const els = collectTurretEls(document);
  setTurretInputs(document);
  addSigResButtons(document);
  const trackingInput = new TrackingInput();
  const i18n = vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  });
  const imageCatalog = vi.mocked<ImageCatalog>({
    shipImageUrl: vi.fn(),
    itemIconUrl: vi.fn(() => undefined),
    droneIconUrl: vi.fn(),
    ...options.imageCatalog,
  });
  const gunFamilies = mockGunFamilies();
  const chargeCatalog = vi.mocked<ChargeCatalog>({
    usualForChargeSize: vi.fn(() => "Hail S"),
    chargesForSize: vi.fn(() => []),
    chargesForTurret: vi.fn(() => []),
    withCharge: vi.fn((turret) => turret),
    ...options.chargeCatalog,
  });
  const fittingImport = vi.mocked<FittingImport>({
    importFitting: vi.fn(() => undefined),
    propulsionVariantNames: vi.fn(),
    propulsionStats: vi.fn(),
    summarize: vi.fn(),
    ...options.fittingImport,
  });
  const overrides = () => options.overrides ?? {};
  const clearTurretOverrides = vi.fn();
  const onConfigChange = vi.fn();
  const popup = {
    isOpen: vi.fn(() => false),
    open: vi.fn(),
    close: vi.fn(),
    focusTrigger: vi.fn(),
    contains: vi.fn(),
  };
  const resolver = new TurretStateResolver({ chargeCatalog, fittingImport });
  const controller = new TurretControllerImpl({
    els,
    popup,
    chargeCatalog,
    gunFamilies,
    imageCatalog,
    trackingInput,
    i18n,
    fittingImport,
    resolver,
    overrides,
    clearTurretOverrides,
    onConfigChange,
  });
  return {
    document,
    controller,
    chargeCatalog,
    imageCatalog,
    fittingImport,
    gunFamilies,
    i18n,
    trackingInput,
    clearTurretOverrides,
    onConfigChange,
    popup,
  };
}


class FakePopupGroup implements PopupGroup {
  private readonly popups: Popup[] = [];
  register(popup: Popup): void { this.popups.push(popup); }
  open(popup: Popup): void {
    for (const p of this.popups) { if (p !== popup && p.isOpen()) p.close(); }
    if (!popup.isOpen()) popup.open();
  }
  toggle(popup: Popup): void { if (popup.isOpen()) this.close(popup); else this.open(popup); }
  close(popup: Popup): void { if (popup.isOpen()) popup.close(); }
  closeAll(): void { for (const p of this.popups) if (p.isOpen()) p.close(); }
  hasOpen(): boolean { return this.popups.some((p) => p.isOpen()); }
  onPointerDown(target: EventTarget | null): void {
    if (!target) return;
    for (const p of this.popups) if (p.isOpen() && !p.contains(target)) p.close();
  }
  onKeyDown(event: { readonly key: string }): void {
    if (event.key !== "Escape") return;
    for (const p of this.popups) if (p.isOpen()) { p.close(); p.focusTrigger(); }
  }
}

export function buildSidePanel(
  side: Side = "attacker",
  ships: Ships = mockShips(),
  fittingImport: FittingImport = mockFittingImport(),
) {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  const els = collectSideEls(createControlsEls(), side);
  const host = {
    persistConfigChange: vi.fn(),
    attackerTurretHooks: { onFittedHullCleared: vi.fn(), restoreTurret: vi.fn() },
    importer: {
      mostRecentFittingFor: vi.fn(),
      importEftFitting: vi.fn(),
      importFromText: vi.fn(() => Promise.resolve()),
      importFromClipboard: vi.fn(() => Promise.resolve()),
    },
  };
  const i18n = vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  });
  const imageCatalog = vi.mocked<ImageCatalog>({
    shipImageUrl: vi.fn(),
    itemIconUrl: vi.fn(() => undefined),
    droneIconUrl: vi.fn(),
  });
  const panel = createSidePanel({
    side,
    host,
    popupGroup: new FakePopupGroup(),
    els,
    i18n,
    ships,
    fittingImport,
    imageCatalog,
    timer: mockTimer(),
  });
  return { document, panel };
}
