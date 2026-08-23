import { USER_SETTINGS_VERSION, type SettingsStore, type StartupState, type UserSettings } from "../../../appstate";
import type { ChargeCatalog } from "../../../fitting";
import { type AutopilotMode, type HitChance, SIG_RESOLUTIONS } from "../../../sim";
import { SessionCodecImpl } from "./sessionCodec";
import { createControlsEls, fakeDocument, FakeElement, fakeTrackingInput } from "../testSupport";
import type { I18n } from "../../i18n";
import type { ChoiceGroup } from "../choiceGroup";
import type { HintRotator } from "../hints";
import type { PreferencesController } from "../preferencesController";
import type { ProfileController } from "../profileController";
import type { SidePanel } from "../sidePanel";
import type { TurretController, TurretOverrides } from "../turret";
import type { TrackingInput } from "../trackingInput";

function fakeEls() {
  globalThis.document = fakeDocument() as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  return createControlsEls();
}

function panelStateFrom(settings: UserSettings, side: "attacker" | "target"): ReturnType<SidePanel["stateFrom"]> {
  const mode: AutopilotMode = side === "attacker" ? settings.attackerMode : settings.targetMode;
  const base = {
    speed: side === "attacker" ? settings.attackerSpeed : settings.targetSpeed,
    mass: side === "attacker" ? settings.attackerMass : settings.targetMass,
    inertia: side === "attacker" ? settings.attackerInertia : settings.targetInertia,
    mode,
    range: side === "attacker" ? settings.attackerRange : settings.targetRange,
    skillLevel: side === "attacker" ? settings.attackerSkillLevel : settings.targetSkillLevel,
    overload: side === "attacker" ? settings.attackerOverload ?? true : settings.targetOverload ?? true,
    hull: side === "attacker" ? settings.attackerHull : settings.targetHull,
    propulsion: side === "attacker" ? settings.attackerPropulsion : settings.targetPropulsion,
    fitting: side === "attacker" ? settings.attackerFitting : settings.targetFitting,
    overrides: side === "attacker" ? {} : settings.targetOverrides ?? {},
    fittedHull: side === "attacker" ? settings.attackerFittedHull : settings.targetFittedHull,
  };
  if (side === "target") return { ...base, sig: settings.targetSig };
  return base;
}

function mockSidePanel(side: "attacker" | "target", captured: ReturnType<SidePanel["capture"]>): SidePanel {
  return {
    capture: vi.fn(() => captured),
    stateFrom: vi.fn(() => captured),
    restore: vi.fn(),
    skillConditions: vi.fn(() => ({ skillLevel: 5, overloaded: true })),
    setSkillLevel: vi.fn(),
    setOverloadActive: vi.fn(),
    setOverloadDisabled: vi.fn(),
    updateAlignTime: vi.fn(),
    renderPropulsionOptions: vi.fn(),
    refreshHullInputs: vi.fn(),
  } as unknown as SidePanel;
}

function mockTurretOverrides(overrides: Record<string, unknown> = {}): TurretOverrides {
  const store = { overrides };
  return {
    get: vi.fn(() => ({ ...store.overrides })),
    set: vi.fn((patch) => { store.overrides = { ...store.overrides, ...patch }; }),
    clear: vi.fn(() => { store.overrides = {}; }),
  } as unknown as TurretOverrides;
}

