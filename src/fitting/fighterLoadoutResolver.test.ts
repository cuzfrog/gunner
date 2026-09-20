import { FighterLoadoutResolverImpl, type FighterLoadoutContext } from "./fighterLoadoutResolver";
import type { FittingCalculator } from "./fittingCalculator";
import type { FittedModule, FittingState } from "./fittingState";
import type { FighterGroup } from "./fighterCatalog";
import type { ImportedFighter } from "./fighterCatalog";
import type { ShipProfile, StatConditions } from "../ships";
import type { HullBonus } from "../gamedata/fittingDb";
import { toTypeId, type ShipId, type FactionId, type HullTypeId } from "../gamedata/ids";

function makeProfile(): ShipProfile {
  return {
    id: "test" as ShipId,
    name: "Test",
    factionId: "test" as FactionId,
    hullTypeId: "25" as HullTypeId,
    mass: 1_000_000,
    inertiaModifier: 3,
    baseSpeed: 300,
    sigRadius: 35,
    scanResolution: 200,
    maxTargetingRange: 30000,
    maxLockedTargets: 4,
    sensorStrengths: { gravimetric: 11, ladar: 0, magnetometric: 0, radar: 0 },
    highSlots: 4,
    medSlots: 4,
    lowSlots: 4,
    rigSlots: 3,
    powerGrid: 1000,
    cpuOutput: 400,
    droneBandwidth: 75,
    droneCapacity: 75,
    maxActiveDrones: 5,
    fighterCapacity: 150000,
    fighterTubes: 4,
    fighterLightSlots: 3,
    fighterHeavySlots: 3,
    fighterSupportSlots: 2,
    shieldHp: 0,
    shieldRechargeTime: 0,
    armorHp: 0,
    hullHp: 0,
    shieldResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    armorResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    bonuses: [],
    capacitorCapacity: 0,
    capacitorRechargeTime: 0,
  };
}

const CONDITIONS: StatConditions = { skillLevel: 5, overloaded: false, weaponOverloaded: false };

function context(overrides: Partial<FighterLoadoutContext> = {}): FighterLoadoutContext {
  return { profile: makeProfile(), hullBonuses: [], droneBoosterModules: [], ...overrides };
}

describe("FighterLoadoutResolverImpl", () => {
  test("resolves fighter groups through the fitting calculator with the context carried into the synthetic state", () => {
    const resolved: ImportedFighter[] = [];
    const seen: FittingState[] = [];
    const calculator = {
      resolveFighters(fitting: FittingState): readonly ImportedFighter[] {
        seen.push(fitting);
        return resolved;
      },
    } as unknown as FittingCalculator;
    const booster: FittedModule = { moduleId: toTypeId("39948"), offline: false };
    const resolver = new FighterLoadoutResolverImpl({ fittingCalculator: calculator });
    const groups: readonly FighterGroup[] = [{ typeId: toTypeId("34359"), count: 6 }];
    const ctx = context({ droneBoosterModules: [booster] });
    const result = resolver.resolve(groups, ctx, CONDITIONS);
    expect(result).toBe(resolved);
    expect(seen).toHaveLength(1);
    expect(seen[0].fighterGroups).toEqual(groups);
    expect(seen[0].droneBoosterModules).toEqual([booster]);
    expect(seen[0].profile).toBe(ctx.profile);
  });

  test("empty groups resolve without touching the calculator", () => {
    let called = 0;
    const calculator = { resolveFighters: () => { called++; return []; } } as unknown as FittingCalculator;
    const resolver = new FighterLoadoutResolverImpl({ fittingCalculator: calculator });
    const result = resolver.resolve([], context(), CONDITIONS);
    expect(result).toEqual([]);
    expect(called).toBe(0);
  });
});
