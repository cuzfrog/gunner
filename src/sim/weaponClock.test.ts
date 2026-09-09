import { WeaponClockImpl } from "./weaponClock";
import { expectedHitRoll, sampledHitRoll } from "./hitRoll";
import { Mulberry32RngFactory } from "./rng";
import { EMPTY_DEFENSE_ASSESSMENT, Vec2 } from "./index";
import { toTypeId } from "../gamedata/ids";
import type { AttackAssessment } from "./fireControl";
import type { EngagementView, WeaponAttack } from "./engagementFrameComposer";
import type { EngagementFrame, HitChanceBreakdown, ShipState, TurretSpec, WeaponSpec } from "./types";
import { ZERO_DAMAGE } from "./types";

const turret: TurretSpec = { kind: "turret", moduleId: toTypeId("1"), tracking: 0.1, sigResolution: 40, optimal: 5000, falloff: 5000, damagePerShot: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 5, turretCount: 1 };
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
    locks: { shipA: LOCKED_STATE, shipB: LOCKED_STATE },
    readouts: { shipA: { kind: "none", speed: 0 }, shipB: { kind: "none", speed: 0 } },
    incomingOffensiveModules: { shipA: [], shipB: [] },
  };
}

function makeAssessment(expectedMultiplier: number, appliedVolleyByType: { em: number; thermal: number; kinetic: number; explosive: number }, inOptimal = true): AttackAssessment {
  return {
    boostedWeapon: turret,
    effectiveWeapon: turret,
    damage: { nominalDps: 20, appliedDps: 20 * expectedMultiplier, application: expectedMultiplier, volley: 100, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType },
    turret: { hit, expectedMultiplier, spoolFactor: 1, inOptimal },
  };
}

function turretAttack(expectedMultiplier: number, volley: { em: number; thermal: number; kinetic: number; explosive: number }, inOptimal = true): WeaponAttack {
  return { weapon: turret, assessment: makeAssessment(expectedMultiplier, volley, inOptimal) };
}

const spoolingTurret: TurretSpec = { ...turret, falloff: 0, spool: { perCycle: 0.1, max: 0.5 } };

function spoolingAttack(volley: { em: number; thermal: number; kinetic: number; explosive: number }, inOptimal = true): WeaponAttack {
  return {
    weapon: spoolingTurret,
    assessment: {
      boostedWeapon: spoolingTurret,
      effectiveWeapon: spoolingTurret,
      damage: { nominalDps: 20, appliedDps: 20, application: 1, volley: 100, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType: volley },
      turret: { hit, expectedMultiplier: 1, spoolFactor: 1, inOptimal },
    },
  };
}

