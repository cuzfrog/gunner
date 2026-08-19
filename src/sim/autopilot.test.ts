import { add, dist, dot, len, perpCCW, perpCW, scale, vec, type Vec2 } from "../math";
import { NaiveAutopilot } from "./autopilot";
import type { AutopilotMode, OrbitDirection, ShipState } from "./types";

const autopilot = new NaiveAutopilot();
const DT = 0.1;
const STEPS = 1000;

const command = (ship: ShipState, other: ShipState): Vec2 => autopilot.computeVelocity(ship, other, 0);

function makeShip(
  id: "attacker" | "target",
  pos: [number, number],
  mode: AutopilotMode,
  maxSpeed: number,
  desiredRange = 5000,
  mass = 1,
  inertiaModifier = 1e-6,
  orbitDirection: OrbitDirection = "cw",
): ShipState {
  return {
    id,
    position: vec(pos[0], pos[1]),
    velocity: vec(0, 0),
    maxSpeed,
    mass,
    inertiaModifier,
    mode,
    desiredRange,
    orbitDirection,
  };
}

function stepBoth(attacker: ShipState, target: ShipState, dt: number): void {
  const attackerVel = command(attacker, target);
  const targetVel = command(target, attacker);
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

describe("NaiveAutopilot", () => {
  test("orbit points tangentially around the reference", () => {
    const ship = makeShip("target", [0, 5000], "orbit", 1000, 5000);
    const other = makeShip("attacker", [0, 0], "orbit", 0, 5000);
    const vel = command(ship, other);
    expect(vel.x).toBeGreaterThan(0); // clockwise from top -> moving +x
    expect(Math.abs(vel.y)).toBeLessThan(50);
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

    test("keeper holds its setpoint against a faster closing ship", () => {
      const attacker = makeShip("attacker", [0, 0], "keepAtRange", 1500, 15000);
      const target = makeShip("target", [0, 12000], "keepAtRange", 1300, 5000);
      const finalDistance = runBoth(attacker, target, DT, STEPS);
      expect(finalDistance).toBeGreaterThan(14500);
      expect(finalDistance).toBeLessThan(15500);
    });

    test("keeper closes on an outward-flying target at the speed difference", () => {
      const attacker = makeShip("attacker", [0, 0], "keepAtRange", 1500, 15000);
      const target = makeShip("target", [0, 50000], "keepAtRange", 800, 100000);
      const finalDistance = runBoth(attacker, target, DT, STEPS);
      expect(finalDistance).toBeGreaterThan(14500);
      expect(finalDistance).toBeLessThan(15500);
    });

    test("slower keeper aims at its own range against a faster keeper", () => {
      const ship = makeShip("attacker", [0, 0], "keepAtRange", 1000, 10000);
      const fasterKeeper = makeShip("target", [0, 15000], "keepAtRange", 1200, 15000);
      const vel = command(ship, fasterKeeper);
      expect(vel.y).toBeGreaterThan(500);
      expect(vel.x).toBeCloseTo(0, 5);
    });

    test("feedforward cancels opponent radial velocity", () => {
      const ship = makeShip("attacker", [0, 0], "keepAtRange", 1500, 15000);
      const approacher = makeShip("target", [0, 15000], "keepAtRange", 1300, 5000);
      approacher.velocity = vec(0, -1300);
      expect(command(ship, approacher).y).toBeCloseTo(-1300, 5);

      const closer = makeShip("target", [0, 12000], "keepAtRange", 1300, 5000);
      closer.velocity = vec(0, -1300);
      expect(command(ship, closer).y).toBeCloseTo(-1500, 5);

      const retreater = makeShip("target", [0, 15000], "keepAtRange", 800, 5000);
      retreater.velocity = vec(0, 800);
      expect(command(ship, retreater).y).toBeCloseTo(800, 5);
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

    test("equal-speed closing keeper does not tackle orbit", () => {
      const attacker = makeShip("attacker", [0, 0], "keepAtRange", 1300, 5000);
      const target = makeShip("target", [0, 12000], "orbit", 1300, 12000);
      const finalDistance = runBoth(attacker, target, DT, STEPS);
      expect(finalDistance).toBeGreaterThan(11500);
      expect(finalDistance).toBeLessThan(12500);
    });

    test("faster orbit holds its radius against an outward-flying ship", () => {
      const attacker = makeShip("attacker", [0, 0], "orbit", 1500, 10000);
      const target = makeShip("target", [0, 10000], "keepAtRange", 800, 50000);
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
      const nearVel = command(nearShip, nearOther);
      expect(len(nearVel)).toBeCloseTo(1000, 5);

      const farShip = makeShip("attacker", [0, 0], "orbit", 1000, 10000);
      const farOther = makeShip("target", [0, 30000], "orbit", 800, 5000);
      const farVel = command(farShip, farOther);
      expect(len(farVel)).toBeCloseTo(1000, 5);
      expect(farVel.x).toBeCloseTo(0, 5);
      expect(farVel.y).toBeCloseTo(1000, 5);
    });

    test("feeds forward inward lead against dynamics lag", () => {
      const ship = makeShip("target", [14000, 0], "orbit", 1500, 14000, 10_000_000, 0.45, "cw");
      const other = makeShip("attacker", [0, 0], "orbit", 0, 5000);
      const fromCenterHat = vec(1, 0);
      const tHat = perpCW(fromCenterHat);
      ship.velocity = scale(tHat, 1400);
      const commandVec = command(ship, other);
      const expectedTangential = 1361.29;
      expect(dot(commandVec, fromCenterHat)).toBeCloseTo(-630, 1);
      expect(dot(commandVec, tHat)).toBeCloseTo(expectedTangential, 1);
      expect(len(commandVec)).toBeLessThanOrEqual(ship.maxSpeed);
    });

    test("lag compensation is inward for both orbit directions", () => {
      const ship = makeShip("target", [14000, 0], "orbit", 1500, 14000, 10_000_000, 0.45, "ccw");
      const other = makeShip("attacker", [0, 0], "orbit", 0, 5000);
      const fromCenterHat = vec(1, 0);
      const tHat = perpCCW(fromCenterHat);
      ship.velocity = scale(tHat, 1400);
      const commandVec = command(ship, other);
      expect(dot(commandVec, fromCenterHat)).toBeCloseTo(-630, 1);
      expect(len(commandVec)).toBeLessThanOrEqual(ship.maxSpeed);
    });

    test("no lead with instant dynamics", () => {
      const ship = makeShip("target", [14000, 0], "orbit", 1500, 14000);
      const other = makeShip("attacker", [0, 0], "orbit", 0, 5000);
      const fromCenterHat = vec(1, 0);
      const tHat = perpCW(fromCenterHat);
      ship.velocity = scale(tHat, 1400);
      const commandVec = command(ship, other);
      expect(commandVec.x).toBeCloseTo(0, 5);
      expect(commandVec.y).toBeCloseTo(-1500, 5);
      expect(len(commandVec)).toBeLessThanOrEqual(ship.maxSpeed);
    });

    test("lead saturates at the speed budget", () => {
      const ship = makeShip("target", [1000, 0], "orbit", 1500, 1000, 10_000_000, 0.45, "cw");
      const other = makeShip("attacker", [0, 0], "orbit", 0, 5000);
      const fromCenterHat = vec(1, 0);
      const tHat = perpCW(fromCenterHat);
      ship.velocity = scale(tHat, 1500);
      const commandVec = command(ship, other);
      expect(commandVec.x).toBeCloseTo(-1500, 5);
      expect(commandVec.y).toBeCloseTo(0, 5);
      expect(len(commandVec)).toBeLessThanOrEqual(ship.maxSpeed);
    });
  });
});
