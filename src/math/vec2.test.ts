import * as v from "./vec2";

describe("vec2", () => {
  test("adds and subtracts", () => {
    expect(v.add(v.vec(1, 2), v.vec(3, 4))).toEqual(v.vec(4, 6));
    expect(v.sub(v.vec(3, 4), v.vec(1, 2))).toEqual(v.vec(2, 2));
  });

  test("scales and computes length", () => {
    expect(v.scale(v.vec(3, 4), 2)).toEqual(v.vec(6, 8));
    expect(v.len(v.vec(3, 4))).toBe(5);
    expect(v.len(v.vec(0, 0))).toBe(0);
  });

  test("normalizes safely", () => {
    expect(v.norm(v.vec(3, 0))).toEqual(v.vec(1, 0));
    expect(v.norm(v.vec(0, 0))).toEqual(v.vec(0, 0));
  });

  test("rotates 90 degrees", () => {
    expect(v.perpCCW(v.vec(1, 0))).toEqual(v.vec(0, 1));
    expect(v.perpCCW(v.vec(0, 1))).toEqual(v.vec(-1, 0));
    expect(v.perpCW(v.vec(1, 0))).toEqual(v.vec(0, -1));
    expect(v.perpCW(v.vec(0, 1))).toEqual(v.vec(1, 0));
  });
});
