import type { UserSettings, SavedFittings, SavedFitting } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import { Vec2, type EwarLoadout, type WarpScramblerSpec, type EngagementFrame, type HitChanceBreakdown, type EngagementView } from "../../../sim";
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

function sideReadoutValues(speed: number, tracking: number, optimal: number, falloff: number, boostedTracking: number, boostedOptimal: number, boostedFalloff: number) {
  return { speed, tracking, optimal, falloff, boostedTracking, boostedOptimal, boostedFalloff, sigResolution: 40 };
}

function makeView(distance: number): EngagementView {
  const shipAState = {
    id: "shipA" as const,
    position: new Vec2(0, 0),
    velocity: new Vec2(0, 0),
    maxSpeed: 0,
    mass: 1,
    inertiaModifier: 1,
    mode: "orbit" as const,
    desiredRange: 0,
    aggressivity: 1,
  };
  const shipBState = { ...shipAState, id: "shipB" as const };
  const frame: EngagementFrame = {
    time: 0, shipA: shipAState, shipB: shipBState,
    relPosition: new Vec2(0, distance), distance, relVelocity: new Vec2(0, 0),
    radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0,
  };
  const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0 };
  const turret = { tracking: 0, sigResolution: 40, optimal: 0, falloff: 0 };
  return { frame, attacks: { shipA: undefined, shipB: undefined }, effectiveTurrets: { shipA: turret, shipB: turret }, hits: { shipA: hit, shipB: hit } };
}

function baseSettings(): UserSettings {
  return {
    version: USER_SETTINGS_VERSION,
    trackingUnit: "rad",
    shipATracking: 0.32,
    shipASigRes: "S",
    shipAOptimal: 1000,
    shipAFalloff: 3000,
    shipBTracking: 0.32,
    shipBSigRes: "S",
    shipBOptimal: 5000,
    shipBFalloff: 5000,
    shipASpeed: 400,
    shipAMode: "orbit",
    shipARange: 5000,
    shipAAggressivity: 1,
    shipBAggressivity: 1,
    gridBrightness: 0.5,
    autoZoom: true,
    zoomFactor: 1,
    shipAMass: 1_000_000,
    shipAInertia: 3,
    shipASkillLevel: 5,
    shipAOverload: true,
    initialDistance: 6000,
    shipBSpeed: 250,
    shipBMode: "orbit",
    shipBRange: 6000,
    shipBMass: 1_000_000,
    shipBInertia: 3,
    shipBSig: 40,
    shipBSkillLevel: 5,
    shipBOverload: true,
    shipAHull: undefined,
    shipAPropulsion: undefined,
    shipBHull: undefined,
    shipBPropulsion: undefined,
    shipAFitting: undefined,
    shipAOverrides: {},
    shipBFitting: undefined,
    shipBOverrides: {},
    shipAFittedHull: undefined,
    shipBFittedHull: undefined,
    shipAAmmo: "Hail S",
    shipBAmmo: "Hail S",
    simSpeed: 2,
    language: "en",
  };
}

