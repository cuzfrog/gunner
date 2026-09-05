import { Vec2 } from "./vec2";
import { EngagementFrameComposerImpl } from "./engagementFrameComposer";
import type { EngagementEvaluator } from "./fireControl";
import type { Kinematics } from "./kinematics";
import type { AttackAssessment } from "./fireControl";
import type { DefenseAssessor } from "./defenseAssessment";
import type { EwarResolver } from "./ewarResolver";
import { EwarResolverImpl } from "./ewarResolver";
import { StackingPenaltyImpl } from "./stackingPenalty";
import { DefenseAssessorImpl } from "./defenseAssessment";
import { type DefenseSpec, type DroneSpec, type EngagementFrame, type MissileSpec, type ShipState, type SimSnapshot, type TurretSpec, EMPTY_DEFENSE_SPEC, EMPTY_PROJECTION, ZERO_DAMAGE, damageVectorAdd } from "./types";

const shipATurret: TurretSpec = { kind: "turret", tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 1 };
const shipBTurret: TurretSpec = { kind: "turret", tracking: 0.28, sigResolution: 125, optimal: 8000, falloff: 4000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 1 };
const boostedTurret: TurretSpec = { kind: "turret", tracking: 0.45, sigResolution: 40, optimal: 5800, falloff: 3800, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 1 };
const effectiveTurret: TurretSpec = { kind: "turret", tracking: 0.5, sigResolution: 40, optimal: 6000, falloff: 4000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 1 };
const shipBEffectiveTurret: TurretSpec = { kind: "turret", tracking: 0.3, sigResolution: 125, optimal: 8500, falloff: 4000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 1 };
const hit = { chance: 1, trackingTerm: 0, rangeTerm: 0, trackingPenalty: 1, rangePenalty: 1 };
const shipBHit = { chance: 0.7, trackingTerm: 0.2, rangeTerm: 0.3, trackingPenalty: 0.5 ** 0.2, rangePenalty: 0.5 ** 0.3 };
const shipADamage = { nominalDps: 20, appliedDps: 20, application: 1, volley: 100, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE };
const shipBDamage = { nominalDps: 20, appliedDps: 14, application: 0.7, volley: 100, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE };
const LOCKED_STATE = { status: "locked" as const, progress: 1, remaining: 0, lockTime: 0, inRange: true };

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

const input = { weapons: { shipA: [shipATurret] as const, shipB: [shipBTurret] as const }, sigRadii: { shipA: 30, shipB: 40 }, droneStates: { shipA: [], shipB: [] } as const, missileFacts: { shipA: [], shipB: [] } as const, defenses: { shipA: EMPTY_DEFENSE_SPEC, shipB: EMPTY_DEFENSE_SPEC } as const, overloaded: { shipA: false, shipB: false } as const, locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE } };

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
  const defenseAssessor: DefenseAssessor = new DefenseAssessorImpl();
  const ewarResolver: EwarResolver = new EwarResolverImpl({ stackingPenalty: new StackingPenaltyImpl() });
  const composer = new EngagementFrameComposerImpl({ kinematics, engagementEvaluator, defenseAssessor, ewarResolver });
  return { kinematics, engagementEvaluator, composer };
}

