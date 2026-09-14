import { describe, expect, test } from "bun:test";
import { buildSubsystemStats } from "./buildSubsystemStats";
import { toTypeId } from "../../src/gamedata/ids";

function values(entries: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(entries));
}

describe("buildSubsystemStats", () => {
  test("builds launcher offensive subsystem stats from SDE attributes", () => {
    const result = buildSubsystemStats({
      typeId: toTypeId("35682"),
      name: "Tengu Offensive - Accelerated Ejection Bay",
      groupId: 956,
      values: values({ hiSlotModifier: 7, launcherHardPointModifier: 6, powerOutput: 190, cpuOutput: 160 }),
    });
    expect(result).toEqual({
      id: toTypeId("35682"),
      name: "Tengu Offensive - Accelerated Ejection Bay",
      slotKind: "offensive",
      highSlots: 7,
      medSlots: 0,
      lowSlots: 0,
      turretHardpoints: 0,
      launcherHardpoints: 6,
    });
  });

  test("builds core subsystem stats with mid/low spread", () => {
    const result = buildSubsystemStats({
      typeId: toTypeId("35686"),
      name: "Tengu Core - Electronic Efficiency Gate",
      groupId: 958,
      values: values({ medSlotModifier: 3, lowSlotModifier: 1 }),
    });
    expect(result).toEqual({
      id: toTypeId("35686"),
      name: "Tengu Core - Electronic Efficiency Gate",
      slotKind: "core",
      highSlots: 0,
      medSlots: 3,
      lowSlots: 1,
      turretHardpoints: 0,
      launcherHardpoints: 0,
    });
  });

  test("returns undefined for non-subsystem groups", () => {
    expect(buildSubsystemStats({ typeId: toTypeId("1"), name: "x", groupId: 963, values: values({}) })).toBeUndefined();
  });
});
