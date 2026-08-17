import { vec } from "../math";
import type { Autopilot } from "./autopilot";
import { SimulationImpl } from "./simulation";
import type { ShipConfig, SimConfig } from "./types";

const autopilot = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });

function shipConfig(id: ShipConfig["id"], mode: ShipConfig["mode"], x = 0, y = 0): ShipConfig {
  return { id, position: vec(x, y), maxSpeed: 100, mode, desiredRange: 5000 };
}

function simConfig(attackerMode: ShipConfig["mode"]): SimConfig {
  return {
    attacker: shipConfig("attacker", attackerMode),
    target: shipConfig("target", "orbit", 0, 5000),
  };
}

describe("SimulationImpl", () => {
  beforeEach(() => {
    autopilot.computeVelocity.mockImplementation((ship) => (ship.id === "target" ? vec(100, 50) : vec(0, 0)));
  });

  test("step integrates positions by velocity * dt and advances time", () => {
    const sim = new SimulationImpl({ autopilot, simConfig: simConfig("keepAtRange") });
    sim.step(2);
    const snapshot = sim.snapshot();
    expect(snapshot.time).toBe(2);
    expect(snapshot.target.position).toEqual(vec(200, 5100));
    expect(snapshot.attacker.position).toEqual(vec(0, 0));
  });

  test("reset restores time and initial positions", () => {
    const sim = new SimulationImpl({ autopilot, simConfig: simConfig("keepAtRange") });
    sim.step(1);
    sim.reset(simConfig("keepAtRange"));
    const snapshot = sim.snapshot();
    expect(snapshot.time).toBe(0);
    expect(snapshot.target.position).toEqual(vec(0, 5000));
    expect(snapshot.attacker.position).toEqual(vec(0, 0));
  });

  test("computes attacker velocity before target velocity by default", () => {
    new SimulationImpl({ autopilot, simConfig: simConfig("orbit") });
    expect(autopilot.computeVelocity.mock.calls.map(([ship]) => ship.id)).toEqual(["attacker", "target"]);
  });

  test("computes target velocity first when attacker is matching", () => {
    new SimulationImpl({ autopilot, simConfig: simConfig("match") });
    expect(autopilot.computeVelocity.mock.calls.map(([ship]) => ship.id)).toEqual(["target", "attacker"]);
  });
});
