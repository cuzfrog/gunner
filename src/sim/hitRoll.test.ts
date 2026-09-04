import type { Rng } from "./rng";
import { Mulberry32Rng } from "./rng";
import { rollHit } from "./hitRoll";

class MockRng implements Rng {
  private values: readonly number[];
  private index: number;

  constructor(values: readonly number[]) {
    this.values = values;
    this.index = 0;
  }

  next(): number {
    const v = this.values[this.index] ?? this.values[this.values.length - 1] ?? 0;
    this.index++;
    return v;
  }
}

describe("rollHit", () => {
  test("zero hit chance always misses", () => {
    const rng = new MockRng([0.5, 0.01, 0.99]);
    expect(rollHit(rng, 0)).toBe(0);
    expect(rollHit(rng, 0)).toBe(0);
    expect(rollHit(rng, 0)).toBe(0);
  });

  test("wrecking hit at x < 0.01 returns 3", () => {
    const rng = new MockRng([0.005]);
    expect(rollHit(rng, 1)).toBe(3);
  });

  test("wrecking hit works even at low hitChance", () => {
    const rng = new MockRng([0.005]);
    expect(rollHit(rng, 0.02)).toBe(3);
  });

  test("normal hit returns x + 0.49", () => {
    const rng = new MockRng([0.5]);
    expect(rollHit(rng, 1)).toBeCloseTo(0.99, 10);
  });

  test("normal hit at x = 0.01 boundary returns 0.5", () => {
    const rng = new MockRng([0.01]);
    expect(rollHit(rng, 1)).toBeCloseTo(0.5, 10);
  });

  test("normal hit at x approaching 1.0 returns approaching 1.49", () => {
    const rng = new MockRng([0.99]);
    expect(rollHit(rng, 1)).toBeCloseTo(0.99 + 0.49, 10);
  });

  test("miss when x > hitChance returns 0", () => {
    const rng = new MockRng([0.6]);
    expect(rollHit(rng, 0.5)).toBe(0);
  });

  test("hit when x = hitChance boundary (not miss)", () => {
    const rng = new MockRng([0.5]);
    expect(rollHit(rng, 0.5)).toBeCloseTo(0.99, 10);
  });

  test("100% hit chance never misses", () => {
    const rng = new MockRng([0.5, 0.99, 0.01, 0.3]);
    for (let i = 0; i < 4; i++) {
      expect(rollHit(rng, 1)).toBeGreaterThan(0);
    }
  });

  test("average multiplier approximates expected multiplier at 100% chance", () => {
    const rng = new Mulberry32Rng(314);
    let sum = 0;
    const count = 1000000;
    for (let i = 0; i < count; i++) {
      sum += rollHit(rng, 1);
    }
    const avg = sum / count;
    expect(avg).toBeCloseTo(1.01505, 2);
  });

  test("average multiplier approximates expected at 50% chance", () => {
    const rng = new Mulberry32Rng(271);
    let sum = 0;
    const count = 1000000;
    for (let i = 0; i < count; i++) {
      sum += rollHit(rng, 0.5);
    }
    const avg = sum / count;
    expect(avg).toBeCloseTo(0.39505, 2);
  });
});