describe("EngagementFrameComposerImpl", () => {
  test("composes a view from the engagement evaluator result", () => {
    const { kinematics, engagementEvaluator, composer } = makeComposer();
    const view = composer.compose(snapshot, input);
    expect(view.frame).toBe(frame);
    expect(view.attacks.shipA).toEqual(shipAAssessment);
    expect(view.attacks.shipB).toEqual(shipBAssessment);
    expect(view.projection).toEqual({ shipA: EMPTY_PROJECTION, shipB: EMPTY_PROJECTION });
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
      shipA: { weapon: shipATurret, opponentSigRadius: 40, droneState: undefined, missileFacts: undefined, locked: true },
      shipB: { weapon: shipBTurret, opponentSigRadius: 30, droneState: undefined, missileFacts: undefined, locked: true },
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
    const view = composer.compose(snapshot, { weapons: { shipA: [], shipB: [] }, sigRadii: { shipA: 30, shipB: 40 }, droneStates: { shipA: [], shipB: [] }, missileFacts: { shipA: [], shipB: [] }, defenses: { shipA: EMPTY_DEFENSE_SPEC, shipB: EMPTY_DEFENSE_SPEC }, overloaded: { shipA: false, shipB: false }, locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE } });
    expect(view.attacks.shipA).toBeUndefined();
    expect(view.attacks.shipB).toBeUndefined();
    expect(view.effectiveWeapons.shipA).toBeUndefined();
    expect(view.effectiveWeapons.shipB).toBeUndefined();
  });

  test("multiple weapons on one side sum DPS while keeping primary weapon details", () => {
    const { engagementEvaluator, composer } = makeComposer();
    const secondTurret: TurretSpec = { kind: "turret", tracking: 0.2, sigResolution: 125, optimal: 7000, falloff: 3000, damagePerShot: { em: 0, thermal: 0, kinetic: 50, explosive: 0 }, cycleTime: 4, turretCount: 2 };
    const secondDamage = { nominalDps: 25, appliedDps: 20, application: 0.8, volley: 100, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE };
    const secondAssessment: AttackAssessment = {
      boostedWeapon: secondTurret,
      effectiveWeapon: secondTurret,
      damage: secondDamage,
      turret: { hit: { chance: 0.8, trackingTerm: 0.1, rangeTerm: 0.1, trackingPenalty: 0.5 ** 0.1, rangePenalty: 0.5 ** 0.1 }, expectedMultiplier: 0.8 },
    };
    engagementEvaluator.evaluate.mockImplementation((_frame, attacks) => {
      if (attacks.shipA?.weapon === shipATurret) return { shipA: shipAAssessment, shipB: undefined };
      if (attacks.shipA?.weapon === secondTurret) return { shipA: secondAssessment, shipB: undefined };
      return { shipA: undefined, shipB: undefined };
    });
    const multiInput = { weapons: { shipA: [shipATurret, secondTurret] as const, shipB: [] as const }, sigRadii: { shipA: 30, shipB: 40 }, droneStates: { shipA: [], shipB: [] } as const, missileFacts: { shipA: [], shipB: [] } as const, defenses: { shipA: EMPTY_DEFENSE_SPEC, shipB: EMPTY_DEFENSE_SPEC } as const, overloaded: { shipA: false, shipB: false } as const, locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE } };
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
    expect(view.projection).toEqual({ shipA: EMPTY_PROJECTION, shipB: EMPTY_PROJECTION });
  });

  test("combined damage.appliedByType is the component-wise sum of the two input vectors", () => {
    const { engagementEvaluator, composer } = makeComposer();
    const firstByType = { em: 12, thermal: 8, kinetic: 0, explosive: 4 };
    const secondByType = { em: 3, thermal: 0, kinetic: 20, explosive: 7 };
    const firstDamage = { nominalDps: 24, appliedDps: 24, application: 1, volley: 100, baseVolleyByType: firstByType, appliedByType: firstByType, appliedVolleyByType: firstByType };
    const secondDamage = { nominalDps: 30, appliedDps: 30, application: 1, volley: 100, baseVolleyByType: secondByType, appliedByType: secondByType, appliedVolleyByType: secondByType };
    const firstAssessment: AttackAssessment = { boostedWeapon: boostedTurret, effectiveWeapon: effectiveTurret, damage: firstDamage, turret: { hit, expectedMultiplier: 1 } };
    const secondAssessment: AttackAssessment = { boostedWeapon: boostedTurret, effectiveWeapon: effectiveTurret, damage: secondDamage, turret: { hit, expectedMultiplier: 1 } };
    engagementEvaluator.evaluate.mockImplementation((_frame, attacks) => {
      if (attacks.shipA?.weapon === shipATurret) return { shipA: firstAssessment, shipB: undefined };
      if (attacks.shipA?.weapon === shipBTurret) return { shipA: secondAssessment, shipB: undefined };
      return { shipA: undefined, shipB: undefined };
    });
    const multiInput = { weapons: { shipA: [shipATurret, shipBTurret] as const, shipB: [] as const }, sigRadii: { shipA: 30, shipB: 40 }, droneStates: { shipA: [], shipB: [] } as const, missileFacts: { shipA: [], shipB: [] } as const, defenses: { shipA: EMPTY_DEFENSE_SPEC, shipB: EMPTY_DEFENSE_SPEC } as const, overloaded: { shipA: false, shipB: false } as const, locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE } };
    const view = composer.compose(snapshot, multiInput);
    expect(view.attacks.shipA).toBeDefined();
    expect(view.attacks.shipA!.damage.appliedByType).toEqual(damageVectorAdd(firstByType, secondByType));
    expect(view.attacks.shipA!.damage.appliedVolleyByType).toEqual(damageVectorAdd(firstByType, secondByType));
  });

  test("defenses are forwarded with correct appliedByType routing and overload flag", () => {
    const { engagementEvaluator, composer } = makeComposer();
    const shipAAttackByType = { em: 100, thermal: 0, kinetic: 0, explosive: 0 };
    const shipBAttackByType = { em: 0, thermal: 100, kinetic: 0, explosive: 0 };
    engagementEvaluator.evaluate.mockReturnValue({
      shipA: { ...shipAAssessment, damage: { ...shipADamage, baseVolleyByType: shipAAttackByType, appliedByType: shipAAttackByType, appliedVolleyByType: shipAAttackByType } },
      shipB: { ...shipBAssessment, damage: { ...shipBDamage, baseVolleyByType: shipBAttackByType, appliedByType: shipBAttackByType, appliedVolleyByType: shipBAttackByType } },
    });
    const shipADefense: DefenseSpec = {
      layers: {
        shield: { hp: 1000, resists: { em: 0.5, thermal: 0, kinetic: 0, explosive: 0 } },
        armor: { hp: 1000, resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 } },
        hull: { hp: 1000, resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 } },
      },
      shieldRechargeTime: 100,
      repairers: [{ layer: "shield", amount: 100, cycleTime: 5, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1.15, cycleTimeMultiplier: 0.85 } }],
      signaturePenalty: 0,
      shieldUniformity: 0.25,
    };
    const shipBDefense: DefenseSpec = {
      layers: {
        shield: { hp: 1000, resists: { em: 0, thermal: 0.5, kinetic: 0, explosive: 0 } },
        armor: { hp: 1000, resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 } },
        hull: { hp: 1000, resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 } },
      },
      shieldRechargeTime: 100,
      repairers: [],
      signaturePenalty: 0,
      shieldUniformity: 0.25,
    };
    const defenseInput = { weapons: { shipA: [shipATurret] as const, shipB: [shipBTurret] as const }, sigRadii: { shipA: 30, shipB: 40 }, droneStates: { shipA: [], shipB: [] } as const, missileFacts: { shipA: [], shipB: [] } as const, defenses: { shipA: shipADefense, shipB: shipBDefense } as const, overloaded: { shipA: true, shipB: false } as const, locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE } };
    const view = composer.compose(snapshot, defenseInput);
    expect(view.defenses.shipA.layers.shield.ehp).toBeCloseTo(1000, 2);
    expect(view.defenses.shipB.layers.shield.ehp).toBeCloseTo(1000, 2);
    expect(view.defenses.shipA.repairPerSecond.shield).toBeCloseTo((100 * 1.15) / (5 * 0.85), 5);
    expect(view.defenses.shipB.repairPerSecond.shield).toBe(0);
  });

  test("readouts produce turret values with boosted fields and disruption breakdown", () => {
    const { composer } = makeComposer();
    const view = composer.compose(snapshot, input);
    expect(view.readouts.shipA.kind).toBe("turret");
    const shipA = view.readouts.shipA;
    if (shipA.kind !== "turret") throw new Error("expected turret");
    expect(shipA.speed).toBe(250);
    expect(shipA.tracking).toBe(effectiveTurret.tracking);
    expect(shipA.optimal).toBe(effectiveTurret.optimal);
    expect(shipA.falloff).toBe(effectiveTurret.falloff);
    expect(shipA.boostedTracking).toBe(boostedTurret.tracking);
    expect(shipA.boostedOptimal).toBe(boostedTurret.optimal);
    expect(shipA.boostedFalloff).toBe(boostedTurret.falloff);
    expect(shipA.sigResolution).toBe(effectiveTurret.sigResolution);
    expect(shipA.speedBreakdown).toBeDefined();
    expect(shipA.trackingBreakdown).toBeDefined();
    expect(view.readouts.shipB.kind).toBe("turret");
    expect(view.readouts.shipB.speed).toBe(120);
  });

  test("readouts fall back to effectiveWeapons when no attack exists", () => {
    const { engagementEvaluator, composer } = makeComposer();
    engagementEvaluator.evaluate.mockReturnValue({ shipA: undefined, shipB: undefined });
    const view = composer.compose(snapshot, input);
    expect(view.readouts.shipA.kind).toBe("turret");
    const shipA = view.readouts.shipA;
    if (shipA.kind !== "turret") throw new Error("expected turret");
    expect(shipA.tracking).toBe(shipATurret.tracking);
    expect(shipA.boostedTracking).toBe(shipATurret.tracking);
    expect(view.readouts.shipB.kind).toBe("turret");
    const shipB = view.readouts.shipB;
    if (shipB.kind !== "turret") throw new Error("expected turret");
    expect(shipB.tracking).toBe(shipBTurret.tracking);
  });

  test("readouts produce none when no weapons are equipped", () => {
    const { engagementEvaluator, composer } = makeComposer();
    engagementEvaluator.evaluate.mockReturnValue({ shipA: undefined, shipB: undefined });
    const view = composer.compose(snapshot, { weapons: { shipA: [], shipB: [] }, sigRadii: { shipA: 30, shipB: 40 }, droneStates: { shipA: [], shipB: [] }, missileFacts: { shipA: [], shipB: [] }, defenses: { shipA: EMPTY_DEFENSE_SPEC, shipB: EMPTY_DEFENSE_SPEC }, overloaded: { shipA: false, shipB: false }, locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE } });
    expect(view.readouts.shipA.kind).toBe("none");
    expect(view.readouts.shipA.speed).toBe(250);
    expect(view.readouts.shipB.kind).toBe("none");
    expect(view.readouts.shipB.speed).toBe(120);
  });

  test("readouts produce missile values when the effective weapon is a missile", () => {
    const { engagementEvaluator, composer } = makeComposer();
    const missile: MissileSpec = { kind: "missile", damagePerMissile: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 10, launcherCount: 3, explosionRadius: 40, explosionVelocity: 170, damageReductionFactor: 0.5, maxVelocity: 5000, flightTime: 5, flightRange: 25000 };
    const missileAssessment: AttackAssessment = { boostedWeapon: missile, effectiveWeapon: missile, damage: { nominalDps: 30, appliedDps: 24, application: 0.8, volley: 300, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE }, missile: { application: 0.8, signatureTerm: 1, velocityTerm: 0.8, inRange: true, timeToImpact: 1 } };
    engagementEvaluator.evaluate.mockReturnValue({ shipA: missileAssessment, shipB: undefined });
    const view = composer.compose(snapshot, { weapons: { shipA: [missile], shipB: [] }, sigRadii: { shipA: 30, shipB: 40 }, droneStates: { shipA: [], shipB: [] }, missileFacts: { shipA: [], shipB: [] }, defenses: { shipA: EMPTY_DEFENSE_SPEC, shipB: EMPTY_DEFENSE_SPEC }, overloaded: { shipA: false, shipB: false }, locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE } });
    expect(view.readouts.shipA.kind).toBe("missile");
    const shipA = view.readouts.shipA;
    if (shipA.kind !== "missile") throw new Error("expected missile");
    expect(shipA.explosionRadius).toBe(40);
    expect(shipA.explosionVelocity).toBe(170);
    expect(shipA.maxVelocity).toBe(5000);
    expect(shipA.flightTime).toBe(5);
    expect(shipA.flightRange).toBe(25000);
    expect(view.readouts.shipB.kind).toBe("none");
  });

  test("readouts produce drone values when the effective weapon is a drone", () => {
    const { engagementEvaluator, composer } = makeComposer();
    const drone: DroneSpec = { kind: "drone", tracking: 0.15, sigResolution: 40, optimal: 1000, falloff: 500, damagePerShot: { em: 0, thermal: 0, kinetic: 20, explosive: 0 }, cycleTime: 4, droneCount: 5, maxVelocity: 6000, orbitSpeed: 1800, orbitRange: 1000, isSentry: false, controlRange: 60000 };
    const droneAssessment: AttackAssessment = { boostedWeapon: drone, effectiveWeapon: drone, damage: { nominalDps: 25, appliedDps: 20, application: 0.8, volley: 100, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE }, drone: { hit, expectedMultiplier: 1, inRange: true, inWeaponRange: true, mode: "engaging", distanceToTarget: 1000, inControlRange: true } };
    engagementEvaluator.evaluate.mockReturnValue({ shipA: droneAssessment, shipB: undefined });
    const view = composer.compose(snapshot, { weapons: { shipA: [drone], shipB: [] }, sigRadii: { shipA: 30, shipB: 40 }, droneStates: { shipA: [], shipB: [] }, missileFacts: { shipA: [], shipB: [] }, defenses: { shipA: EMPTY_DEFENSE_SPEC, shipB: EMPTY_DEFENSE_SPEC }, overloaded: { shipA: false, shipB: false }, locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE } });
    expect(view.readouts.shipA.kind).toBe("drone");
    const shipA = view.readouts.shipA;
    if (shipA.kind !== "drone") throw new Error("expected drone");
    expect(shipA.tracking).toBe(0.15);
    expect(shipA.optimal).toBe(1000);
    expect(shipA.falloff).toBe(500);
    expect(shipA.sigResolution).toBe(40);
    expect(view.readouts.shipB.kind).toBe("none");
  });
});
