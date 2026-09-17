import { CapacitorSimulatorImpl, type CapacitorSimConfig, type CapacitorSimulatorState } from "./capacitorSimulator";
import { toTypeId } from "../gamedata/ids";
import type { CapacitorEngagement, CapacitorPropulsionDrain, CapacitorSideConfig, CapacitorSpec, CombatantConfig, IncomingDrain, ScheduledDrain, Side } from "./types";

const SPEC: CapacitorSpec = { capacity: 6375, rechargeTime: 1250 };
const SMALL_SPEC: CapacitorSpec = { capacity: 1000, rechargeTime: 1250 };
const PROPULSION_MODULE = toTypeId("20850");

function regenClosedForm(cap: number, dt: number, spec: CapacitorSpec = SPEC): number {
  const tau = spec.rechargeTime / 5;
  return spec.capacity * Math.pow(1 + (Math.sqrt(cap / spec.capacity) - 1) * Math.exp(-dt / tau), 2);
}

function drain(moduleId: string, amount: number, interval: number, active = true): ScheduledDrain {
  return { moduleId: toTypeId(moduleId), amount, interval, active };
}

function incoming(moduleId: string, amount: number, interval: number, transfer = false, count = 1): IncomingDrain {
  return { moduleId: toTypeId(moduleId), amount, interval, transfer, count };
}

function sideConfig(overrides: Partial<CapacitorSideConfig> = {}): CapacitorSideConfig {
  return { infinite: false, drains: [], boosters: [], fittedDrainPerSecond: 0, weaponsDrainPerSecond: 0, ...overrides };
}

const ENGAGED: Record<Side, CapacitorEngagement> = {
  shipA: { propulsionSuppressed: false, weaponsEngaged: true, disengagedModuleIds: [] },
  shipB: { propulsionSuppressed: false, weaponsEngaged: true, disengagedModuleIds: [] },
};

function engagement(overrides: Partial<CapacitorEngagement>): Record<Side, CapacitorEngagement> {
  return { shipA: { ...ENGAGED.shipA, ...overrides }, shipB: ENGAGED.shipB };
}

function combatant(id: "shipA" | "shipB", spec: CapacitorSpec | undefined, capacityMultiplier?: number): CombatantConfig {
  return { id, maxSpeed: 100, mass: 1, inertiaModifier: 1, mode: "orbit", desiredRange: 1000, aggressivity: 1, capacitor: spec, propulsionCapacityMultiplier: capacityMultiplier };
}

function makeConfig(shipA: Partial<CapacitorSideConfig> = {}, shipB: Partial<CapacitorSideConfig> = {}, specA: CapacitorSpec | undefined = SPEC, specB: CapacitorSpec | undefined = SPEC, propulsionA?: CapacitorPropulsionDrain, capacityMultiplierA?: number): CapacitorSimConfig {
  return {
    sim: { shipA: combatant("shipA", specA, capacityMultiplierA), shipB: combatant("shipB", specB), initialDistance: 1000 },
    sides: { shipA: sideConfig({ ...shipA, ...(propulsionA ? { propulsion: propulsionA } : {}) }), shipB: sideConfig(shipB) },
  };
}

function propulsionDrain(amount: number, interval = 10): CapacitorPropulsionDrain {
  return { moduleId: PROPULSION_MODULE, amount, interval };
}

