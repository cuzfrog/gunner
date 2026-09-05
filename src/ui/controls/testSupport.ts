import { asClass, asFunction, asValue, createContainer, InjectionMode, type AwilixContainer } from "awilix";
import type { ChargeCatalog, DroneCatalog, DroneLoadoutResolver, DroneLoadoutValidator, FittingCalculator, FittingImport, PresetFittings } from "../../fitting";
import type { TypeId } from "../../gamedata/ids";
import type { Ships } from "../../ships";
import { registerSimModule, type EwarResolver, type HitChance, type SimCradle, type EngineView } from "../../sim";
import type { I18n, Language } from "../i18n";
import type { ImageCatalog } from "../icons";
import type { ProfileEquality, ProfileParamOverrides, ProfileTextCodec, SavedFittings, SettingsStore, TrackingUnit } from "../../appstate";
import { UiEventsImpl, type UiEvents } from "../events";
import type { ViewStream } from "../viewStream";
import {
  FakeElement,
  fakeDocument,
  getFake,
  mockChargeCatalog,
  mockClipboard,
  mockFittingDb,
  mockFittingImport,
  mockGunFamilies,
  mockHitChance,
  mockLauncherClasses,
  mockMissileCatalog,
  mockParser,
  mockPresetFittings,
  mockSavedFittings,
  mockSettingsStore,
  mockShips,
  mockTimer,
} from "../testing";
import type { StatConditions } from "../../ships";
import type { SigResolutionClass, TurretSpec } from "../../sim";
import { TrackingInputImpl, type TrackingInput } from "./trackingInput";
import { DomControls } from "./domControls";
import type { ConfirmController } from "./confirm";
import type { ControlsCradle } from "./cradle";
import { createControlsEls } from "./elements";
import { registerControlsModule } from "./module";
import type { Popup, PopupGroup } from "./popup";
import type { Side } from "./side";
import { registerSidePanelModule, type SidePanel, type SidePanelHost } from "./sidePanel";
import { registerSelectionSessionModule } from "../selectionSession";
import type { TurretController, TurretOverrides } from "./turret";
import type { LauncherController } from "./launcher";
import type { DroneController } from "./drone";

export { createControlsEls } from "./elements";
export * from "../testing";

type TestViewStream = ViewStream & { emit(view: EngineView): void };

function createTestViewStream(): TestViewStream {
  const listeners = new Set<(view: EngineView) => void>();
  let latest: EngineView | undefined;
  return {
    connect: () => {},
    onViewUpdated: (l) => listeners.add(l),
    offViewUpdated: (l) => listeners.delete(l),
    currentView: () => latest,
    emit: (view) => { latest = view; for (const l of Array.from(listeners)) l(view); },
  };
}

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
    displayFor(rad: number, _sigResolution: number): number { return rad; },
  };
}

export function addSigResButtons(document: Document): void {
  for (const id of ["ship-a-sig-res-options", "ship-b-sig-res-options"]) {
    const group = getFake(document, id);
    for (const value of ["S", "M", "L", "XL"]) {
      const button = new FakeElement();
      button.tagName = "BUTTON";
      button.setAttribute("data-value", value);
      button.setAttribute("aria-pressed", String(value === "S"));
      button.setAttribute("data-hint", `Original ${value}`);
      group.appendChild(button);
    }
  }
}

function addPortraitChildren(document: Document): void {
  for (const id of ["ship-a-portrait", "ship-b-portrait"]) {
    const root = getFake(document, id);
    const image = new FakeElement();
    image.tagName = "IMG";
    image.className = "portrait-image";
    root.appendChild(image);
    const lockBadge = new FakeElement();
    lockBadge.tagName = "DIV";
    lockBadge.className = "portrait-lock-badge";
    lockBadge.hidden = true;
    root.appendChild(lockBadge);
    const hpBars = new FakeElement();
    hpBars.tagName = "DIV";
    hpBars.className = "portrait-hp-bars";
    for (const layer of ["shield", "armor", "hull"]) {
      const bar = new FakeElement();
      bar.tagName = "DIV";
      bar.className = `portrait-hp-bar portrait-hp-bar-${layer}`;
      const fill = new FakeElement();
      fill.tagName = "SPAN";
      fill.className = "portrait-hp-fill";
      bar.appendChild(fill);
      hpBars.appendChild(bar);
    }
    root.appendChild(hpBars);
    const effects = new FakeElement();
    effects.tagName = "DIV";
    effects.className = "portrait-effects";
    root.appendChild(effects);
  }
}

