import type {
  FittedHull,
  HullTier,
  PropulsionId,
  PropulsionKind,
  PropulsionModule,
  PropulsionStats,
  ShipProfile,
  Ships,
  StatConditions,
} from "../ships";
import { SIG_RESOLUTIONS, type SigResolutionClass } from "../sim";
import { parseEft, type ParsedFitting } from "./eft";
import type { ChargeStats, FittingModuleStats, TurretScriptStats, TurretStats } from "./fittingDb";

export interface ImportedTurret {
  readonly tracking: number;
  readonly sigResolutionClass: SigResolutionClass;
  readonly optimal: number;
  readonly falloff: number;
}

export interface ImportedFitting {
  readonly profile: ShipProfile;
  readonly fittingName: string;
  readonly fitted: FittedHull;
  readonly propulsion?: PropulsionStats & { readonly propulsionId: PropulsionId };
  readonly turret?: ImportedTurret;
}

export interface FittingDb {
  readonly modules: Readonly<Record<string, FittingModuleStats>>;
  readonly turrets: Readonly<Record<string, TurretStats>>;
  readonly charges: Readonly<Record<string, ChargeStats>>;
  readonly scripts: Readonly<Record<string, TurretScriptStats>>;
}

export interface FittingImport {
  importFitting(text: string, conditions: StatConditions): ImportedFitting | undefined;
}

export class FittingImportImpl implements FittingImport {
  private readonly ships: Ships;
  private readonly db: FittingDb;

  constructor({ ships, fittingDb }: { ships: Ships; fittingDb: FittingDb }) {
    this.ships = ships;
    this.db = fittingDb;
  }

  importFitting(text: string, conditions: StatConditions): ImportedFitting | undefined {
    const parsed = parseEft(text);
    if (!parsed) return undefined;

    const profile = this.ships.findHull(parsed.hullName);
    if (!profile) return undefined;

    const hullSide = aggregateHullSide(profile, this.db, parsed);
    const propulsion = resolvePropulsion(profile, this.ships, this.db, parsed, hullSide.propulsionName);
    const turret = resolveTurret(this.db, parsed, conditions.skillLevel);

    return {
      profile,
      fittingName: parsed.fittingName,
      fitted: hullSide.fitted,
      propulsion,
      turret,
    };
  }
}

interface HullSideAggregation {
  readonly fitted: FittedHull;
  readonly propulsionName?: string;
}

function aggregateHullSide(profile: ShipProfile, db: FittingDb, parsed: ParsedFitting): HullSideAggregation {
  let flatMass = 0;
  const massPercentages: number[] = [];
  const speedPercents: number[] = [];
  const agilityMultipliers: number[] = [];
  const sigPercents: number[] = [];
  let sigRadiusAdd = 0;
  let propulsionName: string | undefined;

  for (const line of parsed.modules) {
    if (line.offline) continue;
    const stats = db.modules[line.name];
    if (!stats) continue;

    if (stats.propulsion) {
      if (!propulsionName) propulsionName = line.name;
      continue;
    }

    if (stats.massAddition) flatMass += stats.massAddition;
    if (stats.massBonusPercentage) massPercentages.push(stats.massBonusPercentage / 100);
    if (stats.speedBonusPercent) speedPercents.push(stats.speedBonusPercent / 100);
    if (stats.agilityMultiplier) agilityMultipliers.push(stats.agilityMultiplier);
    if (stats.agilityDrawbackPercent) agilityMultipliers.push(1 + stats.agilityDrawbackPercent / 100);
    if (stats.sigRadiusAdd) sigRadiusAdd += stats.sigRadiusAdd;
    if (stats.sigBonusPercent) sigPercents.push(stats.sigBonusPercent / 100);
    if (stats.sigDrawbackPercent) sigPercents.push(stats.sigDrawbackPercent / 100);
  }

  const massMultiplier = applyStackingPenalty(massPercentages.map((p) => 1 + p));
  const speedMultiplier = applyStackingPenalty(speedPercents.map((p) => 1 + p));
  const inertiaMultiplier = applyStackingPenalty(agilityMultipliers);
  const sigMultiplier = applyStackingPenalty(sigPercents.map((p) => 1 + p));

  return {
    fitted: {
      mass: profile.mass + flatMass,
      massMultiplier,
      speedMultiplier,
      inertiaMultiplier,
      sigMultiplier,
      sigRadiusAdd,
    },
    propulsionName,
  };
}

function resolvePropulsion(
  profile: ShipProfile,
  ships: Ships,
  db: FittingDb,
  parsed: ParsedFitting,
  propulsionName: string | undefined,
): (PropulsionStats & { readonly propulsionId: PropulsionId }) | undefined {
  const name = propulsionName ?? findFirstPropulsion(parsed, db);
  if (!name) return undefined;

  const stats = db.modules[name]?.propulsion;
  if (!stats) return undefined;

  const propulsionId = findGenericPropulsionId(ships, profile, stats.kind, stats.sizeTier);
  if (!propulsionId) return undefined;

  return { ...stats, propulsionId };
}