describe("DomControls", () => {
  test("facade reads turret, shipB sig, speed, grid brightness and config", () => {
    const { document, controls } = buildDomControls();
    const shipATurret = controls.getTurret("shipA");
    expect(shipATurret.optimal).toBe(1000);
    expect(shipATurret.falloff).toBe(3000);
    expect(controls.getSig("shipB")).toBe(36);
    expect(controls.getSpeed()).toBe(4);
    expect(controls.getGridBrightness()).toBe(0.2);
    const config = controls.getConfig();
    expect(config.shipA.maxSpeed).toBe(300);
    expect(config.shipB.maxSpeed).toBe(300);
    expect(config.initialDistance).toBe(5000);
    controls.setPlaying(true);
    expect(getFake(document, "play").textContent).toBe("button.pause");
  });

  test("play button is disabled while a side is empty and re-enables when both have hulls", () => {
    const { document, controls, cradle } = buildDomControls();
    controls.wireControls();
    expect(getFake(document, "play").disabled).toBe(true);
    cradle.cradle.shipASide.profile = RIFTER;
    controls.onConfigChange(false);
    expect(getFake(document, "play").disabled).toBe(true);
    cradle.cradle.shipBSide.profile = RIFTER;
    controls.onConfigChange(false);
    expect(getFake(document, "play").disabled).toBe(false);
    cradle.cradle.shipASide.profile = undefined;
    controls.onConfigChange(false);
    expect(getFake(document, "play").disabled).toBe(true);
  });

  test("hasGuns reflects whether the ship has a fitted turret on each side", () => {
    const { controls, cradle } = buildDomControls();
    expect(controls.hasGuns("shipA")).toBe(false);
    expect(controls.hasGuns("shipB")).toBe(false);
    cradle.cradle.shipATurretController.applyImported(IMPORTED_RIFTER);
    expect(controls.hasGuns("shipA")).toBe(true);
    expect(controls.hasGuns("shipB")).toBe(false);
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

    getFake(document, "ship-a-speed").value = "400";
    getFake(document, "ship-a-speed").trigger("input");
    expect(callbacks.onConfigChange).toHaveBeenCalledTimes(1);
    getFake(document, "ship-a-mass").value = "1200000";
    getFake(document, "ship-a-mass").trigger("input");
    expect(callbacks.onConfigChange).toHaveBeenCalledTimes(2);
    getFake(document, "ship-a-inertia").value = "2.5";
    getFake(document, "ship-a-inertia").trigger("input");
    expect(callbacks.onConfigChange).toHaveBeenCalledTimes(3);
    getFake(document, "ship-a-mode").value = "midships";
    getFake(document, "ship-a-mode").trigger("input");
    expect(callbacks.onConfigChange).toHaveBeenCalledTimes(4);

    getFake(document, "ship-a-tracking").value = "0.5";
    getFake(document, "ship-a-tracking").trigger("input");
    expect(callbacks.onDisplayChange).toHaveBeenCalledTimes(1);
    getFake(document, "ship-b-sig").value = "80";
    getFake(document, "ship-b-sig").trigger("input");
    expect(callbacks.onDisplayChange).toHaveBeenCalledTimes(2);
    getFake(document, "ship-a-optimal").value = "12345";
    getFake(document, "ship-a-optimal").trigger("input");
    expect(callbacks.onDisplayChange).toHaveBeenCalledTimes(3);
    getFake(document, "ship-a-falloff").value = "54321";
    getFake(document, "ship-a-falloff").trigger("input");
    expect(callbacks.onDisplayChange).toHaveBeenCalledTimes(4);
  });

  test("global pointerdown routes to popupGroup and previewManager", () => {
    const { document, cradle } = buildDomControls();
    const popupGroup = vi.spyOn(cradle.cradle.popupGroup, "onPointerDown");
    const previewManager = vi.spyOn(cradle.cradle.previewManager, "handlePointerDown");
    const fake = getFake(document, "ship-b-hull");
    const pointer = { type: "pointerdown", composedPath: () => [fake] } as unknown as PointerEvent;
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
    expect(config.shipA.maxSpeed).toBe(400);
    expect(config.shipB.maxSpeed).toBe(250);
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
    const shipAEwar: EwarLoadout = {
      webs: [{ moduleName: "Stasis Webifier I", maxRange: 10000, speedFactor: 0.5, overloadRangeBonusPercent: 15 }],
      grapplers: [],
      disruptors: [],
      scramblers: [],
      scripts: [],
    };
    cradle.cradle.ewarController.setLoadout("shipA", shipAEwar);
    const config = controls.getConfig();
    expect(config.shipA.ewar?.loadout.webs).toHaveLength(1);
    expect(config.shipA.ewar).not.toHaveProperty("overloaded");
    expect(config.shipA.ewar?.activation).toEqual({ webs: [{ active: true, overloaded: false }], grapplers: [], disruptors: [], scramblers: [] });
    expect(config.shipB.ewar).toBeUndefined();
  });

  test("getConfig includes ewar projection for the shipB side", () => {
    const { controls, cradle } = buildDomControls();
    const shipBEwar: EwarLoadout = {
      webs: [],
      grapplers: [],
      disruptors: [{
        moduleName: "Tracking Disruptor I", optimal: 1, falloff: 1, disruption: 0.2,
        defaultScript: undefined, overloadStrengthBonusPercent: 0,
      }],
      scramblers: [],
      scripts: [],
    };
    cradle.cradle.ewarController.setLoadout("shipB", shipBEwar);
    const config = controls.getConfig();
    expect(config.shipB.ewar?.loadout.disruptors).toHaveLength(1);
    expect(config.shipB.ewar).not.toHaveProperty("overloaded");
  });

  test("shipB fitting popup applies fitting to the shipB side", () => {
    const savedFittings = vi.mocked<SavedFittings>({ ...mockSavedFittings(), listForHull: vi.fn(() => [SAVED_RIFTER]) });
    const fittingImport = vi.mocked<FittingImport>({ ...mockFittingImport(), importFitting: vi.fn(() => IMPORTED_RIFTER) });
    const ships = vi.mocked<Ships>({ ...mockShips(), findHull: vi.fn(() => RIFTER) });
    const { document, controls } = buildDomControls({ savedFittings, fittingImport, ships });
    controls["shipASide"].profile = RIFTER;
    controls["shipBSide"].profile = RIFTER;
    getFake(document, "ship-b-fitting-trigger").trigger("click");
    const item = getFake(document, "ship-b-fitting-saved-list").children[0].children[0] as unknown as FakeElement;
    item.trigger("click");
    expect(controls["shipBSide"].fittingText).toBe(SAVED_RIFTER.text);
    expect(controls["shipASide"].fittingText).toBeUndefined();
  });

  test("getConfig uses a manually derived baseMaxSpeed for shipB and includes an active scrambler projection", () => {
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
    const shipBSide = controls["shipBSide"];
    shipBSide.profile = RIFTER;
    shipBSide.sections.propulsion.setPropulsionActive("mwd-5mn");
    shipBSide.sections.stats.updateShipStats({ updateInertia: true, updateMass: true, updateSig: true });
    cradle.cradle.ewarController.setLoadout("shipB", { webs: [], grapplers: [], disruptors: [], scramblers: [SCRAMBLER], scripts: [] });

    const config = controls.getConfig();
    expect(config.shipB.maxSpeed).toBe(1800);
    expect(config.shipB.baseMaxSpeed).toBe(300);
    expect(config.shipB.ewar?.loadout.scramblers).toHaveLength(1);
    expect(config.shipB.ewar?.activation?.scramblers).toEqual([{ active: true, overloaded: false }]);
  });

  test("update displays effective attributes and highlights affected values", () => {
    const { document, controls } = buildDomControls();
    const view = makeView(0);
    const sideA = sideReadoutValues(300, 0.32, 1000, 3000, 0.32, 2000, 3000);
    const sideB = sideReadoutValues(150, 0.32, 1000, 3000, 0.32, 1000, 3000);
    const effective: EffectiveReadouts = { shipA: sideA, shipB: sideB };
    controls.update(view, effective);
    expect(getFake(document, "effective-ship-a-speed").textContent).toBe("300 m/s");
    expect(getFake(document, "effective-ship-b-speed").textContent).toBe("150 m/s");
    expect(getFake(document, "effective-ship-a-tracking").textContent).toBe("0.32 rad/s");
    expect(getFake(document, "effective-ship-a-optimal").textContent).toBe("1,000 unit.meter");
    expect(getFake(document, "effective-ship-a-falloff").textContent).toBe("3,000 unit.meter");
    expect(getFake(document, "effective-ship-b-speed").classList.add).toHaveBeenCalledWith("is-negative");
    expect(getFake(document, "effective-ship-a-speed").classList.remove).toHaveBeenCalledWith("is-negative");
    expect(getFake(document, "effective-ship-a-optimal").classList.add).toHaveBeenCalledWith("is-negative");
    expect(getFake(document, "effective-ship-a-falloff").classList.remove).toHaveBeenCalledWith("is-negative");
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
    const view = makeView(0);
    const shipA = sideReadoutValues(300, 0.32, 1000, 3000, 0.32, 1000, 3000);
    const shipB = sideReadoutValues(150, 0.32, 1000, 3000, 0.32, 1000, 3000);
    const effective: EffectiveReadouts = { shipA, shipB };
    return { view, effective };
  }

  test("readouts update immediately when not playing", () => {
    const { controls, cradle } = buildDomControls({ now: () => 0 });
    const engagementUpdate = vi.spyOn(cradle.cradle.engagementReadout, "update");
    const effectiveUpdate = vi.spyOn(cradle.cradle.effectiveReadout, "update");
    const { view, effective } = readoutFixtures();
    controls.update(view, effective);
    controls.update(view, effective);
    expect(engagementUpdate).toHaveBeenCalledTimes(2);
    expect(effectiveUpdate).toHaveBeenCalledTimes(2);
  });

  test("readouts throttle while playing and resume after 50 ms", () => {
    let fakeNow = 0;
    const { controls, cradle } = buildDomControls({ now: () => fakeNow });
    const engagementUpdate = vi.spyOn(cradle.cradle.engagementReadout, "update");
    const effectiveUpdate = vi.spyOn(cradle.cradle.effectiveReadout, "update");
    const { view, effective } = readoutFixtures();
    controls.setPlaying(true);
    controls.update(view, effective);
    fakeNow = 10;
    controls.update(view, effective);
    fakeNow = 60;
    controls.update(view, effective);
    expect(engagementUpdate).toHaveBeenCalledTimes(2);
    expect(effectiveUpdate).toHaveBeenCalledTimes(2);
  });

  test("pause flushes the latest cached readouts even when the last tick was skipped", () => {
    let fakeNow = 0;
    const { controls, cradle } = buildDomControls({ now: () => fakeNow });
    const effectiveUpdate = vi.spyOn(cradle.cradle.effectiveReadout, "update");
    const { view, effective } = readoutFixtures();
    const effective2: EffectiveReadouts = { ...effective, shipB: { ...effective.shipB, speed: 50 } };
    controls.setPlaying(true);
    controls.update(view, effective);
    fakeNow = 10;
    controls.update(view, effective2);
    controls.setPlaying(false);
    expect(effectiveUpdate).toHaveBeenLastCalledWith(effective2);
    expect(effectiveUpdate).toHaveBeenCalledTimes(2);
  });
});
