import { computeExpectedMultiplier } from "./expectedHitMultiplier";

describe("computeExpectedMultiplier", () => {
  test("z=1 yields ~1.01505 (101.5% of paper)", () => {
    expect(computeExpectedMultiplier(1)).toBeCloseTo(1.01505, 4);
  });

  test("z=0.5 yields ~0.39505 (~40%)", () => {
    expect(computeExpectedMultiplier(0.5)).toBeCloseTo(0.39505, 4);
  });

  test("z<=0.01 yields 3*z (wrecking hits only)", () => {
    expect(computeExpectedMultiplier(0.01)).toBeCloseTo(0.03, 10);
    expect(computeExpectedMultiplier(0.005)).toBeCloseTo(0.015, 10);
  });

  test("zero chance yields zero", () => {
    expect(computeExpectedMultiplier(0)).toBe(0);
  });

  test("negative chance yields zero", () => {
    expect(computeExpectedMultiplier(-1)).toBe(0);
  });
});
