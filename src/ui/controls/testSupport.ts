import { type ChargeCatalog, type FittingImport, type GunFamilies, type GunFamily, type ImportedFitting, type ImportedTurret, type PresetFittings } from "../../fitting";
import type { FittedHull, HullView, ShipProfile, Ships, StatConditions } from "../../ships";
import type { HitChance, SigResolutionClass } from "../../sim";
import { TrackingInput } from "./trackingInput";
import type { I18n, Language } from "../i18n";
import type { ImageCatalog } from "../imageCatalog";
import type { ProfileParamOverrides, SettingsStore, ClipboardProvider } from "../settings";
import type { Timer } from "../timer";
import type { SavedFittings } from "../savedFittings";
import { TurretController, type TurretEls } from "./turretController";
import { DomControls, type Controls, type ControlsCallbacks } from "./domControls";
import { SidePanel, type Side, collectSideEls } from "./sidePanel";
import { PopupGroup } from "./popupGroup";
import { createControlsEls } from "./elements";

export const RIFTER: ShipProfile = {
  name: "Rifter",
  faction: "Minmatar Republic",
  hullType: "Standard Frigates",
  mass: 1_000_000,
  inertiaModifier: 3,
  baseSpeed: 365,
  sigRadius: 36,
};

export const FITTED: FittedHull = { mass: 1_000_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 };

export const TURRET: ImportedTurret = {
  tracking: 0.315,
  sigResolutionClass: "S",
  optimal: 600,
  falloff: 3000,
  chargeSize: 1,
  charge: "Hail S",
  base: { tracking: 0.42, optimal: 1200, falloff: 3000 },
  moduleName: "200mm AutoCannon I",
};

const MOCK_REPRESENTATIVES: Record<GunFamily, Record<SigResolutionClass, string>> = {
  autocannon: { S: "200mm AutoCannon I", M: "425mm AutoCannon I", L: "800mm Repeating Cannon I", XL: "Quad 800mm Repeating Cannon I" },
  artillery: { S: "280mm Howitzer Artillery I", M: "720mm Howitzer Artillery I", L: "1400mm Howitzer Artillery I", XL: "Quad 3500mm Siege Artillery I" },
  pulseLaser: { S: "Gatling Pulse Laser I", M: "Heavy Pulse Laser I", L: "Mega Pulse Laser I", XL: "Dual Giga Pulse Laser I" },
  beamLaser: { S: "Small Focused Beam Laser I", M: "Heavy Beam Laser I", L: "Tachyon Beam Laser I", XL: "Dual Giga Beam Laser I" },
  blaster: { S: "Light Neutron Blaster I", M: "Heavy Neutron Blaster I", L: "Neutron Blaster Cannon I", XL: "Ion Siege Blaster I" },
  railgun: { S: "150mm Railgun I", M: "250mm Railgun I", L: "425mm Railgun I", XL: "Dual 1000mm Railgun I" },
};

export const IMPORTED_RIFTER: ImportedFitting = { profile: RIFTER, fittingName: "Brawler", fitted: FITTED, propulsion: undefined, turret: TURRET, cargoCharges: [] };
export const IMPORTED_RIFTER_WITH_CARGO: ImportedFitting = { ...IMPORTED_RIFTER, cargoCharges: [{ name: "Republic Fleet EMP S", quantity: 2000 }] };

export const CHARGE_OPTIONS = [
  { name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 },
  { name: "Republic Fleet EMP S", trackingMultiplier: 1, rangeMultiplier: 0.5, falloffMultiplier: 1 },
] as const;

export class FakeElement {
  value = "";
  checked = false;
  hidden = false;
  className = "";
  textContent = "";
  title = "";
  src = "";
  tagName = "";
  disabled = false;
  isConnected = true;
  children: FakeElement[] = [];
  classList = { add: vi.fn(), remove: vi.fn(), toggle: vi.fn(), contains: vi.fn(() => false) };
  style: Record<string, string | number> & { setProperty(this: Record<string, string | number>, name: string, value: string): void } = Object.assign(Object.create(null), { setProperty(this: Record<string, string | number>, name: string, value: string) { this[name] = value; } });
  offsetParent: FakeElement | null = null;
  offsetWidth = 0;
  offsetHeight = 0;
  private _innerHTML = "";
  private attributes: Record<string, string | null> = {};
  private handlers: Record<string, Array<(event?: unknown) => void>> = {};
  focus = vi.fn();
  blur = vi.fn();

  getBoundingClientRect(): { left: number; top: number; right: number; bottom: number; width: number; height: number; x: number; y: number } {
    return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
  }

  get innerHTML(): string { return this._innerHTML; }
  set innerHTML(value: string) {
    this._innerHTML = value;
    for (const child of this.children) child.isConnected = false;
    this.children = [];
  }

