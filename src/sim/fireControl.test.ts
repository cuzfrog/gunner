import { Vec2 } from "./vec2";
import { EngagementEvaluatorImpl } from "./fireControl";
import type { EwarResolver } from "./ewarResolver";
import type { HitChance } from "./hitChance";
import type { Kinematics } from "./kinematics";
import type { TurretBoosterResolver } from "./turretBoosterResolver";
import type { EngagementFrame, HitChanceBreakdown, ShipState, SimSnapshot, TurretSpec } from "./types";

const turret: TurretSpec = { tracking: 0.1, sigResolution: 40, optimal: 5000, falloff: 5000 };
const boostedTurret: TurretSpec = { tracking: 0.11, sigResolution: 40, optimal: 5500, falloff: 5000 };
const effectiveTurret: TurretSpec = { tracking: 0.05, sigResolution: 40, optimal: 4000, falloff: 4000 };
const hit: HitChanceBreakdown = { chance: 0.8, trackingTerm: 0.1, rangeTerm: 0.1 };

const shipA: ShipState = {
  id: "shipA",
  maxSpeed: 1000,
  mass: 1_000_000,
  inertiaModifier: 1,
  mode: "keepAtRange",
  desiredRange: 5000,
  aggressivity: 1,
  position: new Vec2(0, 0),
  velocity: new Vec2(0, 0),
  ewar: {
    loadout: { webs: [], grapplers: [], disruptors: [], scramblers: [], scripts: [] },
    activation: { webs: [], grapplers: [], disruptors: [], scramblers: [] },
  },
};

const shipB: ShipState = {
  id: "shipB",
  maxSpeed: 1000,
  mass: 1_000_000,
  inertiaModifier: 1,
  mode: "orbit",
  desiredRange: 5000,
  aggressivity: 1,
  position: new Vec2(0, 6000),
  velocity: new Vec2(0, 0),
};

const frame: EngagementFrame = {
  time: 1,
  shipA,
  shipB,
  relPosition: new Vec2(0, 6000),
  distance: 6000,
  relVelocity: new Vec2(0, 0),
  radialVelocity: 0,
  transversalVelocity: new Vec2(0, 0),
  transversalSpeed: 0,
  angularVelocity: 0,
};

const snapshot: SimSnapshot = { time: 1, shipA, shipB, commands: { shipA: new Vec2(0, 0), shipB: new Vec2(0, 0) } };

function makeEvaluator(): {
  kinematics: Kinematics;
  hitChance: HitChance;
  ewarResolver: EwarResolver;
  turretBoosterResolver: TurretBoosterResolver;
  evaluator: EngagementEvaluatorImpl;
} {
  const kinematics = vi.mocked<Kinematics>({ computeEngagement: vi.fn(() => frame) });
  const hitChance = vi.mocked<HitChance>({ compute: vi.fn(() => hit), findBestDistance: vi.fn() });
  const ewarResolver = vi.mocked<EwarResolver>({
    speedMultiplier: vi.fn(() => 1),
    speedMultiplierIgnoringRange: vi.fn(() => 1),
    appliedEffects: vi.fn(() => []),
    disruptedTurret: vi.fn(() => effectiveTurret),
    disruptedTurretIgnoringRange: vi.fn(() => effectiveTurret),
    propulsionSuppressed: vi.fn(() => false),
    propulsionSuppressedIgnoringRange: vi.fn(() => false),
    speedBreakdown: vi.fn(() => ({ effects: [], propulsionSuppressed: false })),
    disruptionBreakdown: vi.fn(() => ({ tracking: [], optimal: [], falloff: [] })),
  });
  const turretBoosterResolver = vi.mocked<TurretBoosterResolver>({ boostedTurret: vi.fn(() => boostedTurret) });
  const evaluator = new EngagementEvaluatorImpl({ kinematics, hitChance, ewarResolver, turretBoosterResolver });
  return { kinematics, hitChance, ewarResolver, turretBoosterResolver, evaluator };
}

describe("EngagementEvaluatorImpl", () => {
  test("evaluates shipA attack using shipB ewar", () => {
    const { kinematics, hitChance, ewarResolver, evaluator } = makeEvaluator();
    const result = evaluator.evaluate(snapshot, { shipA: { turret, shipBSigRadius: 40 } });
    expect(result.shipA).toEqual({ boostedTurret, effectiveTurret, hit });
    expect(result.shipB).toBeUndefined();
    expect(kinematics.computeEngagement).toHaveBeenCalledWith(shipA, shipB, 1);
    expect(ewarResolver.disruptedTurret).toHaveBeenCalledWith(boostedTurret, shipB.ewar, 6000);
    expect(hitChance.compute).toHaveBeenCalledWith(frame, effectiveTurret, 40);
  });

  test("evaluates shipB attack using shipA ewar", () => {
    const { kinematics, hitChance, ewarResolver, evaluator } = makeEvaluator();
    const result = evaluator.evaluate(snapshot, { shipB: { turret, shipBSigRadius: 30 } });
    expect(result.shipB).toEqual({ boostedTurret, effectiveTurret, hit });
    expect(result.shipA).toBeUndefined();
    expect(kinematics.computeEngagement).toHaveBeenCalledWith(shipB, shipA, 1);
    expect(ewarResolver.disruptedTurret).toHaveBeenCalledWith(boostedTurret, shipA.ewar, 6000);
    expect(hitChance.compute).toHaveBeenCalledWith(frame, effectiveTurret, 30);
  });

  test("applies own boosts before enemy disruption", () => {
    const { ewarResolver, turretBoosterResolver, evaluator } = makeEvaluator();
    const boosted: TurretSpec = { tracking: 0.12, sigResolution: 40, optimal: 5500, falloff: 5500 };
    vi.mocked(turretBoosterResolver.boostedTurret).mockReturnValue(boosted);
    const shipAWithBoosts = { ...shipA, boosts: { loadout: { computers: [], scripts: [] } } };
    const snapshotWithBoosts = { ...snapshot, shipA: shipAWithBoosts };
    const result = evaluator.evaluate(snapshotWithBoosts, { shipA: { turret, shipBSigRadius: 40 } });
    expect(result.shipA?.boostedTurret).toEqual(boosted);
    expect(result.shipA?.effectiveTurret).toEqual(effectiveTurret);
    expect(turretBoosterResolver.boostedTurret).toHaveBeenCalledWith(turret, shipAWithBoosts.boosts);
    expect(ewarResolver.disruptedTurret).toHaveBeenCalledWith(boosted, shipB.ewar, 6000);
  });

  test("returns empty result when no attacks are requested", () => {
    const { kinematics, hitChance, ewarResolver, evaluator } = makeEvaluator();
    const result = evaluator.evaluate(snapshot, {});
    expect(result.shipA).toBeUndefined();
    expect(result.shipB).toBeUndefined();
    expect(kinematics.computeEngagement).not.toHaveBeenCalled();
    expect(ewarResolver.disruptedTurret).not.toHaveBeenCalled();
    expect(hitChance.compute).not.toHaveBeenCalled();
  });

  test("uses effective turret for renderer and hit for readout", () => {
    const { evaluator } = makeEvaluator();
    const result = evaluator.evaluate(snapshot, { shipA: { turret, shipBSigRadius: 40 } });
    expect(result.shipA!.effectiveTurret).not.toEqual(turret);
    expect(result.shipA!.hit).toEqual(hit);
  });
});
