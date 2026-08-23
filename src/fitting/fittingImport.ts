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
import {
  SIG_RESOLUTIONS,
  type DisruptionScript,
  type EwarLoadout,
  type SigResolutionClass,
  type StackingPenalty,
  type StasisWebSpec,
  type TrackingDisruptorSpec,
} from "../sim";
import { moduleLines, parseEft, type BankKind, type EftDocument } from "./eft";
import type { ChargeCatalog, CargoCharge, ImportedTurret, ImportedTurretBase } from "./chargeCatalog";
import type {
  ChargeStats,
  DisruptionScriptStats,
  FittingModuleStats,
  HullBonus,
  StasisWebStats,
  TrackingDisruptorStats,
  TurretScriptStats,
  TurretStats,
} from "./fittingDb";


export type { ImportedTurret, ImportedTurretBase, CargoCharge } from "./chargeCatalog";

export interface FittingRow {
  readonly name: string;
  readonly charge?: string;
  readonly quantity?: number;
  readonly empty?: boolean;
}

export type FittingSectionKind = BankKind | "cargo" | "drones";

export interface FittingSection {
  readonly kind: FittingSectionKind;
  readonly rows: readonly FittingRow[];
}

export interface FittingSummary {
  readonly hullName: string;
  readonly fittingName: string;
  readonly sections: readonly FittingSection[];
}

export interface ImportedFitting {
  readonly profile: ShipProfile;
  readonly fittingName: string;
  readonly fitted: FittedHull;
  readonly propulsion?: PropulsionStats & { readonly propulsionId: PropulsionId; readonly propulsionName?: string };
  readonly turret?: ImportedTurret;
  readonly cargoCharges: readonly CargoCharge[];
  readonly ewar: EwarLoadout;
}

export interface FittingDb {
  readonly modules: Readonly<Record<string, FittingModuleStats>>;
  readonly turrets: Readonly<Record<string, TurretStats>>;
  readonly charges: Readonly<Record<string, ChargeStats>>;
  readonly scripts: Readonly<Record<string, TurretScriptStats>>;
  readonly stasisWebs: Readonly<Record<string, StasisWebStats>>;
  readonly trackingDisruptors: Readonly<Record<string, TrackingDisruptorStats>>;
  readonly disruptionScripts: Readonly<Record<string, DisruptionScriptStats>>;
  readonly hullBonuses: Readonly<Record<string, readonly HullBonus[]>>;
}

export interface FittingImport {
  importFitting(text: string, conditions: StatConditions): ImportedFitting | undefined;
  propulsionVariantNames(module: PropulsionModule): readonly string[];
  propulsionStats(name: string): PropulsionStats | undefined;
  summarize(text: string): FittingSummary | undefined;
}

export class FittingImportImpl implements FittingImport {
  private readonly ships: Ships;
  private readonly db: FittingDb;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly stacking: StackingPenalty;

  constructor({
    ships,
    fittingDb,
    chargeCatalog,
    stackingPenalty,
  }: {
    ships: Ships;
    fittingDb: FittingDb;
    chargeCatalog: ChargeCatalog;
    stackingPenalty: StackingPenalty;
  }) {
    this.ships = ships;
    this.db = fittingDb;
    this.chargeCatalog = chargeCatalog;
    this.stacking = stackingPenalty;
  }

  propulsionVariantNames(module: PropulsionModule): readonly string[] {
    return Object.entries(this.db.modules)
      .filter(([, stats]) => stats.propulsion?.kind === module.kind && stats.propulsion?.sizeTier === module.sizeTier && stats.propulsion.thrust > 0 && stats.propulsion.speedBonus > 0)
      .map(([name]) => name)
      .sort((a, b) => {
        const aStats = this.db.modules[a]?.propulsion;
        const bStats = this.db.modules[b]?.propulsion;
        if (!aStats || !bStats) return a.localeCompare(b);
        if (bStats.speedBonus !== aStats.speedBonus) return bStats.speedBonus - aStats.speedBonus;
        return a.localeCompare(b);
      });
  }

  propulsionStats(name: string): PropulsionStats | undefined {
    const stats = this.db.modules[name]?.propulsion;
    if (!stats) return undefined;
    return { thrust: stats.thrust, speedBonus: stats.speedBonus, massAddition: stats.massAddition, sigBloom: stats.sigBloom };
  }

  importFitting(text: string, conditions: StatConditions): ImportedFitting | undefined {
    const parsed = parseEft(text);
    if (!parsed) return undefined;

    const profile = this.ships.findHull(parsed.hullName);
    if (!profile) return undefined;

    const hullBonuses = this.db.hullBonuses[profile.name] ?? [];
    const hullSide = aggregateHullSide(profile, this.db, parsed, hullBonuses, conditions.skillLevel, this.stacking);
    const propulsion = resolvePropulsion(profile, this.ships, this.db, parsed, hullSide.propulsionName);
    const turret = resolveTurret(this.db, this.chargeCatalog, parsed, conditions.skillLevel, hullBonuses, this.stacking);
    const cargoCharges = resolveCargoCharges(this.db, parsed);
    const ewar = resolveEwar(this.db, parsed);

    return {
      profile,
      fittingName: parsed.fittingName,
      fitted: hullSide.fitted,
      propulsion,
      turret,
      cargoCharges,
      ewar,
    };
  }

