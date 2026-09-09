import { toTypeId } from "../gamedata/ids";
import { isFittedHull, isOptionalBoosterActivations, isOptionalEwarActivation, isOptionalRangeOverlayVisibility } from "./validators";

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

describe("isOptionalRangeOverlayVisibility", () => {
  test("accepts undefined", () => {
    expect(isOptionalRangeOverlayVisibility(undefined)).toBe(true);
  });

  test("accepts a valid visibility map", () => {
    expect(isOptionalRangeOverlayVisibility({ web: "shipA", grappler: "both", scrambler: "none", disruptor: "shipB" })).toBe(true);
  });

  test("rejects an unknown kind key", () => {
    expect(isOptionalRangeOverlayVisibility({ web: "both", ecm: "shipA" })).toBe(false);
  });

  test("rejects an invalid visibility value", () => {
    expect(isOptionalRangeOverlayVisibility({ web: "all" })).toBe(false);
  });

  test("rejects a non-object", () => {
    expect(isOptionalRangeOverlayVisibility(["web", "grappler"])).toBe(false);
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

describe("isFittedHull", () => {
  const VALID_HULL = { mass: 1_500_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0, mwdSigBloomMultiplier: 1 } as const;

  test("accepts a fully populated hull", () => {
    expect(isFittedHull({ ...VALID_HULL })).toBe(true);
  });

  test("defaults multipliers missing from legacy records to 1", () => {
    expect(isFittedHull({ ...VALID_HULL, massMultiplier: undefined, mwdSigBloomMultiplier: undefined })).toBe(true);
    expect(isFittedHull({ ...VALID_HULL, speedMultiplier: undefined })).toBe(false);
  });

  test("accepts a negative mwdSigBloomMultiplier produced by module stacking", () => {
    expect(isFittedHull({ ...VALID_HULL, mwdSigBloomMultiplier: -1.5 })).toBe(true);
  });

  test("accepts negative accumulated multipliers", () => {
    expect(isFittedHull({ ...VALID_HULL, speedMultiplier: -0.4, inertiaMultiplier: -0.2 })).toBe(true);
  });

  test("rejects non-finite values", () => {
    expect(isFittedHull({ ...VALID_HULL, mass: Number.NaN })).toBe(false);
    expect(isFittedHull({ ...VALID_HULL, mwdSigBloomMultiplier: Number.POSITIVE_INFINITY })).toBe(false);
  });

  test("rejects a non-number field", () => {
    expect(isFittedHull({ ...VALID_HULL, mass: "heavy" })).toBe(false);
  });
});
