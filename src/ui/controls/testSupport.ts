import { asClass, asFunction, asValue, createContainer, InjectionMode, type AwilixContainer } from "awilix";
import type { ChargeCatalog, FittingImport, PresetFittings } from "../../fitting";
import type { Ships } from "../../ships";
import type { HitChance } from "../../sim";
import type { I18n, Language } from "../i18n";
import type { ImageCatalog } from "../icons";
import type { ProfileParamOverrides, ProfileTextCodec, SavedFittings, SettingsStore, TrackingUnit } from "../../appstate";
import { UiEventsImpl, type UiEvents } from "../events";
import {
  FakeElement,
  fakeDocument,
  getFake,
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
} from "../testing";
import type { StatConditions } from "../../ships";
import type { SigResolutionClass } from "../../sim";
import { TrackingInputImpl, type TrackingInput } from "./trackingInput";
import { DomControls } from "./domControls";
import type { ConfirmController } from "./confirmController";
import type { ControlsCradle } from "./cradle";
import { createControlsEls } from "./elements";
import { registerControlsModule } from "./module";
import type { Popup, PopupGroup } from "./popup";
import { registerSidePanelModule, type Side, type SidePanel } from "./sidePanel";
import type { TurretController, TurretOverrides } from "./turret";

export { createControlsEls } from "./elements";
export * from "../testing";

export function mockTrackingInput(): TrackingInput {
  return new TrackingInputImpl();
}

export function fakeTrackingInput(rad = 0.32, currentUnit: TrackingUnit = "rad"): TrackingInput {
  let currentRad = rad;
  return {
    get rad(): number { return currentRad; },
    get unit(): TrackingUnit { return currentUnit; },
    setRadValue(value: number, _sigResolution: number): number { currentRad = value; return currentRad; },
    setUnit(unit: TrackingUnit, _sigResolution: number): number { currentUnit = unit; return currentRad; },
    setDisplayValue(value: number, _sigResolution: number): number { currentRad = value; return currentRad; },
    displayValue(_sigResolution: number): number { return currentRad; },
  };
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

function mockI18n(): I18n {
  return vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  });
}

function mockImageCatalog(): ImageCatalog {
  return vi.mocked<ImageCatalog>({
    shipImageUrl: vi.fn(),
    itemIconUrl: vi.fn(() => undefined),
    droneIconUrl: vi.fn(),
  });
}

function buildControlsCradle(document: Document, options: BuildDomControlsOptions = {}): AwilixContainer<ControlsCradle> {
  globalThis.document = document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  const cradle = createContainer<ControlsCradle>({ injectionMode: InjectionMode.PROXY });
  cradle.register({ uiEvents: asClass(UiEventsImpl).singleton() });
  cradle.register({
    i18n: asValue(vi.mocked<I18n>({ ...mockI18n(), ...options.i18n })),
    imageCatalog: asValue(mockImageCatalog()),
    hitChance: asValue(vi.mocked<HitChance>({ ...mockHitChance(), ...options.hitChance })),
    ships: asValue(vi.mocked<Ships>({ ...mockShips(), ...options.ships })),
    settingsStore: asValue(vi.mocked<SettingsStore>({ ...mockSettingsStore(), ...options.settingsStore })),
    profileTextCodec: asValue(vi.mocked<ProfileTextCodec>({ parse: vi.fn(() => undefined), serialize: vi.fn(() => ""), hasHeader: vi.fn(() => false) })),
    fittingImport: asValue(vi.mocked<FittingImport>({ ...mockFittingImport(), ...options.fittingImport })),
    gunFamilies: asValue(mockGunFamilies()),
    presetFittings: asValue(vi.mocked<PresetFittings>({ ...mockPresetFittings(), ...options.presetFittings })),
    savedFittings: asValue(vi.mocked<SavedFittings>({ ...mockSavedFittings(), ...options.savedFittings })),
    clipboard: asValue(mockClipboard()),
    timer: asValue(mockTimer()),
    chargeCatalog: asValue(vi.mocked<ChargeCatalog>({ ...mockChargeCatalog(), ...options.chargeCatalog })),
  });
  return cradle;
}

