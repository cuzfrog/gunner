import { describe, expect, test } from "bun:test";
import { toTypeId } from "../gamedata/ids";
import { FighterSimulatorImpl } from "./fighterSimulator";
import { Vec2 } from "./vec2";
import { ZERO_DAMAGE, type EngagementFrame, type FighterSpec, type ShipState } from "./types";

function templar(overrides: Partial<FighterSpec> = {}): FighterSpec {
  return {
    kind: "fighter",
    moduleId: toTypeId("34359"),
    damagePerVolley: { em: 182.8125, thermal: 0, kinetic: 0, explosive: 0 },
    cycleTime: 5,
    fighterCount: 6,
    maxVelocity: 1300,
    orbitRange: 6500,
    explosionRadius: 185,
    explosionVelocity: 105,
    damageReductionFactor: 0.64444259751338,
    optimal: 8000,
    falloff: 5000,
    magazine: { numShots: 12, rearmTime: 4, refuelingTime: 5 },
    ...overrides,
  };
}

function shipAt(x: number, y: number): ShipState {
  return { id: "shipA", maxSpeed: 0, mass: 1_000_000, inertiaModifier: 1, mode: "orbit", desiredRange: 1000, aggressivity: 1, position: new Vec2(x, y), velocity: new Vec2(0, 0) };
}

function frame(shipAPos: Vec2, shipBPos: Vec2): EngagementFrame {
  const dist = shipAPos.dist(shipBPos);
  return { time: 0, shipA: shipAt(shipAPos.x, shipAPos.y), shipB: { ...shipAt(shipBPos.x, shipBPos.y), id: "shipB" }, relPosition: shipBPos.sub(shipAPos), distance: dist, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0 };
}

