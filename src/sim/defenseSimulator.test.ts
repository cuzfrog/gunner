import { toTypeId } from "../gamedata/ids";
import { DefenseSimulatorImpl, _shiftRahResists } from "./defenseSimulator";
import type { CapacitorGate } from "./capacitorSimulator";
import type { DefenseSimConfig } from "./defenseSimulator";
import { StackingPenaltyImpl } from "./stackingPenalty";
import type { ActiveHardenerSpec, BurstEffectKind, BurstModifiers, DamageEvent, DamageResists, DamageType, DamageVector, DefenseLayer, DefenseSpec, LayerDamage, RahSpec, RepairerSpec, Side } from "./types";
import { IDENTITY_BURST_MODIFIERS } from "./types";
import { ZERO_DAMAGE, ZERO_RESISTS } from "./types";

interface DebitRecord {
  readonly side: Side;
  readonly amount: number;
}

function recordingGate(allow: boolean): { gate: CapacitorGate; debits: DebitRecord[] } {
  const debits: DebitRecord[] = [];
  return { debits, gate: { attemptDebit: (side: Side, amount: number) => { debits.push({ side, amount }); return allow; } } };
}

function totalOf(layer: LayerDamage): number {
  return layer.shield + layer.armor + layer.hull;
}

function deltaTotals(after: LayerDamage, before: LayerDamage): LayerDamage {
  return { shield: after.shield - before.shield, armor: after.armor - before.armor, hull: after.hull - before.hull };
}

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
  hardeners?: readonly ActiveHardenerSpec[];
  baseResists?: Readonly<Record<DefenseLayer, DamageResists>>;
} = {}): DefenseSpec {
  const layers = {
    shield: { hp: opts.shieldHp ?? 1000, resists: { em: opts.shieldResists?.em ?? 0, thermal: opts.shieldResists?.thermal ?? 0, kinetic: opts.shieldResists?.kinetic ?? 0, explosive: opts.shieldResists?.explosive ?? 0 } },
    armor: { hp: opts.armorHp ?? 1000, resists: { em: opts.armorResists?.em ?? 0, thermal: opts.armorResists?.thermal ?? 0, kinetic: opts.armorResists?.kinetic ?? 0, explosive: opts.armorResists?.explosive ?? 0 } },
    hull: { hp: opts.hullHp ?? 1000, resists: { em: opts.hullResists?.em ?? 0, thermal: opts.hullResists?.thermal ?? 0, kinetic: opts.hullResists?.kinetic ?? 0, explosive: opts.hullResists?.explosive ?? 0 } },
  };
  return {
    layers,
    baseResists: opts.baseResists ?? { shield: layers.shield.resists, armor: layers.armor.resists, hull: layers.hull.resists },
    hardeners: opts.hardeners ?? [],
    shieldRechargeTime: opts.shieldRechargeTime ?? 0,
    repairers: opts.repairers ?? [],
    signaturePenalty: 0,
    rah: opts.rah,
    shieldUniformity: opts.shieldUniformity ?? 0.25,
  };
}

function hardener(opts: { moduleId?: string; layer?: DefenseLayer; em?: number; thermal?: number; kinetic?: number; explosive?: number; capacitorNeed?: number; cycleTime?: number; overloadBonusMultiplier?: number }): ActiveHardenerSpec {
  return { moduleId: toTypeId(opts.moduleId ?? "9001"), layer: opts.layer ?? "shield", resistBonus: { em: opts.em ?? 0, thermal: opts.thermal ?? 0, kinetic: opts.kinetic ?? 0, explosive: opts.explosive ?? 0 }, overloadBonusMultiplier: opts.overloadBonusMultiplier ?? 1.2, capacitorNeed: opts.capacitorNeed ?? 20, cycleTime: opts.cycleTime ?? 10 };
}

interface GateOptions {
  readonly allow: () => boolean;
}

function gatedDebits(record: DebitRecord[], options?: GateOptions): CapacitorGate {
  return { attemptDebit: (side: Side, amount: number) => {
    if (options && !options.allow()) return false;
    record.push({ side, amount });
    return true;
  } };
}

function config(shipA: DefenseSpec, shipB?: DefenseSpec, damageEnabled?: { shipA: boolean; shipB: boolean }, opts: { overloaded?: Record<Side, boolean>; rahActivation?: Record<Side, { active: boolean; overloaded: boolean } | undefined> } = {}): DefenseSimConfig {
  return {
    shipA,
    shipB: shipB ?? spec(),
    damageEnabled: damageEnabled ?? { shipA: true, shipB: true },
    repairMode: { shipA: "auto", shipB: "auto" },
    repairerActivation: { shipA: [], shipB: [] },
    rahActivation: opts.rahActivation ?? { shipA: undefined, shipB: undefined },
    overloaded: opts.overloaded ?? { shipA: false, shipB: false },
  };
}

function newSim(): DefenseSimulatorImpl {
  return new DefenseSimulatorImpl({ stackingPenalty: new StackingPenaltyImpl() });
}

const ZERO_EVENTS: readonly DamageEvent[] = events(ZERO_DAMAGE, ZERO_DAMAGE);
const EM_DAMAGE: DamageVector = { em: 100, thermal: 0, kinetic: 0, explosive: 0 };
const MIXED_DAMAGE: DamageVector = { em: 50, thermal: 50, kinetic: 0, explosive: 0 };

const RAH_SPEC: RahSpec = { cycleTime: 10, shiftAmount: 0.06, baseResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 }, overloadCycleTimeMultiplier: 1 };

function rahState(resists: DamageResists, damage: DamageVector): { resists: { em: number; thermal: number; kinetic: number; explosive: number }; cycleTimer: number; inCycle: boolean; active: boolean; overloaded: boolean; starved: boolean; armorDamageAccumulator: { em: number; thermal: number; kinetic: number; explosive: number } } {
  return { resists: { ...resists }, cycleTimer: 0, inCycle: true, active: true, overloaded: false, starved: false, armorDamageAccumulator: { ...damage } };
}

function burstSides(overrides: Partial<Record<BurstEffectKind, number>> = {}): Record<Side, BurstModifiers> {
  return { shipA: { ...IDENTITY_BURST_MODIFIERS, ...overrides }, shipB: IDENTITY_BURST_MODIFIERS };
}

