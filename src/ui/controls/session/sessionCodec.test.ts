import {
  USER_SETTINGS_VERSION,
  toCombatantSettings,
  type ProfileSettings,
  type SettingsStore,
  type StartupState,
  type UserSettings,
} from "../../../appstate";
import type { ChargeCatalog } from "../../../fitting";
import { type AutopilotMode, SIG_RESOLUTIONS } from "../../../sim";
import { SessionCodecImpl } from "./sessionCodec";
import { createControlsEls, fakeDocument, FakeElement, fakeTrackingInput } from "../testSupport";
import { UiEventsImpl } from "../../events";
import type { I18n } from "../../i18n";
import type { ChoiceGroup } from "../choiceGroup";
import type { HintRotator } from "../hints";
import type { PreferencesController } from "../preferences";
import type { ProfileController } from "../profile";
import type { SidePanel } from "../sidePanel";
import type { TurretController, TurretOverrides } from "../turret";
import type { TrackingInput } from "../trackingInput";
import type { FittingImport, ImportedFitting } from "../../../fitting";
import type { EwarController } from "../ewar";
import type { BoosterController } from "../booster";

function fakeEls() {
  globalThis.document = fakeDocument() as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  return createControlsEls();
}

function panelStateFrom(settings: UserSettings, side: "shipA" | "shipB"): ReturnType<SidePanel["stateFrom"]> {
  const mode: AutopilotMode = side === "shipA" ? settings.shipAMode : settings.shipBMode;
  const base = {
    speed: side === "shipA" ? settings.shipASpeed : settings.shipBSpeed,
    mass: side === "shipA" ? settings.shipAMass : settings.shipBMass,
    inertia: side === "shipA" ? settings.shipAInertia : settings.shipBInertia,
    mode,
    range: side === "shipA" ? settings.shipARange : settings.shipBRange,
    skillLevel: side === "shipA" ? settings.shipASkillLevel : settings.shipBSkillLevel,
    overload: side === "shipA" ? settings.shipAOverload ?? true : settings.shipBOverload ?? true,
    hull: side === "shipA" ? settings.shipAHull : settings.shipBHull,
    propulsion: side === "shipA" ? settings.shipAPropulsion : settings.shipBPropulsion,
    fitting: side === "shipA" ? settings.shipAFitting : settings.shipBFitting,
    overrides: side === "shipA" ? {} : settings.shipBOverrides ?? {},
    fittedHull: side === "shipA" ? settings.shipAFittedHull : settings.shipBFittedHull,
  };
  if (side === "shipB") return { ...base, sig: settings.shipBSig };
  return base;
}

