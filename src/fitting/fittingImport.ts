import type {
  FittedHull,
  HullTier,
  PropulsionId,
  PropulsionKind,
  PropulsionModule,
  PropulsionStats,
  ShipNameLanguage,
  ShipProfile,
  Ships,
  StatConditions,
} from "../ships";
import {
  SIG_RESOLUTIONS,
  type BoostLoadout,
  type DisruptionScriptSpec,
  type EwarLoadout,
  type SigResolutionClass,
  type StackingPenalty,
  type StasisGrapplerSpec,
  type StasisWebSpec,
  type TrackingBoosterSpec,
  type TrackingDisruptorSpec,
  type TurretScriptSpec,
  type WarpScramblerSpec,
} from "../sim";
import type { FittingDb } from "../gamedata/fittingDb";
import { moduleLines, parseEft, type BankKind, type EftDocument, type EftLine, type QuantityItem } from "./eft";
import type { ItemNameCatalog } from "../gamedata/itemNames";
import type { ModuleSlotCatalog } from "../gamedata/moduleSlots";
import type { ChargeCatalog, CargoCharge, ImportedTurret, ImportedTurretBase } from "./chargeCatalog";
import type {
  ChargeStats,
  DisruptionScriptStats,
  FittingModuleStats,
  HullBonus,
  StasisGrapplerStats,
  StasisWebStats,
  TrackingComputerStats,
  TrackingDisruptorStats,
  TurretScriptStats,
  TurretStats,
  WarpScramblerStats,
} from "../gamedata/fittingDb";


export type { FittingDb } from "../gamedata/fittingDb";
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
  readonly boosts: BoostLoadout;
}

export interface FittingImport {
  importFitting(text: string, conditions: StatConditions): ImportedFitting | undefined;
  propulsionVariantNames(module: PropulsionModule): readonly string[];
  propulsionStats(name: string): PropulsionStats | undefined;
  summarize(text: string): FittingSummary | undefined;
  canonicalEftText(text: string): string | undefined;
  itemName(name: string, language: ShipNameLanguage): string;
  canonicalName(name: string): string;
}

export class FittingImportImpl implements FittingImport {
  private readonly ships: Ships;
  private readonly db: FittingDb;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly stacking: StackingPenalty;
  private readonly itemNameCatalog: ItemNameCatalog;
  private readonly moduleSlotCatalog: ModuleSlotCatalog;

  constructor({
    ships,
    fittingDb,
    chargeCatalog,
    stackingPenalty,
    itemNameCatalog,
    moduleSlotCatalog,
  }: {
    ships: Ships;
    fittingDb: FittingDb;
    chargeCatalog: ChargeCatalog;
    stackingPenalty: StackingPenalty;
    itemNameCatalog: ItemNameCatalog;
    moduleSlotCatalog: ModuleSlotCatalog;
  }) {
    this.ships = ships;
    this.db = fittingDb;
    this.chargeCatalog = chargeCatalog;
    this.stacking = stackingPenalty;
    this.itemNameCatalog = itemNameCatalog;
    this.moduleSlotCatalog = moduleSlotCatalog;
  }

  propulsionVariantNames(module: PropulsionModule): readonly string[] {
    const matches = ([, stats]: [string, FittingModuleStats]) =>
      stats.propulsion?.kind === module.kind &&
      stats.propulsion?.sizeTier === module.sizeTier &&
      stats.propulsion.thrust > 0 &&
      stats.propulsion.speedBonus > 0;
    return Object.entries(this.db.modules)
      .filter(matches)
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
    const document = this.parseAndCanonicalize(text);
    if (!document) return undefined;

    const profile = this.ships.findHull(document.hullName);
    if (!profile) return undefined;

    const hullBonuses = this.db.hullBonuses[profile.name] ?? [];
    const hullSide = aggregateHullSide(profile, this.db, document, hullBonuses, conditions.skillLevel, this.stacking);
    const propulsion = resolvePropulsion(profile, this.ships, this.db, document, hullSide.propulsionName);
    const turret = resolveTurret(this.db, this.chargeCatalog, document, conditions.skillLevel, hullBonuses, this.stacking);
    const cargoCharges = resolveCargoCharges(this.db, document);
    const ewar = resolveEwar(this.db, document);
    const boosts = resolveBoosts(this.db, document);

    return {
      profile,
      fittingName: document.fittingName,
      fitted: hullSide.fitted,
      propulsion,
      turret,
      cargoCharges,
      ewar,
      boosts,
    };
  }

