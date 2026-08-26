import { toTypeId } from "../gamedata/ids";
import { isOptionalBoosterActivations, isOptionalEwarActivation, isOptionalHiddenRangeOverlays } from "./validators";

describe("isOptionalEwarActivation", () => {
  test("accepts a valid activation with webs and scripted disruptors", () => {
    expect(isOptionalEwarActivation({
      webs: [{ active: true, overloaded: false }, { active: false, overloaded: true }],
      grapplers: [{ active: true, overloaded: false }],
      disruptors: [{ active: true, overloaded: true, script: toTypeId("29005") }],
    })).toBe(true);
  });

  test("accepts legacy boolean webs and disruptors without overloaded", () => {
    expect(isOptionalEwarActivation({ webs: [true, false], disruptors: [{ active: true, script: "none" }] })).toBe(true);
  });

  test("accepts undefined", () => {
    expect(isOptionalEwarActivation(undefined)).toBe(true);
  });

  test("accepts empty activation", () => {
    expect(isOptionalEwarActivation({})).toBe(true);
  });

  test("rejects a non-boolean web entry", () => {
    expect(isOptionalEwarActivation({ webs: [true, "false"] })).toBe(false);
  });

  test("rejects a web object missing the active flag", () => {
    expect(isOptionalEwarActivation({ webs: [{ overloaded: true }] })).toBe(false);
  });

  test("rejects a non-string disruptor script", () => {
    expect(isOptionalEwarActivation({ disruptors: [{ active: true, script: 123 }] })).toBe(false);
  });

  test("rejects a disruptor row missing the active flag", () => {
    expect(isOptionalEwarActivation({ disruptors: [{ script: "none" }] })).toBe(false);
  });
});

describe("isOptionalHiddenRangeOverlays", () => {
  test("accepts undefined", () => {
    expect(isOptionalHiddenRangeOverlays(undefined)).toBe(true);
  });

  test("accepts a valid list of hidden overlay kinds", () => {
    expect(isOptionalHiddenRangeOverlays(["web", "grappler", "scrambler", "disruptor"])).toBe(true);
  });

  test("rejects an unknown kind", () => {
    expect(isOptionalHiddenRangeOverlays(["web", " ECM "])).toBe(false);
  });

  test("rejects a non-array", () => {
    expect(isOptionalHiddenRangeOverlays({ web: true })).toBe(false);
  });
});

describe("isOptionalBoosterActivations", () => {
  test("accepts a valid array of active and scripted booster entries", () => {
    expect(isOptionalBoosterActivations([{ active: true, script: toTypeId("28999") }, { active: false, script: "none" }])).toBe(true);
  });

  test("accepts undefined", () => {
    expect(isOptionalBoosterActivations(undefined)).toBe(true);
  });

  test("accepts an empty array", () => {
    expect(isOptionalBoosterActivations([])).toBe(true);
  });

  test("rejects a non-array", () => {
    expect(isOptionalBoosterActivations({ active: true, script: "none" })).toBe(false);
  });

  test("rejects an entry missing the active flag", () => {
    expect(isOptionalBoosterActivations([{ script: "none" }])).toBe(false);
  });

  test("rejects a non-string script", () => {
    expect(isOptionalBoosterActivations([{ active: true, script: 123 }])).toBe(false);
  });
});
