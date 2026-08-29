import { Vec2 } from "./vec2";
import { EngagementFrameComposerImpl } from "./engagementFrameComposer";
import type { EngagementEvaluator } from "./fireControl";
import type { Kinematics } from "./kinematics";
import type { AttackAssessment } from "./fireControl";
import type { EngagementFrame, ShipState, SimSnapshot, TurretSpec } from "./types";

const shipATurret: TurretSpec = { kind: "turret", tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: 100, cycleTime: 5, turretCount: 1 };
const shipBTurret: TurretSpec = { kind: "turret", tracking: 0.28, sigResolution: 125, optimal: 8000, falloff: 4000, damagePerShot: 100, cycleTime: 5, turretCount: 1 };
const boostedTurret: TurretSpec = { kind: "turret", tracking: 0.45, sigResolution: 40, optimal: 5800, falloff: 3800, damagePerShot: 100, cycleTime: 5, turretCount: 1 };
const effectiveTurret: TurretSpec = { kind: "turret", tracking: 0.5, sigResolution: 40, optimal: 6000, falloff: 4000, damagePerShot: 100, cycleTime: 5, turretCount: 1 };
const shipBEffectiveTurret: TurretSpec = { kind: "turret", tracking: 0.3, sigResolution: 125, optimal: 8500, falloff: 4000, damagePerShot: 100, cycleTime: 5, turretCount: 1 };
const hit = { chance: 1, trackingTerm: 0, rangeTerm: 0 };
const shipBHit = { chance: 0.7, trackingTerm: 0.2, rangeTerm: 0.3 };
const shipADamage = { nominalDps: 20, appliedDps: 20, application: 1, volley: 100 };
const shipBDamage = { nominalDps: 20, appliedDps: 14, application: 0.7, volley: 100 };

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

const input = { weapons: { shipA: shipATurret, shipB: shipBTurret } as const, sigRadii: { shipA: 30, shipB: 40 } };

const shipAAssessment: AttackAssessment = {
  boostedWeapon: boostedTurret,
  effectiveWeapon: effectiveTurret,
  damage: shipADamage,
  turret: { hit, expectedMultiplier: 1 },
};
const shipBAssessment: AttackAssessment = {
  boostedWeapon: boostedTurret,
  effectiveWeapon: shipBEffectiveTurret,
  damage: shipBDamage,
  turret: { hit: shipBHit, expectedMultiplier: 0.7 },
};

function makeComposer() {
  const kinematics = vi.mocked<Kinematics>({ computeEngagement: vi.fn(() => frame) });
  const engagementEvaluator = vi.mocked<EngagementEvaluator>({
    evaluate: vi.fn(() => ({ shipA: shipAAssessment, shipB: shipBAssessment })),
  });
  const composer = new EngagementFrameComposerImpl({ kinematics, engagementEvaluator });
  return { kinematics, engagementEvaluator, composer };
}

describe("EngagementFrameComposerImpl", () => {
  test("composes a view from the engagement evaluator result", () => {
    const { kinematics, engagementEvaluator, composer } = makeComposer();
    const view = composer.compose(snapshot, input);
    expect(view.frame).toBe(frame);
    expect(view.attacks.shipA).toEqual(shipAAssessment);
    expect(view.attacks.shipB).toEqual(shipBAssessment);
    expect(view.effectiveWeapons.shipA).toBe(effectiveTurret);
    expect(view.effectiveWeapons.shipB).toBe(shipBEffectiveTurret);
    expect(kinematics.computeEngagement).toHaveBeenCalledWith(shipA, shipB, 1);
    expect(kinematics.computeEngagement).toHaveBeenCalledTimes(1);
    expect(engagementEvaluator.evaluate).toHaveBeenCalledWith(frame, {
      shipA: { weapon: shipATurret, opponentSigRadius: 40 },
      shipB: { weapon: shipBTurret, opponentSigRadius: 30 },
    });
  });

  test("effectiveWeapons falls back to input weapons when evaluator returns no assessment", () => {
    const { engagementEvaluator, composer } = makeComposer();
    engagementEvaluator.evaluate.mockReturnValue({ shipA: undefined, shipB: undefined });
    const view = composer.compose(snapshot, input);
    expect(view.attacks.shipA).toBeUndefined();
    expect(view.attacks.shipB).toBeUndefined();
    expect(view.effectiveWeapons.shipA).toBe(shipATurret);
    expect(view.effectiveWeapons.shipB).toBe(shipBTurret);
  });

  test("undefined weapon yields undefined attack and undefined effective weapon", () => {
    const { engagementEvaluator, composer } = makeComposer();
    engagementEvaluator.evaluate.mockReturnValue({ shipA: undefined, shipB: undefined });
    const view = composer.compose(snapshot, { weapons: { shipA: undefined, shipB: undefined }, sigRadii: { shipA: 30, shipB: 40 } });
    expect(view.attacks.shipA).toBeUndefined();
    expect(view.attacks.shipB).toBeUndefined();
    expect(view.effectiveWeapons.shipA).toBeUndefined();
    expect(view.effectiveWeapons.shipB).toBeUndefined();
    expect(engagementEvaluator.evaluate).toHaveBeenCalledWith(frame, {
      shipA: undefined,
      shipB: undefined,
    });
  });
});
