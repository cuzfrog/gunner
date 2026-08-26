import type { ShipId, TypeId } from "../gamedata/ids";
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
import { moduleLines, parseEft, type BankKind, type EftDocument, type EftLine, type QuantityItem } from "./eft";

import type { ItemNameCatalog, ItemNameResolver } from "../gamedata/itemNames";
import type { ModuleSlotCatalog } from "../gamedata/moduleSlots";
import type { ChargeCatalog, CargoCharge, ImportedTurret, ImportedTurretBase } from "./chargeCatalog";
import type {
  FittingDb,
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
  readonly id?: TypeId;
  readonly charge?: string;
  readonly chargeId?: TypeId;
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
  readonly propulsion?: PropulsionStats & { readonly propulsionId: PropulsionId; readonly propulsionModuleId: TypeId; readonly propulsionName?: string };
  readonly turret?: ImportedTurret;
  readonly cargoCharges: readonly CargoCharge[];
  readonly ewar: EwarLoadout;
  readonly boosts: BoostLoadout;
}

export interface PropulsionVariant {
  readonly id: TypeId;
  readonly name: string;
}

export interface FittingImport {
  importFitting(text: string, conditions: StatConditions): ImportedFitting | undefined;
  propulsionVariantNames(module: PropulsionModule): readonly PropulsionVariant[];
  propulsionStats(name: string): PropulsionStats | undefined;
  propulsionStatsById(id: TypeId): PropulsionStats | undefined;
  summarize(text: string): FittingSummary | undefined;
  canonicalEftText(text: string): string | undefined;
  itemNameForId(id: TypeId, language: ShipNameLanguage): string;
}

export class FittingImportImpl implements FittingImport {
  private readonly ships: Ships;
  private readonly db: FittingDb;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly stacking: StackingPenalty;
  private readonly itemNameCatalog: ItemNameCatalog;
  private readonly itemNameResolver: ItemNameResolver;
  private readonly moduleSlotCatalog: ModuleSlotCatalog;

  constructor({
    ships,
    fittingDb,
    chargeCatalog,
    stackingPenalty,
    itemNameCatalog,
    itemNameResolver,
    moduleSlotCatalog,
  }: {
    ships: Ships;
    fittingDb: FittingDb;
    chargeCatalog: ChargeCatalog;
    stackingPenalty: StackingPenalty;
    itemNameCatalog: ItemNameCatalog;
    itemNameResolver: ItemNameResolver;
    moduleSlotCatalog: ModuleSlotCatalog;
  }) {
    this.ships = ships;
    this.db = fittingDb;
    this.chargeCatalog = chargeCatalog;
    this.stacking = stackingPenalty;
    this.itemNameCatalog = itemNameCatalog;
    this.itemNameResolver = itemNameResolver;
    this.moduleSlotCatalog = moduleSlotCatalog;
  }

  propulsionVariantNames(module: PropulsionModule): readonly PropulsionVariant[] {
    const matches = ([, stats]: [string, FittingModuleStats]) =>
      stats.propulsion?.kind === module.kind &&
      stats.propulsion?.sizeTier === module.sizeTier &&
      stats.propulsion.thrust > 0 &&
      stats.propulsion.speedBonus > 0;
    return Object.entries(this.db.modules)
      .filter(matches)
      .map(([, stats]) => ({ id: stats.id, name: stats.name }))
      .sort((a, b) => {
        const aStats = this.db.modules[a.id]?.propulsion;
        const bStats = this.db.modules[b.id]?.propulsion;
        if (!aStats || !bStats) return a.name.localeCompare(b.name);
        if (bStats.speedBonus !== aStats.speedBonus) return bStats.speedBonus - aStats.speedBonus;
        return a.name.localeCompare(b.name);
      });
  }

  propulsionStats(name: string): PropulsionStats | undefined {
    const stats = moduleByName(this.db, name)?.propulsion;
    if (!stats) return undefined;
    return { thrust: stats.thrust, speedBonus: stats.speedBonus, massAddition: stats.massAddition, sigBloom: stats.sigBloom };
  }

  propulsionStatsById(id: TypeId): PropulsionStats | undefined {
    const stats = this.db.modules[id]?.propulsion;
    if (!stats) return undefined;
    return { thrust: stats.thrust, speedBonus: stats.speedBonus, massAddition: stats.massAddition, sigBloom: stats.sigBloom };
  }

