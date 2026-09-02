import {
  USER_SETTINGS_VERSION,
  type ProfileSettings,
  type SessionSettings,
  type SettingsParser,
  type SettingsStore,
  type StartupState,
  type TrackingUnit,
  type UserSettings,
} from "../../../appstate";
import type { ChargeCatalog } from "../../../fitting";
import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { ImportedTurret } from "../../../fitting";
import { ZERO_DAMAGE, type AutopilotMode, type SigResolutionClass, type TurretSpec } from "../../../sim";
import { SessionCodecImpl } from "./sessionCodec";
import { createControlsEls, fakeDocument, FakeElement, fakeTrackingInput, mockParser } from "../testSupport";
import { UiEventsImpl, type UiEvents } from "../../events";
import type { I18n } from "../../i18n";
import type { HintRotator } from "../hints";
import type { Popup } from "../popup";
import type { PreferencesController } from "../preferences";
import type { ProfileController } from "../profile";
import type { Side } from "../side";
import type { SidePanel, SidePanelState } from "../sidePanel";
import type { TurretController } from "../turret";
import type { TurretOverrides } from "../turret";
import type { TrackingInput } from "../trackingInput";
import type { EwarController } from "../ewar";
import type { BoosterController } from "../booster";
import type { MissileBoosterController } from "../missileBooster";
import type { LauncherController } from "../launcher";
import type { DroneController } from "../drone";
import type { WeaponSystemSwitch } from "../sidePanel";
import type { FittingImport, ImportedFitting } from "../../../fitting";

function fakeEls() {
  globalThis.document = fakeDocument() as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  return createControlsEls();
}

function sessionFromWire(wire: UserSettings): SessionSettings {
  return mockParser().fromWire(wire);
}

function panelStateFrom(settings: UserSettings, side: "shipA" | "shipB"): SidePanelState {
  const mode: AutopilotMode = side === "shipA" ? settings.shipAMode : settings.shipBMode;
  const fittedHull = side === "shipA" ? settings.shipAFittedHull : settings.shipBFittedHull;
  return {
    speed: side === "shipA" ? settings.shipASpeed : settings.shipBSpeed,
    mass: side === "shipA" ? settings.shipAMass : settings.shipBMass,
    inertia: side === "shipA" ? settings.shipAInertia : settings.shipBInertia,
    mode,
    range: side === "shipA" ? settings.shipARange : settings.shipBRange,
    aggressivity: (side === "shipA" ? settings.shipAAggressivity : settings.shipBAggressivity) ?? 1,
    skillLevel: side === "shipA" ? settings.shipASkillLevel : settings.shipBSkillLevel,
    overload: side === "shipA" ? settings.shipAOverload ?? true : settings.shipBOverload ?? true,
    weaponOverload: side === "shipA" ? settings.shipAWeaponOverload ?? false : settings.shipBWeaponOverload ?? false,
    hull: side === "shipA" ? settings.shipAHullId : settings.shipBHullId,
    propulsion: side === "shipA" ? settings.shipAPropulsion : settings.shipBPropulsion,
    fitting: side === "shipA" ? settings.shipAFitting : settings.shipBFitting,
    overrides: side === "shipA" ? (settings.shipAOverrides ?? {}) : (settings.shipBOverrides ?? {}),
    fittedHull,
    sig: side === "shipA" ? settings.shipASig : settings.shipBSig,
  };
}

function makeSettings(): UserSettings {
  return {
    version: USER_SETTINGS_VERSION,
    shipATrackingUnit: "score",
    shipBTrackingUnit: "score",
    weaponRangeVisibility: "both",
    shipATracking: 0.5,
    shipASigRes: "M",
    shipAOptimal: 2000,
    shipAFalloff: 4000,
    shipBTracking: 0.6,
    shipBSigRes: "S",
    shipBOptimal: 8000,
    shipBFalloff: 5000,
    shipASpeed: 450,
    shipAMode: "keepAtRange",
    shipARange: 8000,
    shipAAggressivity: 1.5,
    shipBAggressivity: 1,
    gridBrightness: 0.75,
    autoZoom: true,
    zoomFactor: 1,
    shipAMass: 1_100_000,
    shipAInertia: 2.5,
    shipASkillLevel: 4,
    shipAOverload: false,
    shipAHullId: undefined,
    shipAPropulsion: undefined,
    shipAFitting: undefined,
    shipAOverrides: {},
    shipAFittedHull: undefined,
    initialDistance: 7000,
    shipBSpeed: 260,
    shipBMode: "orbit",
    shipBRange: 7000,
    shipBMass: 1_200_000,
    shipBInertia: 2.8,
    shipBSkillLevel: 3,
    shipBOverload: true,
    shipBSig: 50,
    shipBHullId: undefined,
    shipBPropulsion: undefined,
    shipBFitting: undefined,
    shipBOverrides: {},
    shipBFittedHull: undefined,
    shipAAmmo: "12608" as TypeId,
    shipBAmmo: "12608" as TypeId,
    simSpeed: 2,
    language: "zh",
  };
}

