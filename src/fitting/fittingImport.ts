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
  SkillLevel,
  StatConditions,
} from "../ships";
import {
  SIG_RESOLUTIONS,
  type BoostLoadout,
  type DisruptionScriptSpec,
  type EwarLoadout,
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
import type { ChargeCatalog, CargoCharge, ImportedTurret, ImportedTurretBase, ImportedLauncher } from "./chargeCatalog";
import type { MissileCatalog } from "./missileCatalog";
import type { MissileSkillModel } from "./missileStats";
import { TRACKING_SKILL_BONUS, OPTIMAL_SKILL_BONUS, FALLOFF_SKILL_BONUS, STANDARD_SIGNATURE_RESOLUTION, sigResolutionClassFromChargeSize } from "./turretStats";
import type {
  FittingDb,
  ChargeStats,
  DisruptionScriptStats,
  FittingModuleStats,
  HullBonus,
  LauncherStats,
  MissileStats,
  SkillBonus,
  StasisGrapplerStats,
  StasisWebStats,
  TrackingComputerStats,
  TrackingDisruptorStats,
  TurretScriptStats,
  TurretStats,
  TurretWeaponGroup,
  WarpScramblerStats,
} from "../gamedata/fittingDb";

export type { FittingDb } from "../gamedata/fittingDb";
export type { ImportedTurret, ImportedTurretBase, ImportedLauncher, CargoCharge } from "./chargeCatalog";

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
  readonly turrets?: readonly ImportedTurret[];
  readonly launcher?: ImportedLauncher;
  readonly cargoCharges: readonly CargoCharge[];
  readonly ewar: EwarLoadout;
  readonly boosts: BoostLoadout;
  readonly hullBonuses: readonly HullBonus[];
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
  detectLanguageFromText(text: string): ShipNameLanguage | undefined;
}

export class FittingImportImpl implements FittingImport {
  private readonly ships: Ships;
  private readonly db: FittingDb;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly missileCatalog: MissileCatalog;
  private readonly missileSkillModel: MissileSkillModel;
  private readonly stacking: StackingPenalty;
  private readonly itemNameCatalog: ItemNameCatalog;
  private readonly itemNameResolver: ItemNameResolver;
  private readonly moduleSlotCatalog: ModuleSlotCatalog;

  constructor({
    ships,
    fittingDb,
    chargeCatalog,
    missileCatalog,
    missileSkillModel,
    stackingPenalty,
    itemNameCatalog,
    itemNameResolver,
    moduleSlotCatalog,
  }: {
    ships: Ships;
    fittingDb: FittingDb;
    chargeCatalog: ChargeCatalog;
    missileCatalog: MissileCatalog;
    missileSkillModel: MissileSkillModel;
    stackingPenalty: StackingPenalty;
    itemNameCatalog: ItemNameCatalog;
    itemNameResolver: ItemNameResolver;
    moduleSlotCatalog: ModuleSlotCatalog;
  }) {
    this.ships = ships;
    this.db = fittingDb;
    this.chargeCatalog = chargeCatalog;
    this.missileCatalog = missileCatalog;
    this.missileSkillModel = missileSkillModel;
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
    const parsed = parseEft(text);
    if (!parsed) return undefined;

    const resolved = this.resolveEftDocument(parsed);
    if (!resolved) return undefined;

    const hullBonuses = this.db.hullBonuses[resolved.profile.id] ?? [];
    const hullSide = aggregateHullSide(resolved, this.db, hullBonuses, conditions.skillLevel, this.stacking);
    const propulsion = resolvePropulsion(resolved, this.ships, this.db, hullSide.propulsionId);
    const turrets = resolveTurrets(this.db, this.chargeCatalog, resolved, conditions.skillLevel, hullBonuses, this.stacking);
    const turret = turrets.length > 0 ? turrets[0] : undefined;
    const launcher = resolveLauncher(this.db, this.missileCatalog, this.missileSkillModel, resolved, conditions.skillLevel, hullBonuses);
    const cargoCharges = resolveCargoCharges(this.db, resolved);
    const ewar = resolveEwar(this.db, resolved, this.itemNameCatalog);
    const boosts = resolveBoosts(this.db, resolved, this.itemNameCatalog);

    return {
      profile: resolved.profile,
      fittingName: resolved.fittingName,
      fitted: hullSide.fitted,
      propulsion,
      turret,
      turrets: turrets.length > 0 ? turrets : undefined,
      launcher,
      cargoCharges,
      ewar,
      boosts,
      hullBonuses,
    };
  }