describe("CapacitorSimulatorImpl", () => {
  test("starts at full capacitor and stays full without drains", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig());
    sim.step(10, ENGAGED);
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
    sim.step(10, ENGAGED);
    const view = sim.view().shipA;
    const afterDebit = regenClosedForm(SPEC.capacity - 100, 10);
    expect(view.cap).toBeCloseTo(afterDebit, 6);
    expect(view.drains[0].running).toBe(true);
    expect(view.drains[0].starved).toBe(false);
  });

  test("drain debits repeat at each interval", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 100, 10)] }));
    sim.step(20, ENGAGED);
    const expected = regenClosedForm(regenClosedForm(SPEC.capacity - 100, 10) - 100, 10);
    expect(sim.view().shipA.cap).toBeCloseTo(expected, 6);
  });

  test("inactive drains do not debit", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 100, 10, false)] }));
    sim.step(30, ENGAGED);
    const view = sim.view().shipA;
    expect(view.cap).toBeCloseTo(SPEC.capacity, 6);
    expect(view.drains[0].running).toBe(false);
  });

  test("drain above peak regen starves and retries until cap recovers", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 400, 10)] })); // 40 GJ/s vs 12.75 peak
    sim.step(400, ENGAGED);
    const view = sim.view().shipA;
    expect(view.starved).toBe(true);
    expect(view.drains[0].starved).toBe(true);
    expect(view.cap).toBeLessThan(SPEC.capacity * 0.2);
    // Recovery: once regen accumulates the debit succeeds again.
    sim.step(120, ENGAGED);
    expect(sim.view().shipA.drains[0].running).toBe(true);
  });

  test("infinite mode pins the capacitor at full and never starves", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ infinite: true, drains: [drain("1", 600, 5)] }));
    sim.step(30, ENGAGED);
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
    sim.step(20, ENGAGED);
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

  test("attemptDebit reports the starved module id and clears it on the next step", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig());
    expect(sim.attemptDebit("shipA", 1000)).toBe(true);
    expect(sim.attemptDebit("shipA", SPEC.capacity, toTypeId("101"))).toBe(false);
    expect(sim.view().shipA.starvedModuleIds).toEqual([toTypeId("101")]);
    sim.step(1, ENGAGED);
    expect(sim.view().shipA.starvedModuleIds).toEqual([]);
  });

  test("starved drains report their module ids in the view", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("55", 200, 10)], boosters: [] }, {}, { capacity: 250, rechargeTime: 100 }));
    sim.step(20, ENGAGED);
    const view = sim.view().shipA;
    expect(view.starved).toBe(true);
    expect(view.starvedModuleIds).toEqual([toTypeId("55")]);
  });

  test("propulsion debit starvation is reported and recovers", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({}, {}, { capacity: 1000, rechargeTime: 100 }, SPEC, propulsionDrain(150)));
    sim.attemptDebit("shipA", 900); // leave only 100 GJ in the pool
    sim.step(2, ENGAGED);
    expect(sim.propulsionStarved("shipA")).toBe(true);
    // The retry fires as soon as regen affords the debit.
    sim.step(10, ENGAGED);
    expect(sim.propulsionStarved("shipA")).toBe(false);
  });

  test("propulsion drain interval change rebuilds the runtime and resets the cycle", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ propulsion: propulsionDrain(100, 10) }));
    sim.step(5, ENGAGED); // debit at t=0, timer at 5
    sim.update(makeConfig({ propulsion: propulsionDrain(100, 3) }));
    sim.step(3, ENGAGED); // rebuilt timer debits immediately
    const expected = regenClosedForm(regenClosedForm(SPEC.capacity - 100, 5) - 100, 3);
    expect(sim.view().shipA.cap).toBeCloseTo(expected, 6);
  });

  test("propulsion suppression pauses the drain and reactivation debits immediately", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({}, {}, SPEC, SPEC, propulsionDrain(100)));
    sim.step(10, engagement({ propulsionSuppressed: true }));
    expect(sim.view().shipA.cap).toBeCloseTo(SPEC.capacity, 6);
    sim.step(10, ENGAGED);
    expect(sim.view().shipA.cap).toBeCloseTo(regenClosedForm(SPEC.capacity - 100, 10), 6);
  });

  test("auto booster injects on cycle, respects clip and reloads", () => {
    const sim = new CapacitorSimulatorImpl();
    const booster = { moduleId: toTypeId("9"), amount: 200, cycleTime: 5, clipSize: 2, reloadTime: 10, mode: "auto" as const };
    // The drain keeps the pool below capacity so injections are not postponed.
    sim.reset(makeConfig({ drains: [drain("1", 400, 10)], boosters: [booster] }, {}, SMALL_SPEC));
    // t=0: drain + inject (charges 1), t=5: inject (charges 0, reload until t=15), t=10: drain only.
    sim.step(10, ENGAGED);
    expect(sim.view().shipA.boosters[0].reloading).toBe(true);
    expect(sim.view().shipA.boosters[0].charges).toBe(0);
    // t=15.5: reload done at t=15, clip refilled.
    sim.step(5.5, ENGAGED);
    expect(sim.view().shipA.boosters[0].reloading).toBe(false);
    expect(sim.view().shipA.boosters[0].charges).toBe(2);
    // t=20.5: next cycle injects one charge.
    sim.step(5, ENGAGED);
    expect(sim.view().shipA.boosters[0].charges).toBe(1);
  });

  test("auto booster postpones injection into a full pool", () => {
    const sim = new CapacitorSimulatorImpl();
    const booster = { moduleId: toTypeId("9"), amount: 500, cycleTime: 12, clipSize: 5, reloadTime: 10, mode: "auto" as const };
    sim.reset(makeConfig({ boosters: [booster] }, {}, SMALL_SPEC));
    sim.step(13, ENGAGED);
    expect(sim.view().shipA.cap).toBeCloseTo(1000, 6);
    expect(sim.view().shipA.boosters[0].charges).toBe(5);
  });

  test("manual booster only injects on demand", () => {
    const sim = new CapacitorSimulatorImpl();
    const booster = { moduleId: toTypeId("9"), amount: 300, cycleTime: 12, clipSize: 3, reloadTime: 10, mode: "manual" as const };
    sim.reset(makeConfig({ boosters: [booster] }, {}, SMALL_SPEC));
    sim.step(30, ENGAGED);
    expect(sim.view().shipA.boosters[0].charges).toBe(3);
    sim.injectBooster("shipA", 0);
    expect(sim.view().shipA.boosters[0].charges).toBe(2);
    expect(sim.view().shipA.cap).toBeCloseTo(1000, 6);
    sim.injectBooster("shipA", 0);
    expect(sim.view().shipA.boosters[0].charges).toBe(2); // blocked: cycle timer running
    sim.step(13, ENGAGED);
    sim.injectBooster("shipA", 0);
    expect(sim.view().shipA.boosters[0].charges).toBe(1);
    sim.step(13, ENGAGED);
    sim.injectBooster("shipA", 0);
    expect(sim.view().shipA.boosters[0].charges).toBe(0);
    expect(sim.view().shipA.boosters[0].reloading).toBe(true);
    sim.injectBooster("shipA", 0);
    expect(sim.view().shipA.boosters[0].charges).toBe(0); // blocked: reloading
  });

  test("view reports regen per second and the deterministic drain rate", () => {
    // fitted covers every fitted module's amount/interval (stat-side usage); the scheduled drain and
    // propulsion only drive the pool debits and are expected to be included in the fitted figure.
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 100, 10)], fittedDrainPerSecond: 21 }, {}, SPEC, SPEC, propulsionDrain(50, 10)));
    sim.incomingDrains("shipA", [incoming("5", 30, 5)]);
    sim.step(0.001, ENGAGED); // t=0 debits fire immediately, cap near full
    const view = sim.view().shipA;
    expect(view.drainPerSecond).toBeCloseTo(21 + 30 / 5, 6);
    expect(view.netPerSecond).toBeCloseTo(view.regenPerSecond - 27, 6);
    sim.step(0.037, ENGAGED); // no debit event inside this frame
    const after = sim.view().shipA;
    expect(after.drainPerSecond).toBeCloseTo(27, 6);
    expect(after.netPerSecond).toBeCloseTo(after.regenPerSecond - 27, 6);
  });

  test("drain rate keeps counting the fitted usage while starved", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 2000, 10)], fittedDrainPerSecond: 200 }, {}, SMALL_SPEC));
    sim.step(0.001, ENGAGED);
    const view = sim.view().shipA;
    expect(view.starved).toBe(true);
    expect(view.drainPerSecond).toBeCloseTo(200, 6);
  });

  test("infinite pool reports the drain rate as negative net", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 100, 10)], infinite: true, fittedDrainPerSecond: 10 }));
    sim.step(0.001, ENGAGED);
    const view = sim.view().shipA;
    expect(view.drainPerSecond).toBeCloseTo(10, 6);
    expect(view.netPerSecond).toBeCloseTo(-10, 6);
  });

  test("fitted drain rate feeds the net and survives restore", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ fittedDrainPerSecond: 7 }));
    sim.step(0.001, ENGAGED);
    const view = sim.view().shipA;
    expect(view.drainPerSecond).toBeCloseTo(7, 6);
    expect(view.netPerSecond).toBeCloseTo(view.regenPerSecond - 7, 6);
    sim.restore(sim.capture());
    expect(sim.view().shipA.drainPerSecond).toBeCloseTo(7, 6);
  });

  test("disengaged weapons drop their fitted cost from the net", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ fittedDrainPerSecond: 17.44, weaponsDrainPerSecond: 12.19 }));
    sim.step(0.001, engagement({ weaponsEngaged: false }));
    const view = sim.view().shipA;
    expect(view.drainPerSecond).toBeCloseTo(5.25, 6);
    expect(view.netPerSecond).toBeCloseTo(view.regenPerSecond - 5.25, 6);
    sim.step(0.5, ENGAGED);
    expect(sim.view().shipA.drainPerSecond).toBeCloseTo(17.44, 6);
  });

  test("disengaged drain skips its debit and leaves the net until it re-engages", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 100, 10)], fittedDrainPerSecond: 10 }, {}, SMALL_SPEC));
    sim.step(0.001, engagement({ disengagedModuleIds: [toTypeId("1")] }));
    let view = sim.view().shipA;
    expect(view.drains[0].disengaged).toBe(true);
    expect(view.drains[0].running).toBe(false);
    expect(view.cap).toBeCloseTo(SMALL_SPEC.capacity, 6); // no debit at all
    expect(view.drainPerSecond).toBeCloseTo(0, 6);
    expect(view.netPerSecond).toBeCloseTo(0, 6); // no regen at full pool, nothing disengaged-counted
    sim.step(5, engagement({ disengagedModuleIds: [toTypeId("1")] }));
    expect(sim.view().shipA.cap).toBeCloseTo(SMALL_SPEC.capacity, 6);
    // Re-engage: fresh cycle debits immediately, 100 GJ leaves the pool, the cost returns to the net.
    sim.step(0.5, ENGAGED);
    view = sim.view().shipA;
    expect(view.drains[0].disengaged).toBe(false);
    expect(view.drains[0].running).toBe(true);
    expect(view.cap).toBeCloseTo(regenClosedForm(SMALL_SPEC.capacity - 100, 0.5, SMALL_SPEC), 5);
    expect(view.drainPerSecond).toBeCloseTo(10, 6);
  });

  test("disengaged drain never starves and never counts toward starvation", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 2000, 10)], fittedDrainPerSecond: 200 }, {}, SMALL_SPEC));
    sim.step(0.001, ENGAGED);
    expect(sim.view().shipA.starved).toBe(true);
    sim.step(1, engagement({ disengagedModuleIds: [toTypeId("1")] }));
    const view = sim.view().shipA;
    expect(view.starved).toBe(false);
    expect(view.starvedModuleIds).toEqual([]);
    expect(view.drainPerSecond).toBeCloseTo(0, 6);
  });

  test("suppressed propulsion leaves the net and stays out after suppression lifts until reactivation", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ fittedDrainPerSecond: 80 / 7.5 }, {}, SPEC, SPEC, propulsionDrain(80, 7.5)));
    sim.step(0.001, engagement({ propulsionSuppressed: true }));
    const view = sim.view().shipA;
    expect(view.drainPerSecond).toBeCloseTo(0, 6);
    sim.step(1, ENGAGED);
    // Reactivation starts a fresh cycle: the debit fires immediately on the next step.
    expect(sim.view().shipA.drainPerSecond).toBeCloseTo(80 / 7.5, 6);
  });

  test("disengaged drain on an infinite pool shows running=false", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("1", 100, 10)], infinite: true, fittedDrainPerSecond: 10 }));
    sim.step(1, engagement({ disengagedModuleIds: [toTypeId("1")] }));
    const view = sim.view().shipA;
    expect(view.drains[0].disengaged).toBe(true);
    expect(view.drains[0].running).toBe(false);
    expect(view.drainPerSecond).toBeCloseTo(0, 6);
    expect(view.netPerSecond).toBeCloseTo(0, 6);
  });

  test("restored state reports percentage and peak regen at 25 percent", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig());
    const state: CapacitorSimulatorState = {
      time: 0,
      sides: {
        shipA: { spec: SPEC, infinite: false, cap: SPEC.capacity * 0.25, drains: [], incoming: [], boosters: [], propulsion: undefined, fittedDrainPerSecond: 0, weaponsDrainPerSecond: 0 },
        shipB: { spec: SPEC, infinite: false, cap: SPEC.capacity, drains: [], incoming: [], boosters: [], propulsion: undefined, fittedDrainPerSecond: 0, weaponsDrainPerSecond: 0 },
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
    sim.step(5, ENGAGED);
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
    sim.step(7, ENGAGED);
    const state = sim.capture();
    const restored = new CapacitorSimulatorImpl();
    restored.reset(makeConfig({ drains: [drain("1", 100, 10)], boosters: [booster] }));
    restored.step(3, ENGAGED);
    restored.restore(state);
    sim.step(4, ENGAGED);
    restored.step(4, ENGAGED);
    expect(restored.view().shipA.cap).toBeCloseTo(sim.view().shipA.cap, 9);
    expect(restored.view().shipA.boosters[0].charges).toBe(sim.view().shipA.boosters[0].charges);
    expect(restored.view().shipA.drains[0].timer).toBeCloseTo(sim.view().shipA.drains[0].timer, 9);
  });
});

