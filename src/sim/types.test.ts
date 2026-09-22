import { actingEwarFamilies, DAMAGE_TYPES, EMPTY_EWAR_LOADOUT, ZERO_DAMAGE, damageVectorAdd, damageVectorFromPartial, damageVectorScale, damageVectorSum, type DamageVector, deriveEngagementFrame, type EwarActivation, type EwarLoadout, type JammerSpec, type NosferatuSpec, type ShipState, type StasisWebSpec } from "./types";
import { toTypeId } from "../gamedata/ids";
import { Vec2 } from "./vec2";

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

describe("deriveEngagementFrame", () => {
  const shipA: ShipState = { id: "shipA", position: new Vec2(0, 0), velocity: new Vec2(0, 0), maxSpeed: 0, mass: 1, inertiaModifier: 1, mode: "orbit", desiredRange: 0, aggressivity: 1 };
  const shipB: ShipState = { ...shipA, id: "shipB" };

  test("decomposes pure transversal motion", () => {
    const frame = deriveEngagementFrame({ time: 1, shipA, shipB, relPosition: new Vec2(0, 6000), relVelocity: new Vec2(3000, 0) });
    expect(frame.distance).toBe(6000);
    expect(frame.radialVelocity).toBe(0);
    expect(frame.transversalSpeed).toBe(3000);
    expect(frame.angularVelocity).toBeCloseTo(0.5, 12);
  });

  test("decomposes mixed radial and transversal motion", () => {
    const frame = deriveEngagementFrame({ time: 1, shipA, shipB, relPosition: new Vec2(1000, 0), relVelocity: new Vec2(100, 200) });
    expect(frame.radialVelocity).toBe(100);
    expect(frame.transversalVelocity).toEqual(new Vec2(0, 200));
    expect(frame.transversalSpeed).toBe(200);
    expect(frame.angularVelocity).toBeCloseTo(0.2, 12);
  });

  test("zero distance yields zero angular velocity and keeps the radial along the unit x axis", () => {
    const frame = deriveEngagementFrame({ time: 1, shipA, shipB, relPosition: new Vec2(0, 0), relVelocity: new Vec2(50, 0) });
    expect(frame.distance).toBe(0);
    expect(frame.radialVelocity).toBe(50);
    expect(frame.transversalSpeed).toBe(0);
    expect(frame.angularVelocity).toBe(0);
  });

  test("transversal speed, angular velocity and distance stay mutually consistent", () => {
    const frame = deriveEngagementFrame({ time: 1, shipA, shipB, relPosition: new Vec2(-3000, 4000), relVelocity: new Vec2(120, -40) });
    expect(frame.distance).toBeCloseTo(5000, 9);
    expect(frame.transversalSpeed).toBeCloseTo(frame.angularVelocity * frame.distance, 9);
    expect(frame.relVelocity.dot(new Vec2(frame.relPosition.x / frame.distance, frame.relPosition.y / frame.distance))).toBeCloseTo(frame.radialVelocity, 9);
  });
});

describe("actingEwarFamilies", () => {
  const id = (n: string) => toTypeId(n);
  const web: StasisWebSpec = { moduleName: "Web", moduleId: id("1"), maxRange: 10000, speedFactor: 0.4, overloadRangeBonusPercent: 0, capacitorNeed: 10, cycleTime: 5 };
  const nosferatu: NosferatuSpec = { moduleName: "Vampire", moduleId: id("2"), amount: 480, cycleTime: 6, maxRange: 9000, falloff: 6000 };
  const jammer: JammerSpec = { moduleName: "ECM", moduleId: id("3"), optimal: 18000, falloff: 34000, strengths: { gravimetric: 8, ladar: 8, magnetometric: 8, radar: 8 }, overloadStrengthBonusPercent: 0, capacitorNeed: 26, cycleTime: 20 };
  const loadout: EwarLoadout = { ...EMPTY_EWAR_LOADOUT, webs: [web], nosferatu: [nosferatu], jammers: [jammer] };

  test("enumerates every acting family in stable order, including jammers and nosferatu", () => {
    const families = actingEwarFamilies(loadout);
    expect(families.map((family) => family.specs.map((spec) => spec.moduleId))).toEqual([
      [id("1")], [], [], [], [], [], [], [id("2")], [id("3")],
    ]);
  });

  test("activeAt reads the activation arrays per family and index", () => {
    const activation: EwarActivation = { webs: [{ active: false, overloaded: false }], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], neutralizers: [], nosferatu: [], jammers: [{ active: true, overloaded: false }] };
    const families = actingEwarFamilies(loadout, activation);
    expect(families[0].activeAt(0)).toBe(false);
    expect(families[8].activeAt(0)).toBe(true);
    expect(families[7].activeAt(0)).toBeUndefined();
  });

  test("absent activation means every module cycles by default", () => {
    const families = actingEwarFamilies(loadout);
    expect(families[0].activeAt(0)).toBeUndefined();
    expect(families[8].activeAt(0)).toBeUndefined();
  });
});
