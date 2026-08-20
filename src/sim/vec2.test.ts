import { Vec2 } from "./vec2";

describe("Vec2", () => {
  test("constructs with x and y", () => {
    const v = new Vec2(1, 2);
    expect(v.x).toBe(1);
    expect(v.y).toBe(2);
  });

  test("adds and subtracts", () => {
    expect(new Vec2(1, 2).add(new Vec2(3, 4))).toEqual(new Vec2(4, 6));
    expect(new Vec2(3, 4).sub(new Vec2(1, 2))).toEqual(new Vec2(2, 2));
  });

  test("scales and computes length", () => {
    expect(new Vec2(3, 4).scale(2)).toEqual(new Vec2(6, 8));
    expect(new Vec2(3, 4).len()).toBe(5);
    expect(new Vec2(0, 0).len()).toBe(0);
  });

  test("computes distance", () => {
    expect(new Vec2(0, 0).dist(new Vec2(3, 4))).toBe(5);
  });

  test("normalizes safely", () => {
    expect(new Vec2(3, 0).norm()).toEqual(new Vec2(1, 0));
    expect(new Vec2(0, 0).norm()).toEqual(new Vec2(0, 0));
  });

  test("rotates 90 degrees", () => {
    expect(new Vec2(1, 0).perpCCW()).toEqual(new Vec2(0, 1));
    expect(new Vec2(0, 1).perpCCW()).toEqual(new Vec2(-1, 0));
    expect(new Vec2(1, 0).perpCW()).toEqual(new Vec2(0, -1));
    expect(new Vec2(0, 1).perpCW()).toEqual(new Vec2(1, 0));
  });

  test("computes angle", () => {
    expect(new Vec2(1, 0).angle()).toBe(0);
    expect(new Vec2(0, 1).angle()).toBeCloseTo(Math.PI / 2, 10);
  });
});
