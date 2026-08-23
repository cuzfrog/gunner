import { Vec2, type AttackAssessment, type EngagementEvaluator, type EngagementFrame, type HitChance, type HitChanceBreakdown, type Kinematics, type ShipConfig, type ShipState, type SimConfig, type Simulation, type SimSnapshot, type TurretSpec } from "../sim";
import type { Controls, ControlsCallbacks, Loop, Renderer } from "../ui";
import { AppImpl } from "./app";

const controls = vi.mocked<Controls>({
  getTurret: vi.fn(),
  getTargetSig: vi.fn(),
  getConfig: vi.fn(),
  getSpeed: vi.fn(),
  getGridBrightness: vi.fn(),
  update: vi.fn(),
  setPlaying: vi.fn(),
  setCallbacks: vi.fn(),
});
const simulation = vi.mocked<Simulation>({ step: vi.fn(), snapshot: vi.fn(), reset: vi.fn(), update: vi.fn() });
const kinematics = vi.mocked<Kinematics>({ computeEngagement: vi.fn() });
const hitChance = vi.mocked<HitChance>({ compute: vi.fn(), findBestDistance: vi.fn() });
const engagementEvaluator = vi.mocked<EngagementEvaluator>({ evaluate: vi.fn() });
const renderer = vi.mocked<Renderer>({ draw: vi.fn(), setGridBrightness: vi.fn() });
const loop = vi.mocked<Loop>({
  setTickHandler: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  toggle: vi.fn(),
  isRunning: vi.fn(),
  setSpeed: vi.fn(),
  reset: vi.fn(),
});

const ship: ShipState = {
  id: "attacker",
  position: new Vec2(0, 0),
  velocity: new Vec2(0, 0),
  maxSpeed: 0,
  mass: 1_200_000,
  inertiaModifier: 3,
  mode: "orbit",
  desiredRange: 5000,
  aggressivity: 1,
};
const snapshot: SimSnapshot = { time: 0, attacker: ship, target: ship, commands: { attacker: new Vec2(0, 0), target: new Vec2(0, 0) } };
const frame: EngagementFrame = {
  time: 0,
  attacker: ship,
  target: ship,
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
const shipConfig: ShipConfig = { id: "attacker", maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "orbit", desiredRange: 5000, aggressivity: 1 };
const config: SimConfig = {
  attacker: shipConfig,
  target: { ...shipConfig, id: "target" },
  initialDistance: 5000,
};

describe("AppImpl", () => {
  let app: AppImpl;

  beforeEach(() => {
    const assessment: AttackAssessment = { effectiveTurret: turret, hit };
    simulation.snapshot.mockReturnValue(snapshot);
    kinematics.computeEngagement.mockReturnValue(frame);
    engagementEvaluator.evaluate.mockReturnValue({ attacker: assessment });
    hitChance.compute.mockReturnValue(hit);
    controls.getTurret.mockReturnValue(turret);
    controls.getTargetSig.mockReturnValue(40);
    controls.getSpeed.mockReturnValue(1);
    controls.getGridBrightness.mockReturnValue(0.2);
    controls.getConfig.mockReturnValue(config);
    app = new AppImpl({ controls, simulation, kinematics, hitChance, engagementEvaluator, renderer, loop });
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
    expect(renderer.draw).toHaveBeenCalledWith(snapshot, frame, hit, turret);
    expect(controls.update).toHaveBeenCalledWith(frame, hit);
  });

  test("falls back to hitChance and the base turret when engagement evaluator returns no attacker assessment", () => {
    engagementEvaluator.evaluate.mockReturnValue({});
    app = new AppImpl({ controls, simulation, kinematics, hitChance, engagementEvaluator, renderer, loop });
    app.start();
    expect(hitChance.compute).toHaveBeenCalledWith(frame, turret, 40);
    expect(renderer.draw).toHaveBeenCalledWith(snapshot, frame, hit, turret);
    expect(controls.update).toHaveBeenCalledWith(frame, hit);
  });

  test("tick steps the simulation and renders", () => {
    app.start();
    app.tick(0.1);
    expect(simulation.step).toHaveBeenCalledWith(0.1);
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
});
