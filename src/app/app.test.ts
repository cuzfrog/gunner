import {
  Vec2,
  type AttackAssessment,
  type DisruptionBreakdown,
  type EngagementFrame,
  type EngagementFrameComposer,
  type EngagementView,
  type EwarProjection,
  type EwarResolver,
  type HitChanceBreakdown,
  type ShipConfig,
  type ShipState,
  type SimConfig,
  type Simulation,
  type SimSnapshot,
  type SpeedBreakdown,
  type TurretSpec,
} from "../sim";
import type { Controls, ControlsCallbacks, Loop, Renderer } from "../ui";
import { AppImpl } from "./app";

const controls = vi.mocked<Controls>({
  getTurret: vi.fn(),
  getShipBSig: vi.fn(),
  getConfig: vi.fn(),
  getSpeed: vi.fn(),
  getGridBrightness: vi.fn(),
  getAutoZoom: vi.fn(),
  getZoomFactor: vi.fn(),
  getOverlays: vi.fn(() => []),
  hasShipAGuns: vi.fn(),
  update: vi.fn(),
  setPlaying: vi.fn(),
  setCallbacks: vi.fn(),
});
const simulation = vi.mocked<Simulation>({ step: vi.fn(), snapshot: vi.fn(), reset: vi.fn(), update: vi.fn() });
const engagementFrameComposer = vi.mocked<EngagementFrameComposer>({ compose: vi.fn() });
const renderer = vi.mocked<Renderer>({ draw: vi.fn(), setGridBrightness: vi.fn(), setRangeRingsEnabled: vi.fn(), setManualZoom: vi.fn() });
const loop = vi.mocked<Loop>({
  setTickHandler: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  toggle: vi.fn(),
  isRunning: vi.fn(),
  setSpeed: vi.fn(),
  reset: vi.fn(),
});
const ewarResolver = vi.mocked<Required<EwarResolver>>({
  speedMultiplier: vi.fn(() => 1),
  speedMultiplierIgnoringRange: vi.fn(() => 1),
  disruptedTurret: vi.fn((turret) => turret),
  disruptedTurretIgnoringRange: vi.fn((turret) => turret),
  propulsionSuppressed: vi.fn(() => false),
  propulsionSuppressedIgnoringRange: vi.fn(() => false),
  appliedEffects: vi.fn(() => []),
  speedBreakdown: vi.fn(),
  disruptionBreakdown: vi.fn(),
});

const emptySpeedBreakdown: SpeedBreakdown = { effects: [], propulsionSuppressed: false };
const emptyDisruptionBreakdown: DisruptionBreakdown = { tracking: [], optimal: [], falloff: [] };

const ship: ShipState = {
  id: "shipA",
  position: new Vec2(0, 0),
  velocity: new Vec2(0, 0),
  maxSpeed: 0,
  mass: 1_200_000,
  inertiaModifier: 3,
  mode: "orbit",
  desiredRange: 5000,
  aggressivity: 1,
};
const snapshot: SimSnapshot = { time: 0, shipA: ship, shipB: ship, commands: { shipA: new Vec2(0, 0), shipB: new Vec2(0, 0) } };
const frame: EngagementFrame = {
  time: 0,
  shipA: ship,
  shipB: ship,
  relPosition: new Vec2(0, 5000),
  distance: 5000,
  relVelocity: new Vec2(0, 0),
  radialVelocity: 0,
  transversalVelocity: new Vec2(0, 0),
  transversalSpeed: 0,
  angularVelocity: 0,
};
const turret: TurretSpec = { tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000 };
const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0 };
const shipConfig: ShipConfig = { id: "shipA", maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "orbit", desiredRange: 5000, aggressivity: 1 };
const config: SimConfig = {
  shipA: shipConfig,
  shipB: { ...shipConfig, id: "shipB" },
  initialDistance: 5000,
};

function baseView(): EngagementView {
  const assessment: AttackAssessment = { boostedTurret: turret, effectiveTurret: turret, hit };
  return { frame, assessment, effectiveTurret: turret, hit };
}

