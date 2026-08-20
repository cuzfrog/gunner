import { Vec2 } from "./vec2";
import { alignTime, integrateShip, timeConstant } from "./dynamics";
import type { ShipState } from "./types";

function ship(extra: Partial<ShipState> = {}): ShipState {
  return {
    id: "attacker",
    position: new Vec2(0, 0),
    velocity: new Vec2(0, 0),
    maxSpeed: 100,
    mass: 2_000_000,
    inertiaModifier: 1,
    mode: "orbit",
    desiredRange: 5000,
    aggressivity: 1,
    ...extra,
  };
}

describe("timeConstant", () => {
  test("known ship configurations produce expected tau", () => {
    expect(timeConstant(1_200_000, 3)).toBeCloseTo(3.6, 10);
    expect(timeConstant(10_000_000, 0.45)).toBeCloseTo(4.5, 10);
  });
});

describe("alignTime", () => {
  test("equals ln(4) times the time constant", () => {
    expect(alignTime(1_200_000, 3)).toBeCloseTo(Math.log(4) * 3.6, 10);
    expect(alignTime(10_000_000, 0.45)).toBeCloseTo(Math.log(4) * 4.5, 10);
  });
});

describe("integrateShip", () => {
  test("exponential convergence from standstill", () => {
    const state = ship();
    const tau = 2;
    const command = new Vec2(100, 0);
    const result = integrateShip(state, command, tau);
    expect(result.velocity.x).toBeCloseTo(100 * (1 - Math.exp(-1)), 6);
    expect(result.position.x).toBeCloseTo(100 * tau - 100 * tau * (1 - Math.exp(-1)), 6);
    expect(result.velocity.y).toBeCloseTo(0, 10);
    expect(result.position.y).toBeCloseTo(0, 10);
  });

  test("one step of 2*tau equals two steps of tau", () => {
    const state = ship();
    const command = new Vec2(100, 0);
    const first = integrateShip(state, command, 2);
    const firstState = { ...state, position: first.position, velocity: first.velocity };
    const second = integrateShip(firstState, command, 2);
    const combined = integrateShip(state, command, 4);
    expect(combined.velocity.x).toBeCloseTo(second.velocity.x, 10);
    expect(combined.velocity.y).toBeCloseTo(second.velocity.y, 10);
    expect(combined.position.x).toBeCloseTo(second.position.x, 10);
    expect(combined.position.y).toBeCloseTo(second.position.y, 10);
  });

  test("align time to 75% is close to ln(4) * tau", () => {
    const tau = 2;
    const state = ship();
    const command = new Vec2(100, 0);
    let position = state.position;
    let velocity = state.velocity;
    let elapsed = 0;
    const step = 0.01;
    while (velocity.len() / state.maxSpeed < 0.75) {
      const motion = integrateShip({ ...state, position, velocity }, command, step);
      position = motion.position;
      velocity = motion.velocity;
      elapsed += step;
    }
    expect(elapsed).toBeCloseTo(Math.log(4) * tau, 1);
  });

  test("turn bleeds speed without exceeding max", () => {
    const state = ship({ velocity: new Vec2(100, 0) });
    const command = new Vec2(0, 100);
    const result = integrateShip(state, command, 2);
    const speed = result.velocity.len();
    expect(speed).toBeGreaterThan(0);
    expect(speed).toBeLessThanOrEqual(100);
  });

  test("command clamp prevents exceeding maxSpeed", () => {
    const state = ship();
    const command = new Vec2(200, 0);
    const large = integrateShip(state, command, 1_000_000);
    expect(large.velocity.x).toBeCloseTo(100, 6);
    expect(large.velocity.y).toBeCloseTo(0, 6);
    expect(large.velocity.len()).toBeCloseTo(state.maxSpeed, 6);
  });

  test("instant response when tau is zero", () => {
    const state = ship({ mass: 0, inertiaModifier: 1e-6 });
    const command = new Vec2(50, 50);
    const result = integrateShip(state, command, 1);
    expect(result.velocity).toEqual(new Vec2(50, 50));
    expect(result.position).toEqual(new Vec2(50, 50));
  });

  test("zero dt returns identical state and does not mutate input", () => {
    const state = ship();
    const before = { ...state };
    const result = integrateShip(state, new Vec2(100, 0), 0);
    expect(result.position).toEqual(state.position);
    expect(result.velocity).toEqual(state.velocity);
    expect(state).toEqual(before);
  });

  test("negative dt returns unchanged state", () => {
    const state = ship();
    const result = integrateShip(state, new Vec2(100, 0), -1);
    expect(result.position).toEqual(state.position);
    expect(result.velocity).toEqual(state.velocity);
  });
});
