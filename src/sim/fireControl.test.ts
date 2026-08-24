import { Vec2 } from "./vec2";
import { EngagementEvaluatorImpl } from "./fireControl";
import type { EwarResolver } from "./ewarResolver";
import type { HitChance } from "./hitChance";
import type { Kinematics } from "./kinematics";
import type { EngagementFrame, HitChanceBreakdown, ShipState, SimSnapshot, TurretSpec } from "./types";

const turret: TurretSpec = { tracking: 0.1, sigResolution: 40, optimal: 5000, falloff: 5000 };
const effectiveTurret: TurretSpec = { tracking: 0.05, sigResolution: 40, optimal: 4000, falloff: 4000 };
const hit: HitChanceBreakdown = { chance: 0.8, trackingTerm: 0.1, rangeTerm: 0.1 };

const attacker: ShipState = {
  id: "attacker",
  maxSpeed: 1000,
  mass: 1_000_000,
  inertiaModifier: 1,
  mode: "keepAtRange",
  desiredRange: 5000,
  aggressivity: 1,
  position: new Vec2(0, 0),
  velocity: new Vec2(0, 0),
  ewar: { loadout: { webs: [], disruptors: [], scripts: [] }, activation: { webs: [], disruptors: [] } },
};

const target: ShipState = {
  id: "target",
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
  attacker,
  target,
  relPosition: new Vec2(0, 6000),
  distance: 6000,
  relVelocity: new Vec2(0, 0),
  radialVelocity: 0,
  transversalVelocity: new Vec2(0, 0),
  transversalSpeed: 0,
  angularVelocity: 0,
};

const snapshot: SimSnapshot = { time: 1, attacker, target, commands: { attacker: new Vec2(0, 0), target: new Vec2(0, 0) } };

function makeEvaluator(): {
  kinematics: Kinematics;
  hitChance: HitChance;
  ewarResolver: EwarResolver;
  evaluator: EngagementEvaluatorImpl;
} {
  const kinematics = vi.mocked<Kinematics>({ computeEngagement: vi.fn(() => frame) });
  const hitChance = vi.mocked<HitChance>({ compute: vi.fn(() => hit), findBestDistance: vi.fn() });
  const ewarResolver = vi.mocked<EwarResolver>({ webSpeedMultiplier: vi.fn(() => 1), disruptedTurret: vi.fn(() => effectiveTurret) });
  const evaluator = new EngagementEvaluatorImpl({ kinematics, hitChance, ewarResolver });
  return { kinematics, hitChance, ewarResolver, evaluator };
}

describe("EngagementEvaluatorImpl", () => {
  test("evaluates attacker attack using target ewar", () => {
    const { kinematics, hitChance, ewarResolver, evaluator } = makeEvaluator();
    const result = evaluator.evaluate(snapshot, { attacker: { turret, targetSigRadius: 40 } });
    expect(result.attacker).toEqual({ effectiveTurret, hit });
    expect(result.target).toBeUndefined();
    expect(kinematics.computeEngagement).toHaveBeenCalledWith(attacker, target, 1);
    expect(ewarResolver.disruptedTurret).toHaveBeenCalledWith(turret, target.ewar, 6000);
    expect(hitChance.compute).toHaveBeenCalledWith(frame, effectiveTurret, 40);
  });

  test("evaluates target attack using attacker ewar", () => {
    const { kinematics, hitChance, ewarResolver, evaluator } = makeEvaluator();
    const result = evaluator.evaluate(snapshot, { target: { turret, targetSigRadius: 30 } });
    expect(result.target).toEqual({ effectiveTurret, hit });
    expect(result.attacker).toBeUndefined();
    expect(kinematics.computeEngagement).toHaveBeenCalledWith(target, attacker, 1);
    expect(ewarResolver.disruptedTurret).toHaveBeenCalledWith(turret, attacker.ewar, 6000);
    expect(hitChance.compute).toHaveBeenCalledWith(frame, effectiveTurret, 30);
  });

  test("returns empty result when no attacks are requested", () => {
    const { kinematics, hitChance, ewarResolver, evaluator } = makeEvaluator();
    const result = evaluator.evaluate(snapshot, {});
    expect(result.attacker).toBeUndefined();
    expect(result.target).toBeUndefined();
    expect(kinematics.computeEngagement).not.toHaveBeenCalled();
    expect(ewarResolver.disruptedTurret).not.toHaveBeenCalled();
    expect(hitChance.compute).not.toHaveBeenCalled();
  });

  test("uses effective turret for renderer and hit for readout", () => {
    const { evaluator } = makeEvaluator();
    const result = evaluator.evaluate(snapshot, { attacker: { turret, targetSigRadius: 40 } });
    expect(result.attacker!.effectiveTurret).not.toEqual(turret);
    expect(result.attacker!.hit).toEqual(hit);
  });
});