function sidePanelStateWithDefaults(state: Partial<SidePanelState>): SidePanelState {
  return {
    speed: 0,
    mass: 0,
    inertia: 0,
    mode: "orbit",
    range: 0,
    aggressivity: 1,
    skillLevel: 5,
    overload: true,
    weaponOverload: false,
    hull: undefined,
    propulsion: undefined,
    fitting: undefined,
    overrides: {},
    fittedHull: undefined,
    ...state,
  };
}

function mockSidePanel(side: "shipA" | "shipB", captured: Partial<SidePanelState>): SidePanel {
  const full = sidePanelStateWithDefaults(captured);
  return {
    capture: vi.fn(() => full),
    restore: vi.fn(),
    skillConditions: vi.fn(() => ({ skillLevel: 5, overloaded: true })),
    sections: {
      stats: { updateAlignTime: vi.fn() },
      skill: { setSkillLevel: vi.fn(), setOverloadActive: vi.fn(), setOverloadDisabled: vi.fn() },
      propulsion: { renderPropulsionOptions: vi.fn() },
      hull: { refreshHullInputs: vi.fn(), updateHullHint: vi.fn() },
    },
  } as unknown as SidePanel;
}

function mockEwarController(): EwarController {
  return {
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn(),
    capture: vi.fn(),
    popup: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  } as unknown as EwarController;
}

function mockBoosterController(): BoosterController {
  return {
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn(),
    capture: vi.fn(),
    popup: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  } as unknown as BoosterController;
}

function mockMissileBoosterController(): MissileBoosterController {
  return {
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn(),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  } as unknown as MissileBoosterController;
}

function mockFittingImport(): FittingImport {
  return { importFitting: vi.fn(), moduleNameFor: vi.fn() } as unknown as FittingImport;
}

function mockTurretOverrides(overrides: Record<string, unknown> = {}): TurretOverrides {
  const store = { overrides };
  return {
    get: vi.fn(() => ({ ...store.overrides })),
    set: vi.fn((patch) => { store.overrides = { ...store.overrides, ...patch }; }),
    clear: vi.fn(() => { store.overrides = {}; }),
  } as unknown as TurretOverrides;
}

function mockPopup(): Popup {
  return { isOpen: vi.fn(), open: vi.fn(), close: vi.fn(), focusTrigger: vi.fn(), contains: vi.fn() };
}

class FakeTurretController implements TurretController {
  readonly side: Side;
  readonly popup: Popup;
  private readonly trackingInput: TrackingInput;
  turret = vi.fn(() => undefined as ImportedTurret | undefined);
  ammo = vi.fn(() => "Hail S");
  ammoId = vi.fn(() => "12608" as TypeId);
  applyImported = vi.fn();
  restore = vi.fn((..._args: unknown[]): void => {});
  clear = vi.fn();
  currentTurretSpec = vi.fn((): TurretSpec | undefined => ({
    kind: "turret",
    tracking: this.trackingInput.rad,
    sigResolution: 40,
    optimal: 1000,
    falloff: 3000,
    damagePerShot: ZERO_DAMAGE,
    cycleTime: 1,
    turretCount: 1,
  }));
  currentTurretSpecs = vi.fn((): readonly TurretSpec[] => []);
  currentSigResClass = vi.fn((): SigResolutionClass => "S");
  capture = vi.fn(() => ({ tracking: this.trackingInput.rad, sigRes: "S" as const, optimal: 1000, falloff: 3000, ammo: "12608" as TypeId }));
  isAmmoPopupOpen = vi.fn();
  openAmmoPopup = vi.fn();
  closeAmmoPopup = vi.fn();
  setTrackingUnit(unit: TrackingUnit): void { this.trackingInput.setUnit(unit, 40); }
  trackingUnit(): TrackingUnit { return this.trackingInput.unit; }
  setHullProfile = vi.fn();
  render = vi.fn();

  constructor(side: Side, trackingInput: TrackingInput = fakeTrackingInput()) {
    this.side = side;
    this.popup = mockPopup();
    this.trackingInput = trackingInput;
  }
}

function mockTurretControllers(overrides: { shipA?: Partial<FakeTurretController>; shipB?: Partial<FakeTurretController> } = {}): Record<Side, FakeTurretController> {
  const shipA = new FakeTurretController("shipA");
  const shipB = new FakeTurretController("shipB");
  Object.assign(shipA, overrides.shipA ?? {});
  Object.assign(shipB, overrides.shipB ?? {});
  return { shipA, shipB };
}

function mockTurretOverridesBySide(shipAOverrides: TurretOverrides = mockTurretOverrides(), shipBOverrides: TurretOverrides = mockTurretOverrides()): Record<Side, TurretOverrides> {
  return { shipA: shipAOverrides, shipB: shipBOverrides };
}

function mockLauncherControllers(): Record<Side, LauncherController> {
  const make = (): LauncherController => ({
    side: "shipA",
    popup: mockPopup(),
    launcher: vi.fn(() => undefined),
    ammoId: vi.fn(() => undefined),
    currentMissileSpec: vi.fn(() => undefined),
    applyImported: vi.fn(),
    restore: vi.fn(),
    setHullProfile: vi.fn(),
    clear: vi.fn(),
    capture: vi.fn(() => ({ ammo: undefined })),
    isAmmoPopupOpen: vi.fn(() => false),
    openAmmoPopup: vi.fn(),
    closeAmmoPopup: vi.fn(),
    render: vi.fn(),
  });
  return { shipA: make(), shipB: make() };
}

