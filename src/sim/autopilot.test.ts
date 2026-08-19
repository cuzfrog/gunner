import { add, dist, dot, len, perpCCW, perpCW, scale, sub, vec, type Vec2 } from "../math";
import { ReactiveAutopilot } from "./autopilot";
import { SimulationImpl } from "./simulation";
import type { AutopilotMode, OrbitDirection, ShipConfig, ShipState } from "./types";

const autopilot = new ReactiveAutopilot();
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
  aggressivity = 1,
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
    aggressivity,
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

describe("ReactiveAutopilot", () => {
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

    test("braking reduces the closing command for a ship with real dynamics", () => {
      const ship = makeShip("attacker", [0, 0], "keepAtRange", 1000, 1000, 2_000_000, 1, 1);
      const other = makeShip("target", [0, 1200], "keepAtRange", 0, 1000);
      ship.velocity = vec(0, 300);

      expect(command(ship, other).y).toBeCloseTo(100, 5);
      expect(command(makeShip("attacker", [0, 0], "keepAtRange", 1000, 1000, 2_000_000, 1, 100), other).y).toBeCloseTo(400, 5);
    });

    test("instant-dynamics ships are unchanged by braking", () => {
      const ship = makeShip("attacker", [0, 0], "keepAtRange", 1000, 1000, 1, 1e-6, 0.01);
      const other = makeShip("target", [0, 1200], "keepAtRange", 0, 1000);
      ship.velocity = vec(0, 300);

      expect(command(ship, other).y).toBeCloseTo(400, 5);
      expect(command(makeShip("attacker", [0, 0], "keepAtRange", 1000, 1000, 1, 1e-6, 100), other).y).toBeCloseTo(400, 5);
    });

    test("keep-at-range damping is monotonic across the aggressivity bar", () => {
      const other = makeShip("target", [0, 1200], "keepAtRange", 0, 1000);
      const make = (aggressivity: number) =>
        makeShip("attacker", [0, 0], "keepAtRange", 1000, 1000, 2_000_000, 1, aggressivity);

      const low = command(make(0.01), other).y;
      const mid = command(make(1), other).y;
      const high = command(make(100), other).y;
      expect(low).toBeLessThanOrEqual(mid);
      expect(mid).toBeLessThanOrEqual(high);
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
      const ship = makeShip("target", [14000, 0], "orbit", 1500, 14000, 10_000_000, 0.45, 1, "cw");
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
      const ship = makeShip("target", [14000, 0], "orbit", 1500, 14000, 10_000_000, 0.45, 1, "ccw");
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
      const ship = makeShip("target", [1000, 0], "orbit", 1500, 1000, 10_000_000, 0.45, 1, "cw");
      const other = makeShip("attacker", [0, 0], "orbit", 0, 5000);
      const fromCenterHat = vec(1, 0);
      const tHat = perpCW(fromCenterHat);
      ship.velocity = scale(tHat, 1500);
      const commandVec = command(ship, other);
      expect(commandVec.x).toBeCloseTo(-1500, 5);
      expect(commandVec.y).toBeCloseTo(0, 5);
      expect(len(commandVec)).toBeLessThanOrEqual(ship.maxSpeed);
    });

    test("commands full speed for a clean orbit", () => {
      const ship = makeShip("target", [0, 5000], "orbit", 1000, 5000);
      const other = makeShip("attacker", [0, 0], "orbit", 0, 5000);
      const cmd = command(ship, other);
      expect(len(cmd)).toBeCloseTo(ship.maxSpeed, 5);
    });

    test("co-moving tangential pair produces no inward radial command", () => {
      const ship = makeShip("target", [0, 5000], "orbit", 1000, 5000);
      const other = makeShip("attacker", [0, 0], "orbit", 0, 5000);
      const fromCenterHat = scale(sub(ship.position, other.position), 1 / dist(ship.position, other.position));
      const tHat = perpCW(fromCenterHat);
      ship.velocity = scale(tHat, 1000);
      other.velocity = scale(tHat, 1000);
      const cmd = command(ship, other);
      expect(dot(cmd, fromCenterHat)).toBeCloseTo(0, 5);
      expect(len(cmd)).toBeCloseTo(ship.maxSpeed, 5);
    });

    test("catches up to a center moving radially away", () => {
      const ship = makeShip("target", [0, 5000], "orbit", 1000, 5000);
      const other = makeShip("attacker", [0, 0], "orbit", 0, 5000);
      const fromCenterHat = scale(sub(ship.position, other.position), 1 / dist(ship.position, other.position));
      other.velocity = scale(fromCenterHat, 800);
      const cmd = command(ship, other);
      const outward = dot(cmd, fromCenterHat);
      expect(outward).toBeGreaterThanOrEqual(800);
      expect(outward).toBeLessThanOrEqual(ship.maxSpeed);
    });

    test("holds its range around a tangentially fleeing center", () => {
      const attacker = makeShip("attacker", [0, 0], "orbit", 1000, 5000, 1, 1e-6, 1, "cw");
      const target = makeShip("target", [0, 5000], "orbit", 1000, 5000, 1, 1e-6, 1, "ccw");
      const finalDistance = runBoth(attacker, target, DT, STEPS);
      expect(finalDistance).toBeGreaterThan(4900);
      expect(finalDistance).toBeLessThan(5100);
    });

    test("braking reduces the inward radial command when closing on the orbit radius", () => {
      const ship = makeShip("target", [0, 12000], "orbit", 1000, 10000, 2_000_000, 1, 1);
      const other = makeShip("attacker", [0, 0], "orbit", 0, 5000);
      const fromCenterHat = scale(sub(ship.position, other.position), 1 / dist(ship.position, other.position));
      ship.velocity = scale(fromCenterHat, -300);

      const damped = command(ship, other);
      expect(dot(damped, fromCenterHat)).toBeCloseTo(-700, 1);

      const undamped = makeShip("target", [0, 12000], "orbit", 1000, 10000, 2_000_000, 1, 100);
      undamped.velocity = ship.velocity;
      expect(dot(command(undamped, other), fromCenterHat)).toBeCloseTo(-1000, 1);
    });

    test("braking vanishes for purely tangential and stationary states", () => {
      const ship = makeShip("target", [0, 12000], "orbit", 1000, 10000, 2_000_000, 1, 1);
      const other = makeShip("attacker", [0, 0], "orbit", 0, 5000);
      const fromCenterHat = scale(sub(ship.position, other.position), 1 / dist(ship.position, other.position));
      const tHat = perpCW(fromCenterHat);

      ship.velocity = scale(tHat, 1000);
      const tangentialCmd = command(ship, other);
      const aggressiveTangential = makeShip("target", [0, 12000], "orbit", 1000, 10000, 2_000_000, 1, 100);
      aggressiveTangential.velocity = ship.velocity;
      expect(command(aggressiveTangential, other)).toEqual(tangentialCmd);

      ship.velocity = vec(0, 0);
      const stationaryCmd = command(ship, other);
      const strictStationary = makeShip("target", [0, 12000], "orbit", 1000, 10000, 2_000_000, 1, 0.01);
      strictStationary.velocity = ship.velocity;
      expect(command(strictStationary, other)).toEqual(stationaryCmd);
    });

    test("aggressivity below the minimum clamps to critical damping", () => {
      const fromCenterHat = vec(0, 1);
      const shipLow = makeShip("target", [0, 12000], "orbit", 1000, 10000, 2_000_000, 1, 0.001);
      const shipMin = makeShip("target", [0, 12000], "orbit", 1000, 10000, 2_000_000, 1, 0.01);
      const shipHigh = makeShip("target", [0, 12000], "orbit", 1000, 10000, 2_000_000, 1, 100);
      const other = makeShip("attacker", [0, 0], "orbit", 0, 5000);
      const v = scale(fromCenterHat, -300);
      shipLow.velocity = v;
      shipMin.velocity = v;
      shipHigh.velocity = v;

      expect(command(shipLow, other)).toEqual(command(shipMin, other));
      expect(dot(command(shipHigh, other), fromCenterHat)).toBeCloseTo(-1000, 1);
    });

    test("whole-bar keep-at-range monotonicity", () => {
      const result = (aggressivity: number) => {
        const steering = new ReactiveAutopilot();
        const target: ShipConfig = { id: "target", maxSpeed: 0, mass: 1, inertiaModifier: 1e-6, mode: "keepAtRange", desiredRange: 5000, aggressivity: 1 };
        const keeper: ShipConfig = { id: "attacker", maxSpeed: 1000, mass: 2_000_000, inertiaModifier: 1, mode: "keepAtRange", desiredRange: 5000, aggressivity };
        const sim = new SimulationImpl({ attackerSteering: steering, targetSteering: steering, simConfig: { attacker: keeper, target, initialDistance: 20000 } });
        const dt = 1 / 60;
        const steps = 60 * 60;
        let min = Number.POSITIVE_INFINITY;
        for (let i = 0; i < steps; i++) {
          sim.step(dt);
          const snapshot = sim.snapshot();
          const d = dist(snapshot.attacker.position, snapshot.target.position);
          if (d < min) min = d;
        }
        return { min, final: dist(sim.snapshot().attacker.position, sim.snapshot().target.position) };
      };

      const low = result(0.01);
      const mid = result(1);
      const high = result(100);

      expect(low.min).toBeGreaterThanOrEqual(mid.min);
      expect(mid.min).toBeGreaterThanOrEqual(high.min);
      expect(low.min).toBeGreaterThanOrEqual(4900);
      expect(low.final).toBeGreaterThan(4500);
      expect(low.final).toBeLessThan(5500);
      expect(high.final).toBeGreaterThan(4500);
      expect(high.final).toBeLessThan(5500);
    });
  });
});
