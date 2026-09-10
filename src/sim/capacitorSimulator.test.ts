import { CapacitorSimulatorImpl, type CapacitorSimConfig, type CapacitorSimulatorState } from "./capacitorSimulator";
import { toTypeId } from "../gamedata/ids";
import type { CapacitorSideConfig, CapacitorSpec, CombatantConfig, ScheduledDrain } from "./types";

const SPEC: CapacitorSpec = { capacity: 6375, rechargeTime: 1250 };
const SMALL_SPEC: CapacitorSpec = { capacity: 1000, rechargeTime: 1250 };

function regenClosedForm(cap: number, dt: number, spec: CapacitorSpec = SPEC): number {
  const tau = spec.rechargeTime / 5;
  return spec.capacity * Math.pow(1 + (Math.sqrt(cap / spec.capacity) - 1) * Math.exp(-dt / tau), 2);
}

function drain(moduleId: string, amount: number, interval: number, active = true): ScheduledDrain {
  return { moduleId: toTypeId(moduleId), amount, interval, active };
}

function sideConfig(overrides: Partial<CapacitorSideConfig> = {}): CapacitorSideConfig {
  return { infinite: false, drains: [], boosters: [], ...overrides };
}

function combatant(id: "shipA" | "shipB", spec: CapacitorSpec | undefined, propulsionCapNeed?: number, capacityMultiplier?: number): CombatantConfig {
  return { id, maxSpeed: 100, mass: 1, inertiaModifier: 1, mode: "orbit", desiredRange: 1000, aggressivity: 1, capacitor: spec, propulsionCapNeed, propulsionCapacityMultiplier: capacityMultiplier };
}

function makeConfig(shipA: Partial<CapacitorSideConfig> = {}, shipB: Partial<CapacitorSideConfig> = {}, specA: CapacitorSpec | undefined = SPEC, specB: CapacitorSpec | undefined = SPEC, propulsionA?: number, capacityMultiplierA?: number): CapacitorSimConfig {
  return {
    sim: { shipA: combatant("shipA", specA, propulsionA, capacityMultiplierA), shipB: combatant("shipB", specB), initialDistance: 1000 },
    sides: { shipA: sideConfig(shipA), shipB: sideConfig(shipB) },
  };
}

