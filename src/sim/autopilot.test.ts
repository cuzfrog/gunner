import { add, dist, dot, len, scale, vec } from "../math";
import { AutopilotImpl } from "./autopilot";
import type { AutopilotMode, ShipState } from "./types";

const autopilot = new AutopilotImpl();
const DT = 0.1;
const STEPS = 1000;

function makeShip(
  id: "attacker" | "target",
  pos: [number, number],
  mode: AutopilotMode,
  maxSpeed: number,
  desiredRange = 5000,
): ShipState {
  const mass = id === "attacker" ? 1_200_000 : 10_000_000;
  const inertiaModifier = id === "attacker" ? 3 : 0.45;
  return {
    id,
    position: vec(pos[0], pos[1]),
    velocity: vec(0, 0),
    maxSpeed,
    mass,
    inertiaModifier,
    mode,
    desiredRange,
    orbitDirection: "cw",
  };
}

function stepBoth(attacker: ShipState, target: ShipState, dt: number): void {
  const attackerVel = autopilot.computeVelocity(attacker, target);
  const targetVel = autopilot.computeVelocity(target, attacker);
  attacker.velocity = attackerVel;
  target.velocity = targetVel;
  attacker.position = add(attacker.position, scale(attackerVel, dt));
  target.position = add(target.position, scale(targetVel, dt));
}

function runBoth(attacker: ShipState, target: ShipState, dt: number, steps: number): number {
  for (let i = 0; i < steps; i++) {
    stepBoth(attacker, target, dt);
  }
  return dist(attacker.position, target.position);
}