describe("CapacitorSimulatorImpl incoming cap warfare drains", () => {
  test("incoming neutralizer debits the victim in chunks at each interval", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig());
    sim.incomingDrains("shipA", [incoming("500", 600, 24)]);
    sim.step(24, ENGAGED);
    const afterFirst = sim.view().shipA.cap;
    expect(afterFirst).toBeCloseTo(regenClosedForm(SPEC.capacity - 600, 24), 6);
    const entry = sim.view().shipA.incoming[0];
    expect(entry.moduleId).toBe(toTypeId("500"));
    expect(entry.amount).toBe(600);
    expect(entry.interval).toBe(24);
    expect(entry.transfer).toBe(false);
    expect(entry.count).toBe(1);
    expect(entry.running).toBe(true);
    sim.step(24, ENGAGED);
    expect(sim.view().shipA.cap).toBeCloseTo(regenClosedForm(afterFirst - 600, 24), 6);
  });

  test("incoming drain floors the victim capacitor at zero", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({}, {}, SMALL_SPEC));
    sim.attemptDebit("shipA", SMALL_SPEC.capacity - 20);
    sim.incomingDrains("shipA", [incoming("500", 600, 24)]);
    sim.step(24, ENGAGED);
    expect(sim.view().shipA.cap).toBeCloseTo(regenClosedForm(0, 24, SMALL_SPEC), 6);
  });

  test("incoming drains vanish when the engine stops projecting them", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig());
    sim.incomingDrains("shipA", [incoming("500", 600, 24)]);
    sim.step(5, ENGAGED);
    const before = sim.view().shipA.cap;
    sim.incomingDrains("shipA", []);
    sim.step(30, ENGAGED);
    expect(sim.view().shipA.incoming).toHaveLength(0);
    expect(sim.view().shipA.cap).toBeCloseTo(regenClosedForm(before, 30), 6);
  });

  test("merge updates the amount while preserving the cycle timer", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig());
    sim.incomingDrains("shipA", [incoming("500", 100, 10)]);
    sim.step(7, ENGAGED);
    const before = sim.view().shipA.cap;
    sim.incomingDrains("shipA", [incoming("500", 200, 10)]);
    sim.step(5, ENGAGED);
    const afterRegen = regenClosedForm(before, 3);
    expect(sim.view().shipA.cap).toBeCloseTo(regenClosedForm(afterRegen - 200, 2), 6);
  });

  test("nosferatu transfers only when the attacker capacitor is lower than the victim", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig());
    sim.attemptDebit("shipA", SPEC.capacity - 1000);
    sim.incomingDrains("shipA", [incoming("600", 36, 5, true)]);
    sim.step(5, ENGAGED);
    expect(sim.view().shipA.cap).toBeCloseTo(regenClosedForm(1000, 5), 6);
    expect(sim.view().shipB.cap).toBeCloseTo(SPEC.capacity, 6);

    const sim2 = new CapacitorSimulatorImpl();
    sim2.reset(makeConfig());
    sim2.attemptDebit("shipB", SPEC.capacity - 1000);
    sim2.incomingDrains("shipA", [incoming("600", 36, 5, true)]);
    sim2.step(5, ENGAGED);
    expect(sim2.view().shipA.cap).toBeCloseTo(regenClosedForm(SPEC.capacity - 36, 5), 6);
    expect(sim2.view().shipB.cap).toBeCloseTo(regenClosedForm(1036, 5), 6);
  });

  test("nosferatu drains the victim only down to the attacker capacitor level", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig());
    sim.attemptDebit("shipA", SPEC.capacity - 20);
    sim.attemptDebit("shipB", SPEC.capacity - 10);
    sim.incomingDrains("shipA", [incoming("600", 36, 5, true)]);
    sim.step(5, ENGAGED);
    // EVE parity: the victim stops at the attacker's pre-transfer level (10 + 10 gained), both regen for the rest of the step.
    expect(sim.view().shipA.cap).toBeCloseTo(regenClosedForm(10, 5), 6);
    expect(sim.view().shipB.cap).toBeCloseTo(regenClosedForm(20, 5), 6);
  });

  test("infinite victim never loses capacitor to incoming drains", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ infinite: true }));
    sim.incomingDrains("shipA", [incoming("500", 600, 24)]);
    sim.step(24, ENGAGED);
    expect(sim.view().shipA.cap).toBeCloseTo(SPEC.capacity, 6);
    expect(sim.view().shipA.incoming[0].running).toBe(true);
  });

  test("mirror fits keep own drains and incoming drains apart", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig({ drains: [drain("500", 100, 10)] }));
    sim.incomingDrains("shipA", [incoming("500", 600, 24)]);
    sim.step(24, ENGAGED);
    expect(sim.view().shipA.drains).toHaveLength(1);
    expect(sim.view().shipA.drains[0].amount).toBe(100);
    expect(sim.view().shipA.incoming).toHaveLength(1);
    expect(sim.view().shipA.incoming[0].amount).toBe(600);
    expect(sim.view().shipA.cap).toBeLessThan(SPEC.capacity - 700);
  });

  test("capture and restore round-trip incoming drain timers", () => {
    const sim = new CapacitorSimulatorImpl();
    sim.reset(makeConfig());
    sim.incomingDrains("shipA", [incoming("500", 600, 24)]);
    sim.step(9, ENGAGED);
    const state = sim.capture();
    const restored = new CapacitorSimulatorImpl();
    restored.reset(makeConfig());
    restored.incomingDrains("shipA", [incoming("500", 600, 24)]);
    restored.step(3, ENGAGED);
    restored.restore(state);
    sim.step(15, ENGAGED);
    restored.step(15, ENGAGED);
    expect(restored.view().shipA.cap).toBeCloseTo(sim.view().shipA.cap, 9);
    expect(restored.view().shipA.incoming[0].timer).toBeCloseTo(sim.view().shipA.incoming[0].timer, 9);
  });
});
