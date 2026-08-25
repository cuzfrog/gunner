import { Vec2 } from "./vec2";
import { EngagementFrameComposerImpl } from "./engagementFrameComposer";
import type { EngagementEvaluator } from "./fireControl";
import type { HitChance } from "./hitChance";
import type { Kinematics } from "./kinematics";
import type { EngagementFrame, HitChanceBreakdown, ShipState, SimSnapshot, TurretSpec } from "./types";

const turret: TurretSpec = { tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000 };
const boostedTurret: TurretSpec = { tracking: 0.45, sigResolution: 40, optimal: 5800, falloff: 3800 };
const effectiveTurret: TurretSpec = { tracking: 0.5, sigResolution: 40, optimal: 6000, falloff: 4000 };
const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0 };

const attacker: ShipState = {
  id: "attacker",
  maxSpeed: 250,
  mass: 1_200_000,
  inertiaModifier: 3,
  mode: "orbit",
  desiredRange: 5000,
  aggressivity: 1,
  position: new Vec2(0, 0),
  velocity: new Vec2(0, 0),
};

const target: ShipState = {
  id: "target",
  maxSpeed: 120,
  mass: 1_200_000,
  inertiaModifier: 3,
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

const input = { turret, targetSigRadius: 40 };

function makeComposer() {
  const kinematics = vi.mocked<Kinematics>({ computeEngagement: vi.fn(() => frame) });
  const hitChance = vi.mocked<HitChance>({ compute: vi.fn(() => hit), findBestDistance: vi.fn() });
  const engagementEvaluator = vi.mocked<EngagementEvaluator>({
    evaluate: vi.fn(() => ({ attacker: { boostedTurret, effectiveTurret, hit } })),
  });
  const composer = new EngagementFrameComposerImpl({ kinematics, hitChance, engagementEvaluator });
  return { kinematics, hitChance, engagementEvaluator, composer };
}

describe("EngagementFrameComposerImpl", () => {
  test("composes a view from the engagement evaluator result", () => {
    const { kinematics, engagementEvaluator, composer } = makeComposer();
    const view = composer.compose(snapshot, input);
    expect(view.frame).toBe(frame);
    expect(view.assessment).toEqual({ boostedTurret, effectiveTurret, hit });
    expect(view.effectiveTurret).toBe(effectiveTurret);
    expect(view.hit).toBe(hit);
    expect(kinematics.computeEngagement).toHaveBeenCalledWith(attacker, target, 1);
    expect(engagementEvaluator.evaluate).toHaveBeenCalledWith(snapshot, {
      attacker: { turret: input.turret, targetSigRadius: input.targetSigRadius },
    });
  });

  test("falls back to raw hitChance and the base turret when the evaluator returns no attacker assessment", () => {
    const { hitChance, engagementEvaluator, composer } = makeComposer();
    const fallbackHit: HitChanceBreakdown = { chance: 0.5, trackingTerm: 0.25, rangeTerm: 0.5 };
    engagementEvaluator.evaluate.mockReturnValue({});
    hitChance.compute.mockReturnValue(fallbackHit);
    const view = composer.compose(snapshot, input);
    expect(view.assessment).toBeUndefined();
    expect(view.effectiveTurret).toEqual(turret);
    expect(view.hit).toBe(fallbackHit);
    expect(hitChance.compute).toHaveBeenCalledWith(frame, turret, input.targetSigRadius);
    expect(engagementEvaluator.evaluate).toHaveBeenCalledWith(snapshot, {
      attacker: { turret: input.turret, targetSigRadius: input.targetSigRadius },
    });
  });
});