  summarize(text: string): FittingSummary | undefined {
    const document = this.parseAndCanonicalize(text);
    if (!document) return undefined;
    const hullName = this.canonicalHullName(document.hullName);
    return {
      hullName,
      fittingName: document.fittingName,
      sections: buildSections({ ...document, hullName }, this.db),
    };
  }

  canonicalEftText(text: string): string | undefined {
    const document = this.parseAndCanonicalize(text);
    if (!document) return undefined;
    const hullName = this.canonicalHullName(document.hullName);
    return serializeEftDocument({ ...document, hullName });
  }

  itemName(name: string, language: ShipNameLanguage): string {
    return this.itemNameCatalog.name(name, language);
  }

  canonicalName(name: string): string {
    return this.itemNameCatalog.canonicalName(name);
  }

  private parseAndCanonicalize(text: string): EftDocument | undefined {
    const parsed = parseEft(text, this.moduleSlotCatalog);
    if (!parsed) return undefined;
    const normalized = normalizeEftDocument(parsed, (name) => this.itemNameCatalog.canonicalName(name));
    return parseEft(serializeEftDocument(normalized), this.moduleSlotCatalog);
  }

  private canonicalHullName(hullName: string): string {
    return this.ships.findHull(hullName)?.name ?? hullName;
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

function resolveCargoCharges(db: FittingDb, document: EftDocument): readonly CargoCharge[] {
  const charges: CargoCharge[] = [];
  for (const item of document.drones) {
    if (db.charges[item.name]) charges.push({ name: item.name, quantity: item.quantity });
  }
  for (const item of document.cargo) {
    if (db.charges[item.name]) charges.push({ name: item.name, quantity: item.quantity });
  }
  return charges;
}

function resolveBoosts(db: FittingDb, parsed: EftDocument): BoostLoadout {
  const scripts: TurretScriptSpec[] = Object.entries(db.scripts).map(([name, stats]) => ({
    name,
    trackingMultiplier: stats.trackingMultiplier,
    optimalMultiplier: stats.optimalMultiplier,
    falloffMultiplier: stats.falloffMultiplier,
  }));
  const scriptByName = new Map(scripts.map((s) => [s.name, s]));
  const computers: TrackingBoosterSpec[] = [];

  for (const line of moduleLines(parsed)) {
    if (line.offline) continue;

    const computerStats = db.trackingComputers[line.name];
    if (computerStats) {
      const scriptName = line.charge ?? undefined;
      const defaultScript = scriptName ? scriptByName.get(scriptName) : undefined;
      computers.push({
        moduleName: line.name,
        trackingBonusPercent: computerStats.trackingBonusPercent,
        optimalBonusPercent: computerStats.optimalBonusPercent,
        falloffBonusPercent: computerStats.falloffBonusPercent,
        defaultScript,
      });
    }
  }

  return { computers, scripts };
}

function resolveEwar(db: FittingDb, parsed: EftDocument): EwarLoadout {
  const scripts = Object.entries(db.disruptionScripts).map(([name, stats]) => ({
    name,
    trackingMultiplier: 1 + stats.trackingDeltaBonus / 100,
    optimalMultiplier: 1 + stats.rangeDeltaBonus / 100,
    falloffMultiplier: 1 + stats.falloffDeltaBonus / 100,
  }));
  const scriptByName = new Map(scripts.map((s) => [s.name, s]));
  const webs: StasisWebSpec[] = [];
  const grapplers: StasisGrapplerSpec[] = [];
  const disruptors: TrackingDisruptorSpec[] = [];
  const scramblers: WarpScramblerSpec[] = [];

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

    const grapplerStats = db.stasisGrapplers[line.name];
    if (grapplerStats) {
      grapplers.push({
        moduleName: line.name,
        optimal: grapplerStats.optimal,
        falloff: grapplerStats.falloff,
        speedFactor: Math.round(-grapplerStats.speedFactorPercent * 10000) / 1000000,
        overloadOptimalBonusPercent: grapplerStats.overloadOptimalBonusPercent,
      });
      continue;
    }

    const disruptorStats = db.trackingDisruptors[line.name];
    if (disruptorStats) {
      const scriptName = line.charge ?? undefined;
      const defaultScript = scriptName ? scriptByName.get(scriptName) : undefined;
      disruptors.push({
        moduleName: line.name,
        optimal: disruptorStats.optimal,
        falloff: disruptorStats.falloff,
        disruption: Math.round(-disruptorStats.disruptionPercent * 10000) / 1000000,
        defaultScript,
        overloadStrengthBonusPercent: disruptorStats.overloadStrengthBonusPercent,
      });
      continue;
    }

    const scramblerStats = db.warpScramblers[line.name];
    if (scramblerStats) {
      scramblers.push({
        moduleName: line.name,
        maxRange: scramblerStats.maxRange,
        overloadRangeBonusPercent: scramblerStats.overloadRangeBonusPercent,
      });
    }
  }

  if (webs.length === 0 && grapplers.length === 0 && disruptors.length === 0 && scramblers.length === 0 && scripts.length === 0) return { webs: [], grapplers: [], disruptors: [], scramblers: [], scripts: [] };
  return { webs, grapplers, disruptors, scramblers, scripts };
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

  for (const item of document.drones) classifyQuantity(db, buckets, item);
  for (const item of document.cargo) classifyQuantity(db, buckets, item);

  const sections: FittingSection[] = [];
  for (const kind of SECTION_ORDER) {
    if (buckets[kind].length > 0) sections.push({ kind, rows: buckets[kind] });
  }
  return sections;
}

function classifyQuantity(
  db: FittingDb,
  buckets: Record<FittingSectionKind, FittingRow[]>,
  item: QuantityItem,
): void {
  if (db.drones[item.name]) {
    buckets.drones.push({ name: item.name, quantity: item.quantity });
  } else {
    buckets.cargo.push({ name: item.name, quantity: item.quantity });
  }
}

function normalizeEftDocument(document: EftDocument, canonicalName: (name: string) => string): EftDocument {
  return {
    hullName: canonicalName(document.hullName),
    fittingName: document.fittingName,
    banks: document.banks.map((bank) => ({ bank: bank.bank, lines: bank.lines.map((line) => normalizeEftLine(line, canonicalName)) })),
    drones: document.drones.map((item) => ({ name: canonicalName(item.name), quantity: item.quantity })),
    cargo: document.cargo.map((item) => ({ name: canonicalName(item.name), quantity: item.quantity })),
  };
}

function normalizeEftLine(line: EftLine, canonicalName: (name: string) => string): EftLine {
  if (line.kind === "empty") return line;
  const charge = line.charge !== undefined ? canonicalName(line.charge) : line.charge;
  return { kind: "module", name: canonicalName(line.name), charge, offline: line.offline };
}

function serializeEftDocument(document: EftDocument): string {
  const lines: string[] = [`[${document.hullName}, ${document.fittingName}]`];
  for (const bank of document.banks) {
    if (lines.length > 1) lines.push("");
    for (const line of bank.lines) {
      if (line.kind === "empty") {
        lines.push(line.label);
      } else {
        const parts: string[] = [line.name];
        if (line.charge !== undefined) parts.push(line.charge);
        const suffix = line.offline ? " /OFFLINE" : "";
        lines.push(parts.join(", ") + suffix);
      }
    }
  }
  if (document.drones.length > 0) {
    if (lines.length > 1) lines.push("");
    for (const item of document.drones) lines.push(`${item.name} x${item.quantity}`);
  }
  if (document.cargo.length > 0) {
    if (lines.length > 1) lines.push("");
    for (const item of document.cargo) lines.push(`${item.name} x${item.quantity}`);
  }
  return lines.join("\n");
}


