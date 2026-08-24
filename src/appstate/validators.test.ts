import { isOptionalEwarActivation } from "./validators";

describe("isOptionalEwarActivation", () => {
  test("accepts a valid activation with webs and scripted disruptors", () => {
    expect(isOptionalEwarActivation({
      webs: [{ active: true, overloaded: false }, { active: false, overloaded: true }],
      disruptors: [{ active: true, overloaded: true, script: "Optimal Range Disruption Script" }],
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
