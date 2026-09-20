import type { EwarProjection, SensorStrengths, Side } from "./types";
import type { EwarResolver } from "./ewarResolver";
import type { Rng, RngFactory } from "./rng";
import type { Restorable } from "./restorable";

export type JamRollStrategy = (rng: Rng, chance: number) => boolean;

/** Live world: a jam lands when a uniform draw falls below the per-cycle chance. */
export function sampledJamRoll(rng: Rng, chance: number): boolean {
  return chance > 0 && rng.next() < chance;
}

/** Projection world: deterministic majority outcome, mirroring the expected-hit-roll philosophy. */
export function expectedJamRoll(_rng: Rng, chance: number): boolean {
  return chance >= 0.5;
}

export interface JamStepInput {
  readonly dt: number;
  /** Shooter-side ewar projections; undefined = the side projects nothing (no modules or destroyed). */
  readonly projections: Record<Side, EwarProjection | undefined>;
  readonly distance: number;
  /** Own sensor strengths per side; a side's strengths are the jam target of its opponent's rolls. */
  readonly sensorStrengths: Record<Side, SensorStrengths | undefined>;
  /** A destroyed side rolls no jammer cycles. */
  readonly operational: Record<Side, boolean>;
}

export interface JamClockState {
  readonly time: number;
  readonly jamUntil: Record<Side, number>;
  /** Accumulated cycle time per jammer, aligned with the loadout order. */
  readonly timers: Record<Side, readonly number[]>;
  readonly seed: number;
}

export interface JamClock extends Restorable<JamClockState> {
  reset(): void;
  step(input: JamStepInput): void;
  jammed(): Record<Side, boolean>;
}

/** Jam attempts happen at cycle completion; a successful jam breaks locks for 20 seconds (EVE jam duration). */
const JAM_DURATION_SECONDS = 20;
const SIDES: readonly Side[] = ["shipA", "shipB"] as const;

export class JamClockImpl implements JamClock {
  private readonly resolver: EwarResolver;
  private readonly roll: JamRollStrategy;
  private readonly rngFactory: RngFactory;
  private time = 0;
  private seed = 0;
  private jamUntil: Record<Side, number> = { shipA: Number.NEGATIVE_INFINITY, shipB: Number.NEGATIVE_INFINITY };
  private timers: Record<Side, readonly number[]> = { shipA: [], shipB: [] };
  private rngs: Record<Side, Rng>;

  constructor(deps: { resolver: EwarResolver; roll: JamRollStrategy; rngFactory: RngFactory }) {
    this.resolver = deps.resolver;
    this.roll = deps.roll;
    this.rngFactory = deps.rngFactory;
    this.rngs = { shipA: deps.rngFactory.create(this.seed), shipB: deps.rngFactory.create(this.seed + 1) };
  }

  reset(): void {
    this.seed += SIDES.length;
    this.time = 0;
    this.jamUntil = { shipA: Number.NEGATIVE_INFINITY, shipB: Number.NEGATIVE_INFINITY };
    this.timers = { shipA: [], shipB: [] };
    this.rngs = { shipA: this.rngFactory.create(this.seed), shipB: this.rngFactory.create(this.seed + 1) };
  }

  step(input: JamStepInput): void {
    this.time += input.dt;
    for (const side of SIDES) this.stepSide(side, input);
  }

  jammed(): Record<Side, boolean> {
    return { shipA: this.jamUntil.shipA > this.time, shipB: this.jamUntil.shipB > this.time };
  }

  capture(): JamClockState {
    return { time: this.time, seed: this.seed, jamUntil: { ...this.jamUntil }, timers: { shipA: [...this.timers.shipA], shipB: [...this.timers.shipB] } };
  }

  restore(state: JamClockState): void {
    this.time = state.time;
    this.seed = state.seed;
    this.jamUntil = { ...state.jamUntil };
    this.timers = { shipA: [...state.timers.shipA], shipB: [...state.timers.shipB] };
    this.rngs = { shipA: this.rngFactory.create(this.seed), shipB: this.rngFactory.create(this.seed + 1) };
  }

  private stepSide(side: Side, input: JamStepInput): void {
    const specs = input.projections[side]?.loadout.jammers ?? [];
    if (this.timers[side].length !== specs.length) this.timers = { ...this.timers, [side]: specs.map(() => 0) };
    if (!input.operational[side]) return;
    const target = side === "shipA" ? "shipB" : "shipA";
    const chances = this.resolver.jammerChances(input.projections[side], input.distance, input.sensorStrengths[target]);
    const rng = this.rngs[side];
    const timers = [...this.timers[side]];
    for (let i = 0; i < specs.length; i++) {
      timers[i] += input.dt;
      if (timers[i] < specs[i].cycleTime) continue;
      timers[i] %= specs[i].cycleTime;
      if ((chances[i] ?? 0) <= 0) continue;
      if (this.roll(rng, chances[i] ?? 0)) this.jamUntil[target] = this.time + JAM_DURATION_SECONDS;
    }
    this.timers = { ...this.timers, [side]: timers };
  }
}
