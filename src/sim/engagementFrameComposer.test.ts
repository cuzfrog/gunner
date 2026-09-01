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

const input = { weapons: { shipA: [shipATurret] as const, shipB: [shipBTurret] as const }, sigRadii: { shipA: 30, shipB: 40 }, droneStates: { shipA: [], shipB: [] } as const, missileFacts: { shipA: [], shipB: [] } as const };

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
    expect(view.weaponAttacks.shipA).toHaveLength(1);
    expect(view.weaponAttacks.shipA[0].weapon).toBe(shipATurret);
    expect(view.weaponAttacks.shipA[0].assessment).toEqual(shipAAssessment);
    expect(view.weaponAttacks.shipB).toHaveLength(1);
    expect(view.weaponAttacks.shipB[0].weapon).toBe(shipBTurret);
    expect(view.weaponAttacks.shipB[0].assessment).toEqual(shipBAssessment);
    expect(kinematics.computeEngagement).toHaveBeenCalledWith(shipA, shipB, 1);
    expect(kinematics.computeEngagement).toHaveBeenCalledTimes(1);
    expect(engagementEvaluator.evaluate).toHaveBeenCalledWith(frame, {
      shipA: { weapon: shipATurret, opponentSigRadius: 40, droneState: undefined },
      shipB: { weapon: shipBTurret, opponentSigRadius: 30, droneState: undefined },
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
    const view = composer.compose(snapshot, { weapons: { shipA: [], shipB: [] }, sigRadii: { shipA: 30, shipB: 40 }, droneStates: { shipA: [], shipB: [] }, missileFacts: { shipA: [], shipB: [] } });
    expect(view.attacks.shipA).toBeUndefined();
    expect(view.attacks.shipB).toBeUndefined();
    expect(view.effectiveWeapons.shipA).toBeUndefined();
    expect(view.effectiveWeapons.shipB).toBeUndefined();
  });

  test("multiple weapons on one side sum DPS while keeping primary weapon details", () => {
    const { engagementEvaluator, composer } = makeComposer();
    const secondTurret: TurretSpec = { kind: "turret", tracking: 0.2, sigResolution: 125, optimal: 7000, falloff: 3000, damagePerShot: 50, cycleTime: 4, turretCount: 2 };
    const secondDamage = { nominalDps: 25, appliedDps: 20, application: 0.8, volley: 100 };
    const secondAssessment: AttackAssessment = {
      boostedWeapon: secondTurret,
      effectiveWeapon: secondTurret,
      damage: secondDamage,
      turret: { hit: { chance: 0.8, trackingTerm: 0.1, rangeTerm: 0.1 }, expectedMultiplier: 0.8 },
    };
    engagementEvaluator.evaluate.mockImplementation((_frame, attacks) => {
      if (attacks.shipA?.weapon === shipATurret) return { shipA: shipAAssessment, shipB: undefined };
      if (attacks.shipA?.weapon === secondTurret) return { shipA: secondAssessment, shipB: undefined };
      return { shipA: undefined, shipB: undefined };
    });
    const multiInput = { weapons: { shipA: [shipATurret, secondTurret] as const, shipB: [] as const }, sigRadii: { shipA: 30, shipB: 40 }, droneStates: { shipA: [], shipB: [] } as const, missileFacts: { shipA: [], shipB: [] } as const };
    const view = composer.compose(snapshot, multiInput);
    expect(view.attacks.shipA).toBeDefined();
    expect(view.attacks.shipA!.damage.nominalDps).toBe(shipADamage.nominalDps + secondDamage.nominalDps);
    expect(view.attacks.shipA!.damage.appliedDps).toBe(shipADamage.appliedDps + secondDamage.appliedDps);
    expect(view.attacks.shipA!.damage.volley).toBe(shipADamage.volley + secondDamage.volley);
    expect(view.attacks.shipA!.effectiveWeapon).toBe(effectiveTurret);
    expect(view.attacks.shipB).toBeUndefined();
    expect(view.weaponAttacks.shipA).toHaveLength(2);
    expect(view.weaponAttacks.shipA[0].weapon).toBe(shipATurret);
    expect(view.weaponAttacks.shipA[0].assessment).toEqual(shipAAssessment);
    expect(view.weaponAttacks.shipA[1].weapon).toBe(secondTurret);
    expect(view.weaponAttacks.shipA[1].assessment).toEqual(secondAssessment);
    expect(view.weaponAttacks.shipB).toHaveLength(0);
  });
});
