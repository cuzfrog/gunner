import type { LockState, SensorSpec, Side } from "./types";
import { IDLE_LOCK } from "./types";

export interface LockStepInput {
  readonly distance: number;
  readonly sensorA: SensorSpec | undefined;
  readonly sensorB: SensorSpec | undefined;
  readonly sigA: number;
  readonly sigB: number;
}

export interface LockClock {
  reset(): void;
  step(dt: number, input: LockStepInput): Record<Side, LockState>;
  states(): Record<Side, LockState>;
}

function lockTime(scanResolution: number, targetSigRadius: number): number {
  if (scanResolution <= 0) return Infinity;
  if (targetSigRadius <= 0) return Infinity;
  return 40000 / (scanResolution * Math.asinh(targetSigRadius) ** 2);
}

export class LockClockImpl implements LockClock {
  private shipA: LockState = IDLE_LOCK;
  private shipB: LockState = IDLE_LOCK;

  reset(): void {
    this.shipA = IDLE_LOCK;
    this.shipB = IDLE_LOCK;
  }

  step(dt: number, input: LockStepInput): Record<Side, LockState> {
    this.shipA = this.stepSide(this.shipA, input.sensorA, input.sigB, input.distance, dt);
    this.shipB = this.stepSide(this.shipB, input.sensorB, input.sigA, input.distance, dt);
    return this.states();
  }

  states(): Record<Side, LockState> {
    return { shipA: this.shipA, shipB: this.shipB };
  }

  private stepSide(prev: LockState, sensor: SensorSpec | undefined, targetSig: number, distance: number, dt: number): LockState {
    if (!sensor) return LOCKED_NO_SENSOR;
    const inRange = distance <= sensor.maxTargetingRange;
    const time = lockTime(sensor.scanResolution, targetSig);
    if (!inRange) return IDLE_LOCK;
    if (prev.status === "locked") return { status: "locked", progress: 1, remaining: 0, lockTime: time, inRange };
    if (prev.status === "idle") return { status: "locking", progress: 0, remaining: time, lockTime: time, inRange };
    const progress = Math.min(1, prev.progress + dt / Math.max(time, 0.001));
    if (progress >= 1) return { status: "locked", progress: 1, remaining: 0, lockTime: time, inRange };
    return { status: "locking", progress, remaining: time * (1 - progress), lockTime: time, inRange };
  }
}

const LOCKED_NO_SENSOR: LockState = { status: "locked", progress: 1, remaining: 0, lockTime: 0, inRange: true };
