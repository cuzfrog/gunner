import { WeaponClockImpl } from "./weaponClock";
import { Mulberry32RngFactory } from "./rng";
import { EMPTY_DEFENSE_ASSESSMENT, EMPTY_PROJECTION, Vec2 } from "./index";
import type { AttackAssessment } from "./fireControl";
import type { EngagementView, WeaponAttack } from "./engagementFrameComposer";
import type { EngagementFrame, HitChanceBreakdown, ShipState, TurretSpec, WeaponSpec } from "./types";
import { ZERO_DAMAGE } from "./types";

const turret: TurretSpec = { kind: "turret", tracking: 0.1, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 1 };
const hit: HitChanceBreakdown = { chance: 1, trackingTerm: 0, rangeTerm: 0, trackingPenalty: 1, rangePenalty: 1 };
const LOCKED_STATE = { status: "locked" as const, progress: 1, remaining: 0, lockTime: 0, inRange: true };

function shipState(id: "shipA" | "shipB"): ShipState {
  return { id, maxSpeed: 100, mass: 1_000_000, inertiaModifier: 1, mode: "orbit", desiredRange: 1000, aggressivity: 1, position: new Vec2(0, 0), velocity: new Vec2(0, 0) };
}

function makeFrame(): EngagementFrame {
  const shipA = shipState("shipA");
  const shipB = shipState("shipB");
  const rel = shipB.position.sub(shipA.position);
  return { time: 0, shipA, shipB, relPosition: rel, distance: 1000, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0 };
}

function makeView(shipAAttacks: readonly WeaponAttack[], shipBAttacks: readonly WeaponAttack[] = []): EngagementView {
  return {
    frame: makeFrame(),
    attacks: { shipA: undefined, shipB: undefined },
    weaponAttacks: { shipA: shipAAttacks, shipB: shipBAttacks },
    effectiveWeapons: { shipA: turret, shipB: turret },
    defenses: { shipA: EMPTY_DEFENSE_ASSESSMENT, shipB: EMPTY_DEFENSE_ASSESSMENT },
    projection: { shipA: EMPTY_PROJECTION, shipB: EMPTY_PROJECTION },
    locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE },
  };
}

function makeAssessment(expectedMultiplier: number, appliedVolleyByType: { em: number; thermal: number; kinetic: number; explosive: number }): AttackAssessment {
  return {
    boostedWeapon: turret,
    effectiveWeapon: turret,
    damage: { nominalDps: 20, appliedDps: 20 * expectedMultiplier, application: expectedMultiplier, volley: 100, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType },
    turret: { hit, expectedMultiplier },
  };
}

function turretAttack(expectedMultiplier: number, volley: { em: number; thermal: number; kinetic: number; explosive: number }): WeaponAttack {
  return { weapon: turret, assessment: makeAssessment(expectedMultiplier, volley) };
}

