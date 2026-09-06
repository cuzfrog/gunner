import { EngagementEvaluatorImpl } from "../../src/sim/fireControl";
import { EngagementFrameComposerImpl } from "../../src/sim/engagementFrameComposer";
import { DefenseAssessorImpl } from "../../src/sim/defenseAssessment";
import { EMPTY_DEFENSE_SPEC } from "../../src/sim";
import { HitChanceImpl } from "../../src/sim/hitChance";
import { KinematicsImpl } from "../../src/sim/kinematics";
import { MissileApplicationImpl } from "../../src/sim/missileApplication";
import { DroneApplicationImpl } from "../../src/sim/droneApplication";
import { MissileBoosterResolverImpl } from "../../src/sim/missileBoosterResolver";
import { StackingPenaltyImpl } from "../../src/sim";
import { WeaponDamageAssessorImpl } from "../../src/sim/weaponDamageAssessor";
import { Vec2 } from "../../src/sim/vec2";
import { toTypeId } from "../../src/gamedata/ids";
import { ZERO_DAMAGE } from "../../src/sim";
import type { EwarProjection, ShipState, SimSnapshot, TurretSpec } from "../../src/sim/types";
import type { EwarResolver } from "../../src/sim/ewarResolver";
import type { TurretBoosterResolver } from "../../src/sim/turretBoosterResolver";

const turret: TurretSpec = { kind: "turret", moduleId: toTypeId("1"), tracking: 0.1, sigResolution: 40, optimal: 10_000, falloff: 5_000, damagePerShot: ZERO_DAMAGE, cycleTime: 1, turretCount: 1 };
const LOCKED_STATE = { status: "locked" as const, progress: 1, remaining: 0, lockTime: 0, inRange: true };

function shipState(id: "shipA" | "shipB", ewar?: EwarProjection): ShipState {
  return {
    id,
    maxSpeed: 1000,
    mass: 1_000_000,
    inertiaModifier: 1,
    mode: "orbit",
    desiredRange: 10_000,
    aggressivity: 1,
    position: new Vec2(0, 0),
    velocity: new Vec2(500, 0),
    ewar,
  };
}

const disruptorEwar: EwarProjection = {
  loadout: {
    webs: [],
    grapplers: [],
    disruptors: [{ moduleName: "Tracking Disruptor I", moduleId: toTypeId("2108"), optimal: 1, falloff: 1, disruption: 0.5, defaultScript: undefined, overloadStrengthBonusPercent: 0 }],
    scramblers: [],
    painters: [],
    dampeners: [],
    scripts: [],
    dampenerScripts: [],
  },
  activation: {
    webs: [],
    grapplers: [],
    disruptors: [{ active: true, overloaded: false, script: undefined }],
    scramblers: [],
  painters: [],
  dampeners: [],
  },
};

const turretBoosterResolver: TurretBoosterResolver = {
  boostedTurret: (turret) => turret,
};

function fakeEwarResolver(): EwarResolver {
  return {
    speedMultiplier: () => 1,
    speedMultiplierIgnoringRange: () => 1, sigMultiplier: () => 1, sigMultiplierIgnoringRange: () => 1, disruptedTurret: (turretValue, projection) => {
      if (!projection) return turretValue;
      for (let i = 0; i < projection.loadout.disruptors.length; i++) {
        const spec = projection.loadout.disruptors[i];
        const activation = projection.activation?.disruptors[i];
        if (activation && !activation.active) continue;
        return { ...turretValue, tracking: turretValue.tracking * (1 - spec.disruption) };
      }
      return turretValue;
    },
    disruptedTurretIgnoringRange: (turretValue, projection) => {
      if (!projection) return turretValue;
      for (const spec of projection.loadout.disruptors) {
        return { ...turretValue, tracking: turretValue.tracking * (1 - spec.disruption) };
      }
      return turretValue;
    },
    propulsionSuppressed: () => false,
    propulsionSuppressedIgnoringRange: () => false,
    appliedEffects: () => [],
    speedBreakdown: () => ({ effects: [], propulsionSuppressed: false }),
    disruptionBreakdown: () => ({ tracking: [], optimal: [], falloff: [] }),
    disruptionMultipliers: () => ({ tracking: 1, optimal: 1, falloff: 1 }),
    dampenedSensorSpec: (spec) => spec,
    dampenedSensorSpecIgnoringRange: (spec) => spec,
    dampenerBreakdown: () => ({ scanResolution: [], maxTargetRange: [] }),
    reach: () => ({ web: 0, grappler: 0, scrambler: 0, disruptor: 0, painter: 0, dampener: 0 }),
    potentials: () => ({ speedMultiplier: 1, sigMultiplier: 1, propulsionSuppressed: false, trackingMultiplier: 1, optimalMultiplier: 1, falloffMultiplier: 1, scanResolutionMultiplier: 1, targetingRangeMultiplier: 1 }),
  };
}