  summarize(text: string): FittingSummary | undefined {
    const parsed = parseEft(text);
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
    const parsed = parseEft(text);
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
      if (candidates.length > 0) {
        return { kind: "resolved", id: candidates[0], name: this.itemNameCatalog.nameForId(candidates[0], "en"), quantity: item.quantity, isDrone: preferDrone };
      }
      return { kind: "unrecognized", name: item.name, quantity: item.quantity, isDrone: preferDrone };
    };

    const resolvedDrones: ResolvedQuantity[] = [];
    const resolvedCargo: ResolvedQuantity[] = [];

    for (const item of document.drones) resolvedDrones.push(resolveQuantity(item, true));
    for (const item of document.cargo) resolvedCargo.push(resolveQuantity(item, false));

    const drones: ResolvedQuantity[] = [];
    const cargo: ResolvedQuantity[] = [];
    for (const item of resolvedDrones) (item.isDrone ? drones : cargo).push(item);
    for (const item of resolvedCargo) (item.isDrone ? drones : cargo).push(item);

    return { profile, language, fittingName: document.fittingName, banks, drones, cargo };
  }

  private detectLanguage(document: EftDocument): ShipNameLanguage | undefined {
    for (const language of _detectionOrder(document)) {
      if (this.ships.findHullByName(document.hullName, language)) return language;
    }
    return undefined;
  }

  detectLanguageFromText(text: string): ShipNameLanguage | undefined {
    const parsed = parseEft(text);
    if (!parsed) return undefined;
    return this.detectLanguage(parsed);
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
  | { readonly kind: "unrecognized"; readonly bank: BankKind; readonly name: string; readonly charge?: string; readonly offline: boolean; readonly id?: TypeId; readonly chargeId?: TypeId };

type ResolvedQuantity =
  | { readonly kind: "resolved"; readonly id: TypeId; readonly name: string; readonly quantity: number; readonly isDrone: boolean }
  | { readonly kind: "unrecognized"; readonly name: string; readonly quantity: number; readonly isDrone: boolean; readonly id?: TypeId };

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

  const candidateIds = resolver.idsForName(line.name, language);
  const moduleIds = candidateIds.filter((id) => isModuleRole(id, db));
  const id = moduleIds[0] ?? candidateIds[0];

  const chargeCandidates = line.charge ? resolver.idsForName(line.charge, language) : [];
  const chargeId = chargeCandidates.find((cid) => isChargeRole(cid, db)) ?? chargeCandidates[0];

  if (moduleIds.length === 0) {
    const resolvedBank = id ? (slotCatalog.slotOf(id) ?? bank) : bank;
    return { kind: "unrecognized", bank: resolvedBank, name: line.name, charge: line.charge, offline: line.offline, id, chargeId };
  }

  const moduleId = moduleIds[0];
  const moduleName = catalog.nameForId(moduleId, "en");
  const resolvedBank = slotCatalog.slotOf(moduleId) ?? bank;
  const chargeName = chargeId ? catalog.nameForId(chargeId, "en") : undefined;

  return { kind: "module", bank: resolvedBank, moduleId, moduleName, chargeId, chargeName, offline: line.offline };
}

function isModuleRole(id: TypeId, db: FittingDb): boolean {
  return (
    db.modules[id] !== undefined ||
    db.turrets[id] !== undefined ||
    db.launchers[id] !== undefined ||
    db.stasisWebs[id] !== undefined ||
    db.stasisGrapplers[id] !== undefined ||
    db.trackingComputers[id] !== undefined ||
    db.trackingDisruptors[id] !== undefined ||
    db.warpScramblers[id] !== undefined
  );
}