function mockSidePanel(side: "shipA" | "shipB", captured: ReturnType<SidePanel["capture"]>): SidePanel {
  return {
    capture: vi.fn(() => captured),
    stateFrom: vi.fn(() => captured),
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

function makeProfile(): ProfileSettings {
  return {
    version: USER_SETTINGS_VERSION,
    tracking: 0.32,
    sigRes: "S",
    optimal: 1000,
    falloff: 3000,
    shipASpeed: 300,
    shipAMode: "orbit",
    shipARange: 5000,
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
    shipBSig: 36,
    shipAAmmo: "Hail S",
  };
}

describe("SessionCodec", () => {
  test("capture returns a complete UserSettings from current controls", () => {
    const els = fakeEls();
    const shipA = mockSidePanel("shipA", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 36 });
    const trackingInput = fakeTrackingInput();
    const preferences = {
      trackingInput,
      capture: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 })),
      getManeuverAggressivity: vi.fn(() => 1),
      restore: vi.fn(),
      applyPreferences: vi.fn(),
      savePreferences: vi.fn(),
      updateManeuverAggressivityDisplay: vi.fn(),
      setManeuverAggressivityEnabled: vi.fn(),
    } as unknown as PreferencesController;
    const turret = {
      capture: vi.fn(() => ({ sigRes: "S", optimal: 1000, falloff: 3000, ammo: "Hail S" })),
    } as unknown as TurretController;
    const turretOverrides = mockTurretOverrides({ shipAMass: 1_400_000 });
    els.maneuverAggressivity.value = "1";
    els.initialDistance.value = "5000";
    const events = new UiEventsImpl();

    const codec = new SessionCodecImpl({
      els, shipASide: shipA, shipBSide: shipB, turret, turretOverrides,
      preferences, profileController: {} as ProfileController, i18n: {} as I18n,
      chargeCatalog: {} as ChargeCatalog, sigResChoice: { set: vi.fn() } as unknown as ChoiceGroup, hintRotator: { refresh: vi.fn() } as unknown as HintRotator,
      settingsStore: {} as SettingsStore,
      events,
      trackingInput: fakeTrackingInput(),
      ewarController: mockEwarController(),
      boosterController: mockBoosterController(),
      fittingImport: mockFittingImport(),
    });

    const settings = codec.capture();

    expect(settings.version).toBe(USER_SETTINGS_VERSION);
    expect(settings.tracking).toBe(0.32);
    expect(settings.trackingUnit).toBe("rad");
    expect(settings.sigRes).toBe("S");
    expect(settings.optimal).toBe(1000);
    expect(settings.falloff).toBe(3000);
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
    expect(settings.maneuverAggressivity).toBe(1);
    expect(settings.simSpeed).toBe(4);
    expect(settings.language).toBe("en");
    expect(settings.shipAAmmo).toBe("Hail S");
    expect(settings.shipAOverrides).toEqual({ shipAMass: 1_400_000 });
    expect(turretOverrides.get).toHaveBeenCalled();
  });

  test("restoreStartup round-trips stored settings", () => {
    const els = fakeEls();
    const settings: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.5,
      trackingUnit: "score",
      sigRes: "M",
      optimal: 2000,
      falloff: 4000,
      shipASpeed: 450,
      shipAMode: "keepAtRange",
      shipARange: 8000,
      maneuverAggressivity: 1.5,
      gridBrightness: 0.75,
      autoZoom: true,
      zoomFactor: 1,
      shipAMass: 1_100_000,
      shipAInertia: 2.5,
      shipASkillLevel: 4,
      shipAOverload: false,
      shipAHull: undefined,
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
      shipBHull: undefined,
      shipBPropulsion: undefined,
      shipBFitting: undefined,
      shipBOverrides: {},
      shipBFittedHull: undefined,
      shipAAmmo: "Hail S",
      simSpeed: 2,
      language: "zh",
    };
    const shipA = mockSidePanel("shipA", panelStateFrom(settings, "shipA"));
    const shipB = mockSidePanel("shipB", panelStateFrom(settings, "shipB"));
    shipA.stateFrom = vi.fn(() => panelStateFrom(settings, "shipA"));
    shipB.stateFrom = vi.fn(() => panelStateFrom(settings, "shipB"));
    const trackingInput = fakeTrackingInput();
    const preferences = {
      trackingInput,
      capture: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 })),
      getManeuverAggressivity: vi.fn(() => 1),
      restore: vi.fn(),
      applyPreferences: vi.fn(),
      savePreferences: vi.fn(),
      updateManeuverAggressivityDisplay: vi.fn(),
      setManeuverAggressivityEnabled: vi.fn(),
    } as unknown as PreferencesController;
    const profileController = { restoreFromStartup: vi.fn(() => false), markLoaded: vi.fn(), refresh: vi.fn() } as unknown as ProfileController;
    const turret: TurretController = {
      capture: vi.fn(() => ({ sigRes: "S", optimal: 2000, falloff: 4000, ammo: "Hail S" })),
      restore: vi.fn(),
      currentTurretSpec: vi.fn(() => ({ tracking: 0.5, sigResolution: SIG_RESOLUTIONS.M, optimal: 2000, falloff: 4000 })),
    } as unknown as TurretController;
    const turretOverrides = mockTurretOverrides();
    const settingsStore = { savePreferences: vi.fn(), loadPreferences: vi.fn() } as unknown as SettingsStore;
        const i18n = { translateDocument: vi.fn() } as unknown as I18n;
    const sigResChoice = { set: vi.fn() } as unknown as ChoiceGroup;
    const hintRotator = { refresh: vi.fn() } as unknown as HintRotator;
    const events = new UiEventsImpl();
    const onSessionRestored = vi.fn();
    events.onSessionRestored(onSessionRestored);

    const codec = new SessionCodecImpl({
      els, shipASide: shipA, shipBSide: shipB, turret, turretOverrides,
      preferences, profileController, i18n, chargeCatalog: {} as ChargeCatalog,
      sigResChoice, hintRotator, settingsStore,
      events,
      trackingInput,
      ewarController: mockEwarController(),
      boosterController: mockBoosterController(),
      fittingImport: mockFittingImport(),
    });

    codec.restoreStartup({ settings, selectedProfileName: null });

    expect(shipA.stateFrom).toHaveBeenCalledWith(toCombatantSettings(settings, "shipA"));
    expect(shipA.restore).toHaveBeenCalledWith(panelStateFrom(settings, "shipA"));
    expect(shipB.stateFrom).toHaveBeenCalledWith(toCombatantSettings(settings, "shipB"));
    expect(shipB.restore).toHaveBeenCalledWith(panelStateFrom(settings, "shipB"));
    expect(turret.restore).toHaveBeenCalledWith({ fitting: settings.shipAFitting, conditions: { skillLevel: 5, overloaded: true }, ammo: settings.shipAAmmo });
    expect(preferences.restore).toHaveBeenCalledWith({ language: "zh", trackingUnit: "score", simSpeed: 2, gridBrightness: 0.75, autoZoom: true, zoomFactor: 1 });
    expect(preferences.savePreferences).toHaveBeenCalled();
    expect(i18n.translateDocument).toHaveBeenCalled();
    expect(hintRotator.refresh).toHaveBeenCalled();
    expect(onSessionRestored).toHaveBeenCalled();
    expect(turretOverrides.set).toHaveBeenCalledWith({});
    expect(profileController.markLoaded).toHaveBeenCalledWith("");
  });

  test("capture and restore include ewar activations", () => {
    const els = fakeEls();
    const ewarController = mockEwarController();
    const fittingImport = mockFittingImport();
    const shipA = mockSidePanel("shipA", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: "[Rifter, Brawler]\nStasis Webifier I", overrides: {}, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 36 });
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
    const turret = { capture: vi.fn(() => ({ sigRes: "S" as const, optimal: 1000, falloff: 3000, ammo: "Hail S" })), restore: vi.fn() } as unknown as TurretController;
    const preferences = { capture: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 })), getManeuverAggressivity: vi.fn(() => 1), restore: vi.fn(), applyPreferences: vi.fn(), savePreferences: vi.fn(), updateManeuverAggressivityDisplay: vi.fn(), setManeuverAggressivityEnabled: vi.fn() } as unknown as PreferencesController;
    const i18n = { translateDocument: vi.fn() } as unknown as I18n;
    const profileController = { markLoaded: vi.fn() } as unknown as ProfileController;
    const settingsStore = {} as SettingsStore;
    const events = new UiEventsImpl();
    const onSessionRestored = vi.fn();
    events.onSessionRestored(onSessionRestored);

    const codec = new SessionCodecImpl({
      els, shipASide: shipA, shipBSide: shipB, turret, turretOverrides: mockTurretOverrides(),
      preferences, profileController, i18n,
      chargeCatalog: {} as ChargeCatalog, sigResChoice: { set: vi.fn() } as unknown as ChoiceGroup, hintRotator: { refresh: vi.fn() } as unknown as HintRotator,
      settingsStore,
      events,
      trackingInput: fakeTrackingInput(),
      ewarController,
      boosterController: mockBoosterController(),
      fittingImport,
    });

    const settings = codec.capture();
    expect(settings.shipAEwarActivation).toEqual({
      webs: [{ active: true, overloaded: false }],
      grapplers: [],
      disruptors: [{ active: true, overloaded: false, script: "none" }],
    });

    codec.restore(settings);
    expect(ewarController.restore).toHaveBeenCalledWith("shipA", expect.any(Object), settings.shipAEwarActivation);
    expect(ewarController.restore).toHaveBeenCalledWith("shipB", undefined, settings.shipBEwarActivation);
    expect(onSessionRestored).toHaveBeenCalled();
  });

  test("corrupt startup data falls back to defaults", () => {
    const els = fakeEls();
    const shipA = mockSidePanel("shipA", { speed: 0, mass: 0, inertia: 0, mode: "orbit", range: 0, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 0, mass: 0, inertia: 0, mode: "orbit", range: 0, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 1 });
    const trackingInput = fakeTrackingInput();
    const preferences = {
      trackingInput,
      capture: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 })),
      getManeuverAggressivity: vi.fn(() => 1),
      applyPreferences: vi.fn(),
      savePreferences: vi.fn(),
      updateManeuverAggressivityDisplay: vi.fn(),
      setManeuverAggressivityEnabled: vi.fn(),
    } as unknown as PreferencesController;
    const profileController = { restoreFromStartup: vi.fn(() => false), markLoaded: vi.fn() } as unknown as ProfileController;
    const turret = { capture: vi.fn(() => ({ sigRes: "S", optimal: 1000, falloff: 3000, ammo: "Hail S" })), currentTurretSpec: vi.fn(() => ({ tracking: 0.32, sigResolution: SIG_RESOLUTIONS.S, optimal: 1000, falloff: 3000 })) } as unknown as TurretController;
    const turretOverrides = mockTurretOverrides();
    const settingsStore = { loadPreferences: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 })), savePreferences: vi.fn() } as unknown as SettingsStore;
        const i18n = { translateDocument: vi.fn() } as unknown as I18n;
    const sigResChoice = { set: vi.fn() } as unknown as ChoiceGroup;
    const hintRotator = { refresh: vi.fn() } as unknown as HintRotator;
    const events = new UiEventsImpl();
    const onStartupDefaultsApplied = vi.fn();
    events.onStartupDefaultsApplied(onStartupDefaultsApplied);

    const codec = new SessionCodecImpl({
      els, shipASide: shipA, shipBSide: shipB, turret, turretOverrides,
      preferences, profileController, i18n, chargeCatalog: {} as ChargeCatalog,
      sigResChoice, hintRotator, settingsStore,
      events,
      trackingInput,
      ewarController: mockEwarController(),
      boosterController: mockBoosterController(),
      fittingImport: mockFittingImport(),
    });

    codec.restoreStartup({ settings: null, selectedProfileName: null });

    expect(profileController.restoreFromStartup).toHaveBeenCalled();
    expect(settingsStore.loadPreferences).toHaveBeenCalled();
    expect(preferences.applyPreferences).toHaveBeenCalledWith({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 });
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
    const els = fakeEls();
    const pristineShipA = { speed: 0, mass: 0, inertia: 0, mode: "orbit" as const, range: 0, skillLevel: 5 as const, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined };
    const pristineShipB = { speed: 0, mass: 0, inertia: 0, mode: "orbit" as const, range: 0, skillLevel: 5 as const, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 1 };
    const shipA = mockSidePanel("shipA", pristineShipA);
    const shipB = mockSidePanel("shipB", pristineShipB);
    const trackingInput = fakeTrackingInput();
    const preferences = {
      trackingInput,
      capture: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 })),
      getManeuverAggressivity: vi.fn(() => 1),
      applyPreferences: vi.fn(),
      savePreferences: vi.fn(),
      updateManeuverAggressivityDisplay: vi.fn(),
      setManeuverAggressivityEnabled: vi.fn(),
    } as unknown as PreferencesController;
    const profileController = { markLoaded: vi.fn() } as unknown as ProfileController;
    const turret = { capture: vi.fn(() => ({ sigRes: "S", optimal: 1000, falloff: 3000, ammo: "Hail S" })), restore: vi.fn(), currentTurretSpec: vi.fn(() => ({ tracking: 0.32, sigResolution: SIG_RESOLUTIONS.S, optimal: 1000, falloff: 3000 })) } as unknown as TurretController;
    const turretOverrides = mockTurretOverrides();
    const clearSelectedProfile = vi.fn();
    const settingsStore = { loadPreferences: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 })), savePreferences: vi.fn(), clearSelectedProfile } as unknown as SettingsStore;
        const i18n = { translateDocument: vi.fn() } as unknown as I18n;
    const sigResChoice = { set: vi.fn() } as unknown as ChoiceGroup;
    const hintRotator = { refresh: vi.fn() } as unknown as HintRotator;
    const events = new UiEventsImpl();
    const onStartupDefaultsApplied = vi.fn();
    events.onStartupDefaultsApplied(onStartupDefaultsApplied);
    const ewarController = mockEwarController();

    const codec = new SessionCodecImpl({
      els, shipASide: shipA, shipBSide: shipB, turret, turretOverrides,
      preferences, profileController, i18n, chargeCatalog: {} as ChargeCatalog,
      sigResChoice, hintRotator, settingsStore,
      events,
      trackingInput,
      ewarController,
      boosterController: mockBoosterController(),
      fittingImport: mockFittingImport(),
    });

    codec.resetToDefaults();

    expect(clearSelectedProfile).toHaveBeenCalled();
    expect(shipA.restore).toHaveBeenCalledWith(pristineShipA);
    expect(shipB.restore).toHaveBeenCalledWith(pristineShipB);
    expect(turret.restore).toHaveBeenCalledWith({ fitting: undefined, conditions: { skillLevel: 5, overloaded: true }, ammo: "Hail S" });
    expect(ewarController.restore).toHaveBeenCalledWith("shipA", undefined, undefined);
    expect(ewarController.restore).toHaveBeenCalledWith("shipB", undefined, undefined);
    expect(els.sigRes.value).toBe("S");
    expect(els.optimal.value).toBe("1000");
    expect(els.falloff.value).toBe("3000");
    expect(trackingInput.rad).toBe(0.32);
    expect(preferences.applyPreferences).toHaveBeenCalledWith({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 });
    expect(profileController.markLoaded).toHaveBeenCalledWith("");
    expect(onStartupDefaultsApplied).toHaveBeenCalled();
  });

  test("profileLoaded event restores the named profile and emits sessionRestored", () => {
    const els = fakeEls();
    const profile = makeProfile();
    const loadProfile = vi.fn(() => profile);
    const shipA = mockSidePanel("shipA", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 36 });
    const turret = { capture: vi.fn(() => ({ sigRes: "S" as const, optimal: 1000, falloff: 3000, ammo: "Hail S" })), restore: vi.fn() } as unknown as TurretController;
    const turretOverrides = mockTurretOverrides();
    const trackingInput = fakeTrackingInput();
    const preferences = {
      capture: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 })),
      getManeuverAggressivity: vi.fn(() => 1),
      restore: vi.fn(),
      applyPreferences: vi.fn(),
      savePreferences: vi.fn(),
      updateManeuverAggressivityDisplay: vi.fn(),
      setManeuverAggressivityEnabled: vi.fn(),
    } as unknown as PreferencesController;
    const profileController = { markLoaded: vi.fn(), showStatus: vi.fn() } as unknown as ProfileController;
    const i18n = { translateDocument: vi.fn() } as unknown as I18n;
    const sigResChoice = { set: vi.fn() } as unknown as ChoiceGroup;
    const hintRotator = { refresh: vi.fn() } as unknown as HintRotator;
    const settingsStore = { loadProfile } as unknown as SettingsStore;
    const events = new UiEventsImpl();
    const onSessionRestored = vi.fn();
    events.onSessionRestored(onSessionRestored);
    els.maneuverAggressivity.value = "1";
    els.initialDistance.value = "5000";

    const codec = new SessionCodecImpl({
      els, shipASide: shipA, shipBSide: shipB, turret, turretOverrides,
      preferences, profileController, i18n, chargeCatalog: {} as ChargeCatalog,
      sigResChoice, hintRotator, settingsStore,
      events,
      trackingInput,
      ewarController: mockEwarController(),
      boosterController: mockBoosterController(),
      fittingImport: mockFittingImport(),
    });

    events.emitProfileLoaded("brawler");

    expect(loadProfile).toHaveBeenCalledWith("brawler");
    expect(profileController.markLoaded).toHaveBeenCalledWith("brawler");
    expect(onSessionRestored).toHaveBeenCalled();
    expect(turret.restore).toHaveBeenCalledWith({ fitting: profile.shipAFitting, conditions: { skillLevel: 5, overloaded: true }, ammo: "Hail S" });
  });

  test("profileTextLoaded event restores the shared profile and emits sessionRestored", () => {
    const els = fakeEls();
    const profile = makeProfile();
    const shipA = mockSidePanel("shipA", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 36 });
    const turret = { capture: vi.fn(() => ({ sigRes: "S" as const, optimal: 1000, falloff: 3000, ammo: "Hail S" })), restore: vi.fn() } as unknown as TurretController;
    const turretOverrides = mockTurretOverrides();
    const trackingInput = fakeTrackingInput();
    const preferences = {
      capture: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 })),
      getManeuverAggressivity: vi.fn(() => 1),
      restore: vi.fn(),
      applyPreferences: vi.fn(),
      savePreferences: vi.fn(),
      updateManeuverAggressivityDisplay: vi.fn(),
      setManeuverAggressivityEnabled: vi.fn(),
    } as unknown as PreferencesController;
    const profileController = { markLoaded: vi.fn(), showStatus: vi.fn() } as unknown as ProfileController;
    const i18n = { translateDocument: vi.fn() } as unknown as I18n;
    const sigResChoice = { set: vi.fn() } as unknown as ChoiceGroup;
    const hintRotator = { refresh: vi.fn() } as unknown as HintRotator;
    const settingsStore = {} as unknown as SettingsStore;
    const events = new UiEventsImpl();
    const onSessionRestored = vi.fn();
    events.onSessionRestored(onSessionRestored);
    els.maneuverAggressivity.value = "1";
    els.initialDistance.value = "5000";

    const codec = new SessionCodecImpl({
      els, shipASide: shipA, shipBSide: shipB, turret, turretOverrides,
      preferences, profileController, i18n, chargeCatalog: {} as ChargeCatalog,
      sigResChoice, hintRotator, settingsStore,
      events,
      trackingInput,
      ewarController: mockEwarController(),
      boosterController: mockBoosterController(),
      fittingImport: mockFittingImport(),
    });

    events.emitProfileTextLoaded(profile);

    expect(profileController.showStatus).toHaveBeenCalledWith("status.profileImported");
    expect(onSessionRestored).toHaveBeenCalled();
    expect(profileController.markLoaded).toHaveBeenCalledWith("");
    expect(turret.restore).toHaveBeenCalledWith({ fitting: profile.shipAFitting, conditions: { skillLevel: 5, overloaded: true }, ammo: "Hail S" });
  });

  test("newProfile event resets to defaults and emits sessionReset", () => {
    const els = fakeEls();
    const shipA = mockSidePanel("shipA", { speed: 0, mass: 0, inertia: 0, mode: "orbit", range: 0, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 0, mass: 0, inertia: 0, mode: "orbit", range: 0, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 1 });
    const turret = { capture: vi.fn(() => ({ sigRes: "S" as const, optimal: 1000, falloff: 3000, ammo: "Hail S" })), restore: vi.fn() } as unknown as TurretController;
    const turretOverrides = mockTurretOverrides();
    const trackingInput = fakeTrackingInput();
    const preferences = {
      capture: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 })),
      getManeuverAggressivity: vi.fn(() => 1),
      applyPreferences: vi.fn(),
      savePreferences: vi.fn(),
      updateManeuverAggressivityDisplay: vi.fn(),
      setManeuverAggressivityEnabled: vi.fn(),
    } as unknown as PreferencesController;
    const profileController = { markLoaded: vi.fn(), showStatus: vi.fn() } as unknown as ProfileController;
    const i18n = { translateDocument: vi.fn() } as unknown as I18n;
    const sigResChoice = { set: vi.fn() } as unknown as ChoiceGroup;
    const hintRotator = { refresh: vi.fn() } as unknown as HintRotator;
    const clearSelectedProfile = vi.fn();
    const loadPreferences = vi.fn(() => ({ language: "en" as const, trackingUnit: "rad" as const, simSpeed: 4, gridBrightness: 0.2 }));
    const settingsStore = { loadPreferences, clearSelectedProfile } as unknown as SettingsStore;
    const events = new UiEventsImpl();
    const onSessionReset = vi.fn();
    const onStartupDefaultsApplied = vi.fn();
    events.onSessionReset(onSessionReset);
    events.onStartupDefaultsApplied(onStartupDefaultsApplied);
    els.maneuverAggressivity.value = "1";
    els.initialDistance.value = "5000";

    const codec = new SessionCodecImpl({
      els, shipASide: shipA, shipBSide: shipB, turret, turretOverrides,
      preferences, profileController, i18n, chargeCatalog: {} as ChargeCatalog,
      sigResChoice, hintRotator, settingsStore,
      events,
      trackingInput,
      ewarController: mockEwarController(),
      boosterController: mockBoosterController(),
      fittingImport: mockFittingImport(),
    });

    events.emitNewProfile();

    expect(clearSelectedProfile).toHaveBeenCalled();
    expect(profileController.showStatus).toHaveBeenCalledWith("status.newProfile");
    expect(onSessionReset).toHaveBeenCalled();
    expect(onStartupDefaultsApplied).toHaveBeenCalled();
  });

  test("profileDeleted event resets to defaults and emits sessionReset", () => {
    const els = fakeEls();
    const shipA = mockSidePanel("shipA", { speed: 0, mass: 0, inertia: 0, mode: "orbit", range: 0, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined });
    const shipB = mockSidePanel("shipB", { speed: 0, mass: 0, inertia: 0, mode: "orbit", range: 0, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 1 });
    const turret = { capture: vi.fn(() => ({ sigRes: "S" as const, optimal: 1000, falloff: 3000, ammo: "Hail S" })), restore: vi.fn() } as unknown as TurretController;
    const turretOverrides = mockTurretOverrides();
    const trackingInput = fakeTrackingInput();
    const preferences = {
      capture: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2, autoZoom: true, zoomFactor: 1 })),
      getManeuverAggressivity: vi.fn(() => 1),
      applyPreferences: vi.fn(),
      savePreferences: vi.fn(),
      updateManeuverAggressivityDisplay: vi.fn(),
      setManeuverAggressivityEnabled: vi.fn(),
    } as unknown as PreferencesController;
    const profileController = { markLoaded: vi.fn(), showStatus: vi.fn() } as unknown as ProfileController;
    const i18n = { translateDocument: vi.fn() } as unknown as I18n;
    const sigResChoice = { set: vi.fn() } as unknown as ChoiceGroup;
    const hintRotator = { refresh: vi.fn() } as unknown as HintRotator;
    const clearSelectedProfile = vi.fn();
    const loadPreferences = vi.fn(() => ({ language: "en" as const, trackingUnit: "rad" as const, simSpeed: 4, gridBrightness: 0.2 }));
    const settingsStore = { loadPreferences, clearSelectedProfile } as unknown as SettingsStore;
    const events = new UiEventsImpl();
    const onSessionReset = vi.fn();
    const onStartupDefaultsApplied = vi.fn();
    events.onSessionReset(onSessionReset);
    events.onStartupDefaultsApplied(onStartupDefaultsApplied);
    els.maneuverAggressivity.value = "1";
    els.initialDistance.value = "5000";

    const codec = new SessionCodecImpl({
      els, shipASide: shipA, shipBSide: shipB, turret, turretOverrides,
      preferences, profileController, i18n, chargeCatalog: {} as ChargeCatalog,
      sigResChoice, hintRotator, settingsStore,
      events,
      trackingInput,
      ewarController: mockEwarController(),
      boosterController: mockBoosterController(),
      fittingImport: mockFittingImport(),
    });

    events.emitProfileDeleted();

    expect(clearSelectedProfile).toHaveBeenCalled();
    expect(onSessionReset).toHaveBeenCalled();
    expect(onStartupDefaultsApplied).toHaveBeenCalled();
  });
});