function setControlDefaults(document: Document): void {
  const defaults: Record<string, string> = {
    "ship-a-sigRes": "S",
    "ship-a-tracking": "0.32",
    "ship-a-optimal": "1000",
    "ship-a-falloff": "3000",
    "ship-b-sigRes": "S",
    "ship-b-tracking": "0.32",
    "ship-b-optimal": "5000",
    "ship-b-falloff": "5000",
    "ship-a-speed": "300",
    "ship-a-mass": "1000000",
    "ship-a-inertia": "3",
    "ship-a-range": "5000",
    "ship-a-mode": "orbit",
    "ship-a-aggressivity": "1",
    "ship-a-sig": "40",
    "ship-a-aggressivity-slider": "0.5",
    "ship-a-skills": "5",
    "ship-b-speed": "300",
    "ship-b-mass": "1000000",
    "ship-b-inertia": "3",
    "ship-b-range": "5000",
    "ship-b-aggressivity": "1",
    "ship-b-aggressivity-slider": "0.5",
    "ship-b-sig": "36",
    "ship-b-mode": "orbit",
    "ship-b-skills": "5",
    "initial-distance": "5000",
    "grid-brightness-slider": "0.2",
    "zoom-slider": "1",
    "sim-speed": "4",
  };
  for (const [id, value] of Object.entries(defaults)) {
    const el = getFake(document, id);
    el.value = value;
  }
  getFake(document, "ship-a-overload").checked = true;
  getFake(document, "ship-b-overload").checked = true;
  getFake(document, "auto-zoom").checked = true;
  getFake(document, "canvas-settings-popup").hidden = true;
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
  now?: () => number;
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
    shipImageUrl: vi.fn((_shipId) => ""),
    itemIconUrl: vi.fn(() => undefined),
  });
}

type TestControlsCradle = ControlsCradle & SimCradle;

function buildControlsCradle(document: Document, options: BuildDomControlsOptions = {}): AwilixContainer<TestControlsCradle> {
  globalThis.document = document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  const cradle = createContainer<TestControlsCradle>({ injectionMode: InjectionMode.PROXY });
  cradle.register({ uiEvents: asClass(UiEventsImpl).singleton() });
  cradle.register({ viewStream: asValue(createTestViewStream()) });
  registerSimModule(cradle);
  cradle.register({
    now: asValue(options.now ?? (() => Date.now())),
    i18n: asValue(vi.mocked<I18n>({ ...mockI18n(), ...options.i18n })),
    imageCatalog: asValue(mockImageCatalog()),
    ewarResolver: asValue(vi.mocked<EwarResolver>({
      speedMultiplier: vi.fn(() => 1),
      speedMultiplierIgnoringRange: vi.fn(() => 1), sigMultiplier: vi.fn(() => 1), sigMultiplierIgnoringRange: vi.fn(() => 1),
      disruptedTurret: vi.fn((turret) => turret),
      disruptedTurretIgnoringRange: vi.fn((turret) => turret),
      propulsionSuppressed: vi.fn(() => false),
      propulsionSuppressedIgnoringRange: vi.fn(() => false),
      appliedEffects: vi.fn(() => []),
      speedBreakdown: vi.fn(() => ({ effects: [], propulsionSuppressed: false })),
      disruptionBreakdown: vi.fn(() => ({ tracking: [], optimal: [], falloff: [] })),
      dampenedSensorSpec: vi.fn((spec) => spec),
      dampenedSensorSpecIgnoringRange: vi.fn((spec) => spec),
      dampenerBreakdown: vi.fn(() => ({ scanResolution: [], maxTargetRange: [] })),
      reach: vi.fn(() => ({ web: 0, grappler: 0, scrambler: 0, disruptor: 0, painter: 0, dampener: 0 })),
      potentials: vi.fn(() => ({ speedMultiplier: 1, sigMultiplier: 1, propulsionSuppressed: false, trackingMultiplier: 1, optimalMultiplier: 1, falloffMultiplier: 1, scanResolutionMultiplier: 1, targetingRangeMultiplier: 1 })),
    })),
    hitChance: asValue(vi.mocked<HitChance>({ ...mockHitChance(), ...options.hitChance })),
    ships: asValue(vi.mocked<Ships>({ ...mockShips(), ...options.ships })),
    settingsStore: asValue(vi.mocked<SettingsStore>({ ...mockSettingsStore(), ...options.settingsStore })),
    parser: asValue(mockParser()),
    profileTextCodec: asValue(vi.mocked<ProfileTextCodec>({ parse: vi.fn(() => undefined), serialize: vi.fn(() => ""), hasHeader: vi.fn(() => false) })),
    fittingImport: asValue(vi.mocked<FittingImport>({ ...mockFittingImport(), ...options.fittingImport })),
    gunFamilies: asValue(mockGunFamilies()),
    presetFittings: asValue(vi.mocked<PresetFittings>({ ...mockPresetFittings(), ...options.presetFittings })),
    savedFittings: asValue(vi.mocked<SavedFittings>({ ...mockSavedFittings(), ...options.savedFittings })),
    clipboard: asValue(mockClipboard()),
    timer: asValue(mockTimer()),
    chargeCatalog: asValue(vi.mocked<ChargeCatalog>({ ...mockChargeCatalog(), ...options.chargeCatalog })),
    fittingDb: asValue(mockFittingDb()),
    missileCatalog: asValue(mockMissileCatalog()),
    droneCatalog: asValue(mockDroneCatalog()),
    droneLoadoutResolver: asValue(vi.mocked<DroneLoadoutResolver>({ resolve: vi.fn(() => []) })),
    droneLoadoutValidator: asValue(vi.mocked<DroneLoadoutValidator>({ validate: vi.fn(() => ({ valid: true, totalCount: 0, totalBandwidth: 0, totalVolume: 0, violations: [] })) })),
    launcherClasses: asValue(mockLauncherClasses()),
    fittingCalculator: asValue(vi.mocked<FittingCalculator>({
      resolveTurrets: vi.fn(() => []),
      resolveLauncher: vi.fn(() => undefined),
      resolveHull: vi.fn(() => ({ fitted: { mass: 0, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0, mwdSigBloomMultiplier: 1 } })),
      resolvePropulsion: vi.fn(() => undefined),
      resolveEwar: vi.fn(() => ({ webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], })),
      resolveBoosts: vi.fn(() => ({ computers: [], scripts: [] })),
      resolveMissileBoosts: vi.fn(() => ({ computers: [], enhancers: [], scripts: [] })), resolveSensorBoosts: vi.fn(() => ({ boosters: [], amplifiers: [], boosterScripts: [], dampenerScripts: [] })), resolveSensorSpec: vi.fn(() => ({ scanResolution: 0, maxTargetingRange: 0, maxLockedTargets: 0 })), resolveDrones: vi.fn(() => []), resolveCargoCharges: vi.fn(() => []),
    })),
    profileEquality: asValue<ProfileEquality>({ equal() { return true; } }),
    itemNameLoader: asValue({ ensureLoaded: vi.fn(), isLoaded: vi.fn(() => true), load: vi.fn(() => Promise.resolve()) }),
    itemNameCatalog: asValue({ nameForId: vi.fn((id: string) => id) }),
    dpsHintRenderer: asValue({ render: vi.fn() }),
    dpsHintProvider: asValue({ render: vi.fn() }),
  });
  return cradle;
}

