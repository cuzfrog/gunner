import type { UserSettings, SavedFittings, SavedFitting } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import { Vec2, type EwarLoadout, type WarpScramblerSpec, type EngagementFrame, type HitChanceBreakdown } from "../../../sim";
import type { Ships } from "../../../ships";
import type { EffectiveReadouts } from "../controlsContract";
import { USER_SETTINGS_VERSION } from "../../../appstate";
import {
  buildDomControls,
  getFake,
  mockFittingImport,
  mockSavedFittings,
  mockShips,
  RIFTER,
  IMPORTED_RIFTER,
  FakeElement,
} from "../testSupport";

const SAVED_RIFTER: SavedFitting = {
  id: "Rifter::Brawler",
  hull: "Rifter",
  name: "Brawler",
  text: "[Rifter, Brawler]\n200mm AutoCannon I, Hail S",
  savedAt: 0,
};

function mockCallbacks() {
  return {
    onPlayPause: vi.fn(),
    onReset: vi.fn(),
    onConfigChange: vi.fn(),
    onDisplayChange: vi.fn(),
    onSpeedChange: vi.fn(),
  };
}

function baseSettings(): UserSettings {
  return {
    version: USER_SETTINGS_VERSION,
    tracking: 0.32,
    trackingUnit: "rad",
    sigRes: "S",
    optimal: 1000,
    falloff: 3000,
    attackerSpeed: 400,
    attackerMode: "orbit",
    attackerRange: 5000,
    maneuverAggressivity: 1,
    gridBrightness: 0.5,
    autoZoom: true,
    zoomFactor: 1,
    attackerMass: 1_000_000,
    attackerInertia: 3,
    attackerSkillLevel: 5,
    attackerOverload: true,
    initialDistance: 6000,
    targetSpeed: 250,
    targetMode: "orbit",
    targetRange: 6000,
    targetMass: 1_000_000,
    targetInertia: 3,
    targetSig: 40,
    targetSkillLevel: 5,
    targetOverload: true,
    attackerHull: undefined,
    attackerPropulsion: undefined,
    targetHull: undefined,
    targetPropulsion: undefined,
    attackerFitting: undefined,
    attackerOverrides: {},
    targetFitting: undefined,
    targetOverrides: {},
    attackerFittedHull: undefined,
    targetFittedHull: undefined,
    attackerAmmo: "Hail S",
    simSpeed: 2,
    language: "en",
  };
}

