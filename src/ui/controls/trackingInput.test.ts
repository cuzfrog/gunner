import { TrackingInputImpl, type TrackingInput } from "./trackingInput";

describe("TrackingInput", () => {
  let input: TrackingInput;

  beforeEach(() => {
    input = new TrackingInputImpl();
  });

  test("defaults to rad mode with 0.32 rad/s", () => {
    expect(input.unit).toBe("rad");
    expect(input.rad).toBe(0.32);
  });

  test("keeps rad/s unchanged and computes score for S sig resolution", () => {
    input.setDisplayValue(0.32, 40);
    const score = input.setUnit("score", 40);
    expect(score).toBe(320);
    expect(input.rad).toBe(0.32);
  });

  test("converts score back to rad/s", () => {
    input.setUnit("score", 40);
    input.setDisplayValue(320, 40);
    const rad = input.setUnit("rad", 40);
    expect(rad).toBe(0.32);
    expect(input.rad).toBe(0.32);
  });

  test("updates display when sig resolution changes in score mode", () => {
    input.setDisplayValue(0.32, 40);
    input.setUnit("score", 40);
    const newScore = input.displayValue(125);
    expect(newScore).toBeCloseTo(102.4, 10);
    expect(input.rad).toBe(0.32);
  });

  test("preserves rad/s value when sig resolution changes in rad mode", () => {
    input.setDisplayValue(0.32, 40);
    expect(input.displayValue(125)).toBe(0.32);
    expect(input.rad).toBe(0.32);
  });
});