export function buildDomControls(options: BuildDomControlsOptions = {}) {
  const document = fakeDocument();
  const cradle = buildControlsCradle(document, options);
  setControlDefaults(document);
  addPortraitChildren(document);
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
    viewStream: cradle.cradle.viewStream as TestViewStream,
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
  readonly side: Side;
  popup: Popup = new StubPopup();
  turret = vi.fn(() => undefined);
  ammo = vi.fn(() => "Hail S");
  ammoId = vi.fn(() => "12608" as TypeId);
  applyImported = vi.fn();
  restore(settings: { fitting?: string; conditions?: StatConditions; ammo?: string; tracking?: number; sigRes?: SigResolutionClass; optimal?: number; falloff?: number }): void;
  restore(fittingText?: string, conditions?: StatConditions, ammo?: string, tracking?: number, sigRes?: SigResolutionClass, optimal?: number, falloff?: number): void;
  restore(..._args: unknown[]): void {}
  clear = vi.fn();
  currentTurretSpec = vi.fn((): TurretSpec | undefined => ({ kind: "turret" as const, tracking: 0.32, sigResolution: 40, optimal: 1000, falloff: 3000, damagePerShot: { em: 0, thermal: 0, kinetic: 12, explosive: 0 }, cycleTime: 5, turretCount: 1 }));
  currentTurretSpecs = vi.fn((): readonly TurretSpec[] => [{ kind: "turret" as const, tracking: 0.32, sigResolution: 40, optimal: 1000, falloff: 3000, damagePerShot: { em: 0, thermal: 0, kinetic: 12, explosive: 0 }, cycleTime: 5, turretCount: 1 }]);
  currentSigResClass = vi.fn((): SigResolutionClass => "S");
  capture = vi.fn(() => ({ tracking: 0.32, sigRes: "S" as const, optimal: 1000, falloff: 3000, ammo: "12608" as TypeId }));
  isAmmoPopupOpen = vi.fn();
  openAmmoPopup = vi.fn();
  closeAmmoPopup = vi.fn();
  setHullProfile = vi.fn();
  render = vi.fn();
  private currentUnit: TrackingUnit = "rad";
  setTrackingUnit = vi.fn((unit: TrackingUnit) => { this.currentUnit = unit; });
  trackingUnit = vi.fn((): TrackingUnit => this.currentUnit);

  constructor(side: Side) {
    this.side = side;
  }
}