describe("DomControls", () => {
  test("facade reads turret, target sig, speed, grid brightness and config", () => {
    const { document, controls } = buildDomControls();
    const turret = controls.getTurret();
    expect(turret.optimal).toBe(1000);
    expect(turret.falloff).toBe(3000);
    expect(controls.getTargetSig()).toBe(36);
    expect(controls.getSpeed()).toBe(4);
    expect(controls.getGridBrightness()).toBe(0.2);
    const config = controls.getConfig();
    expect(config.attacker.maxSpeed).toBe(300);
    expect(config.target.maxSpeed).toBe(300);
    expect(config.initialDistance).toBe(5000);
    controls.setPlaying(true);
    expect(getFake(document, "play").textContent).toBe("button.pause");
  });

  test("play button is disabled while a side is empty and re-enables when both have hulls", () => {
    const { document, controls, cradle } = buildDomControls();
    controls.wireControls();
    expect(getFake(document, "play").disabled).toBe(true);
    cradle.cradle.attackerSide.profile = RIFTER;
    controls.onConfigChange(false);
    expect(getFake(document, "play").disabled).toBe(true);
    cradle.cradle.targetSide.profile = RIFTER;
    controls.onConfigChange(false);
    expect(getFake(document, "play").disabled).toBe(false);
    cradle.cradle.attackerSide.profile = undefined;
    controls.onConfigChange(false);
    expect(getFake(document, "play").disabled).toBe(true);
  });

  test("hasAttackerGuns reflects whether the attacker has a fitted turret", () => {
    const { controls, cradle } = buildDomControls();
    expect(controls.hasAttackerGuns()).toBe(false);
    cradle.cradle.turretController.applyImported(IMPORTED_RIFTER);
    expect(controls.hasAttackerGuns()).toBe(true);
  });

  test("callback routing", () => {
    const { document, controls } = buildDomControls();
    const callbacks = mockCallbacks();
    controls.setCallbacks(callbacks);
    getFake(document, "play").trigger("click");
    expect(callbacks.onPlayPause).toHaveBeenCalled();
    getFake(document, "reset").trigger("click");
    expect(callbacks.onReset).toHaveBeenCalled();
    getFake(document, "sim-speed").value = "2";
    getFake(document, "sim-speed").trigger("change");
    expect(callbacks.onSpeedChange).toHaveBeenCalledWith(2);

    getFake(document, "attacker-speed").value = "400";
    getFake(document, "attacker-speed").trigger("input");
    expect(callbacks.onConfigChange).toHaveBeenCalledTimes(1);
    getFake(document, "attacker-mass").value = "1200000";
    getFake(document, "attacker-mass").trigger("input");
    expect(callbacks.onConfigChange).toHaveBeenCalledTimes(2);
    getFake(document, "attacker-inertia").value = "2.5";
    getFake(document, "attacker-inertia").trigger("input");
    expect(callbacks.onConfigChange).toHaveBeenCalledTimes(3);
    getFake(document, "attacker-mode").value = "midships";
    getFake(document, "attacker-mode").trigger("input");
    expect(callbacks.onConfigChange).toHaveBeenCalledTimes(4);

    getFake(document, "tracking").value = "0.5";
    getFake(document, "tracking").trigger("input");
    expect(callbacks.onDisplayChange).toHaveBeenCalledTimes(1);
    getFake(document, "target-sig").value = "80";
    getFake(document, "target-sig").trigger("input");
    expect(callbacks.onDisplayChange).toHaveBeenCalledTimes(2);
    getFake(document, "optimal").value = "12345";
    getFake(document, "optimal").trigger("input");
    expect(callbacks.onDisplayChange).toHaveBeenCalledTimes(3);
    getFake(document, "falloff").value = "54321";
    getFake(document, "falloff").trigger("input");
    expect(callbacks.onDisplayChange).toHaveBeenCalledTimes(4);
  });

  test("global pointerdown routes to popupGroup and previewManager", () => {
    const { document, cradle } = buildDomControls();
    const popupGroup = vi.spyOn(cradle.cradle.popupGroup, "onPointerDown");
    const previewManager = vi.spyOn(cradle.cradle.previewManager, "handlePointerDown");
    const fake = getFake(document, "target-hull");
    const pointer = { type: "pointerdown", target: fake as unknown as HTMLElement } as unknown as PointerEvent;
    (document as unknown as { dispatchEvent(event: Event): void }).dispatchEvent(pointer as unknown as Event);
    expect(popupGroup).toHaveBeenCalledWith(fake);
    expect(previewManager).toHaveBeenCalledWith(fake);
  });

  test("global Escape routes to popupGroup", () => {
    const { document, cradle } = buildDomControls();
    const popupGroup = vi.spyOn(cradle.cradle.popupGroup, "onKeyDown");
    const escape = { type: "keydown", key: "Escape" } as unknown as KeyboardEvent;
    (document as unknown as { dispatchEvent(event: Event): void }).dispatchEvent(escape as unknown as Event);
    expect(popupGroup).toHaveBeenCalledWith(escape);
  });

  test("restoreStartup round-trips stored settings through SessionCodec", () => {
    const settings = baseSettings();
    const loadStartupState = vi.fn(() => ({ settings, selectedProfileName: "brawler" }));
    const { controls } = buildDomControls({ settingsStore: { loadStartupState } });
    const config = controls.getConfig();
    expect(config.attacker.maxSpeed).toBe(400);
    expect(config.target.maxSpeed).toBe(250);
    expect(config.initialDistance).toBe(6000);
    expect(controls.getGridBrightness()).toBe(0.5);
  });

  test("profile save, load and share-text round-trip", async () => {
    const saveProfile = vi.fn();
    const loadProfile = vi.fn(() => null);
    const { document, controls, clipboard } = buildDomControls({ settingsStore: { saveProfile, loadProfile, listProfiles: vi.fn(() => ["brawler"]) } });
    const callbacks = mockCallbacks();
    controls.setCallbacks(callbacks);
    getFake(document, "profile-new").trigger("click");
    getFake(document, "new-profile-name").value = "kappa";
    getFake(document, "new-profile-confirm").trigger("click");
    await Promise.resolve();
    expect(saveProfile).toHaveBeenCalledWith("kappa", expect.any(Object));
    const saved = saveProfile.mock.calls[0][1];
    loadProfile.mockReturnValue(saved);
    getFake(document, "profile-select-trigger").trigger("click");
    await Promise.resolve();
    getFake(document, "profile-popup").children[0].trigger("click");
    await Promise.resolve();
    expect(loadProfile).toHaveBeenCalledWith("brawler");
    expect(callbacks.onReset).toHaveBeenCalled();
    getFake(document, "share-link").trigger("click");
    getFake(document, "share-copy-text").trigger("click");
    await Promise.resolve();
    await Promise.resolve();
    expect(clipboard.writeText).toHaveBeenCalled();
  });

  test("getConfig includes per-side ewar projections with per-module activation and no global overload flag", () => {
    const { controls, cradle } = buildDomControls();
    const attackerEwar: EwarLoadout = {
      webs: [{ moduleName: "Stasis Webifier I", maxRange: 10000, speedFactor: 0.5, overloadRangeBonusPercent: 15 }],
      grapplers: [],
      disruptors: [],
      scramblers: [],
      scripts: [],
    };
    cradle.cradle.ewarController.setLoadout("attacker", attackerEwar);
    const config = controls.getConfig();
    expect(config.attacker.ewar?.loadout.webs).toHaveLength(1);
    expect(config.attacker.ewar).not.toHaveProperty("overloaded");
    expect(config.attacker.ewar?.activation).toEqual({ webs: [{ active: true, overloaded: false }], grapplers: [], disruptors: [], scramblers: [] });
    expect(config.target.ewar).toBeUndefined();
  });

  test("getConfig includes ewar projection for the target side", () => {
    const { controls, cradle } = buildDomControls();
    const targetEwar: EwarLoadout = {
      webs: [],
      grapplers: [],
      disruptors: [{
        moduleName: "Tracking Disruptor I", optimal: 1, falloff: 1, disruption: 0.2,
        defaultScript: undefined, overloadStrengthBonusPercent: 0,
      }],
      scramblers: [],
      scripts: [],
    };
    cradle.cradle.ewarController.setLoadout("target", targetEwar);
    const config = controls.getConfig();
    expect(config.target.ewar?.loadout.disruptors).toHaveLength(1);
    expect(config.target.ewar).not.toHaveProperty("overloaded");
  });

  test("target fitting popup applies fitting to the target side", () => {
    const savedFittings = vi.mocked<SavedFittings>({ ...mockSavedFittings(), listForHull: vi.fn(() => [SAVED_RIFTER]) });
    const fittingImport = vi.mocked<FittingImport>({ ...mockFittingImport(), importFitting: vi.fn(() => IMPORTED_RIFTER) });
    const ships = vi.mocked<Ships>({ ...mockShips(), findHull: vi.fn(() => RIFTER) });
    const { document, controls } = buildDomControls({ savedFittings, fittingImport, ships });
    controls["attackerSide"].profile = RIFTER;
    controls["targetSide"].profile = RIFTER;
    getFake(document, "target-fitting-trigger").trigger("click");
    const item = getFake(document, "target-fitting-saved-list").children[0].children[0] as unknown as FakeElement;
    item.trigger("click");
    expect(controls["targetSide"].fittingText).toBe(SAVED_RIFTER.text);
    expect(controls["attackerSide"].fittingText).toBeUndefined();
  });

  test("getConfig uses a manually derived baseMaxSpeed for target and includes an active scrambler projection", () => {
    const SCRAMBLER: WarpScramblerSpec = { moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 };
    const mwd5 = {
      id: "mwd-5mn", kind: "microwarpdrive", sizeTier: "small", label: "5MN Microwarpdrive I",
      thrust: 1_500_000, speedBonus: 5, massAddition: 500_000, sigBloom: 5,
    } as const;
    const ships = vi.mocked<Ships>({
      ...mockShips(),
      parsePropulsionId: vi.fn((value: unknown) => (value === "mwd-5mn" ? "mwd-5mn" : undefined)),
      fittingOptions: vi.fn(() => [mwd5]),
      fittingOption: vi.fn(() => mwd5),
      fittedStats: vi.fn(() => ({ mass: 1_500_000, inertiaModifier: 3, sigRadius: 35, maxSpeed: 1800, baseMaxSpeed: 300, alignTime: 2.5 })),
      maxSpeedForFittedMass: vi.fn(() => 1800),
    });
    const { document, controls, cradle } = buildDomControls({ ships });
    const targetSide = controls["targetSide"];
    targetSide.profile = RIFTER;
    targetSide.sections.propulsion.setPropulsionActive("mwd-5mn");
    targetSide.sections.stats.updateShipStats({ updateInertia: true, updateMass: true, updateSig: true });
    cradle.cradle.ewarController.setLoadout("target", { webs: [], grapplers: [], disruptors: [], scramblers: [SCRAMBLER], scripts: [] });

    const config = controls.getConfig();
    expect(config.target.maxSpeed).toBe(1800);
    expect(config.target.baseMaxSpeed).toBe(300);
    expect(config.target.ewar?.loadout.scramblers).toHaveLength(1);
    expect(config.target.ewar?.activation?.scramblers).toEqual([{ active: true, overloaded: false }]);
  });

  test("update displays effective attributes and highlights affected values", () => {
    const { document, controls } = buildDomControls();
    const attackerState = {
      id: "attacker" as const,
      position: new Vec2(0, 0),
      velocity: new Vec2(0, 0),
      maxSpeed: 0,
      mass: 1,
      inertiaModifier: 1,
      mode: "orbit" as const,
      desiredRange: 0,
      aggressivity: 1,
    };
    const targetState = { ...attackerState, id: "target" as const };
    const frame: EngagementFrame = {
      time: 0, attacker: attackerState, target: targetState,
      relPosition: new Vec2(0, 0), distance: 0, relVelocity: new Vec2(0, 0),
      radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0,
    };
    const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0 };
    const effective = { attackerSpeed: 300, targetSpeed: 150, tracking: 0.32, optimal: 1000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 2000, boostedFalloff: 3000 };
    controls.update(frame, hit, effective);
    expect(getFake(document, "effective-attacker-speed").textContent).toBe("300 m/s");
    expect(getFake(document, "effective-target-speed").textContent).toBe("150 m/s");
    expect(getFake(document, "effective-tracking").textContent).toBe("0.32 rad/s");
    expect(getFake(document, "effective-optimal").textContent).toBe("1,000 unit.meter");
    expect(getFake(document, "effective-falloff").textContent).toBe("3,000 unit.meter");
    expect(getFake(document, "effective-target-speed").classList.add).toHaveBeenCalledWith("is-negative");
    expect(getFake(document, "effective-attacker-speed").classList.remove).toHaveBeenCalledWith("is-negative");
    expect(getFake(document, "effective-optimal").classList.add).toHaveBeenCalledWith("is-negative");
    expect(getFake(document, "effective-falloff").classList.remove).toHaveBeenCalledWith("is-negative");
  });

  test("sessionRestored preserves playing state and resets the simulation", () => {
    const { document, controls, cradle } = buildDomControls();
    const callbacks = mockCallbacks();
    controls.setCallbacks(callbacks);
    controls.setPlaying(true);
    cradle.cradle.uiEvents.emitSessionRestored();
    expect(getFake(document, "play").textContent).toBe("button.pause");
    expect(callbacks.onReset).toHaveBeenCalled();
    expect(callbacks.onConfigChange).not.toHaveBeenCalled();
  });

  test("sessionReset pauses and resets the simulation", () => {
    const { document, controls, cradle } = buildDomControls();
    const callbacks = mockCallbacks();
    controls.setCallbacks(callbacks);
    controls.setPlaying(true);
    cradle.cradle.uiEvents.emitSessionReset();
    expect(getFake(document, "play").textContent).toBe("button.play");
    expect(callbacks.onReset).toHaveBeenCalled();
    expect(callbacks.onConfigChange).not.toHaveBeenCalled();
  });

  test("startupDefaultsApplied pauses the simulation", () => {
    const { document, controls, cradle } = buildDomControls();
    controls.setPlaying(true);
    cradle.cradle.uiEvents.emitStartupDefaultsApplied();
    expect(getFake(document, "play").textContent).toBe("button.play");
  });

  function readoutFixtures() {
    const attackerState = {
      id: "attacker" as const,
      position: new Vec2(0, 0),
      velocity: new Vec2(0, 0),
      maxSpeed: 0,
      mass: 1,
      inertiaModifier: 1,
      mode: "orbit" as const,
      desiredRange: 0,
      aggressivity: 1,
    };
    const targetState = { ...attackerState, id: "target" as const };
    const frame: EngagementFrame = {
      time: 0, attacker: attackerState, target: targetState,
      relPosition: new Vec2(0, 0), distance: 0, relVelocity: new Vec2(0, 0),
      radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0,
    };
    const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0 };
    const effective: EffectiveReadouts = { attackerSpeed: 300, targetSpeed: 150, tracking: 0.32, optimal: 1000, falloff: 3000, boostedTracking: 0.32, boostedOptimal: 2000, boostedFalloff: 3000 };
    return { frame, hit, effective };
  }

  test("readouts update immediately when not playing", () => {
    const { controls, cradle } = buildDomControls({ now: () => 0 });
    const engagementUpdate = vi.spyOn(cradle.cradle.engagementReadout, "update");
    const effectiveUpdate = vi.spyOn(cradle.cradle.effectiveReadout, "update");
    const { frame, hit, effective } = readoutFixtures();
    controls.update(frame, hit, effective);
    controls.update(frame, hit, effective);
    expect(engagementUpdate).toHaveBeenCalledTimes(2);
    expect(effectiveUpdate).toHaveBeenCalledTimes(2);
  });

  test("readouts throttle while playing and resume after 50 ms", () => {
    let fakeNow = 0;
    const { controls, cradle } = buildDomControls({ now: () => fakeNow });
    const engagementUpdate = vi.spyOn(cradle.cradle.engagementReadout, "update");
    const effectiveUpdate = vi.spyOn(cradle.cradle.effectiveReadout, "update");
    const { frame, hit, effective } = readoutFixtures();
    controls.setPlaying(true);
    controls.update(frame, hit, effective);
    fakeNow = 10;
    controls.update(frame, hit, effective);
    fakeNow = 60;
    controls.update(frame, hit, effective);
    expect(engagementUpdate).toHaveBeenCalledTimes(2);
    expect(effectiveUpdate).toHaveBeenCalledTimes(2);
  });

  test("pause flushes the latest cached readouts even when the last tick was skipped", () => {
    let fakeNow = 0;
    const { controls, cradle } = buildDomControls({ now: () => fakeNow });
    const effectiveUpdate = vi.spyOn(cradle.cradle.effectiveReadout, "update");
    const { frame, hit, effective } = readoutFixtures();
    const effective2 = { ...effective, targetSpeed: 50 };
    controls.setPlaying(true);
    controls.update(frame, hit, effective);
    fakeNow = 10;
    controls.update(frame, hit, effective2);
    controls.setPlaying(false);
    expect(effectiveUpdate).toHaveBeenLastCalledWith(effective2);
    expect(effectiveUpdate).toHaveBeenCalledTimes(2);
  });
});
