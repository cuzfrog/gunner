import { runCapSim, eveStablePercent, type StaticDrain } from "./capacitorSim";

const spec = { capacity: 6375, rechargeTime: 1250 };

describe("capacitorSim", () => {
  test("no drains is stable at 100%", () => {
    const result = runCapSim({ spec, drains: [] });
    expect(result.stable).toBe(true);
    expect(result.stableLow).toBeCloseTo(spec.capacity, 3);
    expect(result.stableHigh).toBeCloseTo(spec.capacity, 3);
    expect(result.depletesAt).toBeUndefined();
  });

  test("drain at half peak regen is stable near EVE equilibrium", () => {
    // peak = 2.5 * 6375 / 1250 = 12.75 GJ/s; drain 6 GJ/s = 60 GJ per 10 s
    const drains: readonly StaticDrain[] = [{ amount: 60, interval: 10 }];
    const result = runCapSim({ spec, drains });
    expect(result.stable).toBe(true);
    const evePercent = eveStablePercent({ capacity: spec.capacity, rechargeTime: spec.rechargeTime, drainPerSecond: 6 });
    const watermarkPercent = ((result.stableLow + result.stableHigh) / 2 / spec.capacity) * 100;
    expect(watermarkPercent).toBeGreaterThan(evePercent - 1);
    expect(watermarkPercent).toBeLessThan(evePercent + 1);
  });

  test("drain above peak regen depletes and larger drains deplete sooner", () => {
    const moderate = runCapSim({ spec, drains: [{ amount: 200, interval: 10 }] }); // 20 GJ/s > 12.75
    const heavy = runCapSim({ spec, drains: [{ amount: 400, interval: 10 }] }); // 40 GJ/s
    expect(moderate.stable).toBe(false);
    expect(heavy.stable).toBe(false);
    const moderateAt = moderate.depletesAt;
    const heavyAt = heavy.depletesAt;
    if (moderateAt === undefined || heavyAt === undefined) throw new Error("depletesAt expected for unstable fits");
    expect(heavyAt).toBeLessThan(moderateAt);
    expect(moderate.stableLow).toBe(0);
    expect(moderate.stableHigh).toBe(0);
  });

  test("regen between activations follows the EVE closed form", () => {
    // tau = T/5 = 250 s. Single 100 GJ debit at t=0 (cap 6275), regen to t=10,
    // second debit at t=10, then tMax cuts the sim before the third event.
    const drains: readonly StaticDrain[] = [{ amount: 100, interval: 10 }];
    const result = runCapSim({ spec, drains, tMaxSeconds: 15 });
    expect(result.stable).toBe(true);
    const c0 = spec.capacity - 100;
    const c1 = spec.capacity * Math.pow(1 + (Math.sqrt(c0 / spec.capacity) - 1) * Math.exp(-10 / 250), 2);
    expect(result.stableLow).toBeCloseTo(c1 - 100, 0);
    expect(result.stableHigh).toBeCloseTo(c1, 0);
  });

  test("identical drains are staggered rather than summed", () => {
    // Same average drain 3 GJ/s, both stable: 4 x 7.5 GJ per 10 s staggered into 2.5 s slots
    // keeps the cap higher than one chunky 30 GJ debit every 10 s.
    const staggered = runCapSim({ spec, drains: [{ amount: 7.5, interval: 10, count: 4 }] });
    const chunky = runCapSim({ spec, drains: [{ amount: 30, interval: 10, count: 1 }] });
    expect(staggered.stable).toBe(true);
    expect(chunky.stable).toBe(true);
    expect(staggered.stableLow).toBeGreaterThan(chunky.stableLow);
  });

  test("injector stabilizes an otherwise unstable fit and honors clip reload", () => {
    // drain 20 GJ/s = 200 per 10 s; injector 800 GJ every 12 s with clip 1 + 10 s reload
    const drains: readonly StaticDrain[] = [
      { amount: 200, interval: 10 },
      { amount: 800, interval: 12, clipSize: 1, reloadTime: 10, injector: true },
    ];
    const result = runCapSim({ spec, drains, tMaxSeconds: 7200 });
    expect(result.stable).toBe(true);
    expect(result.stableLow).toBeGreaterThan(0);
    // without the injector the same fit depletes
    const noInjector = runCapSim({ spec, drains: [{ amount: 200, interval: 10 }] });
    expect(noInjector.stable).toBe(false);
  });

  test("injector with clip consumes charges before reload", () => {
    // drain 100 per 10 s = 10 GJ/s; injector clip 3 x 400 GJ every 12 s, 10 s reload
    const drains: readonly StaticDrain[] = [
      { amount: 100, interval: 10 },
      { amount: 400, interval: 12, clipSize: 3, reloadTime: 10, injector: true },
    ];
    const result = runCapSim({ spec, drains, tMaxSeconds: 7200 });
    expect(result.stable).toBe(true);
    expect(result.stableLow).toBeGreaterThan(0);
  });

  test("injection larger than capacity still sustains the fit via the on-demand reserve", () => {
    // frigate-sized pool: a 400 GJ Navy charge on a 313 GJ capacitor always overshoots,
    // so the injector is held as reserve; reserve spends must credit the injection.
    const frigateSpec = { capacity: 313, rechargeTime: 140.6 };
    const drains: readonly StaticDrain[] = [
      { amount: 16.42, interval: 1 },
      { amount: 400, interval: 12.75, clipSize: 1, reloadTime: 10, injector: true },
    ];
    const result = runCapSim({ spec: frigateSpec, drains, tMaxSeconds: 7200 });
    expect(result.stable).toBe(true);
    expect(result.stableLow).toBeGreaterThan(0);
  });

  test("reserve spend covers a drain the pool can barely afford", () => {
    // pool 313 GJ, drain 300 every 30 s: without reserve credit the second drain overdrafts
    const drains: readonly StaticDrain[] = [
      { amount: 300, interval: 30 },
      { amount: 400, interval: 12, clipSize: 1, reloadTime: 10, injector: true },
    ];
    const result = runCapSim({ spec: { capacity: 313, rechargeTime: 140.6 }, drains, tMaxSeconds: 7200 });
    expect(result.stable).toBe(true);
    expect(result.stableLow).toBeGreaterThan(0);
  });

  test("zero capacity with drains depletes immediately", () => {
    const result = runCapSim({ spec: { capacity: 0, rechargeTime: 1 }, drains: [{ amount: 10, interval: 5 }] });
    expect(result.stable).toBe(false);
    expect(result.depletesAt).toBe(0);
  });
});

describe("eveStablePercent", () => {
  test("matches the EVE equilibrium closed form", () => {
    // D = 6, tau = 250, C = 6375: 0.25 * (1 + sqrt(1 - 2*6*250/6375))^2
    const expected = 0.25 * Math.pow(1 + Math.sqrt(1 - (2 * 6 * 250) / 6375), 2) * 100;
    expect(eveStablePercent({ capacity: 6375, rechargeTime: 1250, drainPerSecond: 6 })).toBeCloseTo(expected, 6);
  });

  test("drain above 2*D*tau >= C never stabilizes", () => {
    expect(eveStablePercent({ capacity: 6375, rechargeTime: 1250, drainPerSecond: 20 })).toBe(0);
  });

  test("no drain stabilizes at 100%", () => {
    expect(eveStablePercent({ capacity: 6375, rechargeTime: 1250, drainPerSecond: 0 })).toBeCloseTo(100, 6);
  });
});