function findFirstPropulsion(parsed: ParsedFitting, db: FittingDb): string | undefined {
  for (const line of parsed.modules) {
    if (line.offline) continue;
    const stats = db.modules[line.name];
    if (stats?.propulsion) return line.name;
  }
  return undefined;
}

function findGenericPropulsionId(
  ships: Ships,
  profile: ShipProfile,
  kind: PropulsionKind,
  sizeTier: HullTier,
): PropulsionId | undefined {
  const option = ships.fittingOptions(profile).find((module) => module.kind === kind && module.sizeTier === sizeTier);
  return option?.id;
}

function resolveTurret(db: FittingDb, parsed: ParsedFitting, skillLevel: number): ImportedTurret | undefined {
  const trackingPercents: number[] = [];
  const optimalPercents: number[] = [];
  const falloffPercents: number[] = [];
  let turret: TurretStats | undefined;
  let charge: ChargeStats | undefined;

  for (const line of parsed.modules) {
    if (line.offline) continue;

    const lineTurret = db.turrets[line.name];
    if (lineTurret && !turret) {
      turret = lineTurret;
      charge = line.charge ? db.charges[line.charge] : undefined;
      continue;
    }

    const stats = db.modules[line.name];
    if (!stats) continue;
    const script = line.charge ? db.scripts[line.charge] : undefined;
    collectTurretPercents(stats, script, trackingPercents, optimalPercents, falloffPercents);
  }

  if (!turret) return undefined;

  const sigResClass = sigResolutionClassFromChargeSize(turret.chargeSize);
  const sigRes = SIG_RESOLUTIONS[sigResClass];
  const skillTrackingMultiplier = 1 + TRACKING_SKILL_BONUS * skillLevel;
  const skillOptimalMultiplier = 1 + OPTIMAL_SKILL_BONUS * skillLevel;
  const skillFalloffMultiplier = 1 + FALLOFF_SKILL_BONUS * skillLevel;

  const trackingBonus = applyStackingPenalty(trackingPercents.map((p) => 1 + p / 100));
  const optimalBonus = applyStackingPenalty(optimalPercents.map((p) => 1 + p / 100));
  const falloffBonus = applyStackingPenalty(falloffPercents.map((p) => 1 + p / 100));

  const trackingScore = turret.tracking * (charge?.trackingMultiplier ?? 1) * skillTrackingMultiplier * trackingBonus;
  const optimal = turret.optimal * (charge?.rangeMultiplier ?? 1) * skillOptimalMultiplier * optimalBonus;
  const falloff = turret.falloff * (charge?.falloffMultiplier ?? 1) * skillFalloffMultiplier * falloffBonus;

  return {
    tracking: (trackingScore * sigRes) / STANDARD_SIGNATURE_RESOLUTION,
    sigResolutionClass: sigResClass,
    optimal,
    falloff,
  };
}

function collectTurretPercents(
  stats: FittingModuleStats,
  script: TurretScriptStats | undefined,
  trackingPercents: number[],
  optimalPercents: number[],
  falloffPercents: number[],
): void {
  if (stats.turretTrackingPercent) {
    const percent = stats.turretTrackingPercent * (script?.trackingMultiplier ?? 1);
    if (percent !== 0) trackingPercents.push(percent);
  }
  if (stats.turretOptimalPercent) {
    const percent = stats.turretOptimalPercent * (script?.optimalMultiplier ?? 1);
    if (percent !== 0) optimalPercents.push(percent);
  }
  if (stats.turretFalloffPercent) {
    const percent = stats.turretFalloffPercent * (script?.falloffMultiplier ?? 1);
    if (percent !== 0) falloffPercents.push(percent);
  }
}

const TRACKING_SKILL_BONUS = 0.05;
const OPTIMAL_SKILL_BONUS = 0.05;
const FALLOFF_SKILL_BONUS = 0.05;
const STANDARD_SIGNATURE_RESOLUTION = 40_000;

function sigResolutionClassFromChargeSize(chargeSize: number): SigResolutionClass {
  if (chargeSize >= 4) return "XL";
  if (chargeSize === 3) return "L";
  if (chargeSize === 2) return "M";
  return "S";
}

function applyStackingPenalty(multipliers: number[]): number {
  const values = multipliers.filter((value) => value !== 1);
  const positive = values.filter((value) => value > 1).sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1));
  const negative = values.filter((value) => value < 1).sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1));

  let product = 1;
  for (const list of [positive, negative]) {
    for (let i = 0; i < list.length; i++) {
      const bonus = list[i];
      product *= 1 + (bonus - 1) * Math.exp(-(i * i) / 7.1289);
    }
  }
  return product;
}

export { applyStackingPenalty as _applyStackingPenalty };
