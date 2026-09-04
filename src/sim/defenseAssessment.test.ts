import { DefenseAssessorImpl } from "./defenseAssessment";
import type { DefenseSpec } from "./types";
import { ZERO_DAMAGE } from "./types";

const assessor = new DefenseAssessorImpl();

function makeSpec(opts: { shieldHp?: number; armorHp?: number; hullHp?: number; shieldResistEm?: number; shieldResistThermal?: number; shieldRechargeTime?: number; repairShield?: number; repairCycle?: number; overloadAmount?: number; overloadCycle?: number }): DefenseSpec {
  return {
    layers: {
      shield: { hp: opts.shieldHp ?? 1000, resists: { em: opts.shieldResistEm ?? 0, thermal: opts.shieldResistThermal ?? 0, kinetic: 0, explosive: 0 } },
      armor: { hp: opts.armorHp ?? 1000, resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 } },
      hull: { hp: opts.hullHp ?? 1000, resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 } },
    },
    shieldRechargeTime: opts.shieldRechargeTime ?? 100,
    repairers: opts.repairShield !== undefined && opts.repairCycle !== undefined
      ? [{ layer: "shield" as const, amount: opts.repairShield, cycleTime: opts.repairCycle, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: opts.overloadAmount ?? 1, cycleTimeMultiplier: opts.overloadCycle ?? 1 } }]
      : [],
    signaturePenalty: 0,
    shieldUniformity: 0.25,
  };
}

describe("DefenseAssessorImpl", () => {
  test("uniform incoming damage distributes EHP evenly across types", () => {
    const spec = makeSpec({ shieldHp: 1000, shieldResistEm: 0.5 });
    const incoming = { em: 100, thermal: 100, kinetic: 100, explosive: 100 };
    const result = assessor.assess(spec, incoming, false);
    expect(result.layers.shield.ehp).toBeCloseTo(1000 / (0.25 * 0.5 + 0.25 * 1 + 0.25 * 1 + 0.25 * 1), 2);
  });

  test("single-type EM incoming uses only EM resist for EHP", () => {
    const spec = makeSpec({ shieldHp: 1000, shieldResistEm: 0.5 });
    const incoming = { em: 100, thermal: 0, kinetic: 0, explosive: 0 };
    const result = assessor.assess(spec, incoming, false);
    expect(result.layers.shield.ehp).toBeCloseTo(2000, 2);
  });

  test("total EHP sums all three layers", () => {
    const spec = makeSpec({ shieldHp: 1000, armorHp: 2000, hullHp: 3000 });
    const result = assessor.assess(spec, { em: 100, thermal: 0, kinetic: 0, explosive: 0 }, false);
    expect(result.totalEhp).toBeCloseTo(6000, 2);
  });

  test("zero incoming damage uses uniform shares", () => {
    const spec = makeSpec({ shieldHp: 1000, shieldResistEm: 0.5 });
    const result = assessor.assess(spec, ZERO_DAMAGE, false);
    expect(result.layers.shield.ehp).toBeCloseTo(1000 / (0.25 * 0.5 + 0.75 * 1), 2);
  });

  test("shield regen per second is 2.5 * hp / rechargeTime", () => {
    const spec = makeSpec({ shieldHp: 1000, shieldRechargeTime: 100 });
    const result = assessor.assess(spec, ZERO_DAMAGE, false);
    expect(result.shieldRegenPerSecond).toBeCloseTo(25, 2);
  });

  test("repair per second is amount / cycleTime", () => {
    const spec = makeSpec({ repairShield: 100, repairCycle: 5 });
    const result = assessor.assess(spec, ZERO_DAMAGE, false);
    expect(result.repairPerSecond.shield).toBeCloseTo(20, 2);
  });

  test("zero shield recharge time yields zero regen", () => {
    const spec = makeSpec({ shieldHp: 1000, shieldRechargeTime: 0 });
    const result = assessor.assess(spec, ZERO_DAMAGE, false);
    expect(result.shieldRegenPerSecond).toBe(0);
  });

  test("overloaded repairer applies overload multipliers to amount and cycleTime", () => {
    const amount = 100;
    const cycleTime = 5;
    const spec = makeSpec({ repairShield: amount, repairCycle: cycleTime, overloadAmount: 1.15, overloadCycle: 0.85 });
    const result = assessor.assess(spec, ZERO_DAMAGE, true);
    expect(result.repairPerSecond.shield).toBeCloseTo((amount * 1.15) / (cycleTime * 0.85), 5);
  });

  test("non-overloaded repairer uses base amount and cycleTime", () => {
    const amount = 100;
    const cycleTime = 5;
    const spec = makeSpec({ repairShield: amount, repairCycle: cycleTime, overloadAmount: 1.15, overloadCycle: 0.85 });
    const result = assessor.assess(spec, ZERO_DAMAGE, false);
    expect(result.repairPerSecond.shield).toBeCloseTo(amount / cycleTime, 5);
  });

  test("non-uniform damage mix EHP uses hp / sum(share * (1 - resist))", () => {
    const spec = makeSpec({ shieldHp: 1000, shieldResistEm: 0, shieldResistThermal: 0.9 });
    const incoming = { em: 50, thermal: 50, kinetic: 0, explosive: 0 };
    const result = assessor.assess(spec, incoming, false);
    expect(result.layers.shield.ehp).toBeCloseTo(1000 / (0.5 * 1.0 + 0.5 * 0.1), 1);
  });
});