class StubLauncherController implements LauncherController {
  readonly side: Side;
  popup: Popup = new StubPopup();
  launcher = vi.fn(() => undefined);
  ammoId = vi.fn(() => undefined);
  currentMissileSpec = vi.fn(() => undefined);
  applyImported = vi.fn();
  restore = vi.fn();
  setHullProfile = vi.fn();
  clear = vi.fn();
  capture = vi.fn(() => ({ ammo: undefined }));
  isAmmoPopupOpen = vi.fn();
  openAmmoPopup = vi.fn();
  closeAmmoPopup = vi.fn();
  render = vi.fn();

  constructor(side: Side) {
    this.side = side;
  }
}

class StubDroneController implements DroneController {
  readonly side: Side;
  popup: Popup = new StubPopup();
  drone = vi.fn(() => undefined);
  currentDroneSpecs = vi.fn(() => []);
  validation = vi.fn(() => undefined);
  applyImported = vi.fn();
  restore = vi.fn();
  clear = vi.fn();
  capture = vi.fn(() => ({ droneGroups: [] }));
  isPopupOpen = vi.fn(() => false);
  openPopup = vi.fn();
  closePopup = vi.fn();
  render = vi.fn();

  constructor(side: Side) {
    this.side = side;
  }
}

export function buildSidePanel(
  side: Side = "shipA",
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
    shipImageUrl: vi.fn((_shipId) => ""),
    itemIconUrl: vi.fn(() => undefined),
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
  const shipATurretOverrides: TurretOverrides = new StubTurretOverrides();
  const shipBTurretOverrides: TurretOverrides = new StubTurretOverrides();
  const shipATurretController: TurretController = new StubTurretController("shipA");
  const shipBTurretController: TurretController = new StubTurretController("shipB");
  const shipALauncherController: LauncherController = new StubLauncherController("shipA");
  const shipBLauncherController: LauncherController = new StubLauncherController("shipB");
  const shipADroneController: DroneController = new StubDroneController("shipA");
  const shipBDroneController: DroneController = new StubDroneController("shipB");

  const cradle = createContainer<TestControlsCradle>({ injectionMode: InjectionMode.PROXY });
  registerSimModule(cradle);
  cradle.register({
    uiEvents: asValue(events),
    els: asFunction(createControlsEls).singleton(),
    i18n: asValue(i18n),
    imageCatalog: asValue(imageCatalog),
    timer: asValue(mockTimer()),
    popupGroup: asValue(popupGroup),
    ships: asValue(ships),
    fittingImport: asValue(fittingImport),
    shipATurretController: asValue(shipATurretController),
    shipBTurretController: asValue(shipBTurretController),
    turretControllers: asValue({ shipA: shipATurretController, shipB: shipBTurretController }),
    launcherControllers: asValue({ shipA: shipALauncherController, shipB: shipBLauncherController }),
    shipADroneController: asValue(shipADroneController),
    shipBDroneController: asValue(shipBDroneController),
    droneControllers: asValue({ shipA: shipADroneController, shipB: shipBDroneController }),
    shipATurretOverrides: asValue(shipATurretOverrides),
    shipBTurretOverrides: asValue(shipBTurretOverrides),
    turretOverridesBySide: asValue({ shipA: shipATurretOverrides, shipB: shipBTurretOverrides }),
    itemNameLoader: asValue({ ensureLoaded: vi.fn(), isLoaded: vi.fn(() => true), load: vi.fn(() => Promise.resolve()) }),
    itemNameCatalog: asValue({ nameForId: vi.fn((id: string) => id) }),
    dpsHintRenderer: asValue({ render: vi.fn() }),
    dpsHintProvider: asValue({ render: vi.fn() }),
  });
  registerSelectionSessionModule(cradle);
  registerSidePanelModule(cradle);

  const panel = side === "shipA" ? cradle.cradle.shipASide : cradle.cradle.shipBSide;
  panel.setImporter({
    autoLoadFittingTextFor: vi.fn(),
    importEftFitting: vi.fn(),
    importFromText: vi.fn(() => Promise.resolve()),
    importFromClipboard: vi.fn(() => Promise.resolve()),
  });
  const host = vi.mocked<SidePanelHost>({
    persistConfigChange: vi.fn(),
    onConfigChange: vi.fn(),
    onDisplayChange: vi.fn(),
  });
  panel.setHost(host);
  const turret = side === "shipA" ? shipATurretController : shipBTurretController;
  const turretOverrides = side === "shipA" ? shipATurretOverrides : shipBTurretOverrides;
  return { document, panel, turret, turretOverrides, host };
}

function mockDroneCatalog(): DroneCatalog {
  return {
    dronesByClass: vi.fn(() => []),
    usualForClass: vi.fn(() => undefined),
    has: vi.fn(() => false),
    idForName: vi.fn(() => undefined),
  };
}
