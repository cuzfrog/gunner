import { describe, test, expect } from "bun:test";
import { toTypeId } from "../gamedata/ids";
import { type BurstEffectSpec, type BurstEffectKind, type CommandBurstSpec, IDENTITY_BURST_MODIFIERS } from "./types";
import { burstModifiers } from "./burstModifiers";

function burst(moduleId: string, effects: readonly BurstEffectSpec[]): CommandBurstSpec {
  return { moduleName: moduleId, moduleId: toTypeId(moduleId), capacitorNeed: 25, cycleTime: 10, effects };
}

describe("burstModifiers", () => {
  test("returns the identity when no burst is live", () => {
    const armor = burst("1", [{ kind: "armorResonance", multiplier: 0.92 }]);
    expect(burstModifiers([armor], () => false)).toEqual(IDENTITY_BURST_MODIFIERS);
  });

  test("applies the multiplier of every live effect kind", () => {
    const armor = burst("1", [{ kind: "armorResonance", multiplier: 0.92 }, { kind: "armorRepair", multiplier: 0.92 }]);
    const result = burstModifiers([armor], () => true);
    expect(result.armorResonance).toBeCloseTo(0.92, 9);
    expect(result.armorRepair).toBeCloseTo(0.92, 9);
    expect(result.shieldResonance).toBe(1);
  });

  test("keeps the strongest effect per kind when several bursts apply the same kind", () => {
    const weak = burst("1", [{ kind: "armorResonance", multiplier: 0.95 }]);
    const strong = burst("2", [{ kind: "armorResonance", multiplier: 0.88 }]);
    expect(burstModifiers([weak, strong], (id) => id === toTypeId("2")).armorResonance).toBeCloseTo(0.88, 9);
    expect(burstModifiers([weak, strong], () => true).armorResonance).toBeCloseTo(0.88, 9);
    expect(burstModifiers([weak, strong], (id) => id === toTypeId("1")).armorResonance).toBeCloseTo(0.95, 9);
  });

  test("independent kinds from different live bursts compose", () => {
    const armor = burst("1", [{ kind: "armorResonance", multiplier: 0.92 }]);
    const info = burst("2", [{ kind: "scanResolution", multiplier: 1.09 }, { kind: "targetingRange", multiplier: 1.18 }]);
    const result = burstModifiers([armor, info], () => true);
    expect(result.armorResonance).toBeCloseTo(0.92, 9);
    expect(result.scanResolution).toBeCloseTo(1.09, 9);
    expect(result.targetingRange).toBeCloseTo(1.18, 9);
  });

  test("only modeled kinds are carried; unknown effects have no shape to carry", () => {
    const kinds: readonly BurstEffectKind[] = ["shieldResonance", "armorResonance", "shieldHp", "armorHp", "shieldRepair", "armorRepair", "scanResolution", "targetingRange", "scanStrength", "signatureRadius", "inertia", "propulsionSpeed"];
    const effects = kinds.map((kind) => ({ kind, multiplier: 1.5 }));
    const result = burstModifiers([burst("1", effects)], () => true);
    for (const kind of kinds) expect(result[kind]).toBeCloseTo(1.5, 9);
  });
});