describe("DefenseSimulatorImpl", () => {
  test("reset initializes pools to spec max HP", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 500, armorHp: 300, hullHp: 200 })));
    const view = sim.view();
    expect(view.pools.shipA).toEqual({ shield: 500, armor: 300, hull: 200 });
    expect(view.pools.shipB).toEqual({ shield: 1000, armor: 1000, hull: 1000 });
    expect(view.dead.shipA).toBe(false);
    expect(view.deadAt.shipA).toBeUndefined();
  });

  test("layer overflow with mixed-type damage: shield depleted, armor takes overflow, hull takes final overflow", () => {
    const sim = newSim();
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
    const sim = newSim();
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
    const sim = newSim();
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
    const sim = newSim();
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
    const sim = newSim();
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
    const sim = newSim();
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

  test("reset after death restores full HP and clears dead", () => {
    const sim = newSim();
    const defense = spec({
      shieldHp: 500,
      armorHp: 300,
      hullHp: 100,
      hullResists: { em: 0 },
    });
    sim.reset(config(defense));
    sim.step(1, events({ em: 2000, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().dead.shipA).toBe(true);
    sim.reset(config(defense));
    const view = sim.view();
    expect(view.dead.shipA).toBe(false);
    expect(view.pools.shipA).toEqual({ shield: 500, armor: 300, hull: 100 });
    expect(view.poolPercentages.shipA).toEqual({ shield: 1, armor: 1, hull: 1 });
  });

  test("zero-HP spec (no fitting) does not trigger death", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 0, armorHp: 0, hullHp: 0 })));
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    const view = sim.view();
    expect(view.dead.shipA).toBe(false);
    expect(view.dead.shipB).toBe(false);
    expect(view.deadAt.shipA).toBeUndefined();
    expect(view.poolPercentages.shipA).toEqual({ shield: 1, armor: 1, hull: 1 });
  });

  test("damage-disable: damage not applied, pools stay full", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 500, armorHp: 500, hullHp: 500 }), undefined, { shipA: false, shipB: true }));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const view = sim.view();
    expect(view.pools.shipA.shield).toBe(500);
    expect(view.pools.shipA.armor).toBe(500);
    expect(view.pools.shipA.hull).toBe(500);
    expect(view.damageEnabled.shipA).toBe(false);
  });

  test("damage-disable: no regen when disabled, pools stay at max", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 100 }), undefined, { shipA: false, shipB: true }));
    // Even with regen time set, pools stay at max when disabled
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(1000);
  });

  test("update preserves pool state while updating maxes and resists from new spec", () => {
    const sim = newSim();
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
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 0, armorHp: 0, hullHp: 0 })));
    expect(sim.view().pools.shipA).toEqual({ shield: 0, armor: 0, hull: 0 });
    sim.update(config(spec({ shieldHp: 1000, armorHp: 800, hullHp: 600 })));
    const view = sim.view();
    expect(view.pools.shipA).toEqual({ shield: 1000, armor: 800, hull: 600 });
    expect(view.poolPercentages.shipA).toEqual({ shield: 1, armor: 1, hull: 1 });
  });

  test("update preserves dead state", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 0, armorHp: 0, hullHp: 100, hullResists: { em: 0 } })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().dead.shipA).toBe(true);
    sim.update(config(spec({ shieldHp: 500, armorHp: 300, hullHp: 200 })));
    expect(sim.view().dead.shipA).toBe(true);
  });

  test("update preserves repairer cycle progress", () => {
    const sim = newSim();
    const repairSpec = spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, armorResists: { em: 0 }, repairers: [{ layer: "armor", amount: 100, cycleTime: 4, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().repairers.shipA[0].cycling).toBe(true);
    expect(sim.view().repairers.shipA[0].cycleProgress).toBeGreaterThan(0);
    sim.update(config(repairSpec));
    expect(sim.view().repairers.shipA[0].cycling).toBe(true);
    expect(sim.view().repairers.shipA[0].cycleProgress).toBeGreaterThan(0);
  });

  test("repairer debits capacitorNeed at cycle start", () => {
    const sim = newSim();
    const repairSpec = spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, armorResists: { em: 0 }, repairers: [{ layer: "armor", amount: 100, cycleTime: 4, capacitorNeed: 320, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    const { gate, debits } = recordingGate(true);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), gate);
    expect(sim.view().repairers.shipA[0].cycling).toBe(true);
    expect(debits).toEqual([{ side: "shipA", amount: 320 }]);
  });

  test("starved repairer does not cycle until the gate allows it", () => {
    const sim = newSim();
    const repairSpec = spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, armorResists: { em: 0 }, repairers: [{ layer: "armor", amount: 100, cycleTime: 4, capacitorNeed: 320, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    const allow: { value: boolean } = { value: false };
    const gate: CapacitorGate = { attemptDebit: () => allow.value };
    sim.step(2, events(EM_DAMAGE, ZERO_DAMAGE), gate);
    expect(sim.view().repairers.shipA[0].cycling).toBe(false);
    expect(sim.view().repairers.shipA[0].starved).toBe(true);
    expect(sim.view().pools.shipA.armor).toBe(900); // damage applied, no repair
    allow.value = true;
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE), gate);
    expect(sim.view().repairers.shipA[0].cycling).toBe(true);
    expect(sim.view().repairers.shipA[0].starved).toBe(false);
    expect(sim.view().pools.shipA.armor).toBe(900); // armor heal lands at cycle end
  });

  test("active rah debits capacitorNeed per cycle", () => {
    const sim = newSim();
    const rahSpec: RahSpec = { cycleTime: 9, shiftAmount: 0.3, baseResists: { em: 0.5, thermal: 0.5, kinetic: 0.5, explosive: 0.5 }, overloadCycleTimeMultiplier: 1, capacitorNeed: 42 };
    sim.reset({ ...config(spec({ armorHp: 1000, rah: rahSpec })), rahActivation: { shipA: { active: true, overloaded: false }, shipB: undefined } });
    const { gate, debits } = recordingGate(true);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), gate);
    expect(debits).toEqual([{ side: "shipA", amount: 42 }]);
  });

  test("rah view flags starved while the activation debit is denied and clears when it succeeds", () => {
    const sim = newSim();
    const rahSpec: RahSpec = { cycleTime: 9, shiftAmount: 0.3, baseResists: { em: 0.5, thermal: 0.5, kinetic: 0.5, explosive: 0.5 }, overloadCycleTimeMultiplier: 1, capacitorNeed: 42 };
    sim.reset({ ...config(spec({ armorHp: 1000, rah: rahSpec })), rahActivation: { shipA: { active: true, overloaded: false }, shipB: undefined } } as never);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), recordingGate(false).gate);
    expect(sim.view().rah.shipA?.starved).toBe(true);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), recordingGate(true).gate);
    expect(sim.view().rah.shipA?.starved).toBe(false);
  });

  test("deactivated rah is never flagged starved", () => {
    const sim = newSim();
    const rahSpec: RahSpec = { cycleTime: 9, shiftAmount: 0.3, baseResists: { em: 0.5, thermal: 0.5, kinetic: 0.5, explosive: 0.5 }, overloadCycleTimeMultiplier: 1, capacitorNeed: 42 };
    sim.reset({ ...config(spec({ armorHp: 1000, rah: rahSpec })), rahActivation: { shipA: { active: false, overloaded: false }, shipB: undefined } } as never);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), recordingGate(false).gate);
    expect(sim.view().rah.shipA?.starved).toBe(false);
  });

  test("repairers without capacitorNeed cycle without debiting", () => {
    const sim = newSim();
    const repairSpec = spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, armorResists: { em: 0 }, repairers: [{ layer: "armor", amount: 100, cycleTime: 4, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    const { gate, debits } = recordingGate(true);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), gate);
    expect(sim.view().repairers.shipA[0].cycling).toBe(true);
    expect(debits).toHaveLength(0);
  });

  test("update clamps pool to new max when spec max decreases", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000 })));
    sim.update(config(spec({ shieldHp: 500, armorHp: 300, hullHp: 200 })));
    const view = sim.view();
    expect(view.pools.shipA.shield).toBe(500);
    expect(view.pools.shipA.armor).toBe(300);
    expect(view.pools.shipA.hull).toBe(200);
  });

  test("shield regen does not exceed max", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 100 })));
    sim.step(10, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(1000);
  });

  test("no regen when shieldRechargeTime is 0", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 500, shieldRechargeTime: 0 })));
    // Damage shield slightly
    sim.step(1, events({ em: 100, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(400);
    // No regen
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(400);
  });

  test("shieldRegenPerSecond in view reflects current shield level", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 100 })));
    // At full shield, regen rate is 0
    expect(sim.view().shieldRegenPerSecond.shipA).toBe(0);
    // Drain to 25%
    sim.step(1, events({ em: 750, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    const rate = sim.view().shieldRegenPerSecond.shipA;
    expect(rate).toBeCloseTo(25, 1);
  });

  test("poolPercentages reflect current pool levels", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 500, hullHp: 200 })));
    sim.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    const pct = sim.view().poolPercentages.shipA;
    expect(pct.shield).toBe(0.5);
    expect(pct.armor).toBe(1);
    expect(pct.hull).toBe(1);
  });

  test("shield booster heals at cycle start", () => {
    const sim = newSim();
    const repairSpec = spec({ shieldHp: 1000, shieldRechargeTime: 0, repairers: [{ layer: "shield", amount: 100, cycleTime: 2, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    sim.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(600);
    const repairers = sim.view().repairers.shipA;
    expect(repairers).toHaveLength(1);
    expect(repairers[0].cycling).toBe(true);
  });

  test("armor repairer heals at cycle end", () => {
    const sim = newSim();
    const repairSpec = spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, armorResists: { em: 0 }, repairers: [{ layer: "armor", amount: 100, cycleTime: 2, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(900);
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(1000);
  });

  test("ancillary repairer depletes charges then reloads", () => {
    const sim = newSim();
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
    const sim = newSim();
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
    const sim = newSim();
    const repairSpec = spec({ shieldHp: 1000, shieldRechargeTime: 0, repairers: [{ layer: "shield", amount: 100, cycleTime: 1, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(1000);
    expect(sim.view().repairers.shipA[0].cycling).toBe(false);
  });

  test("manual mode activates only when module is active", () => {
    const sim = newSim();
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
    sim.update({ ...config(repairSpec), repairerActivation: { shipA: [{ active: true, overloaded: true }], shipB: [] } });
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(600);
  });

  test("update to manual repair mode does not reset pools", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000 })));
    sim.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(500);
    sim.update({ ...config(spec({ shieldHp: 1000 })), repairMode: { shipA: "manual", shipB: "auto" } });
    expect(sim.view().pools.shipA.shield).toBe(500);
    expect(sim.view().repairMode.shipA).toBe("manual");
  });

  test("update applies repairer activation without resetting pools", () => {
    const sim = newSim();
    const repairSpec = spec({ shieldHp: 1000, shieldRechargeTime: 0, repairers: [{ layer: "shield", amount: 100, cycleTime: 5, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    sim.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(600);
    sim.update({ ...config(repairSpec), repairerActivation: { shipA: [{ active: false, overloaded: false }], shipB: [] } });
    expect(sim.view().pools.shipA.shield).toBe(600);
    expect(sim.view().repairers.shipA[0].active).toBe(false);
  });

  test("RAH converges toward 60/0/0/0 under EM-only damage", () => {
    const sim = newSim();
    const rahSpec = spec({ shieldHp: 0, armorHp: 10000, hullHp: 10000, armorResists: { em: 0 }, rah: {
      cycleTime: 1, shiftAmount: 0.06, baseResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 },
      overloadCycleTimeMultiplier: 1,
    } });
    sim.reset(config(rahSpec));
    for (let i = 0; i < 50; i++) {
      sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    }
    const rah = sim.view().rah.shipA;
    expect(rah).toBeDefined();
    expect(rah?.resists.em).toBeCloseTo(0.6, 5);
    expect(rah?.resists.thermal).toBeCloseTo(0, 5);
    expect(rah?.resists.kinetic).toBeCloseTo(0, 5);
    expect(rah?.resists.explosive).toBeCloseTo(0, 5);
  });

  test("RAH converges toward 30/30/0/0 under EM+thermal damage", () => {
    const sim = newSim();
    const rahSpec = spec({ shieldHp: 0, armorHp: 10000, hullHp: 10000, armorResists: { em: 0, thermal: 0 }, rah: {
      cycleTime: 1, shiftAmount: 0.06, baseResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 },
      overloadCycleTimeMultiplier: 1,
    } });
    sim.reset(config(rahSpec));
    for (let i = 0; i < 50; i++) {
      sim.step(1, events(MIXED_DAMAGE, ZERO_DAMAGE));
    }
    const rah = sim.view().rah.shipA;
    expect(rah).toBeDefined();
    expect(rah?.resists.em).toBeCloseTo(0.3, 5);
    expect(rah?.resists.thermal).toBeCloseTo(0.3, 5);
    expect(rah?.resists.kinetic).toBeCloseTo(0, 5);
    expect(rah?.resists.explosive).toBeCloseTo(0, 5);
  });

  test("RAH resets to 15/15/15/15 on deactivation and reactivation", () => {
    const sim = newSim();
    const rahSpec = spec({ shieldHp: 0, armorHp: 10000, hullHp: 10000, armorResists: { em: 0 }, rah: {
      cycleTime: 1, shiftAmount: 0.06, baseResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 },
      overloadCycleTimeMultiplier: 1,
    } });
    sim.reset(config(rahSpec));
    for (let i = 0; i < 20; i++) {
      sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    }
    const rahBefore = sim.view().rah.shipA;
    expect(rahBefore?.resists.em).toBeGreaterThan(0.3);
    sim.update({ ...config(rahSpec), rahActivation: { shipA: { active: false, overloaded: false }, shipB: undefined } });
    expect(sim.view().rah.shipA?.active).toBe(false);
    sim.update({ ...config(rahSpec), rahActivation: { shipA: { active: true, overloaded: true }, shipB: undefined } });
    const rahAfter = sim.view().rah.shipA;
    expect(rahAfter?.resists.em).toBeCloseTo(0.15, 5);
    expect(rahAfter?.resists.thermal).toBeCloseTo(0.15, 5);
    expect(rahAfter?.resists.kinetic).toBeCloseTo(0.15, 5);
    expect(rahAfter?.resists.explosive).toBeCloseTo(0.15, 5);
  });

  test("shiftRahResists is a no-op when no damage was taken during the cycle", () => {
    const rah = rahState({ em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 }, { em: 0, thermal: 0, kinetic: 0, explosive: 0 });
    _shiftRahResists(rah, RAH_SPEC);
    expect(rah.resists).toEqual({ em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 });
  });

  test("one damaged type takes six percent from each of the other three resistances", () => {
    const rah = rahState({ em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 }, { em: 100, thermal: 0, kinetic: 0, explosive: 0 });
    _shiftRahResists(rah, RAH_SPEC);
    expect(rah.resists.em).toBeCloseTo(0.33, 8);
    expect(rah.resists.thermal).toBeCloseTo(0.09, 8);
    expect(rah.resists.kinetic).toBeCloseTo(0.09, 8);
    expect(rah.resists.explosive).toBeCloseTo(0.09, 8);
  });

  test("one damaged type drains only what remains from the other three", () => {
    const rah = rahState({ em: 0.51, thermal: 0.03, kinetic: 0.03, explosive: 0.03 }, { em: 100, thermal: 0, kinetic: 0, explosive: 0 });
    _shiftRahResists(rah, RAH_SPEC);
    expect(rah.resists.em).toBeCloseTo(0.6, 8);
    expect(rah.resists.thermal).toBeCloseTo(0, 8);
    expect(rah.resists.kinetic).toBeCloseTo(0, 8);
    expect(rah.resists.explosive).toBeCloseTo(0, 8);
  });

  test("two damaged types drain the two undamaged resistances into both of them evenly", () => {
    const rah = rahState({ em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 }, { em: 100, thermal: 50, kinetic: 0, explosive: 0 });
    _shiftRahResists(rah, RAH_SPEC);
    expect(rah.resists.em).toBeCloseTo(0.21, 8);
    expect(rah.resists.thermal).toBeCloseTo(0.21, 8);
    expect(rah.resists.kinetic).toBeCloseTo(0.09, 8);
    expect(rah.resists.explosive).toBeCloseTo(0.09, 8);
  });

  test("two damaged types drain only what remains from the undamaged resistances", () => {
    const rah = rahState({ em: 0.27, thermal: 0.27, kinetic: 0.03, explosive: 0.03 }, { em: 100, thermal: 50, kinetic: 0, explosive: 0 });
    _shiftRahResists(rah, RAH_SPEC);
    expect(rah.resists.em).toBeCloseTo(0.3, 8);
    expect(rah.resists.thermal).toBeCloseTo(0.3, 8);
    expect(rah.resists.kinetic).toBeCloseTo(0, 8);
    expect(rah.resists.explosive).toBeCloseTo(0, 8);
  });

  test("ties among damaged types take from em, explosive, kinetic, thermal in that order", () => {
    const rah = rahState({ em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 }, { em: 0, thermal: 100, kinetic: 100, explosive: 100 });
    _shiftRahResists(rah, RAH_SPEC);
    expect(rah.resists.em).toBeCloseTo(0.09, 8);
    expect(rah.resists.explosive).toBeCloseTo(0.09, 8);
    expect(rah.resists.kinetic).toBeCloseTo(0.21, 8);
    expect(rah.resists.thermal).toBeCloseTo(0.21, 8);
  });

  test("update deactivating rah does not reset pools", () => {
    const sim = newSim();
    const rahSpec = spec({ shieldHp: 1000, rah: {
      cycleTime: 1, shiftAmount: 0.06, baseResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 },
      overloadCycleTimeMultiplier: 1,
    } });
    sim.reset(config(rahSpec));
    sim.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(500);
    sim.update({ ...config(rahSpec), rahActivation: { shipA: { active: false, overloaded: false }, shipB: undefined } });
    expect(sim.view().pools.shipA.shield).toBe(500);
  });

  test("view includes repairer and rah state", () => {
    const sim = newSim();
    const repairSpec = spec({ shieldHp: 1000, repairers: [{ layer: "shield", amount: 100, cycleTime: 2, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1.2, cycleTimeMultiplier: 0.9 } }], rah: {
      cycleTime: 5, shiftAmount: 0.06, baseResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 },
      overloadCycleTimeMultiplier: 0.85,
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
    const sim = newSim();
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
    const sim = newSim();
    const repairSpec = spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, armorResists: { em: 0 }, repairers: [{ layer: "armor", amount: 100, cycleTime: 4, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(900);
    expect(sim.view().repairers.shipA[0].cycling).toBe(true);
  });

  test("tick buffer: events before 1s boundary are not applied until boundary", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(0.5, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(1000);
    sim.step(0.5, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(800);
  });

  test("flushPendingDamage applies buffered events immediately and drains the buffer", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(0.5, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(1000);
    sim.flushPendingDamage();
    expect(sim.view().pools.shipA.shield).toBe(900);
    expect(sim.inflictedTotals().shipA.shield).toBe(100);
    sim.step(0.5, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(900);
  });

  test("tick buffer: multiple events in one tick are applied together", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(1, [
      { target: "shipA", source: "shipB", weaponIndex: 0, kind: "turret", rawByType: { em: 50, thermal: 0, kinetic: 0, explosive: 0 } },
      { target: "shipA", source: "shipB", weaponIndex: 0, kind: "turret", rawByType: { em: 50, thermal: 0, kinetic: 0, explosive: 0 } },
    ]);
    expect(sim.view().pools.shipA.shield).toBe(900);
  });

  test("tick buffer: events crossing multiple boundaries apply at first boundary", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(2.5, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(900);
  });

  test("tick buffer: events from multiple frames accumulate before boundary", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(0.3, events({ em: 50, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    sim.step(0.3, events({ em: 50, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    sim.step(0.3, events({ em: 50, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    sim.step(0.3, events({ em: 50, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(800);
  });

  test("tick buffer: reset clears buffer and resets boundary", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(0.5, events(EM_DAMAGE, ZERO_DAMAGE));
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(0.5, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(1000);
    sim.step(0.5, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(900);
  });

  test("tick buffer: both sides receive events at the same boundary", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 }), spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(1, events(EM_DAMAGE, EM_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(900);
    expect(sim.view().pools.shipB.shield).toBe(900);
  });

  test("tick buffer: shield regen applies continuously between boundaries", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 100 })));
    sim.step(1, events({ em: 750, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(250);
    const shieldAfterDamage = sim.view().pools.shipA.shield;
    sim.step(0.5, events(ZERO_DAMAGE, ZERO_DAMAGE));
    const shieldAfterRegen = sim.view().pools.shipA.shield;
    expect(shieldAfterRegen).toBeGreaterThan(shieldAfterDamage);
  });

  test("tick buffer: update preserves pending events in buffer", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(0.5, events(EM_DAMAGE, ZERO_DAMAGE));
    sim.update(config(spec({ shieldHp: 1000, shieldRechargeTime: 0 })));
    sim.step(0.5, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(900);
  });

  test("tick buffer: nextTickBoundary advances correctly after multi-boundary step", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 10000, shieldRechargeTime: 0 })));
    sim.step(2.5, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(9900);
    sim.step(0.5, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(9800);
  });

  test("shield bleed-through: no bleed when shield above uniformity threshold", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0.25 })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(900);
    expect(sim.view().pools.shipA.armor).toBe(1000);
  });

  test("shield bleed-through: bleed occurs when shield below uniformity threshold", () => {
    const sim = newSim();
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
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 100, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0.25 })));
    sim.step(1, events({ em: 100, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    expect(sim.view().pools.shipA.armor).toBe(1000);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    expect(sim.view().pools.shipA.armor).toBe(900);
  });

  test("shield bleed-through: no bleed when uniformity is zero (TSM V)", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 100, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0 })));
    sim.step(1, events({ em: 100, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    expect(sim.view().pools.shipA.armor).toBe(1000);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    expect(sim.view().pools.shipA.armor).toBe(900);
  });

  test("shield bleed-through: bleed damage respects armor resist", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 100, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0.5 }, shieldUniformity: 0.25 })));
    sim.step(1, events({ em: 100, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(950);
  });

  test("shield bleed-through: no bleed at exact threshold boundary", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0.25 })));
    sim.step(1, events({ em: 750, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(250);
    expect(sim.view().pools.shipA.armor).toBe(1000);
  });

  test("shield bleed-through: linear midpoint at half threshold", () => {
    const sim = newSim();
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
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0.25 })));
    sim.step(1, events({ em: 750, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(250);
    sim.step(1, events({ em: 1000, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    expect(sim.view().pools.shipA.armor).toBeLessThan(1000);
  });

  test("inflicted meter: full HP, 0% resists, 100 EM DPS for 1s => 100 shield lost, 0 armor, 0 hull", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, hullResists: { em: 0 } })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.shield).toBe(100);
    expect(inflicted.armor).toBe(0);
    expect(inflicted.hull).toBe(0);
    expect(totalOf(inflicted)).toBe(100);
  });

  test("inflicted meter: reading the view does not mutate live state", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 } })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const poolsBefore = sim.view().pools.shipA;
    const readout = sim.inflictedTotals().shipA;
    expect(totalOf(readout)).toBe(100);
    expect(sim.view().pools.shipA).toEqual(poolsBefore);
  });

  test("inflicted meter: nearly depleted shield splits damage across shield and armor", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0.25 })));
    sim.step(1, events({ em: 985, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(15);
    const before = sim.inflictedTotals().shipA;
    sim.step(1, events({ em: 200, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.shield - before.shield).toBe(12);
    expect(inflicted.armor - before.armor).toBe(188);
    expect(totalOf(inflicted) - totalOf(before)).toBe(200);
  });

  test("inflicted meter: 50% shield resist halves shield damage", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0.5 } })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.shield).toBe(50);
    expect(totalOf(inflicted)).toBe(50);
  });

  test("inflicted meter: dead ship takes no damage", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 0, armorHp: 0, hullHp: 100, hullResists: { em: 0 } })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().dead.shipA).toBe(true);
    expect(totalOf(sim.inflictedTotals().shipA)).toBe(100);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(totalOf(sim.inflictedTotals().shipA)).toBe(100);
  });

  test("inflicted meter: damage disabled refills pools, no HP lost", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000 }), spec(), { shipA: false, shipB: true }));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(totalOf(sim.inflictedTotals().shipA)).toBe(0);
  });

  test("inflicted meter: zero incoming => zero HP lost", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000 })));
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(totalOf(sim.inflictedTotals().shipA)).toBe(0);
    expect(totalOf(sim.inflictedTotals().shipB)).toBe(0);
  });

  test("inflicted meter: both sides receive damage independently", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, shieldResists: { em: 0 } }), spec({ shieldHp: 500, shieldResists: { em: 0 } })));
    sim.step(1, events(EM_DAMAGE, { em: 200, thermal: 0, kinetic: 0, explosive: 0 }));
    expect(sim.inflictedTotals().shipA.shield).toBe(100);
    expect(sim.inflictedTotals().shipB.shield).toBe(200);
  });

  test("inflicted meter: shield regen does not reduce inflicted damage", () => {
    const withRegen = newSim();
    withRegen.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, shieldRechargeTime: 1000 })));
    const withoutRegen = newSim();
    withoutRegen.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, shieldRechargeTime: 0 })));
    withRegen.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    withoutRegen.step(1, events({ em: 500, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(withRegen.inflictedTotals().shipA.shield).toBe(500);
    expect(withoutRegen.inflictedTotals().shipA.shield).toBe(500);
  });

  test("inflicted meter: shield regen shifts the layer split toward shield", () => {
    const withRegenSim = newSim();
    withRegenSim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldRechargeTime: 100, shieldUniformity: 0.25 })));
    const withoutRegenSim = newSim();
    withoutRegenSim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldRechargeTime: 0, shieldUniformity: 0.25 })));
    withRegenSim.step(1, events({ em: 760, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    withoutRegenSim.step(1, events({ em: 760, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(withRegenSim.view().pools.shipA.shield).toBe(240);
    withRegenSim.step(1, events({ em: 50, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    withoutRegenSim.step(1, events({ em: 50, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    const withRegen = withRegenSim.inflictedTotals().shipA;
    const withoutRegen = withoutRegenSim.inflictedTotals().shipA;
    expect(withoutRegen.armor).toBeGreaterThan(0);
    expect(withRegen.armor).toBe(0);
    expect(withRegen.shield).toBeGreaterThan(withoutRegen.shield);
    expect(totalOf(withRegen)).toBe(totalOf(withoutRegen));
  });

  test("inflicted meter: active armor repairer does not reduce inflicted damage", () => {
    const sim = newSim();
    const repairSpec = spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, armorResists: { em: 0 }, repairers: [{ layer: "armor", amount: 100, cycleTime: 2, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.armor).toBe(100);
    expect(totalOf(inflicted)).toBe(100);
  });

  test("inflicted meter: multi-type damage applies per-type resists", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0.5, thermal: 0.25 } })));
    sim.step(1, events(MIXED_DAMAGE, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.shield).toBeCloseTo(50 * 0.5 + 50 * 0.75, 6);
    expect(totalOf(inflicted)).toBeCloseTo(62.5, 6);
  });

  test("inflicted meter: damage reaches hull when shield and armor are depleted", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 0, armorHp: 0, hullHp: 1000, hullResists: { em: 0 } })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.hull).toBe(100);
    expect(totalOf(inflicted)).toBe(100);
  });

  test("inflicted meter: shield bleed-through applies when shield is below uniformity threshold", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0.25 })));
    sim.step(1, events({ em: 750, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(250);
    sim.step(1, events({ em: 125, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(125);
    const before = sim.inflictedTotals().shipA;
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const inflicted = deltaTotals(sim.inflictedTotals().shipA, before);
    expect(inflicted.shield).toBeLessThan(100);
    expect(inflicted.armor).toBeGreaterThan(0);
    expect(totalOf(inflicted)).toBe(100);
  });

  test("inflicted meter: totals accumulate cumulatively across steps", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 100000, shieldResists: { em: 0 } })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(totalOf(sim.inflictedTotals().shipA)).toBe(100);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(totalOf(sim.inflictedTotals().shipA)).toBe(200);
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(totalOf(sim.inflictedTotals().shipA)).toBe(200);
  });

  test("inflicted meter: same DPS yields different inflicted as target transitions from shield to armor with different resists", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0.5 }, hullResists: { em: 0.7 }, shieldUniformity: 0 })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.inflictedTotals().shipA.shield).toBe(100);
    expect(totalOf(sim.inflictedTotals().shipA)).toBe(100);
    for (let i = 0; i < 9; i++) sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    const beforeArmor = sim.inflictedTotals().shipA;
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const armorPhase = deltaTotals(sim.inflictedTotals().shipA, beforeArmor);
    expect(armorPhase.shield).toBe(0);
    expect(armorPhase.armor).toBe(50);
    expect(totalOf(armorPhase)).toBe(50);
    for (let i = 0; i < 19; i++) sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.armor).toBe(0);
    const beforeHull = sim.inflictedTotals().shipA;
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const hullPhase = deltaTotals(sim.inflictedTotals().shipA, beforeHull);
    expect(hullPhase.shield).toBe(0);
    expect(hullPhase.armor).toBe(0);
    expect(hullPhase.hull).toBeCloseTo(30, 6);
    expect(totalOf(hullPhase)).toBeCloseTo(30, 6);
  });

  test("inflicted meter: inflicted DPS drops when armor resist is higher than shield resist", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 100, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0.7 } })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(totalOf(sim.inflictedTotals().shipA)).toBe(100);
    const before = sim.inflictedTotals().shipA;
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    expect(totalOf(deltaTotals(sim.inflictedTotals().shipA, before))).toBeCloseTo(30, 6);
  });

  test("inflicted meter: depleted shield with non-zero shield resist does not reduce inflicted damage", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0.5 }, armorResists: { em: 0.6 } })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.shield).toBe(0);
    expect(inflicted.armor).toBeCloseTo(40, 6);
    expect(totalOf(inflicted)).toBeCloseTo(40, 6);
  });

  test("inflicted meter: depleted shield with non-zero uniformity still bypasses shield resist entirely", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0.5 }, armorResists: { em: 0 }, shieldUniformity: 0.25 })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.shield).toBe(0);
    expect(inflicted.armor).toBe(100);
    expect(totalOf(inflicted)).toBe(100);
  });

  test("inflicted meter: depleted shield and armor with non-zero resists only applies hull resist", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 0, armorHp: 0, hullHp: 1000, shieldResists: { em: 0.5 }, armorResists: { em: 0.5 }, hullResists: { em: 0.7 } })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.shield).toBe(0);
    expect(inflicted.armor).toBe(0);
    expect(inflicted.hull).toBeCloseTo(30, 6);
    expect(totalOf(inflicted)).toBeCloseTo(30, 6);
  });

  test("inflicted meter: shield bleed-through damage is computed from raw damage, not shield-resisted", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0.5 }, armorResists: { em: 0 }, shieldUniformity: 0.25 })));
    sim.step(1, events({ em: 1600, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(200);
    const fraction = 1 - 200 / (0.25 * 1000);
    const before = sim.inflictedTotals().shipA;
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const inflicted = deltaTotals(sim.inflictedTotals().shipA, before);
    const expectedShield = (1 - fraction) * 100 * (1 - 0.5);
    const expectedArmor = fraction * 100;
    expect(inflicted.shield).toBeCloseTo(expectedShield, 6);
    expect(inflicted.armor).toBeCloseTo(expectedArmor, 6);
    expect(totalOf(inflicted)).toBeCloseTo(expectedShield + expectedArmor, 6);
  });

  test("inflicted meter: mid-hit shield break carries unabsorbed raw damage to armor", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 10, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0.5 }, armorResists: { em: 0 }, shieldUniformity: 0 })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.shield).toBe(10);
    expect(inflicted.armor).toBeCloseTo(80, 6);
    expect(totalOf(inflicted)).toBeCloseTo(90, 6);
  });

  test("inflicted meter: mid-hit armor break carries unabsorbed raw damage to hull", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 0, armorHp: 10, hullHp: 1000, shieldResists: { em: 0.5 }, armorResists: { em: 0.5 }, hullResists: { em: 0 } })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.shield).toBe(0);
    expect(inflicted.armor).toBe(10);
    expect(inflicted.hull).toBeCloseTo(80, 6);
    expect(totalOf(inflicted)).toBeCloseTo(90, 6);
  });

  test("inflicted meter: depleted shield sustained damage applies armor resist once", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0.5 }, armorResists: { em: 0.5 }, shieldRechargeTime: 518, shieldUniformity: 0 })));
    sim.step(1, events({ em: 2000, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    let previous = sim.inflictedTotals().shipA;
    for (let t = 0; t < 20; t++) {
      sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
      const inflicted = deltaTotals(sim.inflictedTotals().shipA, previous);
      previous = sim.inflictedTotals().shipA;
      expect(totalOf(inflicted)).toBeGreaterThan(49);
      expect(totalOf(inflicted)).toBeLessThan(51);
    }
  });

  test("inflicted meter: shield continuity between zero and near-zero shield HP", () => {
    const empty = newSim();
    empty.reset(config(spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0.5 }, armorResists: { em: 0.5 }, shieldUniformity: 0 })));
    const sliver = newSim();
    sliver.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0.5 }, armorResists: { em: 0.5 }, shieldUniformity: 0 })));
    sliver.step(1, events({ em: 1998, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sliver.view().pools.shipA.shield).toBeCloseTo(1, 6);
    const emptyBefore = empty.inflictedTotals().shipA;
    const sliverBefore = sliver.inflictedTotals().shipA;
    empty.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    sliver.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const fromZero = totalOf(deltaTotals(empty.inflictedTotals().shipA, emptyBefore));
    const fromSliver = totalOf(deltaTotals(sliver.inflictedTotals().shipA, sliverBefore));
    expect(Math.abs(fromZero - fromSliver)).toBeLessThan(0.01);
  });

  test("inflicted meter: canonical mid-hit raw consumption", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 100, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0.5 }, armorResists: { em: 0.5 }, shieldUniformity: 0 })));
    sim.step(1, events({ em: 300, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.shield).toBe(100);
    expect(inflicted.armor).toBeCloseTo(50, 6);
    expect(totalOf(inflicted)).toBeCloseTo(150, 6);
  });

  test("shield does not regenerate from empty", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldRechargeTime: 518, shieldUniformity: 0 })));
    sim.step(1, events({ em: 2000, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBe(0);
  });

  test("shield regenerates when above zero", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldRechargeTime: 100, shieldUniformity: 0 })));
    sim.step(1, events({ em: 900, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    const after = sim.view().pools.shipA.shield;
    expect(after).toBeGreaterThan(0);
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(sim.view().pools.shipA.shield).toBeGreaterThan(after);
  });

  test("inflicted meter: multi-type event skips shield depleted by an earlier type", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 10, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0.5, thermal: 0.5 }, armorResists: { em: 0, thermal: 0 }, shieldUniformity: 0 })));
    sim.step(1, events({ em: 100, thermal: 100, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.shield).toBe(10);
    expect(inflicted.armor).toBeCloseTo(80 + 100, 6);
    expect(totalOf(inflicted)).toBeCloseTo(190, 6);
  });

  test("inflicted meter: immune layer absorbs nothing and passes raw damage through", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 500, armorHp: 1000, hullHp: 1000, shieldResists: { em: 1 }, armorResists: { em: 0.5 }, shieldUniformity: 0 })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.shield).toBe(0);
    expect(inflicted.armor).toBeCloseTo(50, 6);
    expect(totalOf(inflicted)).toBeCloseTo(50, 6);
    expect(sim.view().pools.shipA.shield).toBe(500);
  });

  test("inflicted meter: totals accumulate per layer independently", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 10, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0.5 }, armorResists: { em: 0.5 }, hullResists: { em: 0 }, shieldUniformity: 0 })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const inflicted = sim.inflictedTotals().shipA;
    expect(inflicted.shield).toBe(10);
    expect(inflicted.armor).toBe(40);
    expect(inflicted.hull).toBe(0);
  });

  test("inflicted meter: tracks sides independently", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 100000 }), spec({ shieldHp: 100000 })));
    sim.step(1, events(EM_DAMAGE, { em: 40, thermal: 0, kinetic: 0, explosive: 0 }));
    expect(totalOf(sim.inflictedTotals().shipA)).toBeCloseTo(100, 6);
    expect(totalOf(sim.inflictedTotals().shipB)).toBeCloseTo(40, 6);
  });

  test("inflicted meter: survives config update", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 100000 })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    sim.update(config(spec({ shieldHp: 2000 })));
    expect(totalOf(sim.inflictedTotals().shipA)).toBeCloseTo(100, 6);
  });

  test("inflicted meter: reset clears history", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 100000 })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    sim.reset(config(spec({ shieldHp: 100000 })));
    expect(totalOf(sim.inflictedTotals().shipA)).toBe(0);
  });

  test("step: rah accumulates only armor HP actually removed when armor breaks mid-hit", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 0, armorHp: 10, hullHp: 1000, armorResists: { em: 0.5 }, hullResists: { em: 0 }, shieldUniformity: 0, rah: { cycleTime: 1, shiftAmount: 0.06, baseResists: { em: 0.15, thermal: 0.15, kinetic: 0.15, explosive: 0.15 }, overloadCycleTimeMultiplier: 1 } })));
    for (let i = 0; i < 5; i++) {
      sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    }
    const rah = sim.view().rah.shipA;
    expect(rah).toBeDefined();
    expect(rah?.resists.em).toBeCloseTo(0.33, 8);
    expect(rah?.resists.thermal).toBeCloseTo(0.09, 8);
    expect(rah?.resists.kinetic).toBeCloseTo(0.09, 8);
    expect(rah?.resists.explosive).toBeCloseTo(0.09, 8);
  });

  test("capture and restore round-trips pools, inflicted totals, and repairer state into another instance", () => {
    const repairers: readonly RepairerSpec[] = [{ layer: "armor", amount: 100, cycleTime: 2, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }];
    const first = newSim();
    first.reset(config(spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, shieldResists: { em: 0 }, armorResists: { em: 0 }, shieldUniformity: 0.25, repairers })));
    first.step(0.6, events({ em: 300, thermal: 0, kinetic: 0, explosive: 0 }, ZERO_DAMAGE));
    const expectedView = first.view();
    const expectedTotals = first.inflictedTotals();
    const state = first.capture();
    first.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const second = newSim();
    second.restore(state);
    expect(second.view()).toEqual(expectedView);
    expect(second.inflictedTotals()).toEqual(expectedTotals);
  });

  test("restored instance keeps stepping independently of the captured source", () => {
    const first = newSim();
    first.reset(config(spec({ shieldHp: 1000, shieldResists: { em: 0 } })));
    first.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const state = first.capture();
    const second = newSim();
    second.restore(state);
    first.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(first.view().pools.shipA.shield).toBe(800);
    expect(second.view().pools.shipA.shield).toBe(900);
    second.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    expect(second.view().pools.shipA.shield).toBe(800);
  });

  test("capture and restore preserves an in-flight repairer cycle", () => {
    const repairers: readonly RepairerSpec[] = [{ layer: "armor", amount: 100, cycleTime: 2, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }];
    const first = newSim();
    first.reset(config(spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, armorResists: { em: 0 }, repairers })));
    first.step(1, events(EM_DAMAGE, ZERO_DAMAGE));
    const state = first.capture();
    const second = newSim();
    second.restore(state);
    second.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE));
    expect(second.view().pools.shipA.armor).toBe(1000);
    const repairer = second.view().repairers.shipA[0];
    expect(repairer.cycling).toBe(false);
  });

  test("online hardeners pay at activation and their resist applies from the first frame", () => {
    const debits: DebitRecord[] = [];
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 10000, hardeners: [hardener({ moduleId: "2301", em: 0.5 })], baseResists: { shield: ZERO_RESISTS, armor: ZERO_RESISTS, hull: ZERO_RESISTS } })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), gatedDebits(debits));
    expect(sim.view().pools.shipA.shield).toBe(10000 - 50);
    expect(debits).toEqual([{ side: "shipA", amount: 20 }]);
    expect(sim.view().hardeners.shipA[0]).toMatchObject({ moduleId: toTypeId("2301"), online: true, starved: false });
  });

  test("an online hardener renews its debit every cycle", () => {
    const debits: DebitRecord[] = [];
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 10000, hardeners: [hardener({ em: 0.5 })], baseResists: { shield: ZERO_RESISTS, armor: ZERO_RESISTS, hull: ZERO_RESISTS } })));
    for (let i = 0; i < 25; i++) sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE), gatedDebits(debits));
    expect(debits).toEqual([{ side: "shipA", amount: 20 }, { side: "shipA", amount: 20 }, { side: "shipA", amount: 20 }]);
  });

  test("a hardener denied its renewal debit drops offline and loses its resist bonus", () => {
    let allow = true;
    const debits: DebitRecord[] = [];
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 10000, hardeners: [hardener({ em: 0.5 })], baseResists: { shield: ZERO_RESISTS, armor: ZERO_RESISTS, hull: ZERO_RESISTS } })));
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE), gatedDebits(debits, { allow: () => allow }));
    expect(sim.view().hardeners.shipA[0]?.online).toBe(true);
    allow = false;
    for (let i = 0; i < 11; i++) sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), gatedDebits(debits, { allow: () => allow }));
    expect(sim.view().hardeners.shipA[0]).toMatchObject({ online: false, starved: true });
    // Online with resist through the paid cycle (steps 2-10, 50 each), then unresisted after the denied renewal (steps 11-12).
    expect(sim.view().pools.shipA.shield).toBe(10000 - 9 * 50 - 2 * 100);
  });

  test("an offline hardener reactivates and pays when the capacitor recovers", () => {
    let allow = true;
    const debits: DebitRecord[] = [];
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 10000, hardeners: [hardener({ em: 0.5 })], baseResists: { shield: ZERO_RESISTS, armor: ZERO_RESISTS, hull: ZERO_RESISTS } })));
    sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE), gatedDebits(debits, { allow: () => allow }));
    allow = false;
    for (let i = 0; i < 11; i++) sim.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE), gatedDebits(debits, { allow: () => allow }));
    expect(sim.view().hardeners.shipA[0]?.online).toBe(false);
    allow = true;
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), gatedDebits(debits, { allow: () => allow }));
    expect(sim.view().hardeners.shipA[0]).toMatchObject({ online: true, starved: false });
    expect(sim.view().pools.shipA.shield).toBe(10000 - 50);
  });

  test("two online hardeners of the same type stack with penalty", () => {
    const debits: DebitRecord[] = [];
    const stacking = new StackingPenaltyImpl();
    const expectedResist = 1 - stacking.apply([0.5, 0.5]);
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 10000, hardeners: [hardener({ moduleId: "1", em: 0.5 }), hardener({ moduleId: "2", em: 0.5 })], baseResists: { shield: ZERO_RESISTS, armor: ZERO_RESISTS, hull: ZERO_RESISTS } })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), gatedDebits(debits));
    expect(sim.view().pools.shipA.shield).toBeCloseTo(10000 - 100 * (1 - expectedResist), 5);
  });

  test("overloaded hardeners apply the overload bonus to their resists", () => {
    const debits: DebitRecord[] = [];
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 10000, hardeners: [hardener({ em: 0.5, overloadBonusMultiplier: 1.2 })], baseResists: { shield: ZERO_RESISTS, armor: ZERO_RESISTS, hull: ZERO_RESISTS } }), undefined, undefined, { overloaded: { shipA: true, shipB: false } }));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), gatedDebits(debits));
    expect(sim.view().pools.shipA.shield).toBe(10000 - 40);
  });

  test("an active reactive hardener combines with online armor hardeners", () => {
    const debits: DebitRecord[] = [];
    const rah: RahSpec = { cycleTime: 10, shiftAmount: 0.06, baseResists: { em: 0.1, thermal: 0, kinetic: 0, explosive: 0 }, overloadCycleTimeMultiplier: 1 };
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 0, hullHp: 0, armorHp: 10000, hardeners: [hardener({ layer: "armor", em: 0.5 })], baseResists: { shield: ZERO_RESISTS, armor: ZERO_RESISTS, hull: ZERO_RESISTS }, rah }), undefined, undefined, { rahActivation: { shipA: { active: true, overloaded: true }, shipB: undefined } }));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), gatedDebits(debits));
    const armorResist = 1 - (1 - 0) * 0.5;
    const combined = 1 - (1 - armorResist) * (1 - 0.1);
    expect(sim.view().pools.shipA.armor).toBeCloseTo(10000 - 100 * (1 - combined), 5);
  });

  test("capture and restore preserves hardener cycle timers and online state", () => {
    const debits: DebitRecord[] = [];
    const first = newSim();
    first.reset(config(spec({ shieldHp: 10000, hardeners: [hardener({ em: 0.5 })], baseResists: { shield: ZERO_RESISTS, armor: ZERO_RESISTS, hull: ZERO_RESISTS } })));
    for (let i = 0; i < 7; i++) first.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE), gatedDebits(debits));
    const second = newSim();
    second.restore(first.capture());
    for (let i = 0; i < 5; i++) first.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE), gatedDebits(debits));
    for (let i = 0; i < 5; i++) second.step(1, events(ZERO_DAMAGE, ZERO_DAMAGE), gatedDebits(debits));
    expect(debits).toEqual([{ side: "shipA", amount: 20 }, { side: "shipA", amount: 20 }, { side: "shipA", amount: 20 }]);
    expect(second.view().hardeners.shipA[0]?.online).toBe(true);
  });
});

