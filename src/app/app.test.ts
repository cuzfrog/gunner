import {
  Vec2,
  type AttackAssessment,
  type DisruptionBreakdown,
  type DroneSimulator,
  type DroneSpec,
  type EngagementFrame,
  type EngagementFrameComposer,
  type EngagementView,
  type EwarProjection,
  type EwarResolver,
  type HitChanceBreakdown,
  type MissileBoosterResolver,
  type MissileSimulator,
  type ShipConfig,
  type ShipState,
  type SimConfig,
  type Simulation,
  type SimSnapshot,
  type SpeedBreakdown,
  type TurretSpec,
} from "../sim";
import { toTypeId } from "../gamedata/ids";
import type { Controls, ControlsCallbacks, Loop, Renderer } from "../ui";
import { AppImpl } from "./app";

const controls = vi.mocked<Controls>({
  getWeapon: vi.fn(),
  getWeapons: vi.fn(),
  getSig: vi.fn(),
  getConfig: vi.fn(),
  getSpeed: vi.fn(),
  getGridBrightness: vi.fn(),
  getAutoZoom: vi.fn(),
  getZoomFactor: vi.fn(),
  getWeaponRangeVisibility: vi.fn(() => "both" as const),
  getDroneRangeVisibility: vi.fn(() => "none" as const),
  getDroneControlRangeVisibility: vi.fn(() => "none" as const),
  getOverlays: vi.fn(() => []),
  hasWeapon: vi.fn(),
  update: vi.fn(),
  setPlaying: vi.fn(),
  setCallbacks: vi.fn(),
});
const simulation = vi.mocked<Simulation>({ step: vi.fn(), snapshot: vi.fn(), reset: vi.fn(), update: vi.fn() });
const droneSimulator = vi.mocked<DroneSimulator>({ reset: vi.fn(), update: vi.fn(), step: vi.fn(), states: vi.fn(() => []) });
const missileSimulator = vi.mocked<MissileSimulator>({ reset: vi.fn(), update: vi.fn(), step: vi.fn(), states: vi.fn(() => []), facts: vi.fn(() => ({ inFlightCount: 0, nearestTimeToImpact: 0, smoothedApplication: 0, interceptable: false })) });
const missileBoosterResolver = vi.mocked<MissileBoosterResolver>({ boostedMissile: vi.fn((m) => m) });
const engagementFrameComposer = vi.mocked<EngagementFrameComposer>({ compose: vi.fn() });
const renderer = vi.mocked<Renderer>({ draw: vi.fn(), setGridBrightness: vi.fn(), setWeaponRangeVisibility: vi.fn(), setDroneRangeVisibility: vi.fn(), setDroneControlRangeVisibility: vi.fn(), setManualZoom: vi.fn() });
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
  speedMultiplierIgnoringRange: vi.fn(() => 1), sigMultiplier: vi.fn(() => 1), sigMultiplierIgnoringRange: vi.fn(() => 1),
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
const turret: TurretSpec = { kind: "turret", tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: 0, cycleTime: 1, turretCount: 1 };
const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0 };
const shipConfig: ShipConfig = { id: "shipA", maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "orbit", desiredRange: 5000, aggressivity: 1 };
const config: SimConfig = {
  shipA: shipConfig,
  shipB: { ...shipConfig, id: "shipB" },
  initialDistance: 5000,
};

function baseView(): EngagementView {
  const assessment: AttackAssessment = {
    boostedWeapon: turret,
    effectiveWeapon: turret,
    damage: { nominalDps: 0, appliedDps: 0, application: 1, volley: 0 },
    turret: { hit, expectedMultiplier: 1 },
  };
  return { frame, attacks: { shipA: assessment, shipB: assessment }, weaponAttacks: { shipA: [], shipB: [] }, effectiveWeapons: { shipA: turret, shipB: turret } };
}

