import { describe, expect, test } from "bun:test";
import { buildBurstChargeStats, buildCommandBurstStats } from "./buildCommandBurstStats";
import { BURST_CHARGE_GROUPS, COMMAND_BURST_GROUP } from "./combatAttributes";
import { toTypeId } from "../../src/gamedata/ids";

function values(entries: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(entries));
}

describe("buildCommandBurstStats", () => {
  test("builds armor command burst stats from SDE attributes", () => {
    const result = buildCommandBurstStats({
      typeId: toTypeId("43552"),
      name: "Armor Command Burst II",
      values: values({ maxRange: 15000, duration: 60000, capacitorNeed: 25, reloadTime: 60000, chargeGroup1: 1774 }),
      requiredSkillIds: [toTypeId("21535")],
    });
    expect(result).toEqual({
      id: toTypeId("43552"),
      name: "Armor Command Burst II",
      maxRange: 15000,
      cycleTime: 60,
      capacitorNeed: 25,
      reloadTime: 60,
      chargeGroup: 1774,
      requiredSkillIds: [toTypeId("21535")],
    });
  });

  test("returns undefined when core attributes are missing", () => {
    expect(buildCommandBurstStats({ typeId: toTypeId("1"), name: "x", values: values({ duration: 60000, capacitorNeed: 25 }), requiredSkillIds: [] })).toBeUndefined();
    expect(buildCommandBurstStats({ typeId: toTypeId("1"), name: "x", values: values({ duration: 60000, chargeGroup1: 1774 }), requiredSkillIds: [] })).toBeUndefined();
  });

  test("command burst module group id", () => {
    expect(COMMAND_BURST_GROUP).toBe(1770);
  });
});

describe("buildBurstChargeStats", () => {
  test("builds armor energizing charge with warfare buff fields", () => {
    const result = buildBurstChargeStats(toTypeId("42832"), "Armor Energizing Charge", 1774, values({ warfareBuff1ID: 13, warfareBuff1Multiplier: -8 }));
    expect(result).toEqual({
      id: toTypeId("42832"),
      name: "Armor Energizing Charge",
      warfareBuffId: 13,
      warfareBuffMultiplier: -8,
      chargeGroup: 1774,
      chargeSize: 0,
    });
  });

  test("returns undefined outside burst charge groups", () => {
    expect(buildBurstChargeStats(toTypeId("1"), "Anything", 83, values({}))).toBeUndefined();
  });

  test("burst charge groups cover shield, mining, skirmish, information, and armor", () => {
    expect([...BURST_CHARGE_GROUPS].sort((a, b) => a - b)).toEqual([1769, 1771, 1772, 1773, 1774]);
  });
});
