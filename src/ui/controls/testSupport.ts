import { createContainer, InjectionMode, type AwilixContainer } from "awilix";
import type { ChargeCatalog, FittingImport, PresetFittings } from "../../fitting";
import type { Ships } from "../../ships";
import type { HitChance } from "../../sim";
import type { I18n, Language } from "../i18n";
import type { ImageCatalog } from "../icons";
import type { SavedFittings, SettingsStore, TrackingUnit } from "../../appstate";
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
import { TrackingInputImpl, type TrackingInput } from "./trackingInput";
import { DomControls } from "./domControls";
import type { DomControlsFactory } from "./domControlsFactory";
import type { Els } from "./elementsContract";
import { createControlsEls } from "./elements";
import { registerControlsModule } from "./module";
import type { Popup, PopupGroup } from "./popup";
import type { Side, SidePanel, SidePanelDeps, SidePanelElements, SidePanelHost } from "./sidePanel";

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

function buildControlsCradle(document: Document): AwilixContainer<object> {
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  const cradle = createContainer({ injectionMode: InjectionMode.PROXY });
  registerControlsModule(cradle);
  return cradle;
}

export function buildDomControls(options: BuildDomControlsOptions = {}) {
  const document = fakeDocument();
  const cradle = buildControlsCradle(document);
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
  const domControlsFactory = cradle.resolve<DomControlsFactory>("domControlsFactory");
  const controls = new DomControls({
    domControlsDeps: {
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
    },
    domControlsFactory,
  });
  return { document, controls, settingsStore, hitChance, i18n, clipboard };
}

export function buildSidePanel(
  side: Side = "attacker",
  ships: Ships = mockShips(),
  fittingImport: FittingImport = mockFittingImport(),
) {
  const document = fakeDocument();
  const cradle = buildControlsCradle(document);
  const els = cradle.resolve<(els: Els, side: Side) => SidePanelElements>("createSidePanelEls")(createControlsEls(), side);
  const host: SidePanelHost = {
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
  const panel = cradle.resolve<(deps: SidePanelDeps) => SidePanel>("createSidePanel")({
    side,
    host,
    popupGroup,
    els,
    i18n,
    ships,
    fittingImport,
    imageCatalog,
    timer: mockTimer(),
  });
  return { document, panel };
}
