import { Vec2 } from "./vec2";
import { EngagementFrameComposerImpl } from "./engagementFrameComposer";
import type { EngagementEvaluator } from "./fireControl";
import type { HitChance } from "./hitChance";
import type { Kinematics } from "./kinematics";
import type { EngagementFrame, HitChanceBreakdown, ShipState, SimSnapshot, TurretSpec } from "./types";

const shipATurret: TurretSpec = { tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000 };
const shipBTurret: TurretSpec = { tracking: 0.28, sigResolution: 125, optimal: 8000, falloff: 4000 };
const boostedTurret: TurretSpec = { tracking: 0.45, sigResolution: 40, optimal: 5800, falloff: 3800 };
const effectiveTurret: TurretSpec = { tracking: 0.5, sigResolution: 40, optimal: 6000, falloff: 4000 };
const shipBEffectiveTurret: TurretSpec = { tracking: 0.3, sigResolution: 125, optimal: 8500, falloff: 4000 };
const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0 };
const shipBHit: HitChanceBreakdown = { chance: 0.7, trackingTerm: 0.2, rangeTerm: 0.3 };

const shipA: ShipState = {
  id: "shipA",
  maxSpeed: 250,
  mass: 1_200_000,
  inertiaModifier: 3,
  mode: "orbit",
  desiredRange: 5000,
  aggressivity: 1,
  position: new Vec2(0, 0),
  velocity: new Vec2(0, 0),
};

const shipB: ShipState = {
  id: "shipB",
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

const input = { turrets: { shipA: shipATurret, shipB: shipBTurret }, sigRadii: { shipA: 30, shipB: 40 } };

function makeComposer() {
  const kinematics = vi.mocked<Kinematics>({ computeEngagement: vi.fn(() => frame) });
  const hitChance = vi.mocked<HitChance>({ compute: vi.fn(() => hit), findBestDistance: vi.fn() });
  const engagementEvaluator = vi.mocked<EngagementEvaluator>({
    evaluate: vi.fn(() => ({
      shipA: { boostedTurret, effectiveTurret, hit },
      shipB: { boostedTurret, effectiveTurret: shipBEffectiveTurret, hit: shipBHit },
    })),
  });
  const composer = new EngagementFrameComposerImpl({ kinematics, hitChance, engagementEvaluator });
  return { kinematics, hitChance, engagementEvaluator, composer };
}

describe("EngagementFrameComposerImpl", () => {
  test("composes a view from the engagement evaluator result", () => {
    const { kinematics, engagementEvaluator, composer } = makeComposer();
    const view = composer.compose(snapshot, input);
    expect(view.frame).toBe(frame);
    expect(view.attacks.shipA).toEqual({ boostedTurret, effectiveTurret, hit });
    expect(view.attacks.shipB).toEqual({ boostedTurret, effectiveTurret: shipBEffectiveTurret, hit: shipBHit });
    expect(view.effectiveTurrets.shipA).toBe(effectiveTurret);
    expect(view.effectiveTurrets.shipB).toBe(shipBEffectiveTurret);
    expect(view.hits.shipA).toBe(hit);
    expect(view.hits.shipB).toBe(shipBHit);
    expect(kinematics.computeEngagement).toHaveBeenCalledWith(shipA, shipB, 1);
    expect(kinematics.computeEngagement).toHaveBeenCalledTimes(1);
    expect(engagementEvaluator.evaluate).toHaveBeenCalledWith(frame, {
      shipA: { turret: shipATurret, targetSigRadius: 40 },
      shipB: { turret: shipBTurret, targetSigRadius: 30 },
    });
  });

  test("falls back to raw hitChance and the base turret when the evaluator returns no assessment", () => {
    const { hitChance, engagementEvaluator, composer } = makeComposer();
    const fallbackHitA: HitChanceBreakdown = { chance: 0.5, trackingTerm: 0.25, rangeTerm: 0.5 };
    const fallbackHitB: HitChanceBreakdown = { chance: 0.4, trackingTerm: 0.3, rangeTerm: 0.4 };
    engagementEvaluator.evaluate.mockReturnValue({ shipA: undefined, shipB: undefined });
    hitChance.compute.mockReturnValueOnce(fallbackHitA).mockReturnValueOnce(fallbackHitB);
    const view = composer.compose(snapshot, input);
    expect(view.attacks.shipA).toBeUndefined();
    expect(view.attacks.shipB).toBeUndefined();
    expect(view.effectiveTurrets.shipA).toEqual(shipATurret);
    expect(view.effectiveTurrets.shipB).toEqual(shipBTurret);
    expect(view.hits.shipA).toBe(fallbackHitA);
    expect(view.hits.shipB).toBe(fallbackHitB);
    expect(hitChance.compute).toHaveBeenNthCalledWith(1, frame, shipATurret, 40);
    expect(hitChance.compute).toHaveBeenNthCalledWith(2, frame, shipBTurret, 30);
    expect(engagementEvaluator.evaluate).toHaveBeenCalledWith(frame, {
      shipA: { turret: shipATurret, targetSigRadius: 40 },
      shipB: { turret: shipBTurret, targetSigRadius: 30 },
    });
  });
});