function isChargeRole(id: TypeId, db: FittingDb): boolean {
  return db.charges[id] !== undefined || db.scripts[id] !== undefined || db.disruptionScripts[id] !== undefined || db.missiles[id] !== undefined;
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

function resolveTurrets(
  db: FittingDb,
  chargeCatalog: ChargeCatalog,
  resolved: ResolvedEft,
  skillLevel: number,
  hullBonuses: readonly HullBonus[],
  stacking: StackingPenalty,
): readonly ImportedTurret[] {
  const sharedTrackingPercents: number[] = [];
  const sharedOptimalPercents: number[] = [];
  const sharedFalloffPercents: number[] = [];
  const damageMultipliersByGroup = new Map<TurretWeaponGroup, number[]>();
  const speedMultipliersByGroup = new Map<TurretWeaponGroup, number[]>();
  const counts = new Map<TypeId, { count: number; chargeId?: TypeId; order: number }>();
  let order = 0;

  for (const bank of resolved.banks) {
    for (const line of bank.lines) {
      if (line.kind !== "module" || line.offline) continue;

      const lineTurret = db.turrets[line.moduleId];
      if (lineTurret) {
        const existing = counts.get(line.moduleId);
        if (existing) {
          existing.count++;
          if (existing.chargeId === undefined && line.chargeId !== undefined) existing.chargeId = line.chargeId;
        } else {
          counts.set(line.moduleId, { count: 1, chargeId: line.chargeId, order: order++ });
        }
        continue;
      }

      const stats = db.modules[line.moduleId];
      if (!stats) continue;
      const script = line.chargeId ? db.scripts[line.chargeId] : undefined;
      collectTurretPercents(stats, script, sharedTrackingPercents, sharedOptimalPercents, sharedFalloffPercents);
      collectDamageModuleModifiers(stats, damageMultipliersByGroup, speedMultipliersByGroup);
    }
  }

  if (counts.size === 0) return [];

  const skillRoFMultiplier = computeSkillRoFMultiplier(db.skillBonuses, skillLevel);

  const entries = [...counts.entries()].sort((a, b) => {
    if (b[1].count !== a[1].count) return b[1].count - a[1].count;
    return a[1].order - b[1].order;
  });

  const result: ImportedTurret[] = [];
  for (const [moduleId, entry] of entries) {
    const turret = db.turrets[moduleId];
    if (!turret) continue;
    const weaponGroup = turretWeaponGroupFromSkill(turret.turretSkill);
    const chargeId = entry.chargeId;

    const hullTrackingPercents: number[] = [];
    const hullOptimalPercents: number[] = [];
    const hullFalloffPercents: number[] = [];
    const hullDamagePercents: number[] = [];
    const hullRoFPercents: number[] = [];

    for (const bonus of hullBonuses) {
      if (bonus.turretSkill && turret.turretSkill !== bonus.turretSkill) continue;
      const percent = hullBonusPercent(bonus, skillLevel);
      if (bonus.attribute === "turretTracking") hullTrackingPercents.push(percent);
      if (bonus.attribute === "turretOptimal") hullOptimalPercents.push(percent);
      if (bonus.attribute === "turretFalloff") hullFalloffPercents.push(percent);
      if (bonus.attribute === "turretDamage") hullDamagePercents.push(percent);
      if (bonus.attribute === "turretRoF") hullRoFPercents.push(percent);
    }

    const trackingBonus = stacking.apply([...sharedTrackingPercents, ...hullTrackingPercents].map((p) => 1 + p / 100));
    const optimalBonus = stacking.apply([...sharedOptimalPercents, ...hullOptimalPercents].map((p) => 1 + p / 100));
    const falloffBonus = stacking.apply([...sharedFalloffPercents, ...hullFalloffPercents].map((p) => 1 + p / 100));

    const moduleDamageMultipliers = weaponGroup ? (damageMultipliersByGroup.get(weaponGroup) ?? []) : [];
    const moduleSpeedMultipliers = weaponGroup ? (speedMultipliersByGroup.get(weaponGroup) ?? []) : [];
    const moduleDamageBonus = stacking.apply(moduleDamageMultipliers);
    const moduleSpeedBonus = stacking.apply(moduleSpeedMultipliers);
    const hullDamageMultiplier = hullDamagePercents.reduce((acc, p) => acc * (1 + p / 100), 1);
    const hullRoFMultiplier = hullRoFPercents.reduce((acc, p) => acc * (1 + p / 100), 1);

    const skillDamageMultiplier = computeSkillDamageMultiplier(db.skillBonuses, turret.turretSkill, weaponGroup, skillLevel);

    const modifiedDamageMultiplier = turret.damageMultiplier * moduleDamageBonus * hullDamageMultiplier * skillDamageMultiplier;
    const modifiedCycleTime = turret.cycleTime * moduleSpeedBonus * hullRoFMultiplier * skillRoFMultiplier;

    const sigResClass = sigResolutionClassFromChargeSize(turret.chargeSize);
    const sigRes = SIG_RESOLUTIONS[sigResClass];
    const skillTrackingMultiplier = 1 + TRACKING_SKILL_BONUS * skillLevel;
    const skillOptimalMultiplier = 1 + OPTIMAL_SKILL_BONUS * skillLevel;
    const skillFalloffMultiplier = 1 + FALLOFF_SKILL_BONUS * skillLevel;

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
      damageMultiplier: modifiedDamageMultiplier,
      damagePerShot: 0,
      cycleTime: modifiedCycleTime,
      turretCount: entry.count,
    };
    const selectedCharge = chargeId && db.charges[chargeId] ? chargeId : chargeCatalog.usualForTurret(turretForChargeSelection);
    const charge = db.charges[selectedCharge] ?? {};
    const chargeDamage = (charge.emDamage ?? 0) + (charge.thermalDamage ?? 0) + (charge.kineticDamage ?? 0) + (charge.explosiveDamage ?? 0);

    result.push({
      tracking: base.tracking * (charge.trackingMultiplier ?? 1),
      sigResolutionClass: sigResClass,
      optimal: base.optimal * (charge.rangeMultiplier ?? 1),
      falloff: base.falloff * (charge.falloffMultiplier ?? 1),
      chargeSize: turret.chargeSize,
      chargeId: selectedCharge,
      base,
      moduleId,
      damageMultiplier: modifiedDamageMultiplier,
      damagePerShot: modifiedDamageMultiplier * chargeDamage,
      cycleTime: modifiedCycleTime,
      turretCount: entry.count,
    });
  }

  return result;
}

