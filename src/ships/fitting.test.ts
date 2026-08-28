import { fittingOptions } from "./fitting";

describe("fittingOptions", () => {
  test("small hull gets small propulsion plus medium afterburner overfit", () => {
    const ids = fittingOptions("small").map((m) => m.id);
    expect(ids).toEqual(["ab-1mn", "mwd-5mn", "ab-10mn"]);
  });

  test("medium hull gets medium propulsion plus large afterburner overfit", () => {
    const ids = fittingOptions("medium").map((m) => m.id);
    expect(ids).toEqual(["ab-10mn", "mwd-50mn", "ab-100mn"]);
  });

  test("large hull gets only large propulsion", () => {
    const ids = fittingOptions("large").map((m) => m.id);
    expect(ids).toEqual(["ab-100mn", "mwd-500mn"]);
  });

  test("capital hull gets only capital propulsion", () => {
    const ids = fittingOptions("capital").map((m) => m.id);
    expect(ids).toEqual(["ab-10000mn", "mwd-50000mn"]);
  });
});