  importFitting(text: string, conditions: StatConditions): ImportedFitting | undefined {
    const parsed = parseEft(text, this.moduleSlotCatalog);
    if (!parsed) return undefined;

    const resolved = this.resolveEftDocument(parsed);
    if (!resolved) return undefined;

    const hullBonuses = this.db.hullBonuses[resolved.profile.id] ?? [];
    const hullSide = aggregateHullSide(resolved, this.db, hullBonuses, conditions.skillLevel, this.stacking);
    const propulsion = resolvePropulsion(resolved, this.ships, this.db, hullSide.propulsionId);
    const turret = resolveTurret(this.db, this.chargeCatalog, resolved, conditions.skillLevel, hullBonuses, this.stacking);
    const cargoCharges = resolveCargoCharges(this.db, resolved);
    const ewar = resolveEwar(this.db, resolved, this.itemNameCatalog);
    const boosts = resolveBoosts(this.db, resolved, this.itemNameCatalog);

    return {
      profile: resolved.profile,
      fittingName: resolved.fittingName,
      fitted: hullSide.fitted,
      propulsion,
      turret,
      cargoCharges,
      ewar,
      boosts,
    };
  }

  summarize(text: string): FittingSummary | undefined {
    const parsed = parseEft(text, this.moduleSlotCatalog);
    if (!parsed) return undefined;

    const resolved = this.resolveEftDocument(parsed);
    if (!resolved) return undefined;

    return {
      hullName: resolved.profile.name,
      fittingName: resolved.fittingName,
      sections: buildSections(resolved),
    };
  }

  canonicalEftText(text: string): string | undefined {
    const parsed = parseEft(text, this.moduleSlotCatalog);
    if (!parsed) return undefined;

    const resolved = this.resolveEftDocument(parsed);
    if (!resolved) return undefined;

    return serializeEftDocument(resolved);
  }

  itemNameForId(id: TypeId, language: ShipNameLanguage): string {
    return this.itemNameCatalog.nameForId(id, language);
  }

  private resolveEftDocument(document: EftDocument): ResolvedEft | undefined {
    const language = this.detectLanguage(document);
    if (!language) return undefined;

    const profile = this.ships.findHullByName(document.hullName, language);
    if (!profile) return undefined;

    const banks: ResolvedBank[] = [];
    for (const bank of document.banks) {
      const lines: ResolvedLine[] = [];
      for (const line of bank.lines) {
        const resolved = resolveLine(line, bank.bank, language, this.db, this.itemNameResolver, this.itemNameCatalog, this.moduleSlotCatalog);
        if (resolved) lines.push(resolved);
      }
      if (lines.length > 0) banks.push({ bank: bank.bank, lines });
    }

    const resolveQuantity = (item: QuantityItem, preferDrone: boolean): ResolvedQuantity => {
      const candidates = this.itemNameResolver.idsForName(item.name, language);
      const droneId = candidates.find((id) => this.db.drones[id] !== undefined);
      const chargeId = candidates.find((id) => this.db.charges[id] !== undefined);
      if (preferDrone && droneId) {
        return { kind: "resolved", id: droneId, name: this.itemNameCatalog.nameForId(droneId, "en"), quantity: item.quantity, isDrone: true };
      }
      if (chargeId) {
        return { kind: "resolved", id: chargeId, name: this.itemNameCatalog.nameForId(chargeId, "en"), quantity: item.quantity, isDrone: false };
      }
      if (droneId) {
        return { kind: "resolved", id: droneId, name: this.itemNameCatalog.nameForId(droneId, "en"), quantity: item.quantity, isDrone: true };
      }
      return { kind: "unresolved", name: item.name, quantity: item.quantity, isDrone: false };
    };

    const drones: ResolvedQuantity[] = [];
    const cargo: ResolvedQuantity[] = [];

    for (const item of document.drones) cargo.push(resolveQuantity(item, true));
    for (const item of document.cargo) cargo.push(resolveQuantity(item, false));

    return { profile, language, fittingName: document.fittingName, banks, drones, cargo };
  }

  private detectLanguage(document: EftDocument): ShipNameLanguage | undefined {
    for (const language of _detectionOrder(document)) {
      if (this.ships.findHullByName(document.hullName, language)) return language;
    }
    return undefined;
  }
}