function resolveLauncher(
  db: FittingDb,
  missileCatalog: MissileCatalog,
  missileSkillModel: MissileSkillModel,
  resolved: ResolvedEft,
  skillLevel: SkillLevel,
  hullBonuses: readonly HullBonus[],
): ImportedLauncher | undefined {
  const counts = new Map<TypeId, { count: number; chargeId?: TypeId; order: number }>();
  let order = 0;
  for (const bank of resolved.banks) {
    for (const line of bank.lines) {
      if (line.kind !== "module" || line.offline) continue;
      const launcherStats = db.launchers[line.moduleId];
      if (!launcherStats) continue;
      const existing = counts.get(line.moduleId);
      if (existing) {
        existing.count++;
        if (existing.chargeId === undefined && line.chargeId !== undefined) existing.chargeId = line.chargeId;
      } else {
        counts.set(line.moduleId, { count: 1, chargeId: line.chargeId, order: order++ });
      }
    }
  }
  if (counts.size === 0) return undefined;

  let bestModuleId: TypeId | undefined;
  let bestCount = 0;
  let bestOrder = Infinity;
  for (const [moduleId, entry] of counts) {
    if (entry.count > bestCount || (entry.count === bestCount && entry.order < bestOrder)) {
      bestModuleId = moduleId;
      bestCount = entry.count;
      bestOrder = entry.order;
    }
  }
  if (!bestModuleId) return undefined;

  const launcherStats = db.launchers[bestModuleId];
  if (!launcherStats) return undefined;

  const chargeId = resolveMissileChargeId(db, missileCatalog, launcherStats, counts.get(bestModuleId)?.chargeId);
  if (!chargeId) return undefined;

  const missileStats = db.missiles[chargeId];
  if (!missileStats) return undefined;

  const output = missileSkillModel.compute(launcherStats, missileStats, hullBonuses, skillLevel);
  return {
    moduleId: bestModuleId,
    name: launcherStats.name,
    count: bestCount,
    chargeId,
    chargeName: missileStats.name,
    damagePerMissile: output.damagePerMissile,
    cycleTime: output.cycleTime,
    explosionRadius: output.explosionRadius,
    explosionVelocity: output.explosionVelocity,
    damageReductionFactor: output.damageReductionFactor,
    maxVelocity: output.maxVelocity,
    flightTime: output.flightTime,
  };
}

