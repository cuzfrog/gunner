import type { ChargeCatalog, FittingImport, GunFamilies } from "../../fitting";
import type { Ships } from "../../ships";
import type { HitChance } from "../../sim";
import type { I18n, Language } from "../i18n";
import type { ImageCatalog } from "../icons";
import type { ClipboardProvider, ProfileParamOverrides, SettingsStore } from "../settings";
import { TrackingInput } from "./trackingInput";
import { TurretController } from "./turretController";
import { TurretStateResolver } from "./turretStateResolver";
import type { TurretEls } from "./turretEls";
import { DomControls, type Controls } from "./domControls";
import { SidePanel, type Side, collectSideEls } from "./sidePanel";
import { PopupGroup } from "./popupGroup";
import { createControlsEls } from "./createElements";
import { fakeDocument, getFake } from "./fakeDocument";
import { FakeElement } from "./fakeElement";
import {
  CHARGE_OPTIONS,
  IMPORTED_RIFTER,
  IMPORTED_RIFTER_WITH_CARGO,
  RIFTER,
  TURRET,
} from "./testConstants";
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

export { CHARGE_OPTIONS, IMPORTED_RIFTER, IMPORTED_RIFTER_WITH_CARGO, RIFTER, TURRET } from "./testConstants";

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
    sigRes: "S", tracking: "0.32", optimal: "1000", falloff: "3000", "attacker-speed": "300", "attacker-mass": "1000000", "attacker-inertia": "3", "attacker-range": "5000", "attacker-mode": "orbit", "attacker-skills": "5",
    "target-speed": "300", "target-mass": "1000000", "target-inertia": "3", "target-range": "5000", "target-sig": "36", "target-mode": "orbit", "target-skills": "5", "initial-distance": "5000", "maneuver-aggressivity": "1",
    "maneuver-aggressivity-slider": "0.5", "grid-brightness-slider": "0.2", "sim-speed": "4", "profile-name": "",
  };
  for (const [id, value] of Object.entries(defaults)) {
    const el = getFake(document, id);
    el.value = value;
  }
  getFake(document, "attacker-overload").checked = true;
  getFake(document, "target-overload").checked = true;
  addSigResButtons(document);
}

export function buildDomControls(options: { i18n?: Partial<I18n>; hitChance?: Partial<HitChance>; ships?: Partial<Ships>; settingsStore?: Partial<SettingsStore>; chargeCatalog?: Partial<ChargeCatalog>; fittingImport?: Partial<FittingImport> } = {}) {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  setControlDefaults(document);
  const i18n = vi.mocked<I18n>({ current: vi.fn((): Language => "en"), setLanguage: vi.fn(), t: vi.fn((key) => key), translateDocument: vi.fn(), ...options.i18n });
  const imageCatalog = vi.mocked<ImageCatalog>({ shipImageUrl: vi.fn(), itemIconUrl: vi.fn(() => undefined), droneIconUrl: vi.fn() });
  const gunFamilies = mockGunFamilies();
  const settingsStore = vi.mocked<SettingsStore>({ ...mockSettingsStore(), ...options.settingsStore });
  const chargeCatalog = vi.mocked<ChargeCatalog>({ ...mockChargeCatalog(), ...options.chargeCatalog });
  const fittingImport = vi.mocked<FittingImport>({ ...mockFittingImport(), ...options.fittingImport });
  const hitChance = vi.mocked<HitChance>({ ...mockHitChance(), ...options.hitChance });
  const ships = vi.mocked<Ships>({ ...mockShips(), ...options.ships });
  const clipboard = mockClipboard();
  const controls = new DomControls({ hitChance, i18n, settingsStore, ships, fittingImport, gunFamilies, presetFittings: mockPresetFittings(), savedFittings: mockSavedFittings(), clipboard, timer: mockTimer(), chargeCatalog, imageCatalog });
  return { document, controls, settingsStore, hitChance, i18n, clipboard };
}

export function buildTurret(options: { overrides?: Partial<ProfileParamOverrides>; imageCatalog?: Partial<ImageCatalog>; chargeCatalog?: Partial<ChargeCatalog>; fittingImport?: Partial<FittingImport> } = {}) {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  const els = collectTurretEls(document);
  setTurretInputs(document);
  addSigResButtons(document);
  const trackingInput = new TrackingInput();
  const i18n = vi.mocked<I18n>({ current: vi.fn((): Language => "en"), setLanguage: vi.fn(), t: vi.fn((key) => key), translateDocument: vi.fn() });
  const imageCatalog = vi.mocked<ImageCatalog>({ shipImageUrl: vi.fn(), itemIconUrl: vi.fn(() => undefined), droneIconUrl: vi.fn(), ...options.imageCatalog });
  const gunFamilies = mockGunFamilies();
  const chargeCatalog = vi.mocked<ChargeCatalog>({ usualForChargeSize: vi.fn(() => "Hail S"), chargesForSize: vi.fn(() => []), chargesForTurret: vi.fn(() => []), withCharge: vi.fn((turret) => turret), ...options.chargeCatalog });
  const fittingImport = vi.mocked<FittingImport>({ importFitting: vi.fn(() => undefined), propulsionVariantNames: vi.fn(), propulsionStats: vi.fn(), summarize: vi.fn(), ...options.fittingImport });
  const overrides = () => options.overrides ?? {};
  const clearTurretOverrides = vi.fn();
  const onConfigChange = vi.fn();
  const popup = { isOpen: vi.fn(() => false), open: vi.fn(), close: vi.fn(), focusTrigger: vi.fn(), contains: vi.fn() };
  const resolver = new TurretStateResolver({ chargeCatalog, fittingImport });
  const controller = new TurretController({ els, popup, chargeCatalog, gunFamilies, imageCatalog, trackingInput, i18n, fittingImport, resolver, overrides, clearTurretOverrides, onConfigChange });
  return { document, controller, chargeCatalog, imageCatalog, fittingImport, gunFamilies, i18n, trackingInput, clearTurretOverrides, onConfigChange, popup };
}

export function buildSidePanel(side: Side = "attacker", ships: Ships = mockShips(), fittingImport: FittingImport = mockFittingImport()) {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  const els = collectSideEls(createControlsEls(), side);
  const host = {
    updateFittingTrigger: vi.fn(),
    persistConfigChange: vi.fn(),
    attackerTurretHooks: { onFittedHullCleared: vi.fn(), restoreTurret: vi.fn() },
    importer: { mostRecentFittingFor: vi.fn(), importEftFitting: vi.fn(), importFromText: vi.fn(() => Promise.resolve()), importFromClipboard: vi.fn(() => Promise.resolve()) },
  };
  const i18n = vi.mocked<I18n>({ current: vi.fn((): Language => "en"), setLanguage: vi.fn(), t: vi.fn((key) => key), translateDocument: vi.fn() });
  const imageCatalog = vi.mocked<ImageCatalog>({ shipImageUrl: vi.fn(), itemIconUrl: vi.fn(() => undefined), droneIconUrl: vi.fn() });
  const panel = new SidePanel({ side, host, popupGroup: new PopupGroup(), els, i18n, ships, fittingImport, imageCatalog, timer: mockTimer() });
  return { document, panel };
}
