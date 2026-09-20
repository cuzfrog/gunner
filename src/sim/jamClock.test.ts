import { JamClockImpl, sampledJamRoll, expectedJamRoll } from "./jamClock";
import type { JamRollStrategy } from "./jamClock";
import { EwarResolverImpl } from "./ewarResolver";
import { StackingPenaltyImpl } from "./stackingPenalty";
import type { Rng, RngFactory } from "./rng";
import { toTypeId } from "../gamedata/ids";
import { EMPTY_EWAR_LOADOUT, type EwarProjection, type JammerSpec, type Side, type SensorStrengths } from "./types";

const stacking = new StackingPenaltyImpl();
const resolver = new EwarResolverImpl({ stackingPenalty: stacking });

const GRAV_JAM_ID = toTypeId("2571");
const CYCLE = 20;
const JAM_DURATION = 20;

const SENSOR: SensorStrengths = { gravimetric: 1, ladar: 0, magnetometric: 0, radar: 0 };

function jammer(strength = 100, cycleTime = CYCLE): JammerSpec {
  return { moduleName: "Gravimetric ECM II", moduleId: GRAV_JAM_ID, strengths: { gravimetric: strength, ladar: 0, magnetometric: 0, radar: 0 }, optimal: 34560, falloff: 32400, overloadStrengthBonusPercent: 20, capacitorNeed: 58, cycleTime };
}

function projection(specs: readonly JammerSpec[], activations?: readonly { active: boolean; overloaded: boolean }[]): EwarProjection {
  return {
    loadout: { ...EMPTY_EWAR_LOADOUT, jammers: specs },
    activation: activations ? { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], neutralizers: [], nosferatu: [], jammers: activations } : undefined,
  };
}

const DETERMINISTIC_RNG_FACTORY: RngFactory = { create: (_seed: number): Rng => ({ next: () => 0.5 }) };

function alwaysTrue(): JamRollStrategy {
  return () => true;
}

function alwaysFalse(): JamRollStrategy {
  return () => false;
}

interface TestClockDeps {
  readonly outcomes?: readonly boolean[];
  readonly roll?: JamRollStrategy;
}

/** Roll strategy that replays a fixed outcome sequence, then repeats the last value. */
function scriptedRoll(outcomes: readonly boolean[]): JamRollStrategy {
  let index = 0;
  return () => {
    const value = outcomes[Math.min(index, outcomes.length - 1)];
    index++;
    return value;
  };
}

function createClock(deps: TestClockDeps = {}): JamClockImpl {
  return new JamClockImpl({
    resolver,
    roll: deps.roll ?? (deps.outcomes ? scriptedRoll(deps.outcomes) : alwaysTrue()),
    rngFactory: DETERMINISTIC_RNG_FACTORY,
  });
}

function stepInput(dt: number, overrides: Partial<Parameters<JamClockImpl["step"]>[0]> = {}): Parameters<JamClockImpl["step"]>[0] {
  const sensorStrengths: Record<Side, SensorStrengths | undefined> = { shipA: SENSOR, shipB: SENSOR };
  return { dt, projections: { shipA: undefined, shipB: undefined }, distance: 10000, sensorStrengths, operational: { shipA: true, shipB: true }, ...overrides };
}

describe("JamClockImpl", () => {
  test("no jam before the first cycle completes", () => {
    const clock = createClock();
    clock.step(stepInput(10, { projections: { shipA: projection([jammer()]), shipB: undefined } }));
    expect(clock.jammed().shipB).toBe(false);
  });

  test("successful roll jams the target at the cycle boundary and expires after 20 seconds", () => {
    const clock = createClock({ outcomes: [true, false] });
    const input = stepInput(CYCLE, { projections: { shipA: projection([jammer()]), shipB: undefined } });
    clock.step(input);
    expect(clock.jammed().shipB).toBe(true);
    clock.step(stepInput(JAM_DURATION - 0.1));
    expect(clock.jammed().shipB).toBe(true);
    clock.step(stepInput(0.1));
    expect(clock.jammed().shipB).toBe(false);
  });

  test("failed roll does not jam", () => {
    const clock = createClock({ roll: alwaysFalse() });
    clock.step(stepInput(CYCLE, { projections: { shipA: projection([jammer()]), shipB: undefined } }));
    expect(clock.jammed().shipB).toBe(false);
  });

  test("inactive jammer does not roll", () => {
    const clock = createClock();
    clock.step(stepInput(CYCLE, { projections: { shipA: projection([jammer()], [{ active: false, overloaded: false }]), shipB: undefined } }));
    expect(clock.jammed().shipB).toBe(false);
  });

  test("destroyed side does not roll", () => {
    const clock = createClock();
    clock.step(stepInput(CYCLE, { projections: { shipA: projection([jammer()]), shipB: undefined }, operational: { shipA: false, shipB: true } }));
    expect(clock.jammed().shipB).toBe(false);
  });

  test("each jammer rolls independently", () => {
    const clock = createClock({ outcomes: [false, true] });
    clock.step(stepInput(CYCLE, { projections: { shipA: projection([jammer(), jammer()]), shipB: undefined } }));
    expect(clock.jammed().shipB).toBe(true);
  });

  test("jams are per side", () => {
    const clock = createClock();
    clock.step(stepInput(CYCLE, { projections: { shipA: projection([jammer()]), shipB: projection([jammer()]) } }));
    expect(clock.jammed().shipA).toBe(true);
    expect(clock.jammed().shipB).toBe(true);
  });

  test("restore preserves jam window and cycle timers", () => {
    const shooter = projection([jammer()]);
    const clock = createClock({ outcomes: [true, false] });
    clock.step(stepInput(CYCLE, { projections: { shipA: shooter, shipB: undefined } }));
    const restored = createClock({ outcomes: [false, true] });
    restored.restore(clock.capture());
    expect(restored.jammed().shipB).toBe(true);
    restored.step(stepInput(JAM_DURATION - 0.1, { projections: { shipA: shooter, shipB: undefined } }));
    expect(restored.jammed().shipB).toBe(true);
    restored.step(stepInput(0.1, { projections: { shipA: shooter, shipB: undefined } }));
    expect(restored.jammed().shipB).toBe(false);
    // Cycle timers continue: the next roll fires exactly one cycle after the first.
    restored.step(stepInput(CYCLE, { projections: { shipA: shooter, shipB: undefined } }));
    expect(restored.jammed().shipB).toBe(true);
  });

  test("expected strategy jams iff chance is at least 0.5", () => {
    const weak = createClock({ roll: expectedJamRoll });
    weak.step(stepInput(CYCLE, { projections: { shipA: projection([jammer(0.4)]), shipB: undefined } }));
    expect(weak.jammed().shipB).toBe(false);
    const strong = createClock({ roll: expectedJamRoll });
    strong.step(stepInput(CYCLE, { projections: { shipA: projection([jammer(0.6)]), shipB: undefined } }));
    expect(strong.jammed().shipB).toBe(true);
  });

  test("sampled strategy rolls against the chance", () => {
    expect(sampledJamRoll({ next: () => 0.1 }, 0.2)).toBe(true);
    expect(sampledJamRoll({ next: () => 0.3 }, 0.2)).toBe(false);
    expect(sampledJamRoll({ next: () => 0 }, 0)).toBe(false);
  });
});
