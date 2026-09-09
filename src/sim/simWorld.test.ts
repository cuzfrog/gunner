import { Vec2 } from "./vec2";
import { SimWorldFactoryImpl } from "./simWorld";
import { KinematicsImpl } from "./kinematics";
import { MissileApplicationImpl } from "./missileApplication";
import { Mulberry32RngFactory } from "./rng";
import { toTypeId } from "../gamedata/ids";
import { ZERO_DAMAGE } from "./types";
import { EMPTY_DEFENSE_ASSESSMENT } from "./defenseAssessment";
import type { AttackAssessment } from "./fireControl";
import type { EngagementView, WeaponAttack } from "./engagementFrameComposer";
import type { EwarResolver } from "./ewarResolver";
import type { EngagementFrame, HitChanceBreakdown, ShipConfig, ShipState, SimConfig, TurretSpec } from "./types";

const hit: HitChanceBreakdown = { chance: 0.5, trackingTerm: 0.5, rangeTerm: 0.5, trackingPenalty: 1, rangePenalty: 1 };
const LOCKED_STATE = { status: "locked" as const, progress: 1, remaining: 0, lockTime: 0, inRange: true };
const turret: TurretSpec = { kind: "turret", moduleId: toTypeId("1"), tracking: 0.32, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 1 };

const shipConfig: ShipConfig = { id: "shipA", maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "orbit", desiredRange: 5000, aggressivity: 1 };
const simConfig: SimConfig = { shipA: shipConfig, shipB: { ...shipConfig, id: "shipB" }, initialDistance: 5000 };

const ewarResolver = vi.mocked<Required<EwarResolver>>({
  speedMultiplier: vi.fn(() => 1), speedMultiplierIgnoringRange: vi.fn(() => 1),
  sigMultiplier: vi.fn(() => 1), sigMultiplierIgnoringRange: vi.fn(() => 1),
  disruptedTurret: vi.fn((t) => t), disruptedTurretIgnoringRange: vi.fn((t) => t),
  propulsionSuppressed: vi.fn(() => false), propulsionSuppressedIgnoringRange: vi.fn(() => false),
  appliedEffects: vi.fn(() => []),
  speedBreakdown: vi.fn(() => ({ effects: [], propulsionSuppressed: false })),
  disruptionBreakdown: vi.fn(() => ({ tracking: [], optimal: [], falloff: [] })),
  disruptionMultipliers: vi.fn(() => ({ tracking: 1, optimal: 1, falloff: 1 })),
  dampenedSensorSpec: vi.fn((s) => s), dampenedSensorSpecIgnoringRange: vi.fn((s) => s),
  dampenerBreakdown: vi.fn(() => ({ scanResolution: [], maxTargetRange: [] })),
  reach: vi.fn(() => ({ web: 0, grappler: 0, scrambler: 0, disruptor: 0, painter: 0, dampener: 0 })),
  potentials: vi.fn(() => ({ speedMultiplier: 1, sigMultiplier: 1, propulsionSuppressed: false, trackingMultiplier: 1, optimalMultiplier: 1, falloffMultiplier: 1, scanResolutionMultiplier: 1, targetingRangeMultiplier: 1 })),
});

function makeFactory(): SimWorldFactoryImpl {
  return new SimWorldFactoryImpl({ simConfig, ewarResolver, kinematics: new KinematicsImpl(), missileApplication: new MissileApplicationImpl(), rngFactory: new Mulberry32RngFactory() });
}

function shipState(id: "shipA" | "shipB"): ShipState {
  return { ...shipConfig, id, position: new Vec2(0, 0), velocity: new Vec2(0, 0) };
}

function makeView(): EngagementView {
  const assessment: AttackAssessment = {
    boostedWeapon: turret, effectiveWeapon: turret,
    damage: { nominalDps: 20, appliedDps: 10, application: 0.5, volley: 100, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType: { em: 0, thermal: 0, kinetic: 100, explosive: 0 } },
    turret: { hit, expectedMultiplier: 0.5, spoolFactor: 1, inOptimal: true },
  };
  const shipA = shipState("shipA");
  const shipB = shipState("shipB");
  const frame: EngagementFrame = { time: 0, shipA, shipB, relPosition: shipB.position.sub(shipA.position), distance: 5000, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0 };
  const attack: WeaponAttack = { weapon: turret, assessment };
  return {
    frame, attacks: { shipA: assessment, shipB: assessment }, weaponAttacks: { shipA: [attack], shipB: [] },
    effectiveWeapons: { shipA: turret, shipB: turret },
    defenses: { shipA: EMPTY_DEFENSE_ASSESSMENT, shipB: EMPTY_DEFENSE_ASSESSMENT },
    locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE },
    readouts: { shipA: { kind: "none", speed: 0 }, shipB: { kind: "none", speed: 0 } },
    incomingOffensiveModules: { shipA: [], shipB: [] },
  };
}

describe("SimWorldFactoryImpl", () => {
  test("expected world fires the full applied volley every cycle", () => {
    const world = makeFactory().createExpected();
    const view = makeView();
    let events = 0;
    for (let i = 0; i < 10; i++) {
      for (const event of world.weaponClock.step(5, view)) {
        events++;
        expect(event.rawByType.kinetic).toBe(100);
      }
    }
    expect(events).toBe(10);
  });

  test("sampled world misses cycles at partial hit chance", () => {
    const world = makeFactory().createSampled();
    const view = makeView();
    let events = 0;
    for (let i = 0; i < 200; i++) events += world.weaponClock.step(5, view).length;
    expect(events).toBeGreaterThan(0);
    expect(events).toBeLessThan(200);
  });

  test("factory produces independent world instances", () => {
    const factory = makeFactory();
    const first = factory.createSampled();
    const second = factory.createSampled();
    expect(first.simulation).not.toBe(second.simulation);
    expect(first.lockClock).not.toBe(second.lockClock);
    expect(first.droneSimulator).not.toBe(second.droneSimulator);
    expect(first.missileSimulator).not.toBe(second.missileSimulator);
    expect(first.weaponClock).not.toBe(second.weaponClock);
    expect(first.defenseSimulator).not.toBe(second.defenseSimulator);
  });
});