interface ResolvedEft {
  readonly profile: ShipProfile;
  readonly language: ShipNameLanguage;
  readonly fittingName: string;
  readonly banks: readonly ResolvedBank[];
  readonly drones: readonly ResolvedQuantity[];
  readonly cargo: readonly ResolvedQuantity[];
}

interface ResolvedBank {
  readonly bank: BankKind;
  readonly lines: readonly ResolvedLine[];
}

type ResolvedLine =
  | { readonly kind: "empty"; readonly bank: BankKind; readonly label: string }
  | { readonly kind: "module"; readonly bank: BankKind; readonly moduleId: TypeId; readonly moduleName: string; readonly chargeId?: TypeId; readonly chargeName?: string; readonly offline: boolean }
  | { readonly kind: "unresolved"; readonly bank: BankKind; readonly name: string; readonly charge?: string; readonly offline: boolean };

type ResolvedQuantity =
  | { readonly kind: "resolved"; readonly id: TypeId; readonly name: string; readonly quantity: number; readonly isDrone: boolean }
  | { readonly kind: "unresolved"; readonly name: string; readonly quantity: number; readonly isDrone: boolean };

interface HullSideAggregation {
  readonly fitted: FittedHull;
  readonly propulsionId?: TypeId;
}

function resolveLine(
  line: EftLine,
  bank: BankKind,
  language: ShipNameLanguage,
  db: FittingDb,
  resolver: ItemNameResolver,
  catalog: ItemNameCatalog,
  slotCatalog: ModuleSlotCatalog,
): ResolvedLine | undefined {
  if (line.kind === "empty") return { kind: "empty", bank, label: line.label };

  const moduleIds = resolver.idsForName(line.name, language).filter((id) => isModuleRole(id, db));
  if (moduleIds.length === 0) {
    return { kind: "unresolved", bank, name: line.name, charge: line.charge, offline: line.offline };
  }

  const moduleId = moduleIds[0];
  const moduleName = catalog.nameForId(moduleId, "en");
  const resolvedBank = slotCatalog.slotOf(moduleName) ?? bank;

  let chargeId: TypeId | undefined;
  let chargeName: string | undefined;
  if (line.charge) {
    const chargeIds = resolver.idsForName(line.charge, language).filter((id) => isChargeRole(id, db));
    if (chargeIds.length > 0) {
      chargeId = chargeIds[0];
      chargeName = catalog.nameForId(chargeId, "en");
    }
  }

  return { kind: "module", bank: resolvedBank, moduleId, moduleName, chargeId, chargeName, offline: line.offline };
}

function isModuleRole(id: TypeId, db: FittingDb): boolean {
  return (
    db.modules[id] !== undefined ||
    db.turrets[id] !== undefined ||
    db.stasisWebs[id] !== undefined ||
    db.stasisGrapplers[id] !== undefined ||
    db.trackingComputers[id] !== undefined ||
    db.trackingDisruptors[id] !== undefined ||
    db.warpScramblers[id] !== undefined
  );
}

function isChargeRole(id: TypeId, db: FittingDb): boolean {
  return db.charges[id] !== undefined || db.scripts[id] !== undefined || db.disruptionScripts[id] !== undefined;
}

function isDroneRole(id: TypeId, db: FittingDb): boolean {
  return db.drones[id] !== undefined;
}

function moduleByName(db: FittingDb, name: string): FittingModuleStats | undefined {
  for (const stats of Object.values(db.modules)) {
    if (stats.name === name) return stats;
  }
  return undefined;
}