export function buildDomControls(options: BuildDomControlsOptions = {}) {
  const document = fakeDocument();
  const cradle = buildControlsCradle(document, options);
  setControlDefaults(document);
  registerControlsModule(cradle);
  cradle.register({
    confirmController: asValue(vi.mocked<ConfirmController>({ confirm: vi.fn(() => Promise.resolve(true)) })),
  });
  const controls = cradle.cradle.controls;
  if (!(controls instanceof DomControls)) throw new Error("controls did not resolve to DomControls");
  return {
    document,
    controls,
    cradle,
    settingsStore: cradle.cradle.settingsStore,
    hitChance: cradle.cradle.hitChance,
    i18n: cradle.cradle.i18n,
    clipboard: cradle.cradle.clipboard,
  };
}

class StubTurretOverrides implements TurretOverrides {
  private overrides: Partial<ProfileParamOverrides> = {};
  get(): Partial<ProfileParamOverrides> { return { ...this.overrides }; }
  set(patch: Partial<ProfileParamOverrides>): void { this.overrides = { ...this.overrides, ...patch }; }
  clearTurret(): void {
    for (const key of ["tracking", "sigRes", "optimal", "falloff"] as const) delete this.overrides[key];
  }
  clear(): void { this.overrides = {}; }
}

class StubPopup implements Popup {
  isOpen = vi.fn();
  open = vi.fn();
  close = vi.fn();
  focusTrigger = vi.fn();
  contains = vi.fn();
}

class StubTurretController implements TurretController {
  popup: Popup = new StubPopup();
  ammo = vi.fn(() => "Hail S");
  applyImported = vi.fn();
  restore(settings: { fitting?: string; conditions?: StatConditions; ammo?: string }): void;
  restore(fittingText?: string, conditions?: StatConditions, ammo?: string): void;
  restore(_arg1?: unknown, _conditions?: StatConditions, _ammo?: string): void {}
  clear = vi.fn();
  currentTurretSpec = vi.fn(() => ({ tracking: 0.32, sigResolution: 40, optimal: 1000, falloff: 3000 }));
  currentSigResClass = vi.fn((): SigResolutionClass => "S");
  capture = vi.fn(() => ({ sigRes: "S" as const, optimal: 1000, falloff: 3000, ammo: "Hail S" }));
  isAmmoPopupOpen = vi.fn();
  openAmmoPopup = vi.fn();
  closeAmmoPopup = vi.fn();
  render = vi.fn();
}

export function buildSidePanel(
  side: Side = "attacker",
  ships: Ships = mockShips(),
  fittingImport: FittingImport = mockFittingImport(),
) {
  const document = fakeDocument();
  globalThis.document = document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  setControlDefaults(document);

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
  const popupGroup = vi.mocked<PopupGroup>({
    register: vi.fn(),
    open: vi.fn(),
    toggle: vi.fn(),
    close: vi.fn(),
    closeAll: vi.fn(),
    hasOpen: vi.fn(),
    onPointerDown: vi.fn(),
    onKeyDown: vi.fn(),
  });
  const events: UiEvents = new UiEventsImpl();
  const turretOverrides: TurretOverrides = new StubTurretOverrides();
  const turret: TurretController = new StubTurretController();

  const cradle = createContainer<ControlsCradle>({ injectionMode: InjectionMode.PROXY });
  cradle.register({
    uiEvents: asValue(events),
    els: asFunction(createControlsEls).singleton(),
    i18n: asValue(i18n),
    imageCatalog: asValue(imageCatalog),
    timer: asValue(mockTimer()),
    popupGroup: asValue(popupGroup),
    ships: asValue(ships),
    fittingImport: asValue(fittingImport),
    turretController: asValue(turret),
    turretOverrides: asValue(turretOverrides),
  });
  registerSidePanelModule(cradle);

  const panel = side === "attacker" ? cradle.cradle.attackerSide : cradle.cradle.targetSide;
  panel.setImporter({
    mostRecentFittingFor: vi.fn(),
    importEftFitting: vi.fn(),
    importFromText: vi.fn(() => Promise.resolve()),
    importFromClipboard: vi.fn(() => Promise.resolve()),
  });
  return { document, panel, turret, turretOverrides };
}