function mockDroneControllers(): Record<Side, DroneController> {
  const make = (): DroneController => ({
    side: "shipA",
    popup: mockPopup(),
    drone: vi.fn(() => undefined),
    currentDroneSpecs: vi.fn(() => []),
    validation: vi.fn(() => undefined),
    applyImported: vi.fn(),
    restore: vi.fn(),
    clear: vi.fn(),
    capture: vi.fn(() => ({ droneGroups: [] })),
    isPopupOpen: vi.fn(() => false),
    openPopup: vi.fn(),
    closePopup: vi.fn(),
    render: vi.fn(),
  });
  return { shipA: make(), shipB: make() };
}

function mockWeaponSystemSwitches(): Record<Side, WeaponSystemSwitch> {
  const make = (): WeaponSystemSwitch => ({
    side: "shipA",
    activeKind: vi.fn(() => "turret" as const),
    setActiveKind: vi.fn(),
    autoToggle: vi.fn(),
    refresh: vi.fn(),
    clear: vi.fn(),
  });
  return { shipA: make(), shipB: make() };
}

function buildCodec(options: {
  els?: ReturnType<typeof createControlsEls>;
  shipA?: SidePanel;
  shipB?: SidePanel;
  turretControllers?: Record<Side, FakeTurretController>;
  turretOverridesBySide?: Record<Side, TurretOverrides>;
  launcherControllers?: Record<Side, LauncherController>;
  droneControllers?: Record<Side, DroneController>;
  weaponSystemSwitches?: Record<Side, WeaponSystemSwitch>;
  preferences?: Partial<PreferencesController>;
  profileController?: Partial<ProfileController>;
  settingsStore?: Partial<SettingsStore>;
  i18n?: Partial<I18n>;
  chargeCatalog?: Partial<ChargeCatalog>;
  hintRotator?: Partial<HintRotator>;
  ewarController?: Partial<EwarController>;
  boosterController?: Partial<BoosterController>;
  missileBoosterController?: Partial<MissileBoosterController>;
  fittingImport?: Partial<FittingImport>;
  parser?: Partial<SettingsParser>;
  events?: UiEvents;
} = {}) {
  const els = options.els ?? fakeEls();
  const shipA = options.shipA ?? mockSidePanel("shipA", sidePanelStateWithDefaults({}));
  const shipB = options.shipB ?? mockSidePanel("shipB", sidePanelStateWithDefaults({ sig: 1 }));
  const turretControllers = options.turretControllers ?? mockTurretControllers();
  const turretOverridesBySide = options.turretOverridesBySide ?? mockTurretOverridesBySide();
  const preferences = {
    capture: vi.fn(() => ({ language: "en" as const, shipATrackingUnit: "rad" as const, shipBTrackingUnit: "rad" as const, weaponRangeVisibility: "both" as const, simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 })),
    restore: vi.fn(),
    applyPreferences: vi.fn(),
    savePreferences: vi.fn(),
    setTrackingUnit: vi.fn(),
    trackingUnit: vi.fn(() => "rad" as const),
    ...options.preferences,
  } as unknown as PreferencesController;
  const profileController = {
    markLoaded: vi.fn(),
    showStatus: vi.fn(),
    restoreFromStartup: vi.fn(() => false),
    ...options.profileController,
  } as unknown as ProfileController;
  const settingsStore = {
    loadPreferences: vi.fn(),
    savePreferences: vi.fn(),
    clearSelectedProfile: vi.fn(),
    loadProfile: vi.fn(),
    ...options.settingsStore,
  } as unknown as SettingsStore;
  const i18n = { translateDocument: vi.fn(), ...options.i18n } as unknown as I18n;
  const chargeCatalog = { usualForChargeSize: vi.fn(() => "Hail S"), ...options.chargeCatalog } as unknown as ChargeCatalog;
  const hintRotator = { refresh: vi.fn(), ...options.hintRotator } as unknown as HintRotator;
  const ewarController = { ...mockEwarController(), ...options.ewarController } as unknown as EwarController;
  const boosterController = { ...mockBoosterController(), ...options.boosterController } as unknown as BoosterController;
  const missileBoosterController = { ...mockMissileBoosterController(), ...options.missileBoosterController } as unknown as MissileBoosterController;
  const fittingImport = { ...mockFittingImport(), ...options.fittingImport } as unknown as FittingImport;
  const parser = { ...mockParser(), ...options.parser } as unknown as SettingsParser;
  const events = options.events ?? new UiEventsImpl();
  const launcherControllers = options.launcherControllers ?? mockLauncherControllers();
  const weaponSystemSwitches = options.weaponSystemSwitches ?? mockWeaponSystemSwitches();
  const codec = new SessionCodecImpl({
    els,
    shipASide: shipA,
    shipBSide: shipB,
    turretControllers,
    turretOverridesBySide,
    launcherControllers,
    droneControllers: options.droneControllers ?? mockDroneControllers(),
    weaponSystemSwitches,
    preferences,
    profileController,
    i18n,
    chargeCatalog,
    hintRotator,
    settingsStore,
    events,
    ewarController,
    boosterController,
    missileBoosterController,
    fittingImport,
    parser,
  });
  return { codec, els, shipA, shipB, turretControllers, turretOverridesBySide, launcherControllers, droneControllers: options.droneControllers ?? mockDroneControllers(), weaponSystemSwitches, preferences, profileController, settingsStore, i18n, chargeCatalog, hintRotator, events, ewarController, boosterController, missileBoosterController, fittingImport, parser };
}