function sideReadoutValues(
  speed = 0,
  tracking = 0.32,
  optimal = 5000,
  falloff = 5000,
  boostedTracking = 0.32,
  boostedOptimal = 5000,
  boostedFalloff = 5000,
  speedBreakdown: SpeedBreakdown | undefined = emptySpeedBreakdown,
  trackingBreakdown: DisruptionBreakdown | undefined = emptyDisruptionBreakdown,
  optimalBreakdown: DisruptionBreakdown | undefined = emptyDisruptionBreakdown,
  falloffBreakdown: DisruptionBreakdown | undefined = emptyDisruptionBreakdown,
) {
  return { kind: "turret", speed, tracking, optimal, falloff, boostedTracking, boostedOptimal, boostedFalloff, sigResolution: 40, speedBreakdown, trackingBreakdown, optimalBreakdown, falloffBreakdown };
}

describe("AppImpl", () => {
  let app: AppImpl;

  beforeEach(() => {
    simulation.snapshot.mockReturnValue(snapshot);
    engagementFrameComposer.compose.mockReturnValue(baseView());
    controls.getWeapon.mockReturnValue(turret);
    controls.getWeapons.mockReturnValue([turret]);
    controls.getSig.mockReturnValue(40);
    controls.getSpeed.mockReturnValue(1);
    controls.getGridBrightness.mockReturnValue(0.2);
    controls.getConfig.mockReturnValue(config);
    controls.hasWeapon.mockReturnValue(true);
    ewarResolver.speedBreakdown.mockReturnValue(emptySpeedBreakdown);
    ewarResolver.disruptionBreakdown.mockReturnValue(emptyDisruptionBreakdown);
    app = new AppImpl({ controls, simulation, droneSimulator, missileSimulator, engagementFrameComposer, ewarResolver, missileBoosterResolver, renderer, loop });
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
    expect(renderer.setWeaponRangeVisibility).toHaveBeenCalledWith("both");
    expect(engagementFrameComposer.compose).toHaveBeenCalledWith(snapshot, { weapons: { shipA: [turret], shipB: [turret] }, sigRadii: { shipA: 40, shipB: 40 }, droneStates: { shipA: [], shipB: [] }, missileFacts: { shipA: [], shipB: [] } });
    expect(renderer.draw).toHaveBeenCalledWith(snapshot, frame, { shipA: { kind: "turret", optimal: 5000, falloff: 5000 }, shipB: { kind: "turret", optimal: 5000, falloff: 5000 } }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] });
    expect(controls.update).toHaveBeenCalledWith(baseView(), {
      shipA: sideReadoutValues(0, 0.32, 5000, 5000, 0.32, 5000, 5000),
      shipB: sideReadoutValues(0, 0.32, 5000, 5000, 0.32, 5000, 5000),
    });
  });

  test("renderFrame passes per-side effective attribute values and boosted baselines from view", () => {
    const effectiveTurret: TurretSpec = { kind: "turret", tracking: 0.5, sigResolution: 40, optimal: 6000, falloff: 4000, damagePerShot: 0, cycleTime: 1, turretCount: 1 };
    const boostedTurret: TurretSpec = { kind: "turret", tracking: 0.45, sigResolution: 40, optimal: 5800, falloff: 3800, damagePerShot: 0, cycleTime: 1, turretCount: 1 };
    const boostedShipA = { ...ship, maxSpeed: 250 };
    const boostedShipB = { ...ship, id: "shipB" as const, maxSpeed: 120 };
    const boostedSnapshot = { ...snapshot, shipA: boostedShipA, shipB: boostedShipB };
    const assessment: AttackAssessment = {
      boostedWeapon: boostedTurret,
      effectiveWeapon: effectiveTurret,
      damage: { nominalDps: 0, appliedDps: 0, application: 1, volley: 0 },
      turret: { hit, expectedMultiplier: 1 },
    };
    const view: EngagementView = {
      frame,
      attacks: { shipA: assessment, shipB: assessment },
      weaponAttacks: { shipA: [], shipB: [] },
      effectiveWeapons: { shipA: effectiveTurret, shipB: effectiveTurret },
    };
    simulation.snapshot.mockReturnValue(boostedSnapshot);
    engagementFrameComposer.compose.mockReturnValue(view);
    app = new AppImpl({ controls, simulation, droneSimulator, missileSimulator, engagementFrameComposer, ewarResolver, missileBoosterResolver, renderer, loop });
    app.start();
    expect(renderer.draw).toHaveBeenCalledWith(boostedSnapshot, frame, { shipA: { kind: "turret", optimal: 6000, falloff: 4000 }, shipB: { kind: "turret", optimal: 6000, falloff: 4000 } }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] });
    expect(controls.update).toHaveBeenCalledWith(view, {
      shipA: sideReadoutValues(250, 0.5, 6000, 4000, 0.45, 5800, 3800),
      shipB: sideReadoutValues(120, 0.5, 6000, 4000, 0.45, 5800, 3800),
    });
  });

  test("falls back to the view's effective weapon when the composer returns no assessment", () => {
    const view: EngagementView = { frame, attacks: { shipA: undefined, shipB: undefined }, weaponAttacks: { shipA: [], shipB: [] }, effectiveWeapons: { shipA: turret, shipB: turret } };
    engagementFrameComposer.compose.mockReturnValue(view);
    app = new AppImpl({ controls, simulation, droneSimulator, missileSimulator, engagementFrameComposer, ewarResolver, missileBoosterResolver, renderer, loop });
    app.start();
    expect(renderer.draw).toHaveBeenCalledWith(snapshot, frame, { shipA: { kind: "turret", optimal: 5000, falloff: 5000 }, shipB: { kind: "turret", optimal: 5000, falloff: 5000 } }, [], { shipA: [], shipB: [] }, { shipA: [], shipB: [] });
    expect(controls.update).toHaveBeenCalledWith(view, {
      shipA: sideReadoutValues(0, 0.32, 5000, 5000, 0.32, 5000, 5000),
      shipB: sideReadoutValues(0, 0.32, 5000, 5000, 0.32, 5000, 5000),
    });
  });

  test("tick steps the simulation and renders", () => {
    app.start();
    app.tick(0.1);
    expect(simulation.step).toHaveBeenCalledWith(0.1);
    expect(droneSimulator.step).toHaveBeenCalledWith(0.1, frame);
    expect(missileSimulator.step).toHaveBeenCalledWith(0.1, frame, { shipA: [], shipB: [] });
    expect(engagementFrameComposer.compose).toHaveBeenCalledTimes(3);
    expect(renderer.draw).toHaveBeenCalledTimes(2);
  });

  test("reset callback re-initializes the simulation and loop, then renders", () => {
    app.start();
    callbacks().onReset();
    expect(simulation.reset).toHaveBeenCalledWith(config);
    expect(missileSimulator.reset).toHaveBeenCalled();
    expect(loop.reset).toHaveBeenCalled();
    expect(renderer.draw).toHaveBeenCalledTimes(2);
  });

  test("config change updates the simulation and renders without restarting the loop", () => {
    app.start();
    droneSimulator.reset.mockClear();
    missileSimulator.reset.mockClear();
    callbacks().onConfigChange();
    expect(simulation.update).toHaveBeenCalledWith(config);
    expect(droneSimulator.update).toHaveBeenCalled();
    expect(missileSimulator.update).toHaveBeenCalled();
    expect(droneSimulator.reset).not.toHaveBeenCalled();
    expect(missileSimulator.reset).not.toHaveBeenCalled();
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

  test("passes per-side ewar breakdowns from the resolver into effective readouts", () => {
    const shipAEwar: EwarProjection = {
      loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], scripts: [] },
      activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [] },
    };
    const shipBEwar: EwarProjection = {
      loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], scripts: [] },
      activation: { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [] },
    };
    const shipAShip: ShipState = { ...ship, ewar: shipAEwar };
    const shipBShip: ShipState = { ...ship, id: "shipB", ewar: shipBEwar };
    simulation.snapshot.mockReturnValue({ ...snapshot, shipA: shipAShip, shipB: shipBShip });
    const shipASpeed: SpeedBreakdown = {
      effects: [{ family: "web" as const, moduleId: toTypeId("527"), multiplier: 0.45 }],
      propulsionSuppressed: false,
    };
    const shipBSpeed: SpeedBreakdown = {
      effects: [{ family: "scrambler" as const, moduleId: toTypeId("448"), multiplier: 1 }],
      propulsionSuppressed: true,
    };
    const disruptionA: DisruptionBreakdown = {
      tracking: [{ moduleId: toTypeId("2109"), scriptId: undefined, multiplier: 0.8281 }],
      optimal: [],
      falloff: [],
    };
    const disruptionB: DisruptionBreakdown = {
      tracking: [],
      optimal: [{ moduleId: toTypeId("2109"), scriptId: toTypeId("29005"), multiplier: 0.7 }],
      falloff: [],
    };
    ewarResolver.speedBreakdown.mockReturnValueOnce(shipASpeed).mockReturnValueOnce(shipBSpeed);
    ewarResolver.disruptionBreakdown.mockReturnValueOnce(disruptionA).mockReturnValueOnce(disruptionB);
    app.start();
    expect(ewarResolver.speedBreakdown).toHaveBeenNthCalledWith(1, shipBEwar, 5000);
    expect(ewarResolver.speedBreakdown).toHaveBeenNthCalledWith(2, shipAEwar, 5000);
    expect(ewarResolver.disruptionBreakdown).toHaveBeenNthCalledWith(1, shipBEwar, 5000);
    expect(ewarResolver.disruptionBreakdown).toHaveBeenNthCalledWith(2, shipAEwar, 5000);
    expect(controls.update).toHaveBeenCalledWith(baseView(), {
      shipA: { ...sideReadoutValues(0, 0.32, 5000, 5000, 0.32, 5000, 5000), speedBreakdown: shipASpeed, trackingBreakdown: disruptionA, optimalBreakdown: disruptionA, falloffBreakdown: disruptionA },
      shipB: { ...sideReadoutValues(0, 0.32, 5000, 5000, 0.32, 5000, 5000), speedBreakdown: shipBSpeed, trackingBreakdown: disruptionB, optimalBreakdown: disruptionB, falloffBreakdown: disruptionB },
    });
  });

  test("returns drone readout values when the effective weapon is a drone", () => {
    const drone: DroneSpec = {
      kind: "drone", tracking: 0.15, sigResolution: 40, optimal: 1000, falloff: 500,
      damagePerShot: 20, cycleTime: 4, droneCount: 5, maxVelocity: 6000, orbitSpeed: 1800, orbitRange: 1000, isSentry: false, controlRange: 60000,
    };
    const droneAssessment: AttackAssessment = {
      boostedWeapon: drone, effectiveWeapon: drone,
      damage: { nominalDps: 25, appliedDps: 20, application: 0.8, volley: 100 },
      drone: { hit, expectedMultiplier: 1, inRange: true, inWeaponRange: true, mode: "engaging", distanceToTarget: 1000, inControlRange: true },
    };
    const droneView: EngagementView = {
      frame,
      attacks: { shipA: droneAssessment, shipB: droneAssessment },
      weaponAttacks: { shipA: [], shipB: [] },
      effectiveWeapons: { shipA: drone, shipB: drone },
    };
    engagementFrameComposer.compose.mockReturnValue(droneView);
    controls.getWeapon.mockReturnValue(drone);
    controls.getWeapons.mockReturnValue([drone]);
    app = new AppImpl({ controls, simulation, droneSimulator, missileSimulator, engagementFrameComposer, ewarResolver, missileBoosterResolver, renderer, loop });
    app.start();
    expect(renderer.draw).toHaveBeenCalledWith(snapshot, frame, { shipA: { kind: "drone", optimal: 1000, falloff: 500 }, shipB: { kind: "drone", optimal: 1000, falloff: 500 } }, [], { shipA: [{ positions: [new Vec2(0, 0)], optimal: 1000, falloff: 500, controlRange: 60000 }], shipB: [{ positions: [new Vec2(0, 0)], optimal: 1000, falloff: 500, controlRange: 60000 }] }, { shipA: [], shipB: [] });
    expect(controls.update).toHaveBeenCalledWith(droneView, {
      shipA: { kind: "drone", speed: 0, tracking: 0.15, optimal: 1000, falloff: 500, sigResolution: 40, speedBreakdown: emptySpeedBreakdown },
      shipB: { kind: "drone", speed: 0, tracking: 0.15, optimal: 1000, falloff: 500, sigResolution: 40, speedBreakdown: emptySpeedBreakdown },
    });
  });
});
