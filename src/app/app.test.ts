import { EMPTY_DEFENSE_ASSESSMENT, EMPTY_DEFENSE_SPEC, EMPTY_PROJECTION, Vec2, ZERO_DAMAGE, type AttackAssessment, type DefenseView, type DroneRuntimeState, type DroneSpec, type EngineConfig, type EngineEvents, type EngineView, type EngagementFrame, type EngagementView, type HitChanceBreakdown, type MissileRuntimeState, type ShipState, type SimConfig, type SimSnapshot, type TurretSpec } from "../sim";
import type { Controls, ControlsCallbacks, Loop, Renderer } from "../ui";
import type { EngagementEngine } from "../sim";
import type { Side } from "../sim";
import { AppImpl } from "./app";

const LOCKED_STATE = { status: "locked" as const, progress: 1, remaining: 0, lockTime: 0, inRange: true };

const ship: ShipState = {
  id: "shipA", position: new Vec2(0, 0), velocity: new Vec2(0, 0), maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "orbit", desiredRange: 5000, aggressivity: 1,
};
const snapshot: SimSnapshot = { time: 0, shipA: ship, shipB: { ...ship, id: "shipB", position: new Vec2(0, 5000) }, commands: { shipA: new Vec2(0, 0), shipB: new Vec2(0, 0) } };
const frame: EngagementFrame = {
  time: 0, shipA: ship, shipB: { ...ship, id: "shipB" }, relPosition: new Vec2(0, 5000), distance: 5000, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0,
};
const turret: TurretSpec = { kind: "turret", tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: ZERO_DAMAGE, cycleTime: 1, turretCount: 1 };
const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0, trackingPenalty: 1, rangePenalty: 1 };
const shipConfig: SimConfig = {
  shipA: { id: "shipA", maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "orbit", desiredRange: 5000, aggressivity: 1 },
  shipB: { id: "shipB", maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "orbit", desiredRange: 5000, aggressivity: 1 },
  initialDistance: 5000,
};

const emptyDefenseView: DefenseView = {
  pools: { shipA: { shield: 0, armor: 0, hull: 0 }, shipB: { shield: 0, armor: 0, hull: 0 } },
  poolPercentages: { shipA: { shield: 0, armor: 0, hull: 0 }, shipB: { shield: 0, armor: 0, hull: 0 } },
  dead: { shipA: false, shipB: false },
  deadAt: { shipA: undefined, shipB: undefined },
  damageEnabled: { shipA: true, shipB: true },
  shieldRegenPerSecond: { shipA: 0, shipB: 0 },
  repairers: { shipA: [], shipB: [] },
  repairMode: { shipA: "auto", shipB: "auto" },
  rah: { shipA: undefined, shipB: undefined },
};

const engineConfig: EngineConfig = {
  sim: shipConfig,
  weapons: { shipA: [turret], shipB: [turret] },
  sigRadii: { shipA: 40, shipB: 40 },
  defense: {
    shipA: EMPTY_DEFENSE_SPEC, shipB: EMPTY_DEFENSE_SPEC,
    damageEnabled: { shipA: true, shipB: true },
    repairMode: { shipA: "auto", shipB: "auto" },
    repairerActivation: { shipA: [], shipB: [] },
    rahActivation: { shipA: undefined, shipB: undefined },
  },
  overloaded: { shipA: false, shipB: false },
};

function baseView(): EngineView {
  const assessment: AttackAssessment = {
    boostedWeapon: turret, effectiveWeapon: turret,
    damage: { nominalDps: 0, appliedDps: 0, application: 1, volley: 0, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE },
    turret: { hit, expectedMultiplier: 1 },
  };
  const engagementView: EngagementView = {
    frame, attacks: { shipA: assessment, shipB: assessment }, weaponAttacks: { shipA: [], shipB: [] },
    effectiveWeapons: { shipA: turret, shipB: turret },
    defenses: { shipA: EMPTY_DEFENSE_ASSESSMENT, shipB: EMPTY_DEFENSE_ASSESSMENT },
    projection: { shipA: EMPTY_PROJECTION, shipB: EMPTY_PROJECTION },
    locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE },
    readouts: { shipA: { kind: "none", speed: 0 }, shipB: { kind: "none", speed: 0 } },
  };
  return {
    ...engagementView,
    snapshot,
    defenseRuntime: emptyDefenseView,
    drones: { shipA: [], shipB: [] },
    droneSpecs: { shipA: [], shipB: [] },
    missiles: { shipA: [], shipB: [] },
  };
}