  get firstElementChild(): FakeElement | null { return this.children[0] ?? null; }
  getAttribute(name: string): string | null { return this.attributes[name] ?? null; }
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
  addEventListener(event: string, handler: (event?: unknown) => void): void { (this.handlers[event] ??= []).push(handler); }
  dispatchEvent(event: { type: string }): void { this.handlers[event.type]?.forEach((h) => h(event)); }
  trigger(event: string, data?: unknown): void { this.handlers[event]?.forEach((h) => h(data)); }
  appendChild(child: unknown): void { this.children.push(child as FakeElement); }
  closest(): FakeElement | null { return null; }
  querySelector(selector: string): FakeElement | null {
    if (selector.startsWith('[aria-selected="true"]')) {
      return this.children.find((c) => c.getAttribute("aria-selected") === "true") ?? null;
    }
    return this.children[0] ?? null;
  }
}

const SELECT_IDS = new Set(["sigRes", "attacker-mode", "target-mode", "attacker-skills", "target-skills", "attacker-propulsion", "target-propulsion", "sim-speed", "profile-select"]);
const TEXTAREA_IDS = new Set(["attacker-paste-input", "target-paste-input"]);
const IMAGE_IDS = new Set(["attacker-ship-image", "target-ship-image", "attacker-ammo-summary-icon"]);
const BUTTON_IDS = new Set(["play", "reset", "profile-save", "profile-delete", "share-link", "import-profile", "import-side-attacker", "import-side-target", "attacker-import-fitting", "target-import-fitting", "attacker-fitting-trigger", "attacker-fitting-eye", "target-fitting-trigger", "target-fitting-eye", "attacker-ammo-trigger", "attacker-ammo-expand", "attacker-propulsion-gear", "target-propulsion-gear", "attacker-skill-trigger", "target-skill-trigger", "attacker-overload-button", "target-overload-button", "tracking-unit-rad", "tracking-unit-score", "lang-en", "lang-zh", "lang-ja"]);

function tagForId(id: string): string {
  if (SELECT_IDS.has(id)) return "SELECT";
  if (TEXTAREA_IDS.has(id)) return "TEXTAREA";
  if (IMAGE_IDS.has(id)) return "IMG";
  if (BUTTON_IDS.has(id)) return "BUTTON";
  if (id.endsWith("-input") || id === "tracking" || id === "optimal" || id === "falloff" || id === "attacker-hull" || id === "target-hull" || id === "attacker-speed" || id === "attacker-mass" || id === "attacker-inertia" || id === "attacker-range" || id === "target-speed" || id === "target-mass" || id === "target-inertia" || id === "target-range" || id === "target-sig" || id === "initial-distance" || id === "maneuver-aggressivity" || id === "maneuver-aggressivity-slider" || id === "grid-brightness-slider" || id === "profile-name" || id === "attacker-overload" || id === "target-overload") return "INPUT";
  return "DIV";
}

export function fakeDocument(): Document {
  const elements = new Map<string, FakeElement>();
  const docHandlers: Record<string, Array<(event?: unknown) => void>> = {};
  return {
    documentElement: { lang: "en" } as unknown as HTMLElement,
    getElementById: (id: string) => {
      if (!elements.has(id)) {
        const el = new FakeElement();
        el.tagName = tagForId(id);
        elements.set(id, el);
      }
      return elements.get(id) as unknown as HTMLElement;
    },
    querySelectorAll: () => [] as unknown as NodeListOf<Element>,
    createElement: (tag: string) => {
      const el = new FakeElement();
      el.tagName = tag.toUpperCase();
      return el as unknown as HTMLElement;
    },
    addEventListener: (event: string, handler: (event?: unknown) => void) => { (docHandlers[event] ??= []).push(handler); },
    removeEventListener: (event: string, handler: (event?: unknown) => void) => { const hs = docHandlers[event]; if (hs) docHandlers[event] = hs.filter((h) => h !== handler); },
    dispatchEvent: (event: Event) => { docHandlers[event.type]?.forEach((h) => h(event)); },
  } as unknown as Document;
}

export function getFake(document: Document, id: string): FakeElement {
  return document.getElementById(id) as unknown as FakeElement;
}

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

export interface BuildTurretResult {
  document: Document;
  controller: TurretController;
  chargeCatalog: ChargeCatalog;
  imageCatalog: ImageCatalog;
  fittingImport: FittingImport;
  gunFamilies: GunFamilies;
  i18n: I18n;
  trackingInput: TrackingInput;
  clearTurretOverrides: ReturnType<typeof vi.fn>;
  onConfigChange: ReturnType<typeof vi.fn>;
  popup: { isOpen: ReturnType<typeof vi.fn>; open: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn>; focusTrigger: ReturnType<typeof vi.fn>; contains: ReturnType<typeof vi.fn> };
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
    if (id === "attacker-overload" || id === "target-overload") el.checked = true;
  }
  const attackerOverload = getFake(document, "attacker-overload");
  attackerOverload.checked = true;
  const targetOverload = getFake(document, "target-overload");
  targetOverload.checked = true;
  addSigResButtons(document);
}

