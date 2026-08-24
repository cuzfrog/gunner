import { isAutopilotMode, isSigResolutionClass } from "./types";

describe("isSigResolutionClass", () => {
  test("accepts valid sig resolution classes", () => {
    expect(isSigResolutionClass("S")).toBe(true);
    expect(isSigResolutionClass("M")).toBe(true);
    expect(isSigResolutionClass("L")).toBe(true);
    expect(isSigResolutionClass("XL")).toBe(true);
  });

  test("rejects invalid values", () => {
    expect(isSigResolutionClass("")).toBe(false);
    expect(isSigResolutionClass("XS")).toBe(false);
    expect(isSigResolutionClass("S ")).toBe(false);
    expect(isSigResolutionClass(125)).toBe(false);
    expect(isSigResolutionClass(null)).toBe(false);
    expect(isSigResolutionClass(undefined)).toBe(false);
  });
});

describe("isAutopilotMode", () => {
  test("accepts valid autopilot modes", () => {
    expect(isAutopilotMode("orbit")).toBe(true);
    expect(isAutopilotMode("keepAtRange")).toBe(true);
    expect(isAutopilotMode("midships")).toBe(true);
  });

  test("rejects invalid values", () => {
    expect(isAutopilotMode("")).toBe(false);
    expect(isAutopilotMode("orbit ")).toBe(false);
    expect(isAutopilotMode("approach")).toBe(false);
    expect(isAutopilotMode(123)).toBe(false);
    expect(isAutopilotMode(null)).toBe(false);
    expect(isAutopilotMode(undefined)).toBe(false);
  });
});