function aggregateHullSide(
  resolved: ResolvedEft,
  db: FittingDb,
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
  let propulsionId: TypeId | undefined;

  for (const bank of resolved.banks) {
    for (const line of bank.lines) {
      if (line.kind !== "module" || line.offline) continue;
      const stats = db.modules[line.moduleId];
      if (!stats) continue;

      if (stats.propulsion) {
        if (!propulsionId) propulsionId = line.moduleId;
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
      mass: resolved.profile.mass + flatMass,
      massMultiplier,
      speedMultiplier,
      inertiaMultiplier,
      sigMultiplier,
      sigRadiusAdd,
    },
    propulsionId,
  };
}

function resolvePropulsion(
  resolved: ResolvedEft,
  ships: Ships,
  db: FittingDb,
  propulsionId: TypeId | undefined,
): (PropulsionStats & { readonly propulsionId: PropulsionId; readonly propulsionModuleId: TypeId; readonly propulsionName: string }) | undefined {
  const id = propulsionId ?? findFirstPropulsionModuleId(resolved, db);
  if (!id) return undefined;

  const stats = db.modules[id]?.propulsion;
  if (!stats) return undefined;

  const propulsionIdGeneric = findGenericPropulsionId(ships, resolved.profile, stats.kind, stats.sizeTier);
  if (!propulsionIdGeneric) return undefined;

  return { ...stats, propulsionId: propulsionIdGeneric, propulsionModuleId: id, propulsionName: db.modules[id].name };
}

function findFirstPropulsionModuleId(resolved: ResolvedEft, db: FittingDb): TypeId | undefined {
  for (const bank of resolved.banks) {
    for (const line of bank.lines) {
      if (line.kind !== "module" || line.offline) continue;
      if (db.modules[line.moduleId]?.propulsion) return line.moduleId;
    }
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
  resolved: ResolvedEft,
  skillLevel: number,
  hullBonuses: readonly HullBonus[],
  stacking: StackingPenalty,
): ImportedTurret | undefined {
  const trackingPercents: number[] = [];
  const optimalPercents: number[] = [];
  const falloffPercents: number[] = [];
  let turret: TurretStats | undefined;
  let chargeId: TypeId | undefined;
  let moduleId: TypeId | undefined;

  for (const bank of resolved.banks) {
    for (const line of bank.lines) {
      if (line.kind !== "module" || line.offline) continue;

      const lineTurret = db.turrets[line.moduleId];
      if (lineTurret && !turret) {
        turret = lineTurret;
        chargeId = line.chargeId;
        moduleId = line.moduleId;
        continue;
      }

      const stats = db.modules[line.moduleId];
      if (!stats) continue;
      const script = line.chargeId ? db.scripts[line.chargeId] : undefined;
      collectTurretPercents(stats, script, trackingPercents, optimalPercents, falloffPercents);
    }
  }

  if (!turret || !moduleId) return undefined;

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

  const turretForChargeSelection: ImportedTurret = {
    tracking: base.tracking,
    sigResolutionClass: sigResClass,
    optimal: base.optimal,
    falloff: base.falloff,
    chargeSize: turret.chargeSize,
    chargeId: chargeId ?? chargeCatalog.usualForChargeSize(turret.chargeSize),
    base,
    moduleId,
  };
  const selectedCharge = chargeId && db.charges[chargeId] ? chargeId : chargeCatalog.usualForTurret(turretForChargeSelection);
  const charge = db.charges[selectedCharge] ?? {};

  return {
    tracking: base.tracking * (charge.trackingMultiplier ?? 1),
    sigResolutionClass: sigResClass,
    optimal: base.optimal * (charge.rangeMultiplier ?? 1),
    falloff: base.falloff * (charge.falloffMultiplier ?? 1),
    chargeSize: turret.chargeSize,
    chargeId: selectedCharge,
    base,
    moduleId,
  };
}

function resolveCargoCharges(db: FittingDb, resolved: ResolvedEft): readonly CargoCharge[] {
  const charges: CargoCharge[] = [];
  for (const item of resolved.drones) {
    if (item.kind === "resolved" && db.charges[item.id]) charges.push({ id: item.id, quantity: item.quantity });
  }
  for (const item of resolved.cargo) {
    if (item.kind === "resolved" && db.charges[item.id]) charges.push({ id: item.id, quantity: item.quantity });
  }
  return charges;
}

function resolveBoosts(db: FittingDb, resolved: ResolvedEft, catalog: ItemNameCatalog): BoostLoadout {
  const scripts = scriptSpecsFrom(db.scripts);
  const scriptByName = new Map(scripts.map((s) => [s.name, s]));
  const computers: TrackingBoosterSpec[] = [];

  for (const bank of resolved.banks) {
    for (const line of bank.lines) {
      if (line.kind !== "module" || line.offline) continue;

      const computerStats = db.trackingComputers[line.moduleId];
      if (computerStats) {
        const scriptName = line.chargeId ? catalog.nameForId(line.chargeId, "en") : undefined;
        const defaultScript = scriptName ? scriptByName.get(scriptName) : undefined;
        computers.push({
          moduleName: computerStats.name,
          moduleId: computerStats.id,
          trackingBonusPercent: computerStats.trackingBonusPercent,
          optimalBonusPercent: computerStats.optimalBonusPercent,
          falloffBonusPercent: computerStats.falloffBonusPercent,
          defaultScript,
        });
      }
    }
  }

  return { computers, scripts };
}

function resolveEwar(db: FittingDb, resolved: ResolvedEft, catalog: ItemNameCatalog): EwarLoadout {
  const scripts = disruptionScriptSpecsFrom(db.disruptionScripts);
  const scriptByName = new Map(scripts.map((s) => [s.name, s]));
  const webs: StasisWebSpec[] = [];
  const grapplers: StasisGrapplerSpec[] = [];
  const disruptors: TrackingDisruptorSpec[] = [];
  const scramblers: WarpScramblerSpec[] = [];

  for (const bank of resolved.banks) {
    for (const line of bank.lines) {
      if (line.kind !== "module" || line.offline) continue;

      const webStats = db.stasisWebs[line.moduleId];
      if (webStats) {
        webs.push({
          moduleName: webStats.name,
          moduleId: webStats.id,
          maxRange: webStats.maxRange,
          speedFactor: Math.round(-webStats.speedFactorPercent * 10000) / 1000000,
          overloadRangeBonusPercent: webStats.overloadRangeBonusPercent,
        });
        continue;
      }

      const grapplerStats = db.stasisGrapplers[line.moduleId];
      if (grapplerStats) {
        grapplers.push({
          moduleName: grapplerStats.name,
          moduleId: grapplerStats.id,
          optimal: grapplerStats.optimal,
          falloff: grapplerStats.falloff,
          speedFactor: Math.round(-grapplerStats.speedFactorPercent * 10000) / 1000000,
          overloadOptimalBonusPercent: grapplerStats.overloadOptimalBonusPercent,
        });
        continue;
      }

      const disruptorStats = db.trackingDisruptors[line.moduleId];
      if (disruptorStats) {
        const scriptName = line.chargeId ? catalog.nameForId(line.chargeId, "en") : undefined;
        const defaultScript = scriptName ? scriptByName.get(scriptName) : undefined;
        disruptors.push({
          moduleName: disruptorStats.name,
          moduleId: disruptorStats.id,
          optimal: disruptorStats.optimal,
          falloff: disruptorStats.falloff,
          disruption: Math.round(-disruptorStats.disruptionPercent * 10000) / 1000000,
          defaultScript,
          overloadStrengthBonusPercent: disruptorStats.overloadStrengthBonusPercent,
        });
        continue;
      }

      const scramblerStats = db.warpScramblers[line.moduleId];
      if (scramblerStats) {
        scramblers.push({
          moduleName: scramblerStats.name,
          moduleId: scramblerStats.id,
          maxRange: scramblerStats.maxRange,
          overloadRangeBonusPercent: scramblerStats.overloadRangeBonusPercent,
        });
      }
    }
  }

  if (webs.length === 0 && grapplers.length === 0 && disruptors.length === 0 && scramblers.length === 0 && scripts.length === 0) return { webs: [], grapplers: [], disruptors: [], scramblers: [], scripts: [] };
  return { webs, grapplers, disruptors, scramblers, scripts };
}

function scriptSpecsFrom(scripts: Readonly<Record<string, TurretScriptStats>>): TurretScriptSpec[] {
  const result: TurretScriptSpec[] = [];
  for (const stats of Object.values(scripts)) {
    result.push({
      name: stats.name,
      moduleId: stats.id,
      trackingMultiplier: stats.trackingMultiplier,
      optimalMultiplier: stats.optimalMultiplier,
      falloffMultiplier: stats.falloffMultiplier,
    });
  }
  return result;
}

function disruptionScriptSpecsFrom(scripts: Readonly<Record<string, DisruptionScriptStats>>): DisruptionScriptSpec[] {
  const result: DisruptionScriptSpec[] = [];
  for (const stats of Object.values(scripts)) {
    result.push({
      name: stats.name,
      moduleId: stats.id,
      trackingMultiplier: 1 + stats.trackingDeltaBonus / 100,
      optimalMultiplier: 1 + stats.rangeDeltaBonus / 100,
      falloffMultiplier: 1 + stats.falloffDeltaBonus / 100,
    });
  }
  return result;
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

const SECTION_ORDER: readonly FittingSectionKind[] = ["high", "mid", "low", "rig", "subsystem", "service", "cargo", "drones"] as const;
const CANONICAL_BANK_ORDER: readonly BankKind[] = ["low", "mid", "high", "rig", "subsystem", "service"] as const;

function buildSections(resolved: ResolvedEft): readonly FittingSection[] {
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

  for (const bank of resolved.banks) {
    for (const line of bank.lines) {
      if (line.kind === "empty") {
        buckets[line.bank].push({ name: line.label, empty: true });
      } else if (line.kind === "module") {
        buckets[line.bank].push({ name: line.moduleName, charge: line.chargeName, id: line.moduleId, chargeId: line.chargeId });
      } else {
        buckets[line.bank].push({ name: line.name, charge: line.charge });
      }
    }
  }

  for (const item of resolved.drones) classifyQuantity(buckets, item);
  for (const item of resolved.cargo) classifyQuantity(buckets, item);

  const sections: FittingSection[] = [];
  for (const kind of SECTION_ORDER) {
    if (buckets[kind].length > 0) sections.push({ kind, rows: buckets[kind] });
  }
  return sections;
}

function classifyQuantity(buckets: Record<FittingSectionKind, FittingRow[]>, item: ResolvedQuantity): void {
  if (item.kind === "resolved") {
    buckets[item.isDrone ? "drones" : "cargo"].push({ name: item.name, id: item.id, quantity: item.quantity });
  } else {
    buckets[item.isDrone ? "drones" : "cargo"].push({ name: item.name, quantity: item.quantity });
  }
}

function serializeEftDocument(resolved: ResolvedEft): string {
  const lines: string[] = [`[${resolved.profile.name}, ${resolved.fittingName}]`];
  const bankLines: Record<BankKind, string[]> = { low: [], mid: [], high: [], rig: [], subsystem: [], service: [] };
  for (const bank of resolved.banks) {
    for (const line of bank.lines) {
      const text = serializeResolvedLine(line);
      if (text) bankLines[line.bank].push(text);
    }
  }
  for (const kind of CANONICAL_BANK_ORDER) {
    if (bankLines[kind].length === 0) continue;
    if (lines.length > 1) lines.push("");
    for (const text of bankLines[kind]) lines.push(text);
  }

  if (resolved.drones.length > 0 || resolved.cargo.length > 0) {
    if (lines.length > 1) lines.push("");
    for (const item of resolved.drones) lines.push(`${item.name} x${item.quantity}`);
    if (resolved.drones.length > 0 && resolved.cargo.length > 0) lines.push("");
    for (const item of resolved.cargo) lines.push(`${item.name} x${item.quantity}`);
  }

  return lines.join("\n");
}

function serializeResolvedLine(line: ResolvedLine): string {
  if (line.kind === "empty") return line.label;
  if (line.kind === "module") {
    const parts: string[] = [line.moduleName];
    if (line.chargeName) parts.push(line.chargeName);
    return parts.join(", ") + (line.offline ? " /OFFLINE" : "");
  }
  const parts: string[] = [line.name];
  if (line.charge) parts.push(line.charge);
  return parts.join(", ") + (line.offline ? " /OFFLINE" : "");
}

export function _detectionOrder(document: EftDocument): ShipNameLanguage[] {
  const text = collectDocumentNames(document).join(" ");
  if (hasKana(text)) return ["ja", "zh", "en"];
  if (hasCjk(text)) return ["zh", "ja", "en"];
  return ["en", "zh", "ja"];
}

function collectDocumentNames(document: EftDocument): string[] {
  const names: string[] = [document.hullName];
  for (const bank of document.banks) {
    for (const line of bank.lines) {
      if (line.kind === "module") {
        names.push(line.name);
        if (line.charge) names.push(line.charge);
      }
    }
  }
  for (const item of document.drones) names.push(item.name);
  for (const item of document.cargo) names.push(item.name);
  return names;
}

const KANA_PATTERN = /\p{Script=Katakana}|\p{Script=Hiragana}/u;
const CJK_PATTERN = /\p{Script=Han}/u;

function hasKana(text: string): boolean {
  return KANA_PATTERN.test(text);
}

function hasCjk(text: string): boolean {
  return CJK_PATTERN.test(text);
}