function makeComposer() {
  const hitChance = new HitChanceImpl();
  const kinematics = new KinematicsImpl();
  const ewarResolver = fakeEwarResolver();
  const weaponDamageAssessor = new WeaponDamageAssessorImpl();
  const missileApplication = new MissileApplicationImpl();
  const droneApplication = new DroneApplicationImpl({ hitChance, weaponDamageAssessor });
  const engagementEvaluator = new EngagementEvaluatorImpl({ hitChance, ewarResolver, turretBoosterResolver, missileBoosterResolver: new MissileBoosterResolverImpl({ stackingPenalty: new StackingPenaltyImpl() }), weaponDamageAssessor, missileApplication, droneApplication });
  return new EngagementFrameComposerImpl({ kinematics, engagementEvaluator, defenseAssessor: new DefenseAssessorImpl(), ewarResolver });
}

describe("symmetric mutual engagement", () => {
  test("identical ships produce identical mutual hit chances", () => {
    const composer = makeComposer();
    const shipA = shipState("shipA");
    const shipB = shipState("shipB");
    const snapshot: SimSnapshot = {
      time: 0,
      shipA,
      shipB,
      commands: { shipA: new Vec2(0, 0), shipB: new Vec2(0, 0) },
    };
    const view = composer.compose(snapshot, { weapons: { shipA: [turret], shipB: [turret] }, sigRadii: { shipA: 40, shipB: 40 }, droneStates: { shipA: [], shipB: [] }, missileFacts: { shipA: [], shipB: [] }, defenses: { shipA: EMPTY_DEFENSE_SPEC, shipB: EMPTY_DEFENSE_SPEC }, overloaded: { shipA: false, shipB: false }, locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE } });
    expect(view.attacks.shipA?.turret?.hit.chance).toBe(view.attacks.shipB?.turret?.hit.chance);
    expect(view.frame.shipA.maxSpeed).toBe(view.frame.shipB.maxSpeed);
  });

  test("a disruptor on one ship degrades only the opponent-facing attack", () => {
    const composer = makeComposer();
    const shipA = shipState("shipA");
    const shipB = { ...shipState("shipB", disruptorEwar), position: new Vec2(10_000, 0), velocity: new Vec2(0, 500) };
    const snapshot: SimSnapshot = {
      time: 0,
      shipA,
      shipB,
      commands: { shipA: new Vec2(0, 0), shipB: new Vec2(0, 0) },
    };
    const view = composer.compose(snapshot, { weapons: { shipA: [turret], shipB: [turret] }, sigRadii: { shipA: 40, shipB: 40 }, droneStates: { shipA: [], shipB: [] }, missileFacts: { shipA: [], shipB: [] }, defenses: { shipA: EMPTY_DEFENSE_SPEC, shipB: EMPTY_DEFENSE_SPEC }, overloaded: { shipA: false, shipB: false }, locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE } });
    expect(view.attacks.shipA?.turret?.hit.chance!).toBeLessThan(view.attacks.shipB?.turret?.hit.chance!);
    expect((view.attacks.shipA?.effectiveWeapon as TurretSpec).tracking).toBe(turret.tracking * 0.5);
    expect((view.attacks.shipB?.effectiveWeapon as TurretSpec).tracking).toBe(turret.tracking);
  });
});