function makeProfile(): ProfileSettings {
  return {
    version: USER_SETTINGS_VERSION,
    shipATracking: 0.32,
    shipASigRes: "S",
    shipAOptimal: 1000,
    shipAFalloff: 3000,
    shipBTracking: 0.25,
    shipBSigRes: "M",
    shipBOptimal: 2000,
    shipBFalloff: 4000,
    shipASpeed: 300,
    shipAMode: "orbit",
    shipARange: 5000,
    shipAAggressivity: 1,
    shipBAggressivity: 1,
    shipAMass: 1_000_000,
    shipAInertia: 3,
    shipASkillLevel: 5,
    shipAOverload: true,
    initialDistance: 5000,
    shipBSpeed: 300,
    shipBMode: "orbit",
    shipBRange: 5000,
    shipBMass: 1_000_000,
    shipBInertia: 3,
    shipBSkillLevel: 5,
    shipBOverload: true,
    shipASig: 40,
    shipBSig: 36,
    shipAAmmo: "12608" as TypeId,
    shipBAmmo: "12608" as TypeId,
  };
}

describe("SessionCodec", () => {
  test("capture returns a complete UserSettings from current controls", () => {
    const shipA = mockSidePanel("shipA", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: { shipAMass: 1_400_000 }, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 36 });
    const { codec, turretControllers, turretOverridesBySide, els } = buildCodec({ shipA, shipB });
    const shipATurret = turretControllers.shipA;
    const shipBTurret = turretControllers.shipB;
    els.initialDistance.value = "5000";

    const settings = codec.capture();

    expect(settings.version).toBe(USER_SETTINGS_VERSION);
    expect(settings.shipATrackingUnit).toBe("rad");
    expect(settings.shipATracking).toBe(0.32);
    expect(settings.shipASigRes).toBe("S");
    expect(settings.shipAOptimal).toBe(1000);
    expect(settings.shipAFalloff).toBe(3000);
    expect(settings.shipBTracking).toBe(0.32);
    expect(settings.shipBSigRes).toBe("S");
    expect(settings.shipBOptimal).toBe(1000);
    expect(settings.shipBFalloff).toBe(3000);
    expect(settings.shipASpeed).toBe(300);
    expect(settings.shipAMass).toBe(1_000_000);
    expect(settings.shipAInertia).toBe(3);
    expect(settings.shipASkillLevel).toBe(5);
    expect(settings.shipAOverload).toBe(true);
    expect(settings.shipBSpeed).toBe(300);
    expect(settings.shipBMass).toBe(1_000_000);
    expect(settings.shipBInertia).toBe(3);
    expect(settings.shipBSig).toBe(36);
    expect(settings.initialDistance).toBe(5000);
    expect(settings.shipAAggressivity).toBe(1);
    expect(settings.shipBAggressivity).toBe(1);
    expect(settings.simSpeed).toBe(4);
    expect(settings.language).toBe("en");
    expect(settings.shipAAmmo).toBe("12608" as TypeId);
    expect(settings.shipBAmmo).toBe("12608" as TypeId);
    expect(settings.shipAOverrides).toEqual({ shipAMass: 1_400_000 });
    expect(shipATurret.capture).toHaveBeenCalled();
    expect(shipBTurret.capture).toHaveBeenCalled();
    expect(turretOverridesBySide.shipA.set).not.toHaveBeenCalled();
  });

  test("restoreStartup round-trips stored settings", () => {
    const settings: UserSettings = {
      version: USER_SETTINGS_VERSION,
      shipATrackingUnit: "score",
      shipBTrackingUnit: "score",
      weaponRangeVisibility: "both",
      shipATracking: 0.5,
      shipASigRes: "M",
      shipAOptimal: 2000,
      shipAFalloff: 4000,
      shipBTracking: 0.6,
      shipBSigRes: "S",
      shipBOptimal: 8000,
      shipBFalloff: 5000,
      shipASpeed: 450,
      shipAMode: "keepAtRange",
      shipARange: 8000,
      shipAAggressivity: 1.5,
      shipBAggressivity: 1,
      gridBrightness: 0.75,
      autoZoom: true,
      zoomFactor: 1,
      shipAMass: 1_100_000,
      shipAInertia: 2.5,
      shipASkillLevel: 4,
      shipAOverload: false,
      shipAHullId: undefined,
      shipAPropulsion: undefined,
      shipAFitting: undefined,
      shipAOverrides: {},
      shipAFittedHull: undefined,
      initialDistance: 7000,
      shipBSpeed: 260,
      shipBMode: "orbit",
      shipBRange: 7000,
      shipBMass: 1_200_000,
      shipBInertia: 2.8,
      shipBSkillLevel: 3,
      shipBOverload: true,
      shipBSig: 50,
      shipBHullId: undefined,
      shipBPropulsion: undefined,
      shipBFitting: undefined,
      shipBOverrides: {},
      shipBFittedHull: undefined,
      shipAAmmo: "12608" as TypeId,
      shipBAmmo: "12608" as TypeId,
      simSpeed: 2,
      language: "zh",
    };
    const shipA = mockSidePanel("shipA", panelStateFrom(settings, "shipA"));
    const shipB = mockSidePanel("shipB", panelStateFrom(settings, "shipB"));
    const profileController = { restoreFromStartup: vi.fn(() => false), markLoaded: vi.fn(), refresh: vi.fn() } as unknown as ProfileController;
    const settingsStore = { savePreferences: vi.fn(), loadPreferences: vi.fn() } as unknown as SettingsStore;
    const i18n = { translateDocument: vi.fn() } as unknown as I18n;
    const hintRotator = { refresh: vi.fn() } as unknown as HintRotator;
    const events = new UiEventsImpl();
    const onSessionRestored = vi.fn();
    events.onSessionRestored(onSessionRestored);
    const session = sessionFromWire(settings);
    const { codec, turretControllers, turretOverridesBySide, preferences } = buildCodec({ shipA, shipB, profileController, settingsStore, i18n, hintRotator, events });

    codec.restoreStartup({ settings: session, selectedProfileName: null });

    expect(shipA.restore).toHaveBeenCalledWith(panelStateFrom(settings, "shipA"));
    expect(shipB.restore).toHaveBeenCalledWith(panelStateFrom(settings, "shipB"));
    expect(turretControllers.shipA.restore).toHaveBeenCalledWith({
      fitting: settings.shipAFitting,
      conditions: { skillLevel: 5, overloaded: true },
      ammo: settings.shipAAmmo,
      tracking: settings.shipATracking,
      sigRes: settings.shipASigRes,
      optimal: settings.shipAOptimal,
      falloff: settings.shipAFalloff,
    });
    expect(turretControllers.shipB.restore).toHaveBeenCalledWith({
      fitting: settings.shipBFitting,
      conditions: { skillLevel: 5, overloaded: true },
      ammo: settings.shipBAmmo,
      tracking: settings.shipBTracking,
      sigRes: settings.shipBSigRes,
      optimal: settings.shipBOptimal,
      falloff: settings.shipBFalloff,
    });
    expect(preferences.restore).toHaveBeenCalledWith({ language: "zh", shipATrackingUnit: "score", shipBTrackingUnit: "score", weaponRangeVisibility: "both", droneRangeVisibility: "none", droneControlRangeVisibility: "none", simSpeed: 2, gridBrightness: 0.75, autoZoom: true, zoomFactor: 1 });
    expect(preferences.savePreferences).toHaveBeenCalled();
    expect(i18n.translateDocument).toHaveBeenCalled();
    expect(hintRotator.refresh).toHaveBeenCalled();
    expect(onSessionRestored).toHaveBeenCalled();
    expect(turretOverridesBySide.shipA.set).toHaveBeenCalledWith({});
    expect(turretOverridesBySide.shipB.set).toHaveBeenCalledWith({});
    expect(profileController.markLoaded).toHaveBeenCalledWith("");
  });

  test("restore applies launcher ammo and weapon kind", () => {
    const settings: UserSettings = {
      ...makeSettings(),
      shipAWeaponKind: "missile",
      shipBWeaponKind: "turret",
      shipAMissileAmmo: toTypeId("202"),
    };
    const shipA = mockSidePanel("shipA", panelStateFrom(settings, "shipA"));
    const shipB = mockSidePanel("shipB", panelStateFrom(settings, "shipB"));
    const profileController = { restoreFromStartup: vi.fn(() => false), markLoaded: vi.fn(), refresh: vi.fn() } as unknown as ProfileController;
    const settingsStore = { savePreferences: vi.fn(), loadPreferences: vi.fn() } as unknown as SettingsStore;
    const i18n = { translateDocument: vi.fn() } as unknown as I18n;
    const hintRotator = { refresh: vi.fn() } as unknown as HintRotator;
    const events = new UiEventsImpl();
    const session = sessionFromWire(settings);
    const { codec, launcherControllers, weaponSystemSwitches } = buildCodec({ shipA, shipB, profileController, settingsStore, i18n, hintRotator, events });
    codec.restoreStartup({ settings: session, selectedProfileName: null });
    expect(launcherControllers.shipA.restore).toHaveBeenCalledWith(settings.shipAFitting, { skillLevel: 5, overloaded: true }, toTypeId("202"));
    expect(launcherControllers.shipB.restore).toHaveBeenCalledWith(settings.shipBFitting, { skillLevel: 5, overloaded: true }, undefined);
    expect(weaponSystemSwitches.shipA.setActiveKind).toHaveBeenCalledWith("missile");
    expect(weaponSystemSwitches.shipB.setActiveKind).toHaveBeenCalledWith("turret");
    expect(weaponSystemSwitches.shipA.autoToggle).toHaveBeenCalledWith(false, false, false);
    expect(weaponSystemSwitches.shipB.autoToggle).toHaveBeenCalledWith(false, false, false);
  });

  test("restore defaults absent weapon kind to turret", () => {
    const settings = makeSettings();
    const shipA = mockSidePanel("shipA", panelStateFrom(settings, "shipA"));
    const shipB = mockSidePanel("shipB", panelStateFrom(settings, "shipB"));
    const profileController = { restoreFromStartup: vi.fn(() => false), markLoaded: vi.fn(), refresh: vi.fn() } as unknown as ProfileController;
    const settingsStore = { savePreferences: vi.fn(), loadPreferences: vi.fn() } as unknown as SettingsStore;
    const i18n = { translateDocument: vi.fn() } as unknown as I18n;
    const hintRotator = { refresh: vi.fn() } as unknown as HintRotator;
    const events = new UiEventsImpl();
    const session = sessionFromWire(settings);
    const { codec, weaponSystemSwitches } = buildCodec({ shipA, shipB, profileController, settingsStore, i18n, hintRotator, events });
    codec.restoreStartup({ settings: session, selectedProfileName: null });
    expect(weaponSystemSwitches.shipA.setActiveKind).toHaveBeenCalledWith("turret");
    expect(weaponSystemSwitches.shipB.setActiveKind).toHaveBeenCalledWith("turret");
  });

  test("capture and restore include ewar activations", () => {
    const ewarController = mockEwarController();
    const fittingImport = mockFittingImport();
    const shipA = mockSidePanel("shipA", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: "[Rifter, Brawler]\nStasis Webifier I", overrides: {}, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 36 });
    vi.mocked(ewarController.capture).mockReturnValue({
      webs: [{ active: true, overloaded: false }],
      grapplers: [],
      disruptors: [{ active: true, overloaded: false, script: "none" }],
    });
    vi.mocked(fittingImport.importFitting).mockReturnValue({
      profile: {} as unknown,
      fittingName: "Brawler",
      ewar: { webs: [{ moduleName: "Stasis Webifier I", maxRange: 10000, speedFactor: 0.5, overloadRangeBonusPercent: 15 }], grapplers: [], disruptors: [], scramblers: [], scripts: [] },
      boosts: { computers: [], scripts: [] },
      weapon: undefined,
      defense: undefined,
      modules: [],
    } as unknown as ImportedFitting);
    const events = new UiEventsImpl();
    const onSessionRestored = vi.fn();
    events.onSessionRestored(onSessionRestored);
    const { codec } = buildCodec({ shipA, shipB, ewarController, fittingImport, events });

    const settings = codec.capture();
    expect(settings.shipAEwarActivation).toEqual({
      webs: [{ active: true, overloaded: false }],
      grapplers: [],
      disruptors: [{ active: true, overloaded: false, script: "none" }],
    });

    codec.restore(sessionFromWire(settings));
    expect(ewarController.restore).toHaveBeenCalledWith("shipA", expect.any(Object), settings.shipAEwarActivation);
    expect(ewarController.restore).toHaveBeenCalledWith("shipB", undefined, settings.shipBEwarActivation);
    expect(onSessionRestored).toHaveBeenCalled();
  });

  test("capture and restore include missile booster activations", () => {
    const missileBoosterController = mockMissileBoosterController();
    const fittingImport = mockFittingImport();
    const shipA = mockSidePanel("shipA", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: "[Rifter, Brawler]\nMissile Guidance Computer I", overrides: {}, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 36 });
    vi.mocked(missileBoosterController.capture).mockReturnValue([{ active: true, overloaded: false, script: "none" }]);
    vi.mocked(fittingImport.importFitting).mockReturnValue({
      profile: {} as unknown,
      fittingName: "Brawler",
      ewar: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], scripts: [] },
      boosts: { computers: [], scripts: [] },
      missileBoosts: { computers: [{ moduleName: "Missile Guidance Computer I", moduleId: toTypeId("0"), explosionRadiusBonusPercent: -15, explosionVelocityBonusPercent: 15, missileVelocityBonusPercent: 15, flightTimeBonusPercent: 15, overloadStrengthBonusPercent: 15 }], enhancers: [], scripts: [] },
      weapon: undefined,
      defense: undefined,
      modules: [],
    } as unknown as ImportedFitting);
    const events = new UiEventsImpl();
    const onSessionRestored = vi.fn();
    events.onSessionRestored(onSessionRestored);
    const { codec } = buildCodec({ shipA, shipB, missileBoosterController, fittingImport, events });

    const settings = codec.capture();
    expect(settings.shipAMissileBoosterActivation).toEqual([{ active: true, overloaded: false, script: "none" }]);

    codec.restore(sessionFromWire(settings));
    expect(missileBoosterController.restore).toHaveBeenCalledWith("shipA", expect.any(Object), settings.shipAMissileBoosterActivation);
    expect(missileBoosterController.restore).toHaveBeenCalledWith("shipB", undefined, settings.shipBMissileBoosterActivation);
    expect(onSessionRestored).toHaveBeenCalled();
  });

  test("corrupt startup data falls back to defaults", () => {
    const shipA = mockSidePanel("shipA", { speed: 0, mass: 0, inertia: 0, mode: "orbit", range: 0, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 0, mass: 0, inertia: 0, mode: "orbit", range: 0, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 1 });
    const settingsStore = { loadPreferences: vi.fn(() => ({ language: "en" as const, shipATrackingUnit: "rad" as const, shipBTrackingUnit: "rad" as const, weaponRangeVisibility: "both" as const, simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 })), savePreferences: vi.fn() } as unknown as SettingsStore;
    const events = new UiEventsImpl();
    const onStartupDefaultsApplied = vi.fn();
    events.onStartupDefaultsApplied(onStartupDefaultsApplied);
    const { codec, preferences, profileController } = buildCodec({ shipA, shipB, settingsStore, events });

    codec.restoreStartup({ settings: null, selectedProfileName: null });

    expect(profileController.restoreFromStartup).toHaveBeenCalled();
    expect(settingsStore.loadPreferences).toHaveBeenCalled();
    expect(preferences.applyPreferences).toHaveBeenCalledWith({ language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", weaponRangeVisibility: "both", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 });
    expect(shipA.sections.skill.setSkillLevel).toHaveBeenCalledWith(5);
    expect(shipA.sections.skill.setOverloadActive).toHaveBeenCalledWith(true);
    expect(shipA.sections.skill.setOverloadDisabled).toHaveBeenCalled();
    expect(shipA.sections.propulsion.renderPropulsionOptions).toHaveBeenCalled();
    expect(shipB.sections.skill.setSkillLevel).toHaveBeenCalledWith(5);
    expect(shipB.sections.skill.setOverloadActive).toHaveBeenCalledWith(true);
    expect(shipB.sections.skill.setOverloadDisabled).toHaveBeenCalled();
    expect(shipB.sections.propulsion.renderPropulsionOptions).toHaveBeenCalled();
    expect(onStartupDefaultsApplied).toHaveBeenCalled();
    expect(profileController.markLoaded).toHaveBeenCalledWith("");
  });

  test("resetToDefaults clears the selected profile and ship state back to pristine", () => {
    const pristineShipA = { speed: 0, mass: 0, inertia: 0, mode: "orbit" as const, range: 0, aggressivity: 1, skillLevel: 5 as const, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 1 };
    const pristineShipB = { speed: 0, mass: 0, inertia: 0, mode: "orbit" as const, range: 0, aggressivity: 1, skillLevel: 5 as const, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 1 };
    const shipA = mockSidePanel("shipA", pristineShipA);
    const shipB = mockSidePanel("shipB", pristineShipB);
    const clearSelectedProfile = vi.fn();
    const settingsStore = { loadPreferences: vi.fn(() => ({ language: "en" as const, shipATrackingUnit: "rad" as const, shipBTrackingUnit: "rad" as const, weaponRangeVisibility: "both" as const, simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 })), savePreferences: vi.fn(), clearSelectedProfile } as unknown as SettingsStore;
    const events = new UiEventsImpl();
    const onStartupDefaultsApplied = vi.fn();
    events.onStartupDefaultsApplied(onStartupDefaultsApplied);
    const { codec, turretControllers, turretOverridesBySide, preferences, profileController } = buildCodec({ shipA, shipB, settingsStore, events });

    codec.resetToDefaults();

    expect(clearSelectedProfile).toHaveBeenCalled();
    expect(shipA.restore).toHaveBeenCalledWith(pristineShipA);
    expect(shipB.restore).toHaveBeenCalledWith(pristineShipB);
    expect(turretControllers.shipA.restore).toHaveBeenCalledWith({
      fitting: undefined,
      conditions: { skillLevel: 5, overloaded: true },
      ammo: "12608",
      tracking: 0.32,
      sigRes: "S",
      optimal: 1000,
      falloff: 3000,
    });
    expect(turretControllers.shipB.restore).toHaveBeenCalledWith({
      fitting: undefined,
      conditions: { skillLevel: 5, overloaded: true },
      ammo: "12608",
      tracking: 0.32,
      sigRes: "S",
      optimal: 1000,
      falloff: 3000,
    });
    expect(turretOverridesBySide.shipA.set).toHaveBeenCalledWith({});
    expect(turretOverridesBySide.shipB.set).toHaveBeenCalledWith({});
    expect(preferences.applyPreferences).toHaveBeenCalledWith({ language: "en", shipATrackingUnit: "rad", shipBTrackingUnit: "rad", weaponRangeVisibility: "both", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 });
    expect(profileController.markLoaded).toHaveBeenCalledWith("");
    expect(onStartupDefaultsApplied).toHaveBeenCalled();
  });

  test("profileLoaded event restores the named profile and emits sessionRestored", () => {
    const profile = makeProfile();
    const loadProfile = vi.fn(() => profile);
    const shipA = mockSidePanel("shipA", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 36 });
    const events = new UiEventsImpl();
    const onSessionRestored = vi.fn();
    events.onSessionRestored(onSessionRestored);
    const els = fakeEls();
    els.initialDistance.value = "5000";
    const { codec, turretControllers, profileController } = buildCodec({ shipA, shipB, settingsStore: { loadProfile }, events, els });

    events.emitProfileLoaded("brawler");

    expect(loadProfile).toHaveBeenCalledWith("brawler");
    expect(profileController.markLoaded).toHaveBeenCalledWith("brawler");
    expect(onSessionRestored).toHaveBeenCalled();
    expect(turretControllers.shipA.restore).toHaveBeenCalledWith({
      fitting: profile.shipAFitting,
      conditions: { skillLevel: 5, overloaded: true },
      ammo: "12608",
      tracking: profile.shipATracking,
      sigRes: profile.shipASigRes,
      optimal: profile.shipAOptimal,
      falloff: profile.shipAFalloff,
    });
    expect(turretControllers.shipB.restore).toHaveBeenCalledWith({
      fitting: profile.shipBFitting,
      conditions: { skillLevel: 5, overloaded: true },
      ammo: "12608",
      tracking: profile.shipBTracking,
      sigRes: profile.shipBSigRes,
      optimal: profile.shipBOptimal,
      falloff: profile.shipBFalloff,
    });
  });

  test("profileTextLoaded event restores the shared profile and emits sessionRestored", () => {
    const profile = makeProfile();
    const shipA = mockSidePanel("shipA", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 36 });
    const events = new UiEventsImpl();
    const onSessionRestored = vi.fn();
    events.onSessionRestored(onSessionRestored);
    const { codec, turretControllers, profileController } = buildCodec({ shipA, shipB, events });

    events.emitProfileTextLoaded(profile);

    expect(profileController.showStatus).toHaveBeenCalledWith("status.profileImported");
    expect(onSessionRestored).toHaveBeenCalled();
    expect(profileController.markLoaded).toHaveBeenCalledWith("");
    expect(turretControllers.shipA.restore).toHaveBeenCalledWith({
      fitting: profile.shipAFitting,
      conditions: { skillLevel: 5, overloaded: true },
      ammo: "12608",
      tracking: profile.shipATracking,
      sigRes: profile.shipASigRes,
      optimal: profile.shipAOptimal,
      falloff: profile.shipAFalloff,
    });
    expect(turretControllers.shipB.restore).toHaveBeenCalledWith({
      fitting: profile.shipBFitting,
      conditions: { skillLevel: 5, overloaded: true },
      ammo: "12608",
      tracking: profile.shipBTracking,
      sigRes: profile.shipBSigRes,
      optimal: profile.shipBOptimal,
      falloff: profile.shipBFalloff,
    });
  });

  test("newProfile event resets to defaults and emits sessionReset", () => {
    const shipA = mockSidePanel("shipA", { speed: 0, mass: 0, inertia: 0, mode: "orbit", range: 0, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 0, mass: 0, inertia: 0, mode: "orbit", range: 0, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 1 });
    const clearSelectedProfile = vi.fn();
    const loadPreferences = vi.fn(() => ({ language: "en" as const, shipATrackingUnit: "rad" as const, shipBTrackingUnit: "rad" as const, weaponRangeVisibility: "both" as const, simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 }));
    const settingsStore = { loadPreferences, clearSelectedProfile } as unknown as SettingsStore;
    const events = new UiEventsImpl();
    const onSessionReset = vi.fn();
    const onStartupDefaultsApplied = vi.fn();
    events.onSessionReset(onSessionReset);
    events.onStartupDefaultsApplied(onStartupDefaultsApplied);
    const { codec, profileController } = buildCodec({ shipA, shipB, settingsStore, events });

    events.emitNewProfile();

    expect(clearSelectedProfile).toHaveBeenCalled();
    expect(profileController.showStatus).toHaveBeenCalledWith("status.newProfile");
    expect(onSessionReset).toHaveBeenCalled();
    expect(onStartupDefaultsApplied).toHaveBeenCalled();
  });

  test("profileDeleted event resets to defaults and emits sessionReset", () => {
    const shipA = mockSidePanel("shipA", { speed: 0, mass: 0, inertia: 0, mode: "orbit", range: 0, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 0, mass: 0, inertia: 0, mode: "orbit", range: 0, skillLevel: 5, overload: true, weaponOverload: false, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 1 });
    const clearSelectedProfile = vi.fn();
    const loadPreferences = vi.fn(() => ({ language: "en" as const, shipATrackingUnit: "rad" as const, shipBTrackingUnit: "rad" as const, weaponRangeVisibility: "both" as const, simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 }));
    const settingsStore = { loadPreferences, clearSelectedProfile } as unknown as SettingsStore;
    const events = new UiEventsImpl();
    const onSessionReset = vi.fn();
    const onStartupDefaultsApplied = vi.fn();
    events.onSessionReset(onSessionReset);
    events.onStartupDefaultsApplied(onStartupDefaultsApplied);
    const { codec } = buildCodec({ shipA, shipB, settingsStore, events });

    events.emitProfileDeleted();

    expect(clearSelectedProfile).toHaveBeenCalled();
    expect(onSessionReset).toHaveBeenCalled();
    expect(onStartupDefaultsApplied).toHaveBeenCalled();
  });
});