describe("FighterSimulatorImpl", () => {
  test("reset creates one body per fighter at the origin", () => {
    const sim = new FighterSimulatorImpl();
    sim.reset({ shipA: [templar()], shipB: [] });
    const states = sim.states("shipA");
    expect(states).toHaveLength(1);
    expect(states[0].positions).toHaveLength(6);
    for (const pos of states[0].positions) expect(pos).toEqual(new Vec2(0, 0));
  });

  test("fighters launch from the ship and fly toward the target", () => {
    const sim = new FighterSimulatorImpl();
    sim.reset({ shipA: [templar()], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(50000, 0);
    sim.step(0.001, frame(shipPos, targetPos), { shipA: true, shipB: true });
    const deployed = sim.states("shipA")[0].positions.map((p) => p.dist(targetPos));
    sim.step(2, frame(shipPos, targetPos), { shipA: true, shipB: true });
    const flying = sim.states("shipA")[0].positions;
    for (let i = 0; i < flying.length; i++) expect(flying[i].dist(targetPos)).toBeLessThan(deployed[i]);
  });

  test("non-operational side freezes its fighters in place", () => {
    const sim = new FighterSimulatorImpl();
    sim.reset({ shipA: [templar()], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(50000, 0);
    sim.step(0.001, frame(shipPos, targetPos), { shipA: true, shipB: true });
    sim.step(2, frame(shipPos, targetPos), { shipA: true, shipB: true });
    const before = sim.states("shipA")[0].positions.map((p) => new Vec2(p.x, p.y));
    sim.step(2, frame(shipPos, targetPos), { shipA: false, shipB: true });
    const frozen = sim.states("shipA")[0].positions;
    for (let i = 0; i < before.length; i++) {
      expect(frozen[i].x).toBe(before[i].x);
      expect(frozen[i].y).toBe(before[i].y);
    }
  });

  test("fighters settle into orbit around the target at orbit range", () => {
    const sim = new FighterSimulatorImpl();
    sim.reset({ shipA: [templar({ fighterCount: 1 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(5000, 0);
    for (let i = 0; i < 600; i++) sim.step(0.1, frame(shipPos, targetPos), { shipA: true, shipB: true });
    const pos = sim.states("shipA")[0].positions[0];
    const dist = pos.dist(targetPos);
    expect(dist).toBeGreaterThan(5500);
    expect(dist).toBeLessThan(7500);
  });

  test("fighters keep orbiting rather than stopping on the target", () => {
    const sim = new FighterSimulatorImpl();
    sim.reset({ shipA: [templar({ fighterCount: 1 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(5000, 0);
    for (let i = 0; i < 300; i++) sim.step(0.1, frame(shipPos, targetPos), { shipA: true, shipB: true });
    const pos1 = sim.states("shipA")[0].positions[0];
    sim.step(0.5, frame(shipPos, targetPos), { shipA: true, shipB: true });
    const pos2 = sim.states("shipA")[0].positions[0];
    expect(pos1.dist(pos2)).toBeGreaterThan(10);
  });

  test("squadron fighters spread apart rather than stacking", () => {
    const sim = new FighterSimulatorImpl();
    sim.reset({ shipA: [templar()], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(5000, 0);
    for (let i = 0; i < 400; i++) sim.step(0.1, frame(shipPos, targetPos), { shipA: true, shipB: true });
    const positions = sim.states("shipA")[0].positions;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        expect(positions[i].dist(positions[j])).toBeGreaterThan(100);
      }
    }
  });

  test("each group tracks its own squadron independently", () => {
    const sim = new FighterSimulatorImpl();
    sim.reset({ shipA: [templar(), templar({ maxVelocity: 900 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(50000, 0);
    sim.step(0.001, frame(shipPos, targetPos), { shipA: true, shipB: true });
    sim.step(1, frame(shipPos, targetPos), { shipA: true, shipB: true });
    const states = sim.states("shipA");
    expect(states).toHaveLength(2);
    expect(states[0].positions[0]).not.toEqual(states[1].positions[0]);
  });

  test("shipB squadrons orbit shipA", () => {
    const sim = new FighterSimulatorImpl();
    sim.reset({ shipA: [], shipB: [templar({ fighterCount: 1 })] });
    const shipAPos = new Vec2(0, 0);
    const shipBPos = new Vec2(50000, 0);
    for (let i = 0; i < 600; i++) sim.step(0.1, frame(shipAPos, shipBPos), { shipA: true, shipB: true });
    const pos = sim.states("shipB")[0].positions[0];
    const dist = pos.dist(shipAPos);
    expect(dist).toBeGreaterThan(5500);
    expect(dist).toBeLessThan(7500);
  });

  test("update preserves positions when the spec changes but count stays", () => {
    const sim = new FighterSimulatorImpl();
    sim.reset({ shipA: [templar()], shipB: [] });
    for (let i = 0; i < 50; i++) sim.step(0.1, frame(new Vec2(0, 0), new Vec2(5000, 0)), { shipA: true, shipB: true });
    const before = sim.states("shipA")[0].positions.map((p) => new Vec2(p.x, p.y));
    sim.update({ shipA: [templar({ maxVelocity: 1500 })], shipB: [] });
    const after = sim.states("shipA")[0].positions;
    expect(after).toHaveLength(before.length);
    for (let i = 0; i < before.length; i++) {
      expect(after[i].x).toBeCloseTo(before[i].x, 5);
      expect(after[i].y).toBeCloseTo(before[i].y, 5);
    }
  });

  test("update rebuilds the squadron when the fighter count changes", () => {
    const sim = new FighterSimulatorImpl();
    sim.reset({ shipA: [templar()], shipB: [] });
    for (let i = 0; i < 50; i++) sim.step(0.1, frame(new Vec2(0, 0), new Vec2(5000, 0)), { shipA: true, shipB: true });
    sim.update({ shipA: [templar({ fighterCount: 3 })], shipB: [] });
    expect(sim.states("shipA")[0].positions).toHaveLength(3);
  });

  test("capture and restore round-trips squadron motion into another instance", () => {
    const first = new FighterSimulatorImpl();
    first.reset({ shipA: [templar()], shipB: [] });
    for (let i = 0; i < 30; i++) first.step(0.1, frame(new Vec2(0, 0), new Vec2(5000, 0)), { shipA: true, shipB: true });
    const expected = { shipA: first.states("shipA"), shipB: first.states("shipB") };
    const state = first.capture();
    for (let i = 0; i < 10; i++) first.step(0.1, frame(new Vec2(0, 0), new Vec2(5000, 0)), { shipA: true, shipB: true });
    const second = new FighterSimulatorImpl();
    second.restore(state);
    expect(second.states("shipA")).toEqual(expected.shipA);
    for (let i = 0; i < 5; i++) second.step(0.1, frame(new Vec2(0, 0), new Vec2(5000, 0)), { shipA: true, shipB: true });
    expect(second.states("shipA")[0].positions[0].dist(first.states("shipA")[0].positions[0])).toBeGreaterThan(0);
  });
});
