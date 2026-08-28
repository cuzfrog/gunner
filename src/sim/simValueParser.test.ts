import { AGGRESSIVITY_MAX, AGGRESSIVITY_MIN } from "./types";
import { SimValueParserImpl } from "./simValueParser";

const parser = new SimValueParserImpl();

describe("parseSigResolutionClass", () => {
  test("returns the value for valid sig resolution classes", () => {
    expect(parser.parseSigResolutionClass("S")).toBe("S");
    expect(parser.parseSigResolutionClass("M")).toBe("M");
    expect(parser.parseSigResolutionClass("L")).toBe("L");
    expect(parser.parseSigResolutionClass("XL")).toBe("XL");
  });

  test("returns undefined for invalid values", () => {
    expect(parser.parseSigResolutionClass("")).toBeUndefined();
    expect(parser.parseSigResolutionClass("XS")).toBeUndefined();
    expect(parser.parseSigResolutionClass("S ")).toBeUndefined();
    expect(parser.parseSigResolutionClass(125)).toBeUndefined();
    expect(parser.parseSigResolutionClass(null)).toBeUndefined();
    expect(parser.parseSigResolutionClass(undefined)).toBeUndefined();
  });
});

describe("parseAutopilotMode", () => {
  test("returns the value for valid autopilot modes", () => {
    expect(parser.parseAutopilotMode("orbit")).toBe("orbit");
    expect(parser.parseAutopilotMode("keepAtRange")).toBe("keepAtRange");
    expect(parser.parseAutopilotMode("midships")).toBe("midships");
    expect(parser.parseAutopilotMode("maneuver")).toBe("maneuver");
  });

  test("returns undefined for invalid values", () => {
    expect(parser.parseAutopilotMode("")).toBeUndefined();
    expect(parser.parseAutopilotMode("orbit ")).toBeUndefined();
    expect(parser.parseAutopilotMode("approach")).toBeUndefined();
    expect(parser.parseAutopilotMode(123)).toBeUndefined();
    expect(parser.parseAutopilotMode(null)).toBeUndefined();
    expect(parser.parseAutopilotMode(undefined)).toBeUndefined();
  });
});

describe("normalizeAggressivity", () => {
  test("clamps below the minimum to the minimum", () => {
    expect(parser.normalizeAggressivity(0.001)).toBe(AGGRESSIVITY_MIN);
  });

  test("clamps above the maximum to the maximum", () => {
    expect(parser.normalizeAggressivity(500)).toBe(AGGRESSIVITY_MAX);
  });

  test("passes in-range values through unchanged", () => {
    expect(parser.normalizeAggressivity(1)).toBe(1);
    expect(parser.normalizeAggressivity(AGGRESSIVITY_MIN)).toBe(AGGRESSIVITY_MIN);
    expect(parser.normalizeAggressivity(AGGRESSIVITY_MAX)).toBe(AGGRESSIVITY_MAX);
  });

  test("returns 1 for NaN and Infinity", () => {
    expect(parser.normalizeAggressivity(Number.NaN)).toBe(1);
    expect(parser.normalizeAggressivity(Number.POSITIVE_INFINITY)).toBe(1);
  });
});