function mockSettingsStore(): SettingsStore {
  return {
    loadStartupState: vi.fn(() => ({ settings: null, selectedProfileName: null })),
    listProfiles: vi.fn(() => []),
    saveProfile: vi.fn(),
    loadProfile: vi.fn(() => null),
    deleteProfile: vi.fn(),
    selectProfile: vi.fn(),
    encodeUrl: vi.fn(() => ""),
    loadPreferences: vi.fn(() => ({ language: "en" as const, trackingUnit: "rad" as const, simSpeed: 4, gridBrightness: 0.2 })),
    savePreferences: vi.fn(),
  };
}

export function mockShips(): Ships {
  return {
    hulls: vi.fn(() => []),
    hullView: vi.fn((profile: ShipProfile, _language: Language): HullView => ({ name: profile.name, hullType: "Frigate", faction: "Unknown" })),
    findHull: vi.fn(() => undefined),
    parsePropulsionId: vi.fn(() => undefined),
    fittingOptions: vi.fn(() => []),
    allFittingOptions: vi.fn(() => []),
    fittingOption: vi.fn(() => undefined),
    fittedStats: vi.fn(() => ({ mass: 0, inertiaModifier: 0, sigRadius: 0, maxSpeed: 0, alignTime: 0 })),
    maxSpeedForFittedMass: vi.fn(() => 0),
    alignTime: vi.fn(() => 0),
  };
}

export function mockFittingImport(): FittingImport {
  return {
    importFitting: vi.fn(() => undefined),
    propulsionVariantNames: vi.fn(() => []),
    propulsionStats: vi.fn(() => undefined),
    summarize: vi.fn(() => undefined),
  };
}

function mockChargeCatalog(): ChargeCatalog {
  return {
    usualForChargeSize: vi.fn(() => "Hail S"),
    chargesForSize: vi.fn(() => []),
    chargesForTurret: vi.fn(() => []),
    withCharge: vi.fn((turret) => turret),
  };
}

function mockPresetFittings(): PresetFittings {
  return { listHulls: vi.fn(() => []), fittingsFor: vi.fn(() => []), eftText: vi.fn(() => "") };
}

function mockSavedFittings(): SavedFittings {
  return { listForHull: vi.fn(() => []), mostRecentFor: vi.fn(() => undefined), record: vi.fn(() => undefined), remove: vi.fn() };
}

function mockClipboard(): ClipboardProvider {
  return { readText: vi.fn(() => Promise.resolve("")), writeText: vi.fn(() => Promise.resolve()) };
}

function mockTimer(): Timer {
  return { setTimeout: vi.fn(() => 0), clearTimeout: vi.fn(), setInterval: vi.fn(() => 0), clearInterval: vi.fn() };
}

function mockHitChance(): HitChance {
  return { compute: vi.fn(() => ({ chance: 0, trackingTerm: 0, rangeTerm: 0 })), findBestDistance: vi.fn(() => 5000) };
}

export interface BuildDomControlsResult {
  document: Document;
  controls: Controls;
  settingsStore: SettingsStore;
  hitChance: HitChance;
  i18n: I18n;
  clipboard: ClipboardProvider;
}

export function buildDomControls(
  options: { i18n?: Partial<I18n>; hitChance?: Partial<HitChance>; ships?: Partial<Ships>; settingsStore?: Partial<SettingsStore>; chargeCatalog?: Partial<ChargeCatalog>; fittingImport?: Partial<FittingImport> } = {},
): BuildDomControlsResult {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  setControlDefaults(document);
  const i18n = vi.mocked<I18n>({ current: vi.fn((): Language => "en"), setLanguage: vi.fn(), t: vi.fn((key) => key), translateDocument: vi.fn(), ...options.i18n });
  const imageCatalog = vi.mocked<ImageCatalog>({ shipImageUrl: vi.fn(), itemIconUrl: vi.fn(() => undefined), droneIconUrl: vi.fn() });
  const gunFamilies = vi.mocked<GunFamilies>({
    familyOf: vi.fn((moduleName: string) => (moduleName.includes("Howitzer") || moduleName.includes("Artillery") ? "artillery" : "autocannon")),
    representativeOf: vi.fn((family: GunFamily, sigRes: SigResolutionClass) => MOCK_REPRESENTATIVES[family][sigRes]),
  });
  const settingsStore = vi.mocked<SettingsStore>({ ...mockSettingsStore(), ...options.settingsStore });
  const chargeCatalog = vi.mocked<ChargeCatalog>({ ...mockChargeCatalog(), ...options.chargeCatalog });
  const fittingImport = vi.mocked<FittingImport>({ ...mockFittingImport(), ...options.fittingImport });
  const hitChance = vi.mocked<HitChance>({ ...mockHitChance(), ...options.hitChance });
  const ships = vi.mocked<Ships>({ ...mockShips(), ...options.ships });
  const clipboard = mockClipboard();
  const controls = new DomControls({
    hitChance,
    i18n,
    settingsStore,
    ships,
    fittingImport,
    gunFamilies,
    presetFittings: mockPresetFittings(),
    savedFittings: mockSavedFittings(),
    clipboard,
    timer: mockTimer(),
    chargeCatalog,
    imageCatalog,
  });
  return { document, controls, settingsStore, hitChance, i18n, clipboard };
}

