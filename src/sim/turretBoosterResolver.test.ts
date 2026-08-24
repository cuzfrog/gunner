import { StackingPenaltyImpl } from "./stackingPenalty";
import { TurretBoosterResolverImpl } from "./turretBoosterResolver";
import type { TrackingBoosterSpec, TurretScriptSpec, TurretSpec } from "./types";

function spec(bonus: { tracking?: number; optimal?: number; falloff?: number }, defaultScript: TurretScriptSpec | undefined = undefined): TrackingBoosterSpec {
  return {
    moduleName: "Tracking Computer I",
    trackingBonusPercent: bonus.tracking ?? 0,
    optimalBonusPercent: bonus.optimal ?? 0,
    falloffBonusPercent: bonus.falloff ?? 0,
    defaultScript,
  };
}

const optimalRangeScript: TurretScriptSpec = { name: "Optimal Range Script", trackingMultiplier: 0, optimalMultiplier: 2, falloffMultiplier: 2 };
const trackingSpeedScript: TurretScriptSpec = { name: "Tracking Speed Script", trackingMultiplier: 2, optimalMultiplier: 0, falloffMultiplier: 0 };

const baseTurret: TurretSpec = { tracking: 0.315, sigResolution: 40, optimal: 6000, falloff: 3000 };

function resolver() {
  return new TurretBoosterResolverImpl({ stackingPenalty: new StackingPenaltyImpl() });
}

describe("TurretBoosterResolverImpl", () => {
  test("empty projection returns the input turret", () => {
    expect(resolver().boostedTurret(baseTurret, undefined)).toEqual(baseTurret);
  });

  test("inactive computer is skipped", () => {
    const projection = {
      loadout: { computers: [spec({ tracking: 10 })], scripts: [] },
      activation: { computers: [{ active: false, script: undefined }] },
    };
    expect(resolver().boostedTurret(baseTurret, projection)).toEqual(baseTurret);
  });

  test("unscripted TC I adds tracking, optimal, and falloff percentages", () => {
    const projection = {
      loadout: { computers: [spec({ tracking: 10, optimal: 5, falloff: 10 })], scripts: [] },
      activation: { computers: [{ active: true, script: undefined }] },
    };
    expect(resolver().boostedTurret(baseTurret, projection)).toEqual({
      tracking: baseTurret.tracking * 1.1,
      sigResolution: 40,
      optimal: baseTurret.optimal * 1.05,
      falloff: baseTurret.falloff * 1.1,
    });
  });

  test("Optimal Range Script doubles optimal and falloff bonuses, removes tracking", () => {
    const projection = {
      loadout: { computers: [spec({ tracking: 10, optimal: 5, falloff: 10 }, optimalRangeScript)], scripts: [optimalRangeScript] },
      activation: { computers: [{ active: true, script: optimalRangeScript }] },
    };
    expect(resolver().boostedTurret(baseTurret, projection)).toEqual({
      tracking: baseTurret.tracking,
      sigResolution: 40,
      optimal: baseTurret.optimal * (1 + 0.05 * 2),
      falloff: baseTurret.falloff * (1 + 0.1 * 2),
    });
  });

  test("Tracking Speed Script doubles tracking bonus, removes range", () => {
    const projection = {
      loadout: { computers: [spec({ tracking: 10, optimal: 5, falloff: 10 }, trackingSpeedScript)], scripts: [trackingSpeedScript] },
      activation: { computers: [{ active: true, script: trackingSpeedScript }] },
    };
    expect(resolver().boostedTurret(baseTurret, projection)).toEqual({
      tracking: baseTurret.tracking * (1 + 0.1 * 2),
      sigResolution: 40,
      optimal: baseTurret.optimal,
      falloff: baseTurret.falloff,
    });
  });

  test("selecting no script falls back to base bonuses", () => {
    const projection = {
      loadout: { computers: [spec({ tracking: 10, optimal: 5, falloff: 10 }, optimalRangeScript)], scripts: [optimalRangeScript] },
      activation: { computers: [{ active: true, script: undefined }] },
    };
    expect(resolver().boostedTurret(baseTurret, projection)).toEqual({
      tracking: baseTurret.tracking * 1.1,
      sigResolution: 40,
      optimal: baseTurret.optimal * 1.05,
      falloff: baseTurret.falloff * 1.1,
    });
  });

  test("two computers stack-penalize", () => {
    const penalty = new StackingPenaltyImpl();
    const projection = {
      loadout: { computers: [spec({ tracking: 10 }), spec({ tracking: 10 })], scripts: [] },
      activation: { computers: [{ active: true, script: undefined }, { active: true, script: undefined }] },
    };
    const result = resolver().boostedTurret(baseTurret, projection);
    expect(result.tracking).toBeCloseTo(baseTurret.tracking * penalty.apply([1.1, 1.1]), 10);
  });
});