describe("command burst modifiers", () => {
  test("armor resonance burst raises the applied armor resist", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 0, hullHp: 0, armorHp: 10000 })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), undefined, burstSides({ armorResonance: 0.92 }));
    expect(sim.view().pools.shipA.armor).toBeCloseTo(9908, 6);
  });

  test("burst resonance stacks with hardeners under the stacking penalty", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 0, hullHp: 0, armorHp: 10000, hardeners: [hardener({ layer: "armor", em: 0.5 })] })));
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), undefined, burstSides({ armorResonance: 0.92 }));
    const stacked = new StackingPenaltyImpl().apply([0.5, 0.92]);
    expect(sim.view().pools.shipA.armor).toBeCloseTo(10000 - 100 * stacked, 6);
  });

  test("shield hp burst inflates the effective pool max and clamps the pool on expiry", () => {
    const sim = newSim();
    sim.reset(config(spec({ shieldHp: 1000, armorHp: 0, hullHp: 0, shieldRechargeTime: 100 })));
    sim.step(60, ZERO_EVENTS, undefined, burstSides({ shieldHp: 1.08 }));
    expect(sim.view().poolMaxes.shipA.shield).toBeCloseTo(1080, 6);
    expect(sim.view().pools.shipA.shield).toBeGreaterThan(1000);
    sim.step(1, ZERO_EVENTS);
    expect(sim.view().poolMaxes.shipA.shield).toBeCloseTo(1000, 6);
    expect(sim.view().pools.shipA.shield).toBeCloseTo(1000, 6);
  });

  test("armor repair burst shortens the cycle and reduces the debit", () => {
    const sim = newSim();
    const repairSpec = spec({ shieldHp: 0, armorHp: 1000, hullHp: 1000, armorResists: { em: 0 }, repairers: [{ layer: "armor", amount: 100, cycleTime: 4, capacitorNeed: 320, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }] });
    sim.reset(config(repairSpec));
    const { gate, debits } = recordingGate(true);
    sim.step(1, events(EM_DAMAGE, ZERO_DAMAGE), gate, burstSides({ armorRepair: 0.92 }));
    expect(debits).toEqual([{ side: "shipA", amount: 320 * 0.92 }]);
    sim.step(8.2, ZERO_EVENTS, gate, burstSides({ armorRepair: 0.92 }));
    expect(sim.view().pools.shipA.armor).toBeCloseTo(1000, 6);
  });

  test("shield repair burst shortens only shield repairer cycles", () => {
    const sim = newSim();
    const repairSpec = spec({ shieldHp: 1000, armorHp: 1000, hullHp: 1000, repairers: [
      { layer: "shield", amount: 100, cycleTime: 4, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } },
      { layer: "armor", amount: 100, cycleTime: 4, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } },
    ] });
    const burstedConfig = { ...config(repairSpec), repairMode: { shipA: "manual" as const, shipB: "auto" as const } };
    sim.reset(burstedConfig);
    sim.step(3.5, ZERO_EVENTS, undefined, burstSides({ shieldRepair: 0.92 }));
    const views = sim.view().repairers.shipA;
    expect(views[0].cycleProgress).toBeCloseTo(3.5 / (4 * 0.92), 6);
    expect(views[1].cycleProgress).toBeCloseTo(3.5 / 4, 6);
  });
});
