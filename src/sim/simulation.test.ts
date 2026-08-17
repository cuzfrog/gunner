import { describe, expect, it } from "bun:test";
import * as v from "../math/vec2.js";
import { Simulation } from "./simulation.js";
import type { ShipConfig } from "./types.js";

const attacker: ShipConfig = {
  id: "attacker",
  position: v.vec(0, 0),
  maxSpeed: 0,
  mode: "keepAtRange",
  desiredRange: 0,
};

const target: ShipConfig = {
  id: "target",
  position: v.vec(0, 5000),
  maxSpeed: 1000,
  mode: "orbit",
  desiredRange: 5000,
  orbitDirection: "cw",
};

describe("Simulation", () => {
  it("advances positions by velocity * dt", () => {
    const sim = new Simulation({ attacker, target });
    sim.step(1);
    const snap = sim.snapshot();
    expect(snap.time).toBe(1);
    expect(snap.target.position.x).toBeGreaterThan(100);
    expect(snap.attacker.position.x).toBe(0);
  });

  it("is deterministic after reset", () => {
    const sim = new Simulation({ attacker, target });
    sim.step(1);
    const p = sim.snapshot().target.position;
    sim.reset({ attacker, target });
    sim.step(1);
    expect(sim.snapshot().target.position).toEqual(p);
  });
});