describe("WeaponClockImpl", () => {
  test("no event before cycle completion", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: sampledHitRoll });
    const view = makeView([turretAttack(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    const events = clock.step(1, view);
    expect(events).toHaveLength(0);
  });

  test("one event at cycle completion", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: sampledHitRoll });
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
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: sampledHitRoll });
    const view = makeView([turretAttack(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    let totalEvents = 0;
    for (let i = 0; i < 50; i++) {
      totalEvents += clock.step(1, view).length;
    }
    expect(totalEvents).toBe(10);
  });

  test("zero appliedVolleyByType produces no event", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: sampledHitRoll });
    const view = makeView([turretAttack(0, ZERO_DAMAGE)]);
    let totalEvents = 0;
    for (let i = 0; i < 10; i++) {
      totalEvents += clock.step(1, view).length;
    }
    expect(totalEvents).toBe(0);
  });

  test("missile weapons are skipped", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: sampledHitRoll });
    const missileWeapon: WeaponSpec = { kind: "missile", moduleId: toTypeId("2"), damagePerMissile: { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, cycleTime: 10, launcherCount: 1, explosionRadius: 40, explosionVelocity: 170, damageReductionFactor: 3, maxVelocity: 3750, flightTime: 5, flightRange: 18750 };
    const view = makeView([{ weapon: missileWeapon, assessment: makeAssessment(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 }) }]);
    let totalEvents = 0;
    for (let i = 0; i < 20; i++) {
      totalEvents += clock.step(1, view).length;
    }
    expect(totalEvents).toBe(0);
  });

  test("both sides emit events targeting the opposing side", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: sampledHitRoll });
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
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: sampledHitRoll });
    const view = makeView([turretAttack(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    clock.step(3, view);
    clock.reset();
    const events = clock.step(2, view);
    expect(events).toHaveLength(0);
  });

  test("hit roll produces variable damage multipliers", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: sampledHitRoll });
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
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: sampledHitRoll });
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
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: sampledHitRoll });
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
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: sampledHitRoll });
    const attack = turretAttack(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 });
    const view: EngagementView = { ...makeView([attack]), locks: { shipA: { status: "locking", progress: 0.5, remaining: 5, lockTime: 10, inRange: true }, shipB: LOCKED_STATE } };
    const events = clock.step(10, view);
    expect(events).toHaveLength(0);
  });

  test("re-lock after break waits full cycle (no burst fire)", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: sampledHitRoll });
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

  test("expected roll fires every cycle with the full applied volley", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    const view = makeView([turretAttack(0.5, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    let totalEvents = 0;
    for (let i = 0; i < 10; i++) {
      for (const event of clock.step(5, view)) {
        totalEvents++;
        expect(event.rawByType.kinetic).toBe(100);
      }
    }
    expect(totalEvents).toBe(10);
  });

  test("expected roll skips weapons with zero expected multiplier", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    const view = makeView([turretAttack(0, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    let totalEvents = 0;
    for (let i = 0; i < 10; i++) totalEvents += clock.step(5, view).length;
    expect(totalEvents).toBe(0);
  });

  test("expected roll is deterministic across resets", () => {
    const view = makeView([turretAttack(0.5, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    const damages = (clock: WeaponClockImpl): number[] => {
      const out: number[] = [];
      for (let i = 0; i < 4; i++) for (const event of clock.step(5, view)) out.push(event.rawByType.kinetic);
      clock.reset();
      return out;
    };
    const first = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    const second = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    damages(first);
    expect(damages(second)).toEqual(damages(first));
  });

  test("capture and restore transfers the cooldown phase into another instance", () => {
    const view = makeView([turretAttack(0.5, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    const first = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    first.step(7, view);
    const state = first.capture();
    const second = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    second.restore(state);
    const fresh = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    expect(first.step(4, view)).toHaveLength(1);
    expect(second.step(4, view)).toHaveLength(1);
    expect(fresh.step(4, view)).toHaveLength(0);
  });

  test("restored instance keeps stepping independently of the captured source", () => {
    const view = makeView([turretAttack(0.5, { em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    const first = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    first.step(7, view);
    const state = first.capture();
    const second = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    second.restore(state);
    first.step(10, view);
    expect(second.step(2, view)).toHaveLength(0);
    expect(second.step(2, view)).toHaveLength(1);
  });

  test("events carry the assessment's spool-inclusive volley while spoolCycles advances per cycle", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    const view = makeView([spoolingAttack({ em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    for (let cycle = 0; cycle < 6; cycle++) {
      const events = clock.step(5, view);
      expect(events).toHaveLength(1);
      // fireControl bakes the spool multiplier into the assessment; the clock only tracks cycle count.
      expect(events[0].rawByType.kinetic).toBeCloseTo(100, 6);
      expect(clock.spoolCycles("shipA", 0)).toBe(cycle + 1);
    }
  });

  test("spoolCycles is zero before any completed cycle and for unknown weapons", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    expect(clock.spoolCycles("shipA", 0)).toBe(0);
    clock.step(3, makeView([spoolingAttack({ em: 0, thermal: 0, kinetic: 100, explosive: 0 })]));
    expect(clock.spoolCycles("shipA", 0)).toBe(0);
    expect(clock.spoolCycles("shipA", 1)).toBe(0);
    expect(clock.spoolCycles("shipB", 0)).toBe(0);
  });

  test("spooling turret deactivates out of optimal: no damage, restarts cycle and spool on re-entry", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    const volley = { em: 0, thermal: 0, kinetic: 100, explosive: 0 };
    const inOptimal = makeView([spoolingAttack(volley)]);
    const outOfOptimal = makeView([spoolingAttack(volley, false)]);
    expect(clock.step(5, inOptimal)[0].rawByType.kinetic).toBeCloseTo(100, 6);
    expect(clock.step(5, inOptimal)[0].rawByType.kinetic).toBeCloseTo(100, 6);
    expect(clock.spoolCycles("shipA", 0)).toBe(2);
    expect(clock.step(5, outOfOptimal)).toHaveLength(0);
    expect(clock.spoolCycles("shipA", 0)).toBe(0);
    expect(clock.step(4, inOptimal)).toHaveLength(0);
    expect(clock.step(1, inOptimal)[0].rawByType.kinetic).toBeCloseTo(100, 6);
    expect(clock.spoolCycles("shipA", 0)).toBe(1);
  });

  test("non-spooling turret keeps firing beyond optimal", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    const view = makeView([turretAttack(1, { em: 0, thermal: 0, kinetic: 100, explosive: 0 }, false)]);
    clock.step(5, view);
    expect(clock.step(5, view)[0].rawByType.kinetic).toBeCloseTo(100, 6);
    expect(clock.spoolCycles("shipA", 0)).toBe(0);
  });

  test("spool resets when the lock is lost", () => {
    const clock = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    const attack = spoolingAttack({ em: 0, thermal: 0, kinetic: 100, explosive: 0 });
    const lockedView = makeView([attack]);
    const unlockingView: EngagementView = { ...makeView([attack]), locks: { shipA: { status: "idle", progress: 0, remaining: 0, lockTime: 0, inRange: false }, shipB: LOCKED_STATE } };
    clock.step(5, lockedView);
    clock.step(5, lockedView);
    expect(clock.spoolCycles("shipA", 0)).toBe(2);
    clock.step(1, unlockingView);
    expect(clock.spoolCycles("shipA", 0)).toBe(0);
  });

  test("capture and restore preserve spoolCycles", () => {
    const view = makeView([spoolingAttack({ em: 0, thermal: 0, kinetic: 100, explosive: 0 })]);
    const first = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    first.step(5, view);
    first.step(5, view);
    const second = new WeaponClockImpl({ rngFactory: new Mulberry32RngFactory(), hitRoll: expectedHitRoll });
    second.restore(first.capture());
    expect(second.spoolCycles("shipA", 0)).toBe(2);
    expect(second.step(5, view)).toHaveLength(1);
    expect(second.spoolCycles("shipA", 0)).toBe(3);
  });
});