describe("SessionCodec", () => {
  test("capture returns a complete UserSettings from current controls", () => {
    const els = fakeEls();
    const attacker = mockSidePanel("attacker", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined });
    const target = mockSidePanel("target", { speed: 300, mass: 1_000_000, inertia: 3, mode: "orbit", range: 5000, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 36 });
    const trackingInput = fakeTrackingInput();
    const preferences = {
      trackingInput,
      capture: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2 })),
      getManeuverAggressivity: vi.fn(() => 1),
      restore: vi.fn(),
      applyPreferences: vi.fn(),
      savePreferences: vi.fn(),
      updateManeuverAggressivityDisplay: vi.fn(),
      updateManeuverAggressivityEnabled: vi.fn(),
    } as unknown as PreferencesController;
    const turret = {
      capture: vi.fn(() => ({ sigRes: "S", optimal: 1000, falloff: 3000, ammo: "Hail S" })),
    } as unknown as TurretController;
    const turretOverrides = mockTurretOverrides({ attackerMass: 1_400_000 });
    els.maneuverAggressivity.value = "1";
    els.initialDistance.value = "5000";

    const codec = new SessionCodecImpl({
      els, attackerSide: attacker, targetSide: target, turret, turretOverrides,
      preferences, profileController: {} as ProfileController, i18n: {} as I18n,
      chargeCatalog: {} as ChargeCatalog, sigResChoice: {} as ChoiceGroup, hintRotator: {} as HintRotator,
      settingsStore: {} as SettingsStore, hitChance: {} as HitChance,
      trackingInput: fakeTrackingInput(),
    });
    codec.setSessionControl({ isPlaying: () => false, setPlaying: vi.fn() });

    const settings = codec.capture();

    expect(settings.version).toBe(USER_SETTINGS_VERSION);
    expect(settings.tracking).toBe(0.32);
    expect(settings.trackingUnit).toBe("rad");
    expect(settings.sigRes).toBe("S");
    expect(settings.optimal).toBe(1000);
    expect(settings.falloff).toBe(3000);
    expect(settings.attackerSpeed).toBe(300);
    expect(settings.attackerMass).toBe(1_000_000);
    expect(settings.attackerInertia).toBe(3);
    expect(settings.attackerSkillLevel).toBe(5);
    expect(settings.attackerOverload).toBe(true);
    expect(settings.targetSpeed).toBe(300);
    expect(settings.targetMass).toBe(1_000_000);
    expect(settings.targetInertia).toBe(3);
    expect(settings.targetSig).toBe(36);
    expect(settings.initialDistance).toBe(5000);
    expect(settings.maneuverAggressivity).toBe(1);
    expect(settings.simSpeed).toBe(4);
    expect(settings.language).toBe("en");
    expect(settings.attackerAmmo).toBe("Hail S");
    expect(settings.attackerOverrides).toEqual({ attackerMass: 1_400_000 });
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
      attackerSpeed: 450,
      attackerMode: "keepAtRange",
      attackerRange: 8000,
      maneuverAggressivity: 1.5,
      gridBrightness: 0.75,
      attackerMass: 1_100_000,
      attackerInertia: 2.5,
      attackerSkillLevel: 4,
      attackerOverload: false,
      attackerHull: undefined,
      attackerPropulsion: undefined,
      attackerFitting: undefined,
      attackerOverrides: {},
      attackerFittedHull: undefined,
      initialDistance: 7000,
      targetSpeed: 260,
      targetMode: "orbit",
      targetRange: 7000,
      targetMass: 1_200_000,
      targetInertia: 2.8,
      targetSkillLevel: 3,
      targetOverload: true,
      targetSig: 50,
      targetHull: undefined,
      targetPropulsion: undefined,
      targetFitting: undefined,
      targetOverrides: {},
      targetFittedHull: undefined,
      attackerAmmo: "Hail S",
      simSpeed: 2,
      language: "zh",
    };
    const attacker = mockSidePanel("attacker", panelStateFrom(settings, "attacker"));
    const target = mockSidePanel("target", panelStateFrom(settings, "target"));
    attacker.stateFrom = vi.fn(() => panelStateFrom(settings, "attacker"));
    target.stateFrom = vi.fn(() => panelStateFrom(settings, "target"));
    const trackingInput = fakeTrackingInput();
    const preferences = {
      trackingInput,
      restore: vi.fn(),
      applyPreferences: vi.fn(),
      savePreferences: vi.fn(),
      updateManeuverAggressivityDisplay: vi.fn(),
      updateManeuverAggressivityEnabled: vi.fn(),
    } as unknown as PreferencesController;
    const profileController = { restoreFromStartup: vi.fn(() => false), markLoaded: vi.fn(), refresh: vi.fn() } as unknown as ProfileController;
    const turret: TurretController = {
      restore: vi.fn(),
      currentTurretSpec: vi.fn(() => ({ tracking: 0.5, sigResolution: SIG_RESOLUTIONS.M, optimal: 2000, falloff: 4000 })),
    } as unknown as TurretController;
    const turretOverrides = mockTurretOverrides();
    const settingsStore = { savePreferences: vi.fn(), loadPreferences: vi.fn() } as unknown as SettingsStore;
    const hitChance = { findBestDistance: vi.fn(() => 5000) } as unknown as HitChance;
    const i18n = { translateDocument: vi.fn() } as unknown as I18n;
    const sigResChoice = { set: vi.fn() } as unknown as ChoiceGroup;
    const hintRotator = { refresh: vi.fn() } as unknown as HintRotator;
    const setPlaying = vi.fn();
    const sessionControl = { isPlaying: () => true, setPlaying };

    const codec = new SessionCodecImpl({
      els, attackerSide: attacker, targetSide: target, turret, turretOverrides,
      preferences, profileController, i18n, chargeCatalog: {} as ChargeCatalog,
      sigResChoice, hintRotator, settingsStore, hitChance,
      trackingInput,
    });
    codec.setSessionControl(sessionControl);

    codec.restoreStartup({ settings, selectedProfileName: null });

    expect(attacker.stateFrom).toHaveBeenCalledWith(settings);
    expect(attacker.restore).toHaveBeenCalledWith(panelStateFrom(settings, "attacker"));
    expect(target.restore).toHaveBeenCalledWith(panelStateFrom(settings, "target"));
    expect(turret.restore).toHaveBeenCalledWith({ fitting: settings.attackerFitting, conditions: { skillLevel: 5, overloaded: true }, ammo: settings.attackerAmmo });
    expect(preferences.restore).toHaveBeenCalledWith({ language: "zh", trackingUnit: "score", simSpeed: 2, gridBrightness: 0.75 });
    expect(preferences.savePreferences).toHaveBeenCalled();
    expect(i18n.translateDocument).toHaveBeenCalled();
    expect(hintRotator.refresh).toHaveBeenCalled();
    expect(setPlaying).toHaveBeenCalledWith(true);
    expect(turretOverrides.set).toHaveBeenCalledWith({});
    expect(profileController.markLoaded).toHaveBeenCalledWith("");
  });

  test("corrupt startup data falls back to defaults", () => {
    const els = fakeEls();
    const attacker = mockSidePanel("attacker", { speed: 0, mass: 0, inertia: 0, mode: "orbit", range: 0, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined });
    const target = mockSidePanel("target", { speed: 0, mass: 0, inertia: 0, mode: "orbit", range: 0, skillLevel: 5, overload: true, hull: undefined, propulsion: undefined, fitting: undefined, overrides: {}, fittedHull: undefined, sig: 1 });
    const trackingInput = fakeTrackingInput();
    const preferences = {
      trackingInput,
      applyPreferences: vi.fn(),
      savePreferences: vi.fn(),
      updateManeuverAggressivityDisplay: vi.fn(),
      updateManeuverAggressivityEnabled: vi.fn(),
    } as unknown as PreferencesController;
    const profileController = { restoreFromStartup: vi.fn(() => false), refresh: vi.fn() } as unknown as ProfileController;
    const turret = { currentTurretSpec: vi.fn(() => ({ tracking: 0.32, sigResolution: SIG_RESOLUTIONS.S, optimal: 1000, falloff: 3000 })) } as unknown as TurretController;
    const turretOverrides = mockTurretOverrides();
    const settingsStore = { loadPreferences: vi.fn(() => ({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2 })), savePreferences: vi.fn() } as unknown as SettingsStore;
    const hitChance = { findBestDistance: vi.fn(() => 5000) } as unknown as HitChance;
    const i18n = { translateDocument: vi.fn() } as unknown as I18n;
    const sigResChoice = { set: vi.fn() } as unknown as ChoiceGroup;
    const hintRotator = { refresh: vi.fn() } as unknown as HintRotator;
    const setPlaying = vi.fn();
    const sessionControl = { isPlaying: () => false, setPlaying };

    const codec = new SessionCodecImpl({
      els, attackerSide: attacker, targetSide: target, turret, turretOverrides,
      preferences, profileController, i18n, chargeCatalog: {} as ChargeCatalog,
      sigResChoice, hintRotator, settingsStore, hitChance,
      trackingInput,
    });
    codec.setSessionControl(sessionControl);

    codec.restoreStartup({ settings: null, selectedProfileName: null });

    expect(profileController.restoreFromStartup).toHaveBeenCalled();
    expect(settingsStore.loadPreferences).toHaveBeenCalled();
    expect(preferences.applyPreferences).toHaveBeenCalledWith({ language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2 });
    expect(attacker.setSkillLevel).toHaveBeenCalledWith(5);
    expect(attacker.setOverloadActive).toHaveBeenCalledWith(true);
    expect(attacker.setOverloadDisabled).toHaveBeenCalled();
    expect(attacker.renderPropulsionOptions).toHaveBeenCalled();
    expect(target.setSkillLevel).toHaveBeenCalledWith(5);
    expect(target.setOverloadActive).toHaveBeenCalledWith(true);
    expect(target.setOverloadDisabled).toHaveBeenCalled();
    expect(target.renderPropulsionOptions).toHaveBeenCalled();
    expect(setPlaying).toHaveBeenCalledWith(false);
    expect(profileController.refresh).toHaveBeenCalled();
  });
});
