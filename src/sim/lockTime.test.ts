import { lockTime } from "./lockTime";

describe("lockTime", () => {
  test("computes lock time in seconds from scan resolution and signature radius", () => {
    expect(lockTime(200, 120)).toBeCloseTo(6.6583, 3);
  });

  test("returns Infinity for non-positive scan resolution or signature radius", () => {
    expect(lockTime(0, 120)).toBe(Infinity);
    expect(lockTime(-1, 120)).toBe(Infinity);
    expect(lockTime(200, 0)).toBe(Infinity);
    expect(lockTime(200, -1)).toBe(Infinity);
  });

  test("larger signature radius locks faster at the same scan resolution", () => {
    expect(lockTime(200, 400)).toBeLessThan(lockTime(200, 40));
  });
});
