import { DefenseSimulatorImpl } from "./defenseSimulator";
import type { DefenseSimConfig } from "./defenseSimulator";
import type { DamageEvent, DamageVector, DefenseSpec, RahSpec, RepairerSpec } from "./types";
import { ZERO_DAMAGE } from "./types";

function events(shipA: DamageVector, shipB: DamageVector): readonly DamageEvent[] {
  const result: DamageEvent[] = [];
  if (shipA.em > 0 || shipA.thermal > 0 || shipA.kinetic > 0 || shipA.explosive > 0) {
    result.push({ target: "shipA", source: "shipB", weaponIndex: 0, kind: "turret", rawByType: shipA });
  }
  if (shipB.em > 0 || shipB.thermal > 0 || shipB.kinetic > 0 || shipB.explosive > 0) {
    result.push({ target: "shipB", source: "shipA", weaponIndex: 0, kind: "turret", rawByType: shipB });
  }
  return result;
}

function spec(opts: {
  shieldHp?: number;
  armorHp?: number;
  hullHp?: number;
  shieldRechargeTime?: number;
  shieldUniformity?: number;
  shieldResists?: Partial<Record<keyof DamageVector, number>>;
  armorResists?: Partial<Record<keyof DamageVector, number>>;
  hullResists?: Partial<Record<keyof DamageVector, number>>;
  repairers?: readonly RepairerSpec[];
  rah?: RahSpec;
} = {}): DefenseSpec {
  return {
    layers: {
      shield: { hp: opts.shieldHp ?? 1000, resists: { em: opts.shieldResists?.em ?? 0, thermal: opts.shieldResists?.thermal ?? 0, kinetic: opts.shieldResists?.kinetic ?? 0, explosive: opts.shieldResists?.explosive ?? 0 } },
      armor: { hp: opts.armorHp ?? 1000, resists: { em: opts.armorResists?.em ?? 0, thermal: opts.armorResists?.thermal ?? 0, kinetic: opts.armorResists?.kinetic ?? 0, explosive: opts.armorResists?.explosive ?? 0 } },
      hull: { hp: opts.hullHp ?? 1000, resists: { em: opts.hullResists?.em ?? 0, thermal: opts.hullResists?.thermal ?? 0, kinetic: opts.hullResists?.kinetic ?? 0, explosive: opts.hullResists?.explosive ?? 0 } },
    },
    shieldRechargeTime: opts.shieldRechargeTime ?? 0,
    repairers: opts.repairers ?? [],
    signaturePenalty: 0,
    rah: opts.rah,
    shieldUniformity: opts.shieldUniformity ?? 0.25,
  };
}

function config(shipA: DefenseSpec, shipB?: DefenseSpec, damageEnabled?: { shipA: boolean; shipB: boolean }): DefenseSimConfig {
  return {
    shipA,
    shipB: shipB ?? spec(),
    damageEnabled: damageEnabled ?? { shipA: true, shipB: true },
    repairMode: { shipA: "auto", shipB: "auto" },
    repairerActivation: { shipA: [], shipB: [] },
    rahActivation: { shipA: undefined, shipB: undefined },
  };
}

const EM_DAMAGE: DamageVector = { em: 100, thermal: 0, kinetic: 0, explosive: 0 };
const MIXED_DAMAGE: DamageVector = { em: 50, thermal: 50, kinetic: 0, explosive: 0 };