const controls = vi.mocked<Controls>({
  getWeapon: vi.fn(),
  getSig: vi.fn(),
  getConfig: vi.fn(),
  getEngineConfig: vi.fn(() => engineConfig),
  getSpeed: vi.fn(() => 1),
  getGridBrightness: vi.fn(() => 0.2),
  getAutoZoom: vi.fn(),
  getZoomFactor: vi.fn(),
  getWeaponRangeVisibility: vi.fn(() => "both" as const),
  getDroneRangeVisibility: vi.fn(() => "none" as const),
  getDroneControlRangeVisibility: vi.fn(() => "none" as const),
  getOverlays: vi.fn(() => []),
  hasWeapon: vi.fn(),
  setPlaying: vi.fn(),
  setCallbacks: vi.fn(),
});

const viewListeners = new Set<(view: EngineView) => void>();
const destroyListeners = new Set<(side: Side) => void>();
const engineEvents: EngineEvents = {
  onViewUpdated: (l) => viewListeners.add(l),
  offViewUpdated: (l) => viewListeners.delete(l),
  onShipDestroyed: (l) => destroyListeners.add(l),
  offShipDestroyed: (l) => destroyListeners.delete(l),
};
function emitView(view: EngineView): void { for (const l of Array.from(viewListeners)) l(view); }
function emitDestroy(side: Side): void { for (const l of Array.from(destroyListeners)) l(side); }

const engine = vi.mocked<EngagementEngine>({
  reset: vi.fn(() => { const v = baseView(); emitView(v); return v; }),
  update: vi.fn(() => { const v = baseView(); emitView(v); return v; }),
  step: vi.fn(() => { const v = baseView(); emitView(v); return v; }),
  view: vi.fn(() => baseView()),
  events: vi.fn(() => engineEvents),
  setDamageEnabled: vi.fn(),
  setRepairMode: vi.fn(),
  setRepairerActivation: vi.fn(),
  setRahActivation: vi.fn(),
});

const renderer = vi.mocked<Renderer>({ draw: vi.fn(), setGridBrightness: vi.fn(), setWeaponRangeVisibility: vi.fn(), setDroneRangeVisibility: vi.fn(), setDroneControlRangeVisibility: vi.fn(), setManualZoom: vi.fn(), setLockStates: vi.fn() });
const loop = vi.mocked<Loop>({
  setTickHandler: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  toggle: vi.fn(),
  isRunning: vi.fn(),
  setSpeed: vi.fn(),
  reset: vi.fn(),
});