describe("WeaponClockImpl", () => {
  test("no event before cycle completion", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory() });
    const view = makeView([turretAttack(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    const events = clock.step(1, view);
    expect(events).toHaveLength(0);
  });

  test("one event at cycle completion", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory() });
    const view = makeView([turretAttack(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    clock.step(1, view);
    const events = clock.step(4, view);
    expect(events).toHaveLength(1);
    expect(events[0].target).toBe("shipB");
    expect(events[0].source).toBe("shipA");
    expect(events[0].kind).toBe("turret");
    expect(events[0].weaponIndex).toBe(0);
    expect(events[0].rawByType.kinetic).toBeGreaterThan(0);
  });

  test("repeated events across multiple cycles", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory() });
    const view = makeView([turretAttack(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    let totalEvents = 0;
    for (let i = 0; i < 50; i++) {
      totalEvents += clock.step(1, view).length;
    }
    expect(totalEvents).toBe(10);
  });

  test("zero appliedVolleyByType produces no event", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory() });
    const view = makeView([turretAttack(0, ZERO_DAMAGE)]);
    let totalEvents = 0;
    for (let i = 0; i < 10; i++) {
      totalEvents += clock.step(1, view).length;
    }
    expect(totalEvents).toBe(0);
  });

  test("missile weapons are skipped", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory() });
    const missileWeapon: WeaponSpec = { kind: "missile", damagePerMissile: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 10, launcherCount: 1, explosionRadius: 40, explosionVelocity: 170, damageReductionFactor: 3, maxVelocity: 3750, flightTime: 5, flightRange: 18750 };
    const view = makeView([{ weapon: missileWeapon, assessment: makeAssessment(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 }) }]);
    let totalEvents = 0;
    for (let i = 0; i < 20; i++) {
      totalEvents += clock.step(1, view).length;
    }
    expect(totalEvents).toBe(0);
  });

  test("both sides emit events targeting the opposing side", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory() });
    const view = makeView(
      [turretAttack(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })],
      [turretAttack(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })],
    );
    clock.step(1, view);
    const events = clock.step(4, view);
    expect(events).toHaveLength(2);
    const shipAEvent = events.find((e) => e.source === "shipA");
    const shipBEvent = events.find((e) => e.source === "shipB");
    expect(shipAEvent?.target).toBe("shipB");
    expect(shipBEvent?.target).toBe("shipA");
  });

  test("reset clears cooldowns", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory() });
    const view = makeView([turretAttack(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    clock.step(3, view);
    clock.reset();
    const events = clock.step(2, view);
    expect(events).toHaveLength(0);
  });

  test("hit roll produces variable damage multipliers", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory() });
    const view = makeView([turretAttack(0.5, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    const damages: number[] = [];
    for (let i = 0; i < 100; i++) {
      const events = clock.step(5, view);
      for (const event of events) {
        damages.push(event.rawByType.kinetic);
      }
    }
    expect(damages.length).toBeGreaterThan(50);
    const unique = new Set(damages.map((d) => Math.round(d)));
    expect(unique.size).toBeGreaterThan(5);
  });

  test("average damage approximates appliedVolleyByType", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory() });
    const expectedMultiplier = 1.01505;
    const view = makeView([turretAttack(expectedMultiplier, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    let totalDamage = 0;
    let hitCount = 0;
    for (let i = 0; i < 10000; i++) {
      const events = clock.step(5, view);
      for (const event of events) {
        totalDamage += event.rawByType.kinetic;
        hitCount++;
      }
    }
    expect(hitCount).toBeGreaterThan(5000);
    const avgDamage = totalDamage / hitCount;
    expect(avgDamage).toBeCloseTo(100, 0);
  });

  test("weapon list change resets cooldowns", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory() });
    const fastTurret: TurretSpec = { ...turret, cycleTime: 2 };
    const viewA = makeView([turretAttack(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    clock.step(4, viewA);
    const eventsBefore = clock.step(1, viewA);
    expect(eventsBefore).toHaveLength(1);
    const viewB = makeView([{ weapon: fastTurret, assessment: makeAssessment(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 }) }]);
    const eventsAfter = clock.step(1, viewB);
    expect(eventsAfter).toHaveLength(0);
  });

  test("unlocked side produces no events", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory() });
    const attack = turretAttack(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 });
    const view: EngagementView = { ...makeView([attack]), locks: { shipA: { status: "locking", progress: 0.5, remaining: 5, lockTime: 10, inRange: true }, shipB: LOCKED_STATE } };
    const events = clock.step(10, view);
    expect(events).toHaveLength(0);
  });

  test("re-lock after break waits full cycle (no burst fire)", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory() });
    const attack = turretAttack(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 });
    const lockedView = makeView([attack]);
    const unlockingView: EngagementView = { ...makeView([attack]), locks: { shipA: { status: "idle", progress: 0, remaining: 0, lockTime: 0, inRange: false }, shipB: LOCKED_STATE } };
    clock.step(4, lockedView);
    clock.step(1, lockedView);
    clock.step(3, unlockingView);
    const eventsAfterRelock = clock.step(1, lockedView);
    expect(eventsAfterRelock).toHaveLength(0);
    const eventsAfterFullCycle = clock.step(4, lockedView);
    expect(eventsAfterFullCycle).toHaveLength(1);
  });
});