function resolveMissileChargeId(db: FittingDb, missileCatalog: MissileCatalog, launcher: LauncherStats, loadedChargeId: TypeId | undefined): TypeId | undefined {
  if (loadedChargeId && db.missiles[loadedChargeId] && launcher.chargeGroups.includes(db.missiles[loadedChargeId].chargeGroup)) {
    return loadedChargeId;
  }
  return missileCatalog.usualForLauncher(launcher);
}

function resolveCargoCharges(db: FittingDb, resolved: ResolvedEft): readonly CargoCharge[] {
  const charges: CargoCharge[] = [];
  for (const item of resolved.drones) {
    if (item.kind === "resolved" && (db.charges[item.id] || db.missiles[item.id])) charges.push({ id: item.id, quantity: item.quantity });
  }
  for (const item of resolved.cargo) {
    if (item.kind === "resolved" && (db.charges[item.id] || db.missiles[item.id])) charges.push({ id: item.id, quantity: item.quantity });
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

function collectDamageModuleModifiers(
  stats: FittingModuleStats,
  damageMultipliersByGroup: Map<TurretWeaponGroup, number[]>,
  speedMultipliersByGroup: Map<TurretWeaponGroup, number[]>,
): void {
  if (!stats.turretWeaponGroup) return;
  const group = stats.turretWeaponGroup;
  if (stats.turretDamageMultiplier && stats.turretDamageMultiplier !== 1) {
    const list = damageMultipliersByGroup.get(group) ?? [];
    list.push(stats.turretDamageMultiplier);
    damageMultipliersByGroup.set(group, list);
  }
  if (stats.turretSpeedMultiplier && stats.turretSpeedMultiplier !== 1) {
    const list = speedMultipliersByGroup.get(group) ?? [];
    list.push(stats.turretSpeedMultiplier);
    speedMultipliersByGroup.set(group, list);
  }
}

function turretWeaponGroupFromSkill(turretSkill: string | undefined): TurretWeaponGroup | undefined {
  if (!turretSkill) return undefined;
  if (turretSkill.includes("Energy")) return "Energy Weapon";
  if (turretSkill.includes("Hybrid")) return "Hybrid Weapon";
  if (turretSkill.includes("Projectile")) return "Projectile Weapon";
  return undefined;
}

function computeSkillDamageMultiplier(
  skillBonuses: readonly SkillBonus[],
  turretSkill: string | undefined,
  weaponGroup: TurretWeaponGroup | undefined,
  skillLevel: number,
): number {
  let multiplier = 1;
  for (const bonus of skillBonuses) {
    if (bonus.bonusType !== "turretDamage") continue;
    if (bonus.weaponGroup && bonus.weaponGroup !== weaponGroup) continue;
    if (bonus.turretSkill && bonus.turretSkill !== turretSkill) continue;
    multiplier *= 1 + (bonus.magnitudePerLevel * skillLevel) / 100;
  }
  return multiplier;
}

function computeSkillRoFMultiplier(skillBonuses: readonly SkillBonus[], skillLevel: number): number {
  let multiplier = 1;
  for (const bonus of skillBonuses) {
    if (bonus.bonusType !== "turretRoF") continue;
    multiplier *= 1 + (bonus.magnitudePerLevel * skillLevel) / 100;
  }
  return multiplier;
}

function hullBonusPercent(bonus: HullBonus, skillLevel: number): number {
  return bonus.magnitude * (bonus.skill ? skillLevel : 1);
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
        buckets[line.bank].push({ name: line.name, charge: line.charge, id: line.id, chargeId: line.chargeId });
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
    lines.push("");
    for (const text of bankLines[kind]) lines.push(text);
  }

  if (resolved.drones.length > 0 || resolved.cargo.length > 0) {
    if (lines.length > 1) {
      lines.push("");
      lines.push("");
    } else {
      lines.push("");
    }
    for (const item of resolved.drones) lines.push(`${item.name} x${item.quantity}`);
    if (resolved.drones.length > 0 && resolved.cargo.length > 0) {
      lines.push("");
      lines.push("");
    }
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
