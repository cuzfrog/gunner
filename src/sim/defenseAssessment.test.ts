import { DefenseAssessorImpl } from "./defenseAssessment";
import type { DefenseSpec } from "./types";
import { ZERO_DAMAGE } from "./types";

const assessor = new DefenseAssessorImpl();

function makeSpec(opts: { shieldHp?: number; armorHp?: number; hullHp?: number; shieldResistEm?: number; shieldRechargeTime?: number; repairShield?: number; repairCycle?: number }): DefenseSpec {
  return {
    layers: {
      shield: { hp: opts.shieldHp ?? 1000, resists: { em: opts.shieldResistEm ?? 0, thermal: 0, kinetic: 0, explosive: 0 } },
      armor: { hp: opts.armorHp ?? 1000, resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 } },
      hull: { hp: opts.hullHp ?? 1000, resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 } },
    },
    shieldRechargeTime: opts.shieldRechargeTime ?? 100,
    repairers: opts.repairShield !== undefined && opts.repairCycle !== undefined
      ? [{ layer: "shield" as const, amount: opts.repairShield, cycleTime: opts.repairCycle, capacitorNeed: 0, heatDamage: 0, overload: { amountMultiplier: 1, cycleTimeMultiplier: 1 } }]
      : [],
  };
}

describe("DefenseAssessorImpl", () => {
  test("uniform incoming damage distributes EHP evenly across types", () => {
    const spec = makeSpec({ shieldHp: 1000, shieldResistEm: 0.5 });
    const incoming = { em: 100, thermal: 100, kinetic: 100, explosive: 100 };
    const result = assessor.assess(spec, incoming);
    expect(result.layers.shield.ehp).toBeCloseTo(1000 * 0.25 / 0.5 + 1000 * 0.25 / 1 + 1000 * 0.25 / 1 + 1000 * 0.25 / 1, 2);
  });

  test("single-type EM incoming uses only EM resist for EHP", () => {
    const spec = makeSpec({ shieldHp: 1000, shieldResistEm: 0.5 });
    const incoming = { em: 100, thermal: 0, kinetic: 0, explosive: 0 };
    const result = assessor.assess(spec, incoming);
    expect(result.layers.shield.ehp).toBeCloseTo(2000, 2);
  });

  test("total EHP sums all three layers", () => {
    const spec = makeSpec({ shieldHp: 1000, armorHp: 2000, hullHp: 3000 });
    const result = assessor.assess(spec, { em: 100, thermal: 0, kinetic: 0, explosive: 0 });
    expect(result.totalEhp).toBeCloseTo(6000, 2);
  });

  test("zero incoming damage uses uniform shares", () => {
    const spec = makeSpec({ shieldHp: 1000, shieldResistEm: 0.5 });
    const result = assessor.assess(spec, ZERO_DAMAGE);
    expect(result.layers.shield.ehp).toBeCloseTo(1000 * 0.25 / 0.5 + 1000 * 0.75, 2);
  });

  test("shield regen per second is 2.5 * hp / rechargeTime", () => {
    const spec = makeSpec({ shieldHp: 1000, shieldRechargeTime: 100 });
    const result = assessor.assess(spec, ZERO_DAMAGE);
    expect(result.shieldRegenPerSecond).toBeCloseTo(25, 2);
  });

  test("repair per second is amount / cycleTime", () => {
    const spec = makeSpec({ repairShield: 100, repairCycle: 5 });
    const result = assessor.assess(spec, ZERO_DAMAGE);
    expect(result.repairPerSecond.shield).toBeCloseTo(20, 2);
  });

  test("zero shield recharge time yields zero regen", () => {
    const spec = makeSpec({ shieldHp: 1000, shieldRechargeTime: 0 });
    const result = assessor.assess(spec, ZERO_DAMAGE);
    expect(result.shieldRegenPerSecond).toBe(0);
  });
});
