import type { FighterStats, FittingDb } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import type { FighterGroup } from "./fighterCatalog";

export type FighterLoadoutViolation = "tooManySquadrons" | "lightSquadronsExceeded" | "heavySquadronsExceeded" | "supportSquadronsExceeded" | "hangarCapacityExceeded";

export interface FighterLoadoutValidation {
  readonly valid: boolean;
  /** Fighters stored in the hangar (idle + launched). */
  readonly totalFighters: number;
  /** Fighters launched in squadrons. */
  readonly activeFighters: number;
  /** Squadrons occupied by the launched fighters. */
  readonly activeSquadrons: number;
  /** Volume of the stored fighters (idle + launched). */
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
    let activeSquadrons = 0;
    let totalFighters = 0;
    let activeFighters = 0;
    let totalVolume = 0;
    for (const group of groups) {
      totalFighters += group.count;
      activeFighters += group.activeCount;
      const stats = this.fighters[group.typeId];
      if (!stats) continue;
      const squadrons = squadronsFor(group.activeCount, stats.squadronMaxSize);
      activeSquadrons += squadrons;
      usage[stats.kind] += squadrons;
      totalVolume += group.count * stats.volume;
    }
    const hangarCapacity = profile.fighterCapacity;
    const violations = collectViolations(activeSquadrons, usage, totalVolume, profile, hangarCapacity);
    return { valid: violations.length === 0, totalFighters, activeFighters, activeSquadrons, totalVolume, hangarCapacity, violations };
  }
}

/** A launched set spanning more fighters than one squadron holds occupies several squadrons and tubes; hangar storage is capacity-limited only. */
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
