import { LockClockImpl } from "./lockClock";
import type { LockStepInput } from "./lockClock";
import type { SensorSpec } from "./types";
import { IDLE_LOCK } from "./types";

const sensor: SensorSpec = { scanResolution: 200, maxTargetingRange: 50000, maxLockedTargets: 4 };
const targetSig = 40;

function stepInput(distance: number, sensorA: SensorSpec | undefined = sensor, sensorB: SensorSpec | undefined = sensor, sigA = targetSig, sigB = targetSig): LockStepInput {
  return { distance, sensorA, sensorB, sigA, sigB };
}

describe("LockClockImpl", () => {
  test("starts idle and enters locking when in range", () => {
    const clock = new LockClockImpl();
    const states = clock.step(0.1, stepInput(10000));
    expect(states.shipA.status).toBe("locking");
    expect(states.shipA.progress).toBe(0);
    expect(states.shipA.inRange).toBe(true);
    expect(states.shipA.lockTime).toBeGreaterThan(0);
  });

  test("stays idle when out of range", () => {
    const clock = new LockClockImpl();
    const states = clock.step(0.1, stepInput(80000));
    expect(states.shipA).toEqual(IDLE_LOCK);
    expect(states.shipB).toEqual(IDLE_LOCK);
  });

  test("progresses locking over time and reaches locked", () => {
    const clock = new LockClockImpl();
    clock.step(0.1, stepInput(10000));
    const lockTime = clock.states().shipA.lockTime;
    const dt = lockTime / 2;
    const midStates = clock.step(dt, stepInput(10000));
    expect(midStates.shipA.status).toBe("locking");
    expect(midStates.shipA.progress).toBeCloseTo(0.5, 1);
    const finalStates = clock.step(dt, stepInput(10000));
    expect(finalStates.shipA.status).toBe("locked");
    expect(finalStates.shipA.progress).toBe(1);
    expect(finalStates.shipA.remaining).toBe(0);
  });

  test("breaks lock when target leaves range", () => {
    const clock = new LockClockImpl();
    clock.step(0.1, stepInput(10000));
    clock.step(1.0, stepInput(10000));
    const states = clock.step(0.1, stepInput(80000));
    expect(states.shipA.status).toBe("idle");
    expect(states.shipA.progress).toBe(0);
  });

  test("breaks lock from locked state when target leaves range", () => {
    const clock = new LockClockImpl();
    clock.step(0.1, stepInput(10000));
    const lockTime = clock.states().shipA.lockTime;
    clock.step(lockTime, stepInput(10000));
    expect(clock.states().shipA.status).toBe("locked");
    const states = clock.step(0.1, stepInput(80000));
    expect(states.shipA.status).toBe("idle");
  });

  test("recomputes lock time each tick when damps change", () => {
    const clock = new LockClockImpl();
    clock.step(0.1, stepInput(10000));
    const firstLockTime = clock.states().shipA.lockTime;
    const dampenedSensor: SensorSpec = { scanResolution: 50, maxTargetingRange: 50000, maxLockedTargets: 4 };
    const states = clock.step(0.1, stepInput(10000, dampenedSensor, dampenedSensor));
    expect(states.shipA.lockTime).toBeGreaterThan(firstLockTime * 3);
    expect(states.shipA.status).toBe("locking");
  });

  test("larger signature radius locks faster", () => {
    const clock1 = new LockClockImpl();
    const clock2 = new LockClockImpl();
    clock1.step(0.01, stepInput(10000, sensor, sensor, 40, 40));
    clock2.step(0.01, stepInput(10000, sensor, sensor, 400, 400));
    expect(clock2.states().shipA.lockTime).toBeLessThan(clock1.states().shipA.lockTime);
  });

  test("undefined sensor spec results in locked state (backward compatible)", () => {
    const clock = new LockClockImpl();
    const states = clock.step(0.1, { distance: 10000, sensorA: undefined, sensorB: undefined, sigA: targetSig, sigB: targetSig });
    expect(states.shipA.status).toBe("locked");
    expect(states.shipB.status).toBe("locked");
  });

  test("reset returns both sides to idle", () => {
    const clock = new LockClockImpl();
    clock.step(0.1, stepInput(10000));
    clock.reset();
    expect(clock.states().shipA).toEqual(IDLE_LOCK);
    expect(clock.states().shipB).toEqual(IDLE_LOCK);
  });

  test("remaining decreases as progress increases", () => {
    const clock = new LockClockImpl();
    clock.step(0.01, stepInput(10000));
    const initialRemaining = clock.states().shipA.remaining;
    clock.step(0.5, stepInput(10000));
    const laterRemaining = clock.states().shipA.remaining;
    expect(laterRemaining).toBeLessThan(initialRemaining);
  });
});