describe("AppImpl", () => {
  let app: AppImpl;

  beforeEach(() => {
    controls.getWeapon.mockReturnValue(turret);
    controls.hasWeapon.mockReturnValue(true);
    viewListeners.clear();
    destroyListeners.clear();
    engine.reset.mockImplementation(() => { const v = baseView(); emitView(v); return v; });
    engine.update.mockImplementation(() => { const v = baseView(); emitView(v); return v; });
    engine.step.mockImplementation(() => { const v = baseView(); emitView(v); return v; });
    engine.view.mockReturnValue(baseView());
    app = new AppImpl({ controls, engine, renderer, loop });
  });

  function callbacks(): ControlsCallbacks {
    return controls.setCallbacks.mock.calls.at(-1)![0];
  }

  test("start wires the loop, controls callbacks, resets the engine, and renders the initial frame via view event", () => {
    app.start();
    expect(loop.setTickHandler).toHaveBeenCalled();
    expect(loop.setSpeed).toHaveBeenCalledWith(1);
    expect(controls.setCallbacks).toHaveBeenCalled();
    expect(engine.reset).toHaveBeenCalledWith(engineConfig);
    expect(renderer.setGridBrightness).toHaveBeenCalledWith(0.2);
    expect(renderer.draw).toHaveBeenCalledTimes(1);
  });

  test("tick delegates only to engine.step; no direct death check in tick", () => {
    app.start();
    renderer.draw.mockClear();
    engine.step.mockClear();
    app.tick(0.1);
    expect(engine.step).toHaveBeenCalledWith(0.1);
  });

  test("shipDestroyed event stops the loop and sets playing false", () => {
    app.start();
    loop.stop.mockClear();
    controls.setPlaying.mockClear();
    emitDestroy("shipA");
    expect(loop.stop).toHaveBeenCalled();
    expect(controls.setPlaying).toHaveBeenCalledWith(false);
  });

  test("reset callback re-initializes the engine and loop; rendering is driven by view event", () => {
    app.start();
    engine.reset.mockClear();
    renderer.draw.mockClear();
    callbacks().onReset();
    expect(engine.reset).toHaveBeenCalledWith(engineConfig);
    expect(loop.reset).toHaveBeenCalled();
    expect(renderer.draw).toHaveBeenCalledTimes(1);
  });

  test("config change updates the engine without restarting the loop; rendering is driven by view event", () => {
    app.start();
    engine.update.mockClear();
    loop.reset.mockClear();
    renderer.draw.mockClear();
    callbacks().onConfigChange();
    expect(engine.update).toHaveBeenCalledWith(engineConfig);
    expect(loop.reset).not.toHaveBeenCalled();
    expect(renderer.draw).toHaveBeenCalledTimes(1);
  });

  test("display change re-renders from engine.view() without stepping the engine", () => {
    app.start();
    engine.step.mockClear();
    const before = renderer.draw.mock.calls.length;
    callbacks().onDisplayChange();
    expect(renderer.draw).toHaveBeenCalledTimes(before + 1);
    expect(engine.step).not.toHaveBeenCalled();
  });

  test("play/pause toggles the loop and reflects its state in the controls", () => {
    loop.isRunning.mockReturnValue(true);
    app.start();
    callbacks().onPlayPause();
    expect(loop.toggle).toHaveBeenCalled();
    expect(controls.setPlaying).toHaveBeenCalledWith(true);
  });

  test("stop halts the loop and sets playing to false", () => {
    app.start();
    callbacks().onStop();
    expect(loop.stop).toHaveBeenCalled();
    expect(controls.setPlaying).toHaveBeenCalledWith(false);
  });

  test("speed change is forwarded to the loop", () => {
    app.start();
    callbacks().onSpeedChange(4);
    expect(loop.setSpeed).toHaveBeenCalledWith(4);
  });

  test("renderFrame passes engine view snapshot, frame, weapon ranges, and defense runtime to renderer", () => {
    app.start();
    expect(renderer.draw).toHaveBeenCalledWith(snapshot, frame, { shipA: { kind: "turret", optimal: 5000, falloff: 5000 }, shipB: { kind: "turret", optimal: 5000, falloff: 5000 } }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] }, emptyDefenseView);
  });

  test("renderFrame passes drone render info from engine view drone states and specs", () => {
    const drone: DroneSpec = { kind: "drone", tracking: 0.15, sigResolution: 40, optimal: 1000, falloff: 500, damagePerShot: ZERO_DAMAGE, cycleTime: 4, droneCount: 5, maxVelocity: 6000, orbitSpeed: 1800, orbitRange: 1000, isSentry: false, controlRange: 60000 };
    const droneState: DroneRuntimeState = { mode: "engaging", positions: [new Vec2(100, 200)], distanceToTarget: 1000, distanceToSlot: 100, inControlRange: true };
    const droneView: EngineView = {
      ...baseView(),
      effectiveWeapons: { shipA: drone, shipB: drone },
      drones: { shipA: [droneState], shipB: [droneState] },
      droneSpecs: { shipA: [drone], shipB: [drone] },
    };
    engine.reset.mockImplementation(() => { emitView(droneView); return droneView; });
    engine.view.mockReturnValue(droneView);
    app.start();
    expect(renderer.draw).toHaveBeenCalledWith(snapshot, frame, { shipA: { kind: "drone", optimal: 1000, falloff: 500 }, shipB: { kind: "drone", optimal: 1000, falloff: 500 } }, [], { shipA: [{ positions: [new Vec2(100, 200)], optimal: 1000, falloff: 500, controlRange: 60000 }], shipB: [{ positions: [new Vec2(100, 200)], optimal: 1000, falloff: 500, controlRange: 60000 }] }, { shipA: [], shipB: [] }, emptyDefenseView);
  });

  test("renderFrame passes missile render info from engine view missile states", () => {
    const missileState: MissileRuntimeState = { position: new Vec2(50, 60), velocity: new Vec2(1, 0), trail: [new Vec2(0, 0)], side: "shipA", weaponIndex: 0 };
    const missileView: EngineView = {
      ...baseView(),
      missiles: { shipA: [missileState], shipB: [] },
    };
    engine.reset.mockImplementation(() => { emitView(missileView); return missileView; });
    engine.view.mockReturnValue(missileView);
    app.start();
    const drawCall = renderer.draw.mock.calls[0];
    const missileInfo = drawCall[5];
    expect(missileInfo).toEqual({ shipA: [{ position: new Vec2(50, 60), velocity: new Vec2(1, 0), trail: [new Vec2(0, 0)] }], shipB: [] });
  });
});
