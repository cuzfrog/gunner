import type { FighterStats, FittingDb } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import type { FighterGroup } from "./fighterCatalog";

export type FighterLoadoutViolation = "tooManySquadrons" | "lightSquadronsExceeded" | "heavySquadronsExceeded" | "supportSquadronsExceeded" | "hangarCapacityExceeded";

export interface FighterLoadoutValidation {
  readonly valid: boolean;
  readonly totalFighters: number;
  readonly totalSquadrons: number;
  readonly totalVolume: number;
  readonly hangarCapacity: number;
  readonly violations: readonly FighterLoadoutViolation[];
}

export interface FighterLoadoutValidator {
  validate(groups: readonly FighterGroup[], profile: ShipProfile): FighterLoadoutValidation;
}

interface FighterLoadoutValidatorDeps {
  readonly fittingDb: Pick<FittingDb, "fighters">;
}

export class FighterLoadoutValidatorImpl implements FighterLoadoutValidator {
  private readonly fighters: Readonly<Record<string, FighterStats>>;

  constructor({ fittingDb }: FighterLoadoutValidatorDeps) {
    this.fighters = fittingDb.fighters;
  }

  validate(groups: readonly FighterGroup[], profile: ShipProfile): FighterLoadoutValidation {
    const usage = { light: 0, heavy: 0, support: 0 };
    let totalSquadrons = 0;
    let totalFighters = 0;
    let totalVolume = 0;
    for (const group of groups) {
      totalFighters += group.count;
      const stats = this.fighters[group.typeId];
      if (!stats) continue;
      const squadrons = squadronsFor(group.count, stats.squadronMaxSize);
      totalSquadrons += squadrons;
      usage[stats.kind] += squadrons;
      totalVolume += group.count * stats.volume;
    }
    const hangarCapacity = profile.fighterCapacity;
    const violations = collectViolations(totalSquadrons, usage, totalVolume, profile, hangarCapacity);
    return { valid: violations.length === 0, totalFighters, totalSquadrons, totalVolume, hangarCapacity, violations };
  }
}

// A group spanning more fighters than one squadron holds occupies several squadrons and tubes.
function squadronsFor(count: number, squadronMaxSize: number): number {
  if (squadronMaxSize <= 0) return count > 0 ? 1 : 0;
  return Math.ceil(count / squadronMaxSize);
}

function collectViolations(totalSquadrons: number, usage: Readonly<Record<FighterStats["kind"], number>>, totalVolume: number, profile: ShipProfile, hangarCapacity: number): FighterLoadoutViolation[] {
  const violations: FighterLoadoutViolation[] = [];
  if (totalSquadrons > profile.fighterTubes) violations.push("tooManySquadrons");
  if (usage.light > profile.fighterLightSlots) violations.push("lightSquadronsExceeded");
  if (usage.heavy > profile.fighterHeavySlots) violations.push("heavySquadronsExceeded");
  if (usage.support > profile.fighterSupportSlots) violations.push("supportSquadronsExceeded");
  if (totalVolume > hangarCapacity) violations.push("hangarCapacityExceeded");
  return violations;
}
