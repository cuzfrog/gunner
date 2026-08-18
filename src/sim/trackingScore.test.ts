import { toTrackingRadPerSecond, toTrackingScore } from "./trackingScore";

describe("tracking score conversion", () => {
  test("score = rad/s * 40000 / sigResolution", () => {
    expect(toTrackingScore(0.32, 40)).toBe(320);
    expect(toTrackingScore(0.32, 125)).toBeCloseTo(102.4, 10);
  });

  test("rad/s = score * sigResolution / 40000", () => {
    expect(toTrackingRadPerSecond(320, 40)).toBe(0.32);
    expect(toTrackingRadPerSecond(102.4, 125)).toBeCloseTo(0.32, 10);
  });

  test("round-trip returns the original rad/s", () => {
    const rad = 0.18;
    const sig = 400;
    const score = toTrackingScore(rad, sig);
    expect(toTrackingRadPerSecond(score, sig)).toBe(rad);
  });
});