  summarize(text: string): FittingSummary | undefined {
    const parsed = parseEft(text);
    if (!parsed) return undefined;
    return {
      hullName: parsed.hullName,
      fittingName: parsed.fittingName,
      sections: buildSections(parsed, this.db),
    };
  }
}

interface HullSideAggregation {
  readonly fitted: FittedHull;
  readonly propulsionName?: string;
}

function aggregateHullSide(
  profile: ShipProfile,
  db: FittingDb,
  parsed: EftDocument,
  hullBonuses: readonly HullBonus[],
  skillLevel: number,
  stacking: StackingPenalty,
): HullSideAggregation {
  let flatMass = 0;
  const massPercentages: number[] = [];
  const speedPercents: number[] = [];
  const agilityMultipliers: number[] = [];
  const sigPercents: number[] = [];
  let sigRadiusAdd = 0;
  let propulsionName: string | undefined;

  for (const line of moduleLines(parsed)) {
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

  for (const bonus of hullBonuses) {
    const percent = hullBonusPercent(bonus, skillLevel);
    if (bonus.attribute === "maxVelocity") speedPercents.push(percent / 100);
    if (bonus.attribute === "agility") agilityMultipliers.push(1 + percent / 100);
  }

  const massMultiplier = stacking.apply(massPercentages.map((p) => 1 + p));
  const speedMultiplier = stacking.apply(speedPercents.map((p) => 1 + p));
  const inertiaMultiplier = stacking.apply(agilityMultipliers);
  const sigMultiplier = stacking.apply(sigPercents.map((p) => 1 + p));

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
  parsed: EftDocument,
  propulsionName: string | undefined,
): (PropulsionStats & { readonly propulsionId: PropulsionId; readonly propulsionName: string }) | undefined {
  const name = propulsionName ?? findFirstPropulsion(parsed, db);
  if (!name) return undefined;

  const stats = db.modules[name]?.propulsion;
  if (!stats) return undefined;

  const propulsionId = findGenericPropulsionId(ships, profile, stats.kind, stats.sizeTier);
  if (!propulsionId) return undefined;

  return { ...stats, propulsionId, propulsionName: name };
}

function findFirstPropulsion(parsed: EftDocument, db: FittingDb): string | undefined {
  for (const line of moduleLines(parsed)) {
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

function resolveTurret(
  db: FittingDb,
  chargeCatalog: ChargeCatalog,
  parsed: EftDocument,
  skillLevel: number,
  hullBonuses: readonly HullBonus[],
  stacking: StackingPenalty,
): ImportedTurret | undefined {
  const trackingPercents: number[] = [];
  const optimalPercents: number[] = [];
  const falloffPercents: number[] = [];
  let turret: TurretStats | undefined;
  let chargeName: string | undefined;
  let moduleName: string | undefined;

  for (const line of moduleLines(parsed)) {
    if (line.offline) continue;

    const lineTurret = db.turrets[line.name];
    if (lineTurret && !turret) {
      turret = lineTurret;
      chargeName = line.charge;
      moduleName = line.name;
      continue;
    }

    const stats = db.modules[line.name];
    if (!stats) continue;
    const script = line.charge ? db.scripts[line.charge] : undefined;
    collectTurretPercents(stats, script, trackingPercents, optimalPercents, falloffPercents);
  }

  if (!turret) return undefined;

  for (const bonus of hullBonuses) {
    if (bonus.turretSkill && turret.turretSkill !== bonus.turretSkill) continue;
    const percent = hullBonusPercent(bonus, skillLevel);
    if (bonus.attribute === "turretTracking") trackingPercents.push(percent);
    if (bonus.attribute === "turretOptimal") optimalPercents.push(percent);
    if (bonus.attribute === "turretFalloff") falloffPercents.push(percent);
  }

  const sigResClass = sigResolutionClassFromChargeSize(turret.chargeSize);
  const sigRes = SIG_RESOLUTIONS[sigResClass];
  const skillTrackingMultiplier = 1 + TRACKING_SKILL_BONUS * skillLevel;
  const skillOptimalMultiplier = 1 + OPTIMAL_SKILL_BONUS * skillLevel;
  const skillFalloffMultiplier = 1 + FALLOFF_SKILL_BONUS * skillLevel;

  const trackingBonus = stacking.apply(trackingPercents.map((p) => 1 + p / 100));
  const optimalBonus = stacking.apply(optimalPercents.map((p) => 1 + p / 100));
  const falloffBonus = stacking.apply(falloffPercents.map((p) => 1 + p / 100));

  const trackingScore = turret.tracking * skillTrackingMultiplier * trackingBonus;
  const optimalScore = turret.optimal * skillOptimalMultiplier * optimalBonus;
  const falloffScore = turret.falloff * skillFalloffMultiplier * falloffBonus;

  const base: ImportedTurretBase = {
    tracking: (trackingScore * sigRes) / STANDARD_SIGNATURE_RESOLUTION,
    optimal: optimalScore,
    falloff: falloffScore,
  };

  const selectedCharge = chargeName && db.charges[chargeName] ? chargeName : chargeCatalog.usualForChargeSize(turret.chargeSize);
  const charge = db.charges[selectedCharge] ?? {};

  return {
    tracking: base.tracking * (charge.trackingMultiplier ?? 1),
    sigResolutionClass: sigResClass,
    optimal: base.optimal * (charge.rangeMultiplier ?? 1),
    falloff: base.falloff * (charge.falloffMultiplier ?? 1),
    chargeSize: turret.chargeSize,
    charge: selectedCharge,
    base,
    moduleName: moduleName ?? "Unknown Turret",
  };
}

function resolveCargoCharges(db: FittingDb, parsed: EftDocument): readonly CargoCharge[] {
  const charges: CargoCharge[] = [];
  for (const item of parsed.cargo) {
    if (!db.charges[item.name]) continue;
    charges.push({ name: item.name, quantity: item.quantity });
  }
  return charges;
}

function resolveEwar(db: FittingDb, parsed: EftDocument): EwarLoadout {
  const webs: StasisWebSpec[] = [];
  const disruptors: TrackingDisruptorSpec[] = [];

  for (const line of moduleLines(parsed)) {
    if (line.offline) continue;

    const webStats = db.stasisWebs[line.name];
    if (webStats) {
      webs.push({
        moduleName: line.name,
        maxRange: webStats.maxRange,
        speedFactor: Math.round(-webStats.speedFactorPercent * 10000) / 1000000,
        overloadRangeBonusPercent: webStats.overloadRangeBonusPercent,
      });
      continue;
    }

    const disruptorStats = db.trackingDisruptors[line.name];
    if (disruptorStats) {
      const scriptStats = line.charge ? db.disruptionScripts[line.charge] : undefined;
      disruptors.push({
        moduleName: line.name,
        optimal: disruptorStats.optimal,
        falloff: disruptorStats.falloff,
        disruption: Math.round(-disruptorStats.disruptionPercent * 10000) / 1000000,
        defaultScript: resolveDisruptionScript(scriptStats),
        overloadStrengthBonusPercent: disruptorStats.overloadStrengthBonusPercent,
      });
    }
  }

  if (webs.length === 0 && disruptors.length === 0) return { webs: [], disruptors: [] };
  return { webs, disruptors };
}

function resolveDisruptionScript(stats: DisruptionScriptStats | undefined): DisruptionScript {
  if (!stats) return "none";
  if (stats.rangeDeltaBonus > 0 && stats.trackingDeltaBonus <= 0) return "optimalRange";
  if (stats.trackingDeltaBonus > 0 && stats.rangeDeltaBonus <= 0) return "trackingSpeed";
  return "none";
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

function hullBonusPercent(bonus: HullBonus, skillLevel: number): number {
  return bonus.magnitude * (bonus.skill ? skillLevel : 1);
}

function sigResolutionClassFromChargeSize(chargeSize: number): SigResolutionClass {
  if (chargeSize >= 4) return "XL";
  if (chargeSize === 3) return "L";
  if (chargeSize === 2) return "M";
  return "S";
}

const SECTION_ORDER: readonly FittingSectionKind[] = [
  "high",
  "mid",
  "low",
  "rig",
  "subsystem",
  "service",
  "cargo",
  "drones",
];

function buildSections(document: EftDocument, db: FittingDb): readonly FittingSection[] {
  const buckets: Record<FittingSectionKind, FittingRow[]> = {
    low: [],
    mid: [],
    high: [],
    rig: [],
    subsystem: [],
    service: [],
    cargo: [],
    drones: [],
  };

  for (const bank of document.banks) {
    for (const line of bank.lines) {
      if (line.kind === "module") {
        buckets[bank.bank].push({ name: line.name, charge: line.charge });
      } else {
        buckets[bank.bank].push({ name: line.label, empty: true });
      }
    }
  }

  for (const item of document.cargo) {
    buckets.cargo.push({ name: item.name, quantity: item.quantity });
  }

  for (const item of document.drones) {
    if (item.name in db.charges) {
      buckets.cargo.push({ name: item.name, quantity: item.quantity });
    } else {
      buckets.drones.push({ name: item.name, quantity: item.quantity });
    }
  }

  const sections: FittingSection[] = [];
  for (const kind of SECTION_ORDER) {
    if (buckets[kind].length > 0) sections.push({ kind, rows: buckets[kind] });
  }
  return sections;
}