describe("DefenseSimulatorImpl", () => {
  test("reset initializes pools to spec max HP", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 500, armorHp: 300, hullHp: 200 })));
    const view = sim.view();
    expect(view.pools.shipA).toEqual({ shield: 500, armor: 300, hull: 200 });
    expect(view.pools.shipB).toEqual({ shield: 1000, armor: 1000, hull: 1000 });
    expect(view.dead.shipA).toBe(false);
    expect(view.deadAt.shipA).toBeUndefined();
  });

  test("layer overflow with mixed-type damage: shield depleted, armor takes overflow, hull takes final overflow", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({
      shieldHp: 100,
      armorHp: 50,
      hullHp: 1000,
      shieldResists: { em: 0, thermal: 0 },
      armorResists: { em: 0, thermal: 0 },
      hullResists: { em: 0, thermal: 0 },
    })));
    // 100 total DPS (50 em + 50 thermal), dt=1s => 100 total damage
    // Shield: 100 * 1 = 100 damage (0% resist) => shield depleted, 0 overflow
    sim.step(1, events(MIXED_DAMAGE, ZERO_DAMAGE));
    const view = sim.view();
    expect(view.pools.shipA.shield).toBe(0);
    expect(view.pools.shipA.armor).toBe(50);
    expect(view.pools.shipA.hull).toBe(1000);
  });

  test("shield overflow continues into armor with armor resist applied", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({
      shieldHp: 50,
      armorHp: 1000,
      hullHp: 1000,
      shieldResists: { em: 0 },
      armorResists: { em: 0.5 },
    })));
    // 100 EM DPS, dt=1s => 100 raw EM damage
    // Shield: 100 * (1-0) = 100 damage, shield has 50 => absorbs 50, overflow = 50
    // Armor: 50 * (1-0.5) = 25 damage => armor takes 25
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const view = sim.view();
    expect(view.pools.shipA.shield).toBe(0);
    expect(view.pools.shipA.armor).toBe(975);
    expect(view.pools.shipA.hull).toBe(1000);
  });

  test("armor overflow continues into hull with hull resist applied", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({
      shieldHp: 0,
      armorHp: 30,
      hullHp: 1000,
      armorResists: { em: 0 },
      hullResists: { em: 0.5 },
    })));
    // 100 EM DPS, dt=1s => 100 raw EM damage
    // Shield: 0 HP, all overflows
    // Armor: 100 * (1-0) = 100 damage, armor has 30 => absorbs 30, overflow = 70
    // Hull: 70 * (1-0.5) = 35 damage => hull takes 35
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const view = sim.view();
    expect(view.pools.shipA.shield).toBe(0);
    expect(view.pools.shipA.armor).toBe(0);
    expect(view.pools.shipA.hull).toBe(965);
  });

  test("shield regen curve: capacity increases between ticks", () => {
    const sim = new DefenseSimulatorImpl();
    const rechargeTime = 100;
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: rechargeTime })));
    // Drain shield to 250 (25%)
    sim.step(1, events({ em: 750, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(250);
    // Step with no damage — shield should regen
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    const regenShield = sim.view().pools.shipA.shield;
    expect(regenShield).toBeGreaterThan(250);
    expect(regenShield).toBeLessThan(1000);
  });

  test("shield regen peak is at 25% shield capacity", () => {
    const max = 1000;
    const rechargeTime = 100;
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: max, shieldRechargeTime: rechargeTime, shieldResists: { em: 0 } })));

    sim.step(1, events({ em: 750, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(250);
    const peakRate = sim.view().shieldRegenPerSecond.shipA;
    expect(peakRate).toBeCloseTo(2.5 * max / rechargeTime, 5);

    sim.reset(config(spec({ shieldHp: max, shieldRechargeTime: rechargeTime, shieldResists: { em: 0 } })));
    sim.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    const rateAt50 = sim.view().shieldRegenPerSecond.shipA;
    expect(peakRate).toBeGreaterThan(rateAt50);

    sim.reset(config(spec({ shieldHp: max, shieldRechargeTime: rechargeTime, shieldResists: { em: 0 } })));
    sim.step(1, events({ em: 900, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    const rateAt10 = sim.view().shieldRegenPerSecond.shipA;
    expect(peakRate).toBeGreaterThan(rateAt10);
  });

  test("death stops sim: hull reaches 0, dead flag set, deadAt recorded", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({
      shieldHp: 0,
      armorHp: 0,
      hullHp: 100,
      hullResists: { em: 0 },
    })));
    // 100 EM DPS, dt=1s => 100 damage to hull (0 resist) => hull = 0
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const view = sim.view();
    expect(view.pools.shipA.hull).toBe(0);
    expect(view.dead.shipA).toBe(true);
    expect(view.deadAt.shipA).toBe(1);
    // Further steps should not change anything
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const view2 = sim.view();
    expect(view2.pools.shipA.hull).toBe(0);
    expect(view2.deadAt.shipA).toBe(1);
  });

  test("zero-HP spec (no fitting) does not trigger death", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 0, armorHp: 0, hullHp: 0 })));
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    const view = sim.view();
    expect(view.dead.shipA).toBe(false);
    expect(view.dead.shipB).toBe(false);
    expect(view.deadAt.shipA).toBeUndefined();
    expect(view.poolPercentages.shipA).toEqual({ shield: 1, armor: 1, hull: 1 });
  });

  test("damage-disable: damage not applied, pools stay full", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 500, armorHp: 500, hullHp: 500 }), undefined, { shipA: false, shipB: true }));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const view = sim.view();
    expect(view.pools.shipA.shield).toBe(500);
    expect(view.pools.shipA.armor).toBe(500);
    expect(view.pools.shipA.hull).toBe(500);
    expect(view.damageEnabled.shipA).toBe(false);
  });

  test("damage-disable: no regen when disabled, pools stay at max", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 100 }), undefined, { shipA: false, shipB: true }));
    // Even with regen time set, pools stay at max when disabled
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(1000);
  });

  test("setDamageEnabled toggles at runtime", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 200, armorHp: 200, hullHp: 200 })));
    sim.setDamageEnabled("shipA", false);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(200);
    sim.setDamageEnabled("shipA", true);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(100);
  });

  test("update preserves pool state while updating maxes and resists from new spec", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 500, armorHp: 300, hullHp: 200 })));
    sim.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    sim.update(config(spec({ shieldHp: 1000, armorHp: 800, hullHp: 600 })));
    const view = sim.view();
    expect(view.pools.shipA.shield).toBe(0);
    expect(view.pools.shipA.armor).toBe(300);
    expect(view.pools.shipA.hull).toBe(200);
    expect(view.dead.shipA).toBe(false);
  });

  test("update from empty spec (no fitting) to real spec initializes pools to full", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 0, armorHp: 0, hullHp: 0 })));
    expect(sim.view().pools.shipA).toEqual({ shield: 0, armor: 0, hull: 0 });
    sim.update(config(spec({ shieldHp: 1000, armorHp: 800, hullHp: 600 })));
    const view = sim.view();
    expect(view.pools.shipA).toEqual({ shield: 1000, armor: 800, hull: 600 });
    expect(view.poolPercentages.shipA).toEqual({ shield: 1, armor: 1, hull: 1 });
  });

  test("update preserves dead state", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 0, armorHp: 0, hullHp: 100, hullResists: { em: 0 } })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().dead.shipA).toBe(true);
    sim.update(config(spec({ shieldHp: 500, armorHp: 300, hullHp: 200 })));
    expect(sim.view().dead.shipA).toBe(true);
  });

  test("update preserves repairer cycle progress", () => {
    const sim = new DefenseSimulatorImpl();
    const repairSpec = spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, armorResists: { em: 0 }, repairers: [{ layer: "armor", amount: 100, cycleTime: 4, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().repairers.shipA[0].cycling).toBe(true);
    expect(sim.view().repairers.shipA[0].cycleProgress).toBeGreaterThan(0);
    sim.update(config(repairSpec));
    expect(sim.view().repairers.shipA[0].cycling).toBe(true);
    expect(sim.view().repairers.shipA[0].cycleProgress).toBeGreaterThan(0);
  });

  test("update clamps pool to new max when spec max decreases", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000 })));
    sim.update(config(spec({ shieldHp: 500, armorHp: 300, hullHp: 200 })));
    const view = sim.view();
    expect(view.pools.shipA.shield).toBe(500);
    expect(view.pools.shipA.armor).toBe(300);
    expect(view.pools.shipA.hull).toBe(200);
  });

  test("shield regen does not exceed max", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 100 })));
    sim.step(10, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(1000);
  });

  test("no regen when shieldRechargeTime is 0", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 500, shieldRechargeTime: 0 })));
    // Damage shield slightly
    sim.step(1, events({ em: 100, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(400);
    // No regen
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(400);
  });

  test("shieldRegenPerSecond in view reflects current shield level", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 100 })));
    // At full shield, regen rate is 0
    expect(sim.view().shieldRegenPerSecond.shipA).toBe(0);
    // Drain to 25%
    sim.step(1, events({ em: 750, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    const rate = sim.view().shieldRegenPerSecond.shipA;
    expect(rate).toBeCloseTo(25, 1);
  });

  test("poolPercentages reflect current pool levels", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 500, hullHp: 200 })));
    sim.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    const pct = sim.view().poolPercentages.shipA;
    expect(pct.shield).toBe(0.5);
    expect(pct.armor).toBe(1);
    expect(pct.hull).toBe(1);
  });

  test("shield booster heals at cycle start", () => {
    const sim = new DefenseSimulatorImpl();
    const repairSpec = spec({ shieldHp: 1000, shieldRechargeTime: 0, repairers: [{ layer: "shield", amount: 100, cycleTime: 2, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    sim.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(600);
    const repairers = sim.view().repairers.shipA;
    expect(repairers).toHaveLength(1);
    expect(repairers[0].cycling).toBe(true);
  });

  test("armor repairer heals at cycle end", () => {
    const sim = new DefenseSimulatorImpl();
    const repairSpec = spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, armorResists: { em: 0 }, repairers: [{ layer: "armor", amount: 100, cycleTime: 2, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(900);
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(1000);
  });

  test("ancillary repairer depletes charges then reloads", () => {
    const sim = new DefenseSimulatorImpl();
    const repairSpec = spec({ shieldHp: 0, armorHp: 100000, hullHp: 100000, armorResists: { em: 0 }, repairers: [{
      layer: "armor", amount: 100, cycleTime: 2, capacitorNeed: 0, heatDamage: 0,
      overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 },
      ancillary: { chargeMultiplier: 3, shots: 2, reloadTime: 5 },
    }] });
    sim.reset(config(repairSpec));
    sim.step(1, events({ em: 5000, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(95000);
    expect(sim.view().repairers.shipA[0].ancillaryCharges).toBe(1);
    expect(sim.view().repairers.shipA[0].cycling).toBe(true);
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(95300);
    expect(sim.view().repairers.shipA[0].ancillaryCharges).toBe(1);
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().repairers.shipA[0].ancillaryCharges).toBe(0);
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().repairers.shipA[0].reloading).toBe(true);
  });

  test("overload multiplies amount and reduces cycle time", () => {
    const sim = new DefenseSimulatorImpl();
    const repairSpec = spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, armorResists: { em: 0 }, repairers: [{
      layer: "armor", amount: 100, cycleTime: 4, capacitorNeed: 0, heatDamage: 0,
      overload: { amountMultiplier: 1.5, cycleTimeMultiplier: 0.75 },
    }] });
    sim.reset(config(repairSpec));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(900);
    sim.step(2, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(1000);
    const r = sim.view().repairers.shipA[0];
    expect(r.overloaded).toBe(true);
    expect(r.hpPerSecond).toBeCloseTo((100 * 1.5) / (4 * 0.75), 5);
  });

  test("auto mode skips new cycles when pool is full", () => {
    const sim = new DefenseSimulatorImpl();
    const repairSpec = spec({ shieldHp: 1000, shieldRechargeTime: 0, repairers: [{ layer: "shield", amount: 100, cycleTime: 1, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(1000);
    expect(sim.view().repairers.shipA[0].cycling).toBe(false);
  });

  test("manual mode activates only when module is active", () => {
    const sim = new DefenseSimulatorImpl();
    const repairSpec = spec({ shieldHp: 1000, shieldRechargeTime: 0, repairers: [{ layer: "shield", amount: 100, cycleTime: 5, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset({
      ...config(repairSpec),
      repairMode: { shipA: "manual", shipB: "auto" },
      repairerActivation: { shipA: [{ active: false, overloaded: true }], shipB: [] },
    });
    sim.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(500);
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(500);
    sim.setRepairerActivation("shipA", 0, true, true);
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(600);
  });

  test("setRepairMode does not reset pools", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000 })));
    sim.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(500);
    sim.setRepairMode("shipA", "manual");
    expect(sim.view().pools.shipA.shield).toBe(500);
    expect(sim.view().repairMode.shipA).toBe("manual");
  });

  test("setRepairerActivation does not reset pools", () => {
    const sim = new DefenseSimulatorImpl();
    const repairSpec = spec({ shieldHp: 1000, shieldRechargeTime: 0, repairers: [{ layer: "shield", amount: 100, cycleTime: 5, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    sim.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(600);
    sim.setRepairerActivation("shipA", 0, false, false);
    expect(sim.view().pools.shipA.shield).toBe(600);
    expect(sim.view().repairers.shipA[0].active).toBe(false);
  });

  test("RAH converges toward 60/0/0/0 under EM-only damage", () => {
    const sim = new DefenseSimulatorImpl();
    const rahSpec = spec({ shieldHp: 0, armorHp: 10000, hullHp: 10000, armorResists: { em: 0 }, rah: {
      cycleTime: 1, shiftAmount: 0.06, baseResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 },
      overloadCycleTimeMultiplier: 1, armorResistsWithoutRah: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    } });
    sim.reset(config(rahSpec));
    for (let i = 0; i < 50; i++) {
      sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    }
    const rah = sim.view().rah.shipA;
    expect(rah).toBeDefined();
    expect(rah?.resists.em).toBeGreaterThan(0.5);
    expect(rah?.resists.thermal).toBeLessThan(0.05);
    expect(rah?.resists.kinetic).toBeLessThan(0.05);
    expect(rah?.resists.explosive).toBeLessThan(0.05);
  });

  test("RAH converges toward 30/30/0/0 under EM+thermal damage", () => {
    const sim = new DefenseSimulatorImpl();
    const rahSpec = spec({ shieldHp: 0, armorHp: 10000, hullHp: 10000, armorResists: { em: 0, thermal: 0 }, rah: {
      cycleTime: 1, shiftAmount: 0.06, baseResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 },
      overloadCycleTimeMultiplier: 1, armorResistsWithoutRah: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    } });
    sim.reset(config(rahSpec));
    for (let i = 0; i < 50; i++) {
      sim.step(1, events(MIXED_DAMAGE, ZERO_DAMAGE));
    }
    const rah = sim.view().rah.shipA;
    expect(rah).toBeDefined();
    expect(rah?.resists.em).toBeGreaterThan(0.25);
    expect(rah?.resists.thermal).toBeGreaterThan(0.25);
    expect(rah?.resists.kinetic).toBeLessThan(0.05);
    expect(rah?.resists.explosive).toBeLessThan(0.05);
  });

  test("RAH resets to 15/15/15/15 on deactivation and reactivation", () => {
    const sim = new DefenseSimulatorImpl();
    const rahSpec = spec({ shieldHp: 0, armorHp: 10000, hullHp: 10000, armorResists: { em: 0 }, rah: {
      cycleTime: 1, shiftAmount: 0.06, baseResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 },
      overloadCycleTimeMultiplier: 1, armorResistsWithoutRah: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    } });
    sim.reset(config(rahSpec));
    for (let i = 0; i < 20; i++) {
      sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    }
    const rahBefore = sim.view().rah.shipA;
    expect(rahBefore?.resists.em).toBeGreaterThan(0.3);
    sim.setRahActivation("shipA", false, false);
    expect(sim.view().rah.shipA?.active).toBe(false);
    sim.setRahActivation("shipA", true, true);
    const rahAfter = sim.view().rah.shipA;
    expect(rahAfter?.resists.em).toBeCloseTo(0.15, 5);
    expect(rahAfter?.resists.thermal).toBeCloseTo(0.15, 5);
    expect(rahAfter?.resists.kinetic).toBeCloseTo(0.15, 5);
    expect(rahAfter?.resists.explosive).toBeCloseTo(0.15, 5);
  });

  test("setRahActivation does not reset pools", () => {
    const sim = new DefenseSimulatorImpl();
    const rahSpec = spec({ shieldHp: 1000, rah: {
      cycleTime: 1, shiftAmount: 0.06, baseResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 },
      overloadCycleTimeMultiplier: 1, armorResistsWithoutRah: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    } });
    sim.reset(config(rahSpec));
    sim.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(500);
    sim.setRahActivation("shipA", false, false);
    expect(sim.view().pools.shipA.shield).toBe(500);
  });

  test("view includes repairer and rah state", () => {
    const sim = new DefenseSimulatorImpl();
    const repairSpec = spec({ shieldHp: 1000, repairers: [{ layer: "shield", amount: 100, cycleTime: 2, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1.2, cycleTimeMultiplier: 0.9 } }], rah: {
      cycleTime: 5, shiftAmount: 0.06, baseResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 },
      overloadCycleTimeMultiplier: 0.85, armorResistsWithoutRah: { em: 0.5, thermal: 0.35, kinetic: 0.25, explosive: 0.2 },
    } });
    sim.reset(config(repairSpec));
    const view = sim.view();
    expect(view.repairers.shipA).toHaveLength(1);
    expect(view.repairers.shipA[0].layer).toBe("shield");
    expect(view.repairers.shipA[0].overloaded).toBe(true);
    expect(view.repairMode.shipA).toBe("auto");
    expect(view.rah.shipA).toBeDefined();
    expect(view.rah.shipA?.active).toBe(true);
    expect(view.rah.shipA?.overloaded).toBe(true);
  });

  test("in-progress armor cycle completes and heals at cycle end", () => {
    const sim = new DefenseSimulatorImpl();
    const repairSpec = spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, armorResists: { em: 0 }, repairers: [{ layer: "armor", amount: 100, cycleTime: 4, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(900);
    expect(sim.view().repairers.shipA[0].cycling).toBe(true);
    sim.step(3, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(1000);
    expect(sim.view().repairers.shipA[0].cycling).toBe(false);
  });

  test("auto mode starts cycle when layer is below max", () => {
    const sim = new DefenseSimulatorImpl();
    const repairSpec = spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, armorResists: { em: 0 }, repairers: [{ layer: "armor", amount: 100, cycleTime: 4, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(900);
    expect(sim.view().repairers.shipA[0].cycling).toBe(true);
  });

  test("tick buffer: events before 1s boundary are not applied until boundary", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(0.5, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(1000);
    sim.step(0.5, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(800);
  });

  test("tick buffer: multiple events in one tick are applied together", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(1, [
      { target: "shipA", source: "shipB", weaponIndex: 0, kind: "turret", rawByType: { em: 50, thermal: 0, kinetic: 0, explosive: 0 } },
      { target: "shipA", source: "shipB", weaponIndex: 0, kind: "turret", rawByType: { em: 50, thermal: 0, kinetic: 0, explosive: 0 } },
    ]);
    expect(sim.view().pools.shipA.shield).toBe(900);
  });

  test("tick buffer: events crossing multiple boundaries apply at first boundary", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(2.5, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(900);
  });

  test("tick buffer: events from multiple frames accumulate before boundary", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(0.3, events({ em: 50, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    sim.step(0.3, events({ em: 50, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    sim.step(0.3, events({ em: 50, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    sim.step(0.3, events({ em: 50, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(800);
  });

  test("tick buffer: reset clears buffer and resets boundary", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(0.5, events(EM_DAMAGE, ZERO_DAMAGE));
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(0.5, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(1000);
    sim.step(0.5, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(900);
  });

  test("tick buffer: both sides receive events at the same boundary", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 }), spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(1, events(EM_DAMAGE, EM_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(900);
    expect(sim.view().pools.shipB.shield).toBe(900);
  });

  test("tick buffer: shield regen applies continuously between boundaries", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 100 })));
    sim.step(1, events({ em: 750, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(250);
    const shieldAfterDamage = sim.view().pools.shipA.shield;
    sim.step(0.5, events(ZERO_DAMAGE, ZERO_DAMAGE));
    const shieldAfterRegen = sim.view().pools.shipA.shield;
    expect(shieldAfterRegen).toBeGreaterThan(shieldAfterDamage);
  });

  test("tick buffer: update preserves pending events in buffer", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(0.5, events(EM_DAMAGE, ZERO_DAMAGE));
    sim.update(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(0.5, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(900);
  });

  test("tick buffer: nextTickBoundary advances correctly after multi-boundary step", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 10000, shieldRechargeTime: 0 })));
    sim.step(2.5, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(9900);
    sim.step(0.5, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(9800);
  });

  test("shield bleed-through: no bleed when shield above uniformity threshold", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0.25 })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(900);
    expect(sim.view().pools.shipA.armor).toBe(1000);
  });

  test("shield bleed-through: bleed occurs when shield below uniformity threshold", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0.25 })));
    sim.step(1, events({ em: 800, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(200);
    expect(sim.view().pools.shipA.armor).toBe(1000);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const view = sim.view();
    expect(view.pools.shipA.shield).toBeLessThan(200);
    expect(view.pools.shipA.armor).toBeLessThan(1000);
  });

  test("shield bleed-through: full bleed at zero shield", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 100, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0.25 })));
    sim.step(1, events({ em: 100, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    expect(sim.view().pools.shipA.armor).toBe(1000);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    expect(sim.view().pools.shipA.armor).toBe(900);
  });

  test("shield bleed-through: no bleed when uniformity is zero (TSM V)", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 100, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0 })));
    sim.step(1, events({ em: 100, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    expect(sim.view().pools.shipA.armor).toBe(1000);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    expect(sim.view().pools.shipA.armor).toBe(900);
  });

  test("shield bleed-through: bleed damage respects armor resist", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 100, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0.5 }, shieldUniformity: 0.25 })));
    sim.step(1, events({ em: 100, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(950);
  });

  test("shield bleed-through: no bleed at exact threshold boundary", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0.25 })));
    sim.step(1, events({ em: 750, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(250);
    expect(sim.view().pools.shipA.armor).toBe(1000);
  });

  test("shield bleed-through: linear midpoint at half threshold", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0.25 })));
    sim.step(1, events({ em: 750, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(250);
    sim.step(1, events({ em: 125, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(125);
    expect(sim.view().pools.shipA.armor).toBe(1000);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const view = sim.view();
    expect(view.pools.shipA.shield).toBe(75);
    expect(view.pools.shipA.armor).toBe(950);
  });

  test("shield bleed-through: combined bleed and shield overflow in one hit", () => {
    const sim = new DefenseSimulatorImpl();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0.25 })));
    sim.step(1, events({ em: 750, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(250);
    sim.step(1, events({ em: 1000, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    expect(sim.view().pools.shipA.armor).toBeLessThan(1000);
  });
});