describe("AutopilotImpl", () => {
  test("orbit points tangentially around the reference", () => {
    const ship = makeShip("target", [0, 5000], "orbit", 1000, 5000);
    const other = makeShip("attacker", [0, 0], "orbit", 0, 5000);
    const vel = autopilot.computeVelocity(ship, other);
    expect(vel.x).toBeGreaterThan(0); // clockwise from top -> moving +x
    expect(Math.abs(vel.y)).toBeLessThan(50);
  });

  test("approach points directly at the reference", () => {
    const ship = makeShip("attacker", [0, 0], "approach", 1000, 0);
    const other = makeShip("target", [5000, 0], "orbit", 0, 5000);
    const vel = autopilot.computeVelocity(ship, other);
    expect(vel.x).toBeCloseTo(1000, 5);
    expect(vel.y).toBeCloseTo(0, 5);
  });

  test("retreat points directly away from the reference", () => {
    const ship = makeShip("attacker", [0, 0], "retreat", 1000, 0);
    const other = makeShip("target", [5000, 0], "orbit", 0, 5000);
    const vel = autopilot.computeVelocity(ship, other);
    expect(vel.x).toBeCloseTo(-1000, 5);
    expect(vel.y).toBeCloseTo(0, 5);
  });

  test("match copies the other ship's velocity", () => {
    const ship = makeShip("attacker", [0, 0], "match", 1000, 0);
    const other = makeShip("target", [5000, 0], "orbit", 0, 5000);
    other.velocity = vec(600, 800);
    const vel = autopilot.computeVelocity(ship, other);
    expect(vel.x).toBeCloseTo(600, 5);
    expect(vel.y).toBeCloseTo(800, 5);
  });

  test("match caps at max speed", () => {
    const ship = makeShip("attacker", [0, 0], "match", 500, 0);
    const other = makeShip("target", [5000, 0], "orbit", 0, 5000);
    other.velocity = vec(1000, 0);
    const vel = autopilot.computeVelocity(ship, other);
    expect(len(vel)).toBe(500);
  });

  describe("keepAtRange", () => {
    test("slower keeper yields to a faster target's desired range", () => {
      const attacker = makeShip("attacker", [0, 0], "keepAtRange", 1300, 10000);
      const target = makeShip("target", [0, 12000], "keepAtRange", 1500, 15000);
      const finalDistance = runBoth(attacker, target, DT, STEPS);
      expect(finalDistance).toBeGreaterThan(14500);
      expect(finalDistance).toBeLessThan(15500);
    });

    test("faster attacker holds its own desired range", () => {
      const attacker = makeShip("attacker", [0, 0], "keepAtRange", 1500, 10000);
      const target = makeShip("target", [0, 12000], "keepAtRange", 1300, 15000);
      const finalDistance = runBoth(attacker, target, DT, STEPS);
      expect(finalDistance).toBeGreaterThan(9500);
      expect(finalDistance).toBeLessThan(10500);
    });

    test("equal speed keepers stalemate between desired ranges", () => {
      const attacker = makeShip("attacker", [0, 0], "keepAtRange", 1300, 10000);
      const target = makeShip("target", [0, 12000], "keepAtRange", 1300, 15000);
      const finalDistance = runBoth(attacker, target, DT, STEPS);
      expect(finalDistance).toBeGreaterThan(11500);
      expect(finalDistance).toBeLessThan(12500);
    });

    test("keeper holds its setpoint against a faster approacher", () => {
      const attacker = makeShip("attacker", [0, 0], "keepAtRange", 1500, 15000);
      const target = makeShip("target", [0, 12000], "approach", 1300, 5000);
      const finalDistance = runBoth(attacker, target, DT, STEPS);
      expect(finalDistance).toBeGreaterThan(14500);
      expect(finalDistance).toBeLessThan(15500);
    });

    test("keeper closes on a retreating target at the speed difference", () => {
      const attacker = makeShip("attacker", [0, 0], "keepAtRange", 1500, 15000);
      const target = makeShip("target", [0, 50000], "retreat", 800, 5000);
      const finalDistance = runBoth(attacker, target, DT, STEPS);
      expect(finalDistance).toBeGreaterThan(14500);
      expect(finalDistance).toBeLessThan(15500);
    });

    test("slower keeper aims at its own range against a faster keeper", () => {
      const ship = makeShip("attacker", [0, 0], "keepAtRange", 1000, 10000);
      const fasterKeeper = makeShip("target", [0, 15000], "keepAtRange", 1200, 15000);
      const vel = autopilot.computeVelocity(ship, fasterKeeper);
      expect(vel.y).toBeGreaterThan(500);
      expect(vel.x).toBeCloseTo(0, 5);
    });

    test("feedforward cancels opponent radial velocity", () => {
      const ship = makeShip("attacker", [0, 0], "keepAtRange", 1500, 15000);
      const approacher = makeShip("target", [0, 15000], "approach", 1300, 5000);
      approacher.velocity = vec(0, -1300);
      expect(autopilot.computeVelocity(ship, approacher).y).toBeCloseTo(-1300, 5);

      const closer = makeShip("target", [0, 12000], "approach", 1300, 5000);
      closer.velocity = vec(0, -1300);
      expect(autopilot.computeVelocity(ship, closer).y).toBeCloseTo(-1500, 5);

      const retreater = makeShip("target", [0, 15000], "retreat", 800, 5000);
      retreater.velocity = vec(0, 800);
      expect(autopilot.computeVelocity(ship, retreater).y).toBeCloseTo(800, 5);
    });
  });

  describe("orbit", () => {
    test("slower keeper yields to a faster orbit's desired range", () => {
      const attacker = makeShip("attacker", [0, 0], "keepAtRange", 1300, 10000);
      const target = makeShip("target", [0, 12000], "orbit", 1500, 15000);
      const finalDistance = runBoth(attacker, target, DT, STEPS);
      expect(finalDistance).toBeGreaterThan(14500);
      expect(finalDistance).toBeLessThan(15500);
    });

    test("faster orbit holds its own desired range against a slower keeper", () => {
      const attacker = makeShip("attacker", [0, 0], "orbit", 1500, 10000);
      const target = makeShip("target", [0, 12000], "keepAtRange", 1300, 15000);
      const finalDistance = runBoth(attacker, target, DT, STEPS);
      expect(finalDistance).toBeGreaterThan(9500);
      expect(finalDistance).toBeLessThan(10500);
    });

    test("equal-speed approacher does not tackle orbit", () => {
      const attacker = makeShip("attacker", [0, 0], "approach", 1300, 5000);
      const target = makeShip("target", [0, 12000], "orbit", 1300, 12000);
      const finalDistance = runBoth(attacker, target, DT, STEPS);
      expect(finalDistance).toBeGreaterThan(11500);
      expect(finalDistance).toBeLessThan(12500);
    });

    test("faster orbit holds its radius against retreater", () => {
      const attacker = makeShip("attacker", [0, 0], "orbit", 1500, 10000);
      const target = makeShip("target", [0, 10000], "retreat", 800, 10000);
      const finalDistance = runBoth(attacker, target, DT, STEPS);
      expect(finalDistance).toBeGreaterThan(9500);
      expect(finalDistance).toBeLessThan(10500);
    });

    test("faster orbit wins range contest against slower orbit", () => {
      const attacker = makeShip("attacker", [0, 0], "orbit", 1500, 10000);
      const target = makeShip("target", [0, 12000], "orbit", 1300, 15000);
      const finalDistance = runBoth(attacker, target, DT, STEPS);
      expect(finalDistance).toBeGreaterThan(9500);
      expect(finalDistance).toBeLessThan(10500);
    });

    test("orbit tangential budget shrinks as radial demand grows", () => {
      const nearShip = makeShip("attacker", [0, 0], "orbit", 1000, 10000);
      const nearOther = makeShip("target", [0, 12000], "orbit", 1200, 15000);
      const nearVel = autopilot.computeVelocity(nearShip, nearOther);
      expect(len(nearVel)).toBeCloseTo(1000, 5);

      const farShip = makeShip("attacker", [0, 0], "orbit", 1000, 10000);
      const farOther = makeShip("target", [0, 30000], "orbit", 800, 5000);
      const farVel = autopilot.computeVelocity(farShip, farOther);
      expect(len(farVel)).toBeCloseTo(1000, 5);
      expect(farVel.x).toBeCloseTo(0, 5);
      expect(farVel.y).toBeCloseTo(1000, 5);
    });
  });
});
