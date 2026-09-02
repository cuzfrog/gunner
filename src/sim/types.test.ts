import { DAMAGE_TYPES, ZERO_DAMAGE, damageVectorAdd, damageVectorFromPartial, damageVectorScale, damageVectorSum, type DamageVector } from "./types";

describe("ZERO_DAMAGE", () => {
  test("all four types are 0", () => {
    expect(ZERO_DAMAGE.em).toBe(0);
    expect(ZERO_DAMAGE.thermal).toBe(0);
    expect(ZERO_DAMAGE.kinetic).toBe(0);
    expect(ZERO_DAMAGE.explosive).toBe(0);
  });
});

describe("DAMAGE_TYPES", () => {
  test("contains exactly the four damage types in order", () => {
    expect(DAMAGE_TYPES).toEqual(["em", "thermal", "kinetic", "explosive"]);
  });
});

describe("damageVectorSum", () => {
  const mixedVector: DamageVector = { em: 10, thermal: 20, kinetic: 30, explosive: 40 };

  test("sums all four type values into a scalar", () => {
    expect(damageVectorSum(mixedVector)).toBe(100);
  });

  test("sum of ZERO_DAMAGE is 0", () => {
    expect(damageVectorSum(ZERO_DAMAGE)).toBe(0);
  });
});

describe("damageVectorScale", () => {
  const mixedVector: DamageVector = { em: 10, thermal: 20, kinetic: 30, explosive: 40 };

  test("scales each type by the factor", () => {
    expect(damageVectorScale(mixedVector, 2)).toEqual({ em: 20, thermal: 40, kinetic: 60, explosive: 80 });
  });

  test("scaling by 0 gives ZERO_DAMAGE", () => {
    expect(damageVectorScale(mixedVector, 0)).toEqual(ZERO_DAMAGE);
  });

  test("scaling by 1 is identity", () => {
    expect(damageVectorScale(mixedVector, 1)).toEqual(mixedVector);
  });
});

describe("damageVectorAdd", () => {
  const a: DamageVector = { em: 10, thermal: 20, kinetic: 30, explosive: 40 };
  const b: DamageVector = { em: 5, thermal: 15, kinetic: 25, explosive: 35 };

  test("adds two multi-type vectors component-wise", () => {
    expect(damageVectorAdd(a, b)).toEqual({ em: 15, thermal: 35, kinetic: 55, explosive: 75 });
  });

  test("adding ZERO_DAMAGE is identity", () => {
    expect(damageVectorAdd(a, ZERO_DAMAGE)).toEqual(a);
  });

  test("adding a vector to itself doubles each type", () => {
    expect(damageVectorAdd(a, a)).toEqual({ em: 20, thermal: 40, kinetic: 60, explosive: 80 });
  });
});

describe("damageVectorFromPartial", () => {
  test("fills missing types with 0", () => {
    expect(damageVectorFromPartial({ kinetic: 30, thermal: 20 })).toEqual({ em: 0, thermal: 20, kinetic: 30, explosive: 0 });
  });

  test("a full record passes through", () => {
    const full: DamageVector = { em: 10, thermal: 20, kinetic: 30, explosive: 40 };
    expect(damageVectorFromPartial(full)).toEqual(full);
  });

  test("an empty record gives ZERO_DAMAGE", () => {
    expect(damageVectorFromPartial({})).toEqual(ZERO_DAMAGE);
  });
});