describe("AppImpl", () => {
  let app: AppImpl;

  beforeEach(() => {
    simulation.snapshot.mockReturnValue(snapshot);
    engagementFrameComposer.compose.mockReturnValue(baseView());
    controls.getTurret.mockReturnValue(turret);
    controls.getShipBSig.mockReturnValue(40);
    controls.getSpeed.mockReturnValue(1);
    controls.getGridBrightness.mockReturnValue(0.2);
    controls.getConfig.mockReturnValue(config);
    ewarResolver.speedBreakdown.mockReturnValue(emptySpeedBreakdown);
    ewarResolver.disruptionBreakdown.mockReturnValue(emptyDisruptionBreakdown);
    app = new AppImpl({ controls, simulation, engagementFrameComposer, ewarResolver, renderer, loop });
  });

  function callbacks(): ControlsCallbacks {
    return controls.setCallbacks.mock.calls.at(-1)![0];
  }

  test("start wires the loop, controls callbacks, and renders the initial frame", () => {
    app.start();
    expect(loop.setTickHandler).toHaveBeenCalled();
    expect(loop.setSpeed).toHaveBeenCalledWith(1);
    expect(controls.setCallbacks).toHaveBeenCalled();
    expect(controls.getGridBrightness).toHaveBeenCalled();
    expect(renderer.setGridBrightness).toHaveBeenCalledWith(0.2);
    expect(engagementFrameComposer.compose).toHaveBeenCalledWith(snapshot, { turret, shipBSigRadius: 40 });
    expect(renderer.draw).toHaveBeenCalledWith(snapshot, frame, hit, turret, []);
    expect(controls.update).toHaveBeenCalledWith(frame, hit, {
      shipASpeed: 0, shipBSpeed: 0, tracking: 0.32, optimal: 5000, falloff: 5000,
      boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 5000,
      shipASpeedBreakdown: emptySpeedBreakdown, shipBSpeedBreakdown: emptySpeedBreakdown,
      trackingBreakdown: emptyDisruptionBreakdown, optimalBreakdown: emptyDisruptionBreakdown, falloffBreakdown: emptyDisruptionBreakdown,
    });
  });

  test("renderFrame passes effective attribute values and boosted baselines from view", () => {
    const effectiveTurret: TurretSpec = { tracking: 0.5, sigResolution: 40, optimal: 6000, falloff: 4000 };
    const boostedTurret: TurretSpec = { tracking: 0.45, sigResolution: 40, optimal: 5800, falloff: 3800 };
    const boostedShipA = { ...ship, maxSpeed: 250 };
    const boostedShipB = { ...ship, id: "shipB" as const, maxSpeed: 120 };
    const boostedSnapshot = { ...snapshot, shipA: boostedShipA, shipB: boostedShipB };
    const view: EngagementView = {
      frame,
      assessment: { boostedTurret, effectiveTurret, hit },
      effectiveTurret,
      hit,
    };
    simulation.snapshot.mockReturnValue(boostedSnapshot);
    engagementFrameComposer.compose.mockReturnValue(view);
    app = new AppImpl({ controls, simulation, engagementFrameComposer, ewarResolver, renderer, loop });
    app.start();
    expect(renderer.draw).toHaveBeenCalledWith(boostedSnapshot, frame, hit, effectiveTurret, []);
    expect(controls.update).toHaveBeenCalledWith(frame, hit, {
      shipASpeed: 250, shipBSpeed: 120, tracking: 0.5, optimal: 6000, falloff: 4000,
      boostedTracking: 0.45, boostedOptimal: 5800, boostedFalloff: 3800,
      shipASpeedBreakdown: emptySpeedBreakdown, shipBSpeedBreakdown: emptySpeedBreakdown,
      trackingBreakdown: emptyDisruptionBreakdown, optimalBreakdown: emptyDisruptionBreakdown, falloffBreakdown: emptyDisruptionBreakdown,
    });
  });

  test("falls back to the view's effective turret when the composer returns no assessment", () => {
    const view: EngagementView = { frame, assessment: undefined, effectiveTurret: turret, hit };
    engagementFrameComposer.compose.mockReturnValue(view);
    app = new AppImpl({ controls, simulation, engagementFrameComposer, ewarResolver, renderer, loop });
    app.start();
    expect(renderer.draw).toHaveBeenCalledWith(snapshot, frame, hit, turret, []);
    expect(controls.update).toHaveBeenCalledWith(frame, hit, {
      shipASpeed: 0, shipBSpeed: 0, tracking: 0.32, optimal: 5000, falloff: 5000,
      boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 5000,
      shipASpeedBreakdown: emptySpeedBreakdown, shipBSpeedBreakdown: emptySpeedBreakdown,
      trackingBreakdown: emptyDisruptionBreakdown, optimalBreakdown: emptyDisruptionBreakdown, falloffBreakdown: emptyDisruptionBreakdown,
    });
  });

  test("tick steps the simulation and renders", () => {
    app.start();
    app.tick(0.1);
    expect(simulation.step).toHaveBeenCalledWith(0.1);
    expect(engagementFrameComposer.compose).toHaveBeenCalledTimes(2);
    expect(renderer.draw).toHaveBeenCalledTimes(2);
  });

  test("reset callback re-initializes the simulation and loop, then renders", () => {
    app.start();
    callbacks().onReset();
    expect(simulation.reset).toHaveBeenCalledWith(config);
    expect(loop.reset).toHaveBeenCalled();
    expect(renderer.draw).toHaveBeenCalledTimes(2);
  });

  test("config change updates the simulation and renders without restarting the loop", () => {
    app.start();
    callbacks().onConfigChange();
    expect(simulation.update).toHaveBeenCalledWith(config);
    expect(loop.reset).not.toHaveBeenCalled();
    expect(renderer.draw).toHaveBeenCalledTimes(2);
  });

  test("display change sets grid brightness and re-renders without stepping the simulation", () => {
    controls.getGridBrightness.mockReturnValue(0.63);
    app.start();
    const before = renderer.draw.mock.calls.length;
    callbacks().onDisplayChange();
    expect(renderer.setGridBrightness).toHaveBeenLastCalledWith(0.63);
    expect(renderer.draw).toHaveBeenCalledTimes(before + 1);
    expect(simulation.step).not.toHaveBeenCalled();
  });

  test("play/pause toggles the loop and reflects its state in the controls", () => {
    loop.isRunning.mockReturnValue(true);
    app.start();
    callbacks().onPlayPause();
    expect(loop.toggle).toHaveBeenCalled();
    expect(controls.setPlaying).toHaveBeenCalledWith(true);
  });

  test("speed change is forwarded to the loop", () => {
    app.start();
    callbacks().onSpeedChange(4);
    expect(loop.setSpeed).toHaveBeenCalledWith(4);
  });

  test("passes ewar breakdowns from the resolver into effective readouts", () => {
    const shipAEwar: EwarProjection = {
      loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], scripts: [] },
      activation: { webs: [], grapplers: [], disruptors: [], scramblers: [] },
    };
    const shipBEwar: EwarProjection = {
      loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], scripts: [] },
      activation: { webs: [], grapplers: [], disruptors: [], scramblers: [] },
    };
    const shipAShip: ShipState = { ...ship, ewar: shipAEwar };
    const shipBShip: ShipState = { ...ship, id: "shipB", ewar: shipBEwar };
    simulation.snapshot.mockReturnValue({ ...snapshot, shipA: shipAShip, shipB: shipBShip });
    const shipASpeed: SpeedBreakdown = {
      effects: [{ family: "web" as const, moduleName: "Stasis Webifier II", multiplier: 0.45 }],
      propulsionSuppressed: false,
    };
    const shipBSpeed: SpeedBreakdown = {
      effects: [{ family: "scrambler" as const, moduleName: "Warp Scrambler II", multiplier: 1 }],
      propulsionSuppressed: true,
    };
    const disruption: DisruptionBreakdown = {
      tracking: [{ moduleName: "Tracking Disruptor II", scriptName: undefined, multiplier: 0.8281 }],
      optimal: [],
      falloff: [],
    };
    ewarResolver.speedBreakdown.mockReturnValueOnce(shipASpeed).mockReturnValueOnce(shipBSpeed);
    ewarResolver.disruptionBreakdown.mockReturnValue(disruption);
    app.start();
    expect(ewarResolver.speedBreakdown).toHaveBeenNthCalledWith(1, shipBEwar, 5000);
    expect(ewarResolver.speedBreakdown).toHaveBeenNthCalledWith(2, shipAEwar, 5000);
    expect(ewarResolver.disruptionBreakdown).toHaveBeenCalledWith(shipBEwar, 5000);
    expect(controls.update).toHaveBeenCalledWith(frame, hit, {
      shipASpeed: 0, shipBSpeed: 0, tracking: 0.32, optimal: 5000, falloff: 5000,
      boostedTracking: 0.32, boostedOptimal: 5000, boostedFalloff: 5000,
      shipASpeedBreakdown: shipASpeed, shipBSpeedBreakdown: shipBSpeed,
      trackingBreakdown: disruption, optimalBreakdown: disruption, falloffBreakdown: disruption,
    });
  });
});
