import { StackingPenaltyImpl } from "./stackingPenalty";

const stacking = new StackingPenaltyImpl();

function stackingPenaltyForTwo(first: number, second: number): number {
  const penalty = Math.exp(-1 / 7.1289);
  return first * (1 + (second - 1) * penalty);
}

describe("StackingPenaltyImpl", () => {
  test("identity for empty input", () => {
    expect(stacking.apply([])).toBe(1);
  });

  test("drops identity multipliers", () => {
    expect(stacking.apply([1, 1.1, 1])).toBeCloseTo(1.1, 10);
  });

  test("penalizes the second positive modifier", () => {
    const first = 1.2;
    const second = 1.1;
    expect(stacking.apply([first, second])).toBeCloseTo(stackingPenaltyForTwo(first, second), 10);
  });

  test("penalizes the second negative modifier", () => {
    const first = 0.8;
    const second = 0.8425;
    expect(stacking.apply([first, second])).toBeCloseTo(stackingPenaltyForTwo(first, second), 10);
  });

  test("sorts positives strongest-first", () => {
    expect(stacking.apply([1.1, 1.2])).toBeCloseTo(stacking.apply([1.2, 1.1]), 10);
  });

  test("sorts negatives strongest-first", () => {
    expect(stacking.apply([0.9, 0.8])).toBeCloseTo(stacking.apply([0.8, 0.9]), 10);
  });

  test("keeps positive and negative chains separate", () => {
    const expected = stackingPenaltyForTwo(1.2, 1.1) * stackingPenaltyForTwo(0.8, 0.8425);
    expect(stacking.apply([1.2, 0.8, 1.1, 0.8425])).toBeCloseTo(expected, 10);
  });
});