describe("CapacitorSimulatorImpl", () => {
  test("starts at full capacitor and stays full without drains", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig());
    sim.step(10, { shipA: false, shipB: false });
    const view = sim.view().shipA;
    expect(view.cap).toBeCloseTo(SPEC.capacity, 6);
    expect(view.percentage).toBeCloseTo(100, 6);
    expect(view.starved).toBe(false);
  });

  test("propulsion capacity multiplier composes the effective pool", () => {
    const sim = new CapacitorSimulatorImpl();
    const effective = SPEC.capacity * 0.75;
    sim.reset(makeConfig({}, {}, SPEC, SPEC, undefined, 0.75));
    const view = sim.view().shipA;
    expect(view.capacity).toBeCloseTo(effective, 6);
    expect(view.cap).toBeCloseTo(effective, 6);
    expect(view.percentage).toBeCloseTo(100, 6);
    sim.update(makeConfig({}, {}, SPEC, SPEC, undefined, 1));
    expect(sim.view().shipA.capacity).toBeCloseTo(SPEC.capacity, 6);
  });

  test("scheduled drain debits at cycle start and regen follows the closed form", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 100, 10)] }));
    sim.step(10, { shipA: false, shipB: false });
    const view = sim.view().shipA;
    const afterDebit = regenClosedForm(SPEC.capacity - 100, 10);
    expect(view.cap).toBeCloseTo(afterDebit, 6);
    expect(view.drains[0].running).toBe(true);
    expect(view.drains[0].starved).toBe(false);
  });

  test("drain debits repeat at each interval", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 100, 10)] }));
    sim.step(20, { shipA: false, shipB: false });
    const expected = regenClosedForm(regenClosedForm(SPEC.capacity - 100, 10) - 100, 10);
    expect(sim.view().shipA.cap).toBeCloseTo(expected, 6);
  });

  test("inactive drains do not debit", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 100, 10, false)] }));
    sim.step(30, { shipA: false, shipB: false });
    const view = sim.view().shipA;
    expect(view.cap).toBeCloseTo(SPEC.capacity, 6);
    expect(view.drains[0].running).toBe(false);
  });

  test("drain above peak regen starves and retries until cap recovers", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 400, 10)] })); // 40 GJ/s vs 12.75 peak
    sim.step(400, { shipA: false, shipB: false });
    const view = sim.view().shipA;
    expect(view.starved).toBe(true);
    expect(view.drains[0].starved).toBe(true);
    expect(view.cap).toBeLessThan(SPEC.capacity * 0.2);
    // Recovery: once regen accumulates the debit succeeds again.
    sim.step(120, { shipA: false, shipB: false });
    expect(sim.view().shipA.drains[0].running).toBe(true);
  });

  test("infinite mode pins the capacitor at full and never starves", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ infinite: true, drains: [drain("1", 600, 5)] }));
    sim.step(30, { shipA: false, shipB: false });
    const view = sim.view().shipA;
    expect(view.cap).toBeCloseTo(SPEC.capacity, 6);
    expect(view.percentage).toBeCloseTo(100, 6);
    expect(view.starved).toBe(false);
    expect(view.drains[0].running).toBe(true);
    expect(sim.attemptDebit("shipA", 99999)).toBe(true);
  });

  test("missing spec never starves and debits are free", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 100, 10)] }, {}, undefined, undefined));
    sim.step(20, { shipA: false, shipB: false });
    const view = sim.view().shipA;
    expect(view.starved).toBe(false);
    expect(view.drains[0].running).toBe(true);
    expect(sim.attemptDebit("shipA", 5000)).toBe(true);
  });

  test("attemptDebit succeeds while cap covers the amount and fails otherwise", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig());
    expect(sim.attemptDebit("shipA", 1000)).toBe(true);
    expect(sim.view().shipA.cap).toBeCloseTo(SPEC.capacity - 1000, 6);
    expect(sim.attemptDebit("shipA", SPEC.capacity)).toBe(false);
    expect(sim.view().shipA.starved).toBe(true);
    // Failed attempt leaves the pool untouched.
    expect(sim.view().shipA.cap).toBeCloseTo(SPEC.capacity - 1000, 6);
  });

  test("propulsion debit starvation is reported and recovers", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({}, {}, { capacity: 1000, rechargeTime: 100 }, SPEC, 150));
    sim.attemptDebit("shipA", 900); // leave only 100 GJ in the pool
    sim.step(2, { shipA: false, shipB: false });
    expect(sim.propulsionStarved("shipA")).toBe(true);
    // The retry fires as soon as regen affords the debit.
    sim.step(10, { shipA: false, shipB: false });
    expect(sim.propulsionStarved("shipA")).toBe(false);
  });

  test("propulsion suppression pauses the drain and reactivation debits immediately", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({}, {}, SPEC, SPEC, 100));
    sim.step(10, { shipA: true, shipB: false });
    expect(sim.view().shipA.cap).toBeCloseTo(SPEC.capacity, 6);
    sim.step(10, { shipA: false, shipB: false });
    expect(sim.view().shipA.cap).toBeCloseTo(regenClosedForm(SPEC.capacity - 100, 10), 6);
  });

  test("auto booster injects on cycle, respects clip and reloads", () => {
    const sim = new CapacitorSimulatorImpl();
    const booster = { moduleId: toTypeId("9"), amount: 200, cycleTime: 5, clipSize: 2, reloadTime: 10, mode: "auto" as const };
    // The drain keeps the pool below capacity so injections are not postponed.
    sim.reset(makeConfig({ drains: [drain("1", 400, 10)], boosters: [booster] }, {}, SMALL_SPEC));
    // t=0: drain + inject (charges 1), t=5: inject (charges 0, reload until t=15), t=10: drain only.
    sim.step(10, { shipA: false, shipB: false });
    expect(sim.view().shipA.boosters[0].reloading).toBe(true);
    expect(sim.view().shipA.boosters[0].charges).toBe(0);
    // t=15.5: reload done at t=15, clip refilled.
    sim.step(5.5, { shipA: false, shipB: false });
    expect(sim.view().shipA.boosters[0].reloading).toBe(false);
    expect(sim.view().shipA.boosters[0].charges).toBe(2);
    // t=20.5: next cycle injects one charge.
    sim.step(5, { shipA: false, shipB: false });
    expect(sim.view().shipA.boosters[0].charges).toBe(1);
  });

  test("auto booster postpones injection into a full pool", () => {
    const sim = new CapacitorSimulatorImpl();
    const booster = { moduleId: toTypeId("9"), amount: 500, cycleTime: 12, clipSize: 5, reloadTime: 10, mode: "auto" as const };
    sim.reset(makeConfig({ boosters: [booster] }, {}, SMALL_SPEC));
    sim.step(13, { shipA: false, shipB: false });
    expect(sim.view().shipA.cap).toBeCloseTo(1000, 6);
    expect(sim.view().shipA.boosters[0].charges).toBe(5);
  });

  test("manual booster only injects on demand", () => {
    const sim = new CapacitorSimulatorImpl();
    const booster = { moduleId: toTypeId("9"), amount: 300, cycleTime: 12, clipSize: 3, reloadTime: 10, mode: "manual" as const };
    sim.reset(makeConfig({ boosters: [booster] }, {}, SMALL_SPEC));
    sim.step(30, { shipA: false, shipB: false });
    expect(sim.view().shipA.boosters[0].charges).toBe(3);
    sim.injectBooster("shipA", 0);
    expect(sim.view().shipA.boosters[0].charges).toBe(2);
    expect(sim.view().shipA.cap).toBeCloseTo(1000, 6);
    sim.injectBooster("shipA", 0);
    expect(sim.view().shipA.boosters[0].charges).toBe(2); // blocked: cycle timer running
    sim.step(13, { shipA: false, shipB: false });
    sim.injectBooster("shipA", 0);
    expect(sim.view().shipA.boosters[0].charges).toBe(1);
    sim.step(13, { shipA: false, shipB: false });
    sim.injectBooster("shipA", 0);
    expect(sim.view().shipA.boosters[0].charges).toBe(0);
    expect(sim.view().shipA.boosters[0].reloading).toBe(true);
    sim.injectBooster("shipA", 0);
    expect(sim.view().shipA.boosters[0].charges).toBe(0); // blocked: reloading
  });

  test("view reports regen per second and drain rates", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 100, 10)] }));
    sim.step(0.001, { shipA: false, shipB: false }); // debit at t=0, cap near full
    const view = sim.view().shipA;
    expect(view.incomingDrainPerSecond).toBeCloseTo(100 / 0.001, 3);
    expect(view.netPerSecond).toBeLessThan(0);
  });

  test("restored state reports percentage and peak regen at 25 percent", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig());
    const state: CapacitorSimulatorState = {
      time: 0,
      sides: {
        shipA: { spec: SPEC, infinite: false, cap: SPEC.capacity * 0.25, drains: [], boosters: [], propulsion: undefined },
        shipB: { spec: SPEC, infinite: false, cap: SPEC.capacity, drains: [], boosters: [], propulsion: undefined },
      },
    };
    sim.restore(state);
    const restored = sim.view().shipA;
    expect(restored.cap).toBeCloseTo(SPEC.capacity * 0.25, 6);
    expect(restored.percentage).toBeCloseTo(25, 6);
    expect(restored.regenPerSecond).toBeCloseTo((2.5 * SPEC.capacity) / SPEC.rechargeTime, 6);
  });

  test("update merges drains by module id and preserves capacitor state", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 100, 10)] }));
    sim.step(5, { shipA: false, shipB: false });
    const capBefore = sim.view().shipA.cap;
    sim.update(makeConfig({ drains: [drain("2", 50, 8)] }));
    const view = sim.view().shipA;
    expect(view.cap).toBeCloseTo(capBefore, 6);
    expect(view.drains).toHaveLength(1);
    expect(view.drains[0].moduleId).toBe(toTypeId("2"));
  });

  test("update with changed spec resets the pool to the new capacity", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig());
    sim.attemptDebit("shipA", 1000);
    const config = makeConfig({}, {}, { capacity: 3000, rechargeTime: 1000 });
    sim.update(config);
    expect(sim.view().shipA.cap).toBeCloseTo(3000, 6);
    expect(sim.view().shipA.capacity).toBeCloseTo(3000, 6);
  });

  test("capture and restore round-trip the runtime", () => {
    const booster = { moduleId: toTypeId("9"), amount: 200, cycleTime: 12, clipSize: 5, reloadTime: 10, mode: "auto" as const };
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 100, 10)], boosters: [booster] }));
    sim.step(7, { shipA: false, shipB: false });
    const state = sim.capture();
    const restored = new CapacitorSimulatorImpl();
    restored.reset(makeConfig({ drains: [drain("1", 100, 10)], boosters: [booster] }));
    restored.step(3, { shipA: false, shipB: false });
    restored.restore(state);
    sim.step(4, { shipA: false, shipB: false });
    restored.step(4, { shipA: false, shipB: false });
    expect(restored.view().shipA.cap).toBeCloseTo(sim.view().shipA.cap, 9);
    expect(restored.view().shipA.boosters[0].charges).toBe(sim.view().shipA.boosters[0].charges);
    expect(restored.view().shipA.drains[0].timer).toBeCloseTo(sim.view().shipA.drains[0].timer, 9);
  });
});