export function buildTurret(
  options: { overrides?: Partial<ProfileParamOverrides>; imageCatalog?: Partial<ImageCatalog>; chargeCatalog?: Partial<ChargeCatalog>; fittingImport?: Partial<FittingImport> } = {},
): BuildTurretResult {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  const els = collectTurretEls(document);
  setTurretInputs(document);
  addSigResButtons(document);
  const trackingInput = new TrackingInput();
  const i18n = vi.mocked<I18n>({ current: vi.fn((): Language => "en"), setLanguage: vi.fn(), t: vi.fn((key) => key), translateDocument: vi.fn() });
  const imageCatalog = vi.mocked<ImageCatalog>({ shipImageUrl: vi.fn(), itemIconUrl: vi.fn(() => undefined), droneIconUrl: vi.fn(), ...options.imageCatalog });
  const gunFamilies = vi.mocked<GunFamilies>({
    familyOf: vi.fn((moduleName: string) => (moduleName.includes("Howitzer") || moduleName.includes("Artillery") ? "artillery" : "autocannon")),
    representativeOf: vi.fn((family: GunFamily, sigRes: SigResolutionClass) => MOCK_REPRESENTATIVES[family][sigRes]),
  });
  const chargeCatalog = vi.mocked<ChargeCatalog>({ usualForChargeSize: vi.fn(() => "Hail S"), chargesForSize: vi.fn(() => []), chargesForTurret: vi.fn(() => []), withCharge: vi.fn((turret) => turret), ...options.chargeCatalog });
  const fittingImport = vi.mocked<FittingImport>({ importFitting: vi.fn(() => undefined), propulsionVariantNames: vi.fn(), propulsionStats: vi.fn(), summarize: vi.fn(), ...options.fittingImport });
  const overrides = () => options.overrides ?? {};
  const clearTurretOverrides = vi.fn();
  const onConfigChange = vi.fn();
  const popup = { isOpen: vi.fn(() => false), open: vi.fn(), close: vi.fn(), focusTrigger: vi.fn(), contains: vi.fn() };
  const controller = new TurretController({ els, popup, chargeCatalog, gunFamilies, imageCatalog, trackingInput, i18n, fittingImport, overrides, clearTurretOverrides, onConfigChange });
  return { document, controller, chargeCatalog, imageCatalog, fittingImport, gunFamilies, i18n, trackingInput, clearTurretOverrides, onConfigChange, popup };
}

export interface BuildSidePanelResult {
  document: Document;
  panel: SidePanel;
}

export function buildSidePanel(
  side: Side = "attacker",
  ships: Ships = mockShips(),
  fittingImport: FittingImport = mockFittingImport(),
): BuildSidePanelResult {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  const els = collectSideEls(createControlsEls(), side);
  const host = {
    updateFittingTrigger: vi.fn(),
    persistConfigChange: vi.fn(),
    attackerTurretHooks: { onFittedHullCleared: vi.fn(), restoreTurret: vi.fn() },
    importer: {
      mostRecentFittingFor: vi.fn(),
      importEftFitting: vi.fn(),
      importFromText: vi.fn(() => Promise.resolve()),
      importFromClipboard: vi.fn(() => Promise.resolve()),
    },
  };
  const i18n = vi.mocked<I18n>({ current: vi.fn((): Language => "en"), setLanguage: vi.fn(), t: vi.fn((key) => key), translateDocument: vi.fn() });
  const imageCatalog = vi.mocked<ImageCatalog>({ shipImageUrl: vi.fn(), itemIconUrl: vi.fn(() => undefined), droneIconUrl: vi.fn() });
  const panel = new SidePanel({ side, host, popupGroup: new PopupGroup(), els, i18n, ships, fittingImport, imageCatalog, timer: mockTimer() });
  return { document, panel };
}
