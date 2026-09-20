import type { TypeId } from "../gamedata/ids";
import type {
  FittedHull,
  PropulsionId,
  PropulsionModule,
  PropulsionStats,
  ShipNameLanguage,
  ShipProfile,
  Ships,
  SkillLevel,
  StatConditions,
} from "../ships";
import { type BoostLoadout, type BurstEffectKind, type BurstEffectSpec, type CommandBurstSpec, type EwarLoadout, type MissileBoosterLoadout, type SensorBoostLoadout, type SensorSpec, type StackingPenalty } from "../sim";
import { parseEft, type BankKind, type EftDocument, type EftLine, type QuantityItem } from "./eft";

import type { ItemNameCatalog, ItemNameResolver } from "../gamedata/itemNames";
import type { ModuleSlotCatalog } from "../gamedata/moduleSlots";
import type { ChargeCatalog, CargoCharge, ImportedTurret, ImportedLauncher, ImportedVorton } from "./chargeCatalog";
import type { ImportedDrone } from "./droneCatalog";
import type { GunFamilies } from "./gunFamilies";
import type { MissileCatalog } from "./missileCatalog";
import type { MissileSkillModel } from "./missileStats";
import type { DroneCatalog } from "./droneCatalog";
import type { DroneSkillModel } from "./droneStats";
import type { FighterSkillModel } from "./fighterStats";
import type { ImportedFighter } from "./fighterCatalog";
import { FittingStateFactory, type FittingState, type FittingModuleEntry, type CargoEntry } from "./fittingState";
import { FittingCalculatorImpl, type FittingCalculator } from "./fittingCalculator";
import { FittingResourcesCalculatorImpl, type FittingResourcesCalculator } from "./fittingResourcesCalculator";
import { DefenseCalculatorImpl, type DefenseCalculator } from "./defenseCalculator";
import { CapacitorCalculatorImpl, type CapacitorDrainSources, type CapacitorStats } from "./capacitorCalculator";
import type { FittingDb, FittingModuleStats, FittingResources, HullBonus } from "../gamedata/fittingDb";
import type { DefenseSpec } from "../sim";

export type { FittingDb } from "../gamedata/fittingDb";
export type { ImportedTurret, ImportedLauncher, ImportedVorton, CargoCharge } from "./chargeCatalog";

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
  // Static capacitor readout for the preview, at level-5-skill conditions.
  readonly capacitor?: {
    readonly capacity: number;
    readonly rechargeTime: number;
    readonly usagePerSecond: number;
    readonly stablePercent?: number;
    readonly depletesInSeconds?: number;
  };
  // Static powergrid/CPU readout for the preview, at level-5-skill conditions.
  readonly resources?: FittingResources;
}

export interface ImportedFitting {
  readonly profile: ShipProfile;
  readonly fittingName: string;
  readonly fitted: FittedHull;
  readonly fittingState: FittingState;
  readonly propulsion?: PropulsionStats & { readonly propulsionId: PropulsionId; readonly propulsionModuleId: TypeId; readonly propulsionName?: string };
  readonly turret?: ImportedTurret;
  readonly turrets?: readonly ImportedTurret[];
  readonly launcher?: ImportedLauncher;
  readonly vortons: readonly ImportedVorton[];
  readonly drones: readonly ImportedDrone[];
  readonly fighters: readonly ImportedFighter[];
  readonly cargoCharges: readonly CargoCharge[];
  readonly ewar: EwarLoadout;
  readonly energyWarfareResistancePercent: number;
  readonly boosts: BoostLoadout;
  readonly missileBoosts: MissileBoosterLoadout;
  readonly sensorSpec: SensorSpec;
  readonly sensorBoosts: SensorBoostLoadout;
  readonly hullBonuses: readonly HullBonus[];
  readonly defense: DefenseSpec;
  readonly commandBursts: readonly CommandBurstSpec[];
  readonly capacitor: CapacitorStats;
  readonly resources: FittingResources;
}

export interface PropulsionVariant {
  readonly id: TypeId;
  readonly name: string;
}

export interface FittingImport {
  importFitting(text: string, conditions: StatConditions): ImportedFitting | undefined;
  /** Re-resolves the capacitor preview from the imported skeleton with live drain sources (propulsion selection, loadout projections, skills). */
  resolveCapacitorStats(imported: ImportedFitting, conditions: StatConditions, sources: CapacitorDrainSources): CapacitorStats;
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
  private readonly itemNameCatalog: ItemNameCatalog;
  private readonly itemNameResolver: ItemNameResolver;
  private readonly moduleSlotCatalog: ModuleSlotCatalog;
  private readonly fittingStateFactory: FittingStateFactory;
  private readonly calculator: FittingCalculator;
  private readonly defenseCalculator: DefenseCalculator;
  private readonly capacitorCalculator: CapacitorCalculatorImpl;
  private readonly resourcesCalculator: FittingResourcesCalculator;

  constructor({
    ships,
    fittingDb,
    chargeCatalog,
    gunFamilies,
    missileCatalog,
    missileSkillModel,
    droneCatalog,
    droneSkillModel,
    fighterSkillModel,
    stackingPenalty,
    itemNameCatalog,
    itemNameResolver,
    moduleSlotCatalog,
  }: {
    ships: Ships;
    fittingDb: FittingDb;
    chargeCatalog: ChargeCatalog;
    gunFamilies: GunFamilies;
    missileCatalog: MissileCatalog;
    missileSkillModel: MissileSkillModel;
    droneCatalog: DroneCatalog;
    droneSkillModel: DroneSkillModel;
    fighterSkillModel: FighterSkillModel;
    stackingPenalty: StackingPenalty;
    itemNameCatalog: ItemNameCatalog;
    itemNameResolver: ItemNameResolver;
    moduleSlotCatalog: ModuleSlotCatalog;
  }) {
    this.ships = ships;
    this.db = fittingDb;
    this.itemNameCatalog = itemNameCatalog;
    this.itemNameResolver = itemNameResolver;
    this.moduleSlotCatalog = moduleSlotCatalog;
    this.fittingStateFactory = new FittingStateFactory(fittingDb);
    this.calculator = new FittingCalculatorImpl({ fittingDb, ships, chargeCatalog, gunFamilies, missileCatalog, missileSkillModel, droneCatalog, droneSkillModel, fighterSkillModel, stackingPenalty, itemNameCatalog });
    this.defenseCalculator = new DefenseCalculatorImpl({ fittingDb, stackingPenalty });
    this.capacitorCalculator = new CapacitorCalculatorImpl({ fittingDb, stackingPenalty });
    this.resourcesCalculator = new FittingResourcesCalculatorImpl({ fittingDb, stackingPenalty });
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
    return { thrust: stats.thrust, speedBonus: stats.speedBonus, massAddition: stats.massAddition, sigBloom: stats.sigBloom, capacitorNeed: stats.capacitorNeed, ...(stats.capacitorCapacityMultiplier !== undefined ? { capacitorCapacityMultiplier: stats.capacitorCapacityMultiplier } : {}) };
  }

  propulsionStatsById(id: TypeId): PropulsionStats | undefined {
    const stats = this.db.modules[id]?.propulsion;
    if (!stats) return undefined;
    return { thrust: stats.thrust, speedBonus: stats.speedBonus, massAddition: stats.massAddition, sigBloom: stats.sigBloom, capacitorNeed: stats.capacitorNeed, ...(stats.capacitorCapacityMultiplier !== undefined ? { capacitorCapacityMultiplier: stats.capacitorCapacityMultiplier } : {}) };
  }

  resolveCapacitorStats(imported: ImportedFitting, conditions: StatConditions, sources: CapacitorDrainSources): CapacitorStats {
    return this.capacitorCalculator.resolve(imported.fittingState, conditions, sources);
  }

  importFitting(text: string, conditions: StatConditions): ImportedFitting | undefined {
    const parsed = parseEft(text);
    if (!parsed) return undefined;

    const resolved = this.resolveEftDocument(parsed);
    if (!resolved) return undefined;

    const hullBonuses = this.db.hullBonuses[resolved.profile.id] ?? [];
    const fittingState = this.fittingStateFactory.create(resolved.profile, hullBonuses, collectModuleEntries(resolved), collectCargoEntries(resolved.drones), collectCargoEntries(resolved.fighters), collectCargoEntries(resolved.cargo));
    const hullSide = this.calculator.resolveHull(fittingState, conditions);
    const propulsion = this.calculator.resolvePropulsion(fittingState);
    const turrets = this.calculator.resolveTurrets(fittingState, conditions);
    const turret = turrets.length > 0 ? turrets[0] : undefined;
    const launcher = this.calculator.resolveLauncher(fittingState, conditions);
    const vortons = this.calculator.resolveVortons(fittingState, conditions);
    const drones = this.calculator.resolveDrones(fittingState, conditions);
    const fighters = this.calculator.resolveFighters(fittingState, conditions);
    const cargoCharges = this.calculator.resolveCargoCharges(fittingState);
    const ewar = this.calculator.resolveEwar(fittingState, conditions);
    const energyWarfareResistancePercent = this.calculator.resolveEnergyWarfareResistance(fittingState);
    const boosts = this.calculator.resolveBoosts(fittingState, conditions);
    const missileBoosts = this.calculator.resolveMissileBoosts(fittingState, conditions);
    const sensorSpec = this.calculator.resolveSensorSpec(fittingState, conditions);
    const sensorBoosts = this.calculator.resolveSensorBoosts(fittingState, conditions);
    const defense = this.defenseCalculator.resolve(fittingState, conditions);
    const turretDrains = turrets.map((turret) => ({ moduleId: turret.moduleId, capacitorNeed: turret.capacitorNeed, cycleTime: turret.cycleTime, count: turret.turretCount }));
    const commandBursts = resolveCommandBurstSpecs(fittingState, this.db);
    const capacitor = this.capacitorCalculator.resolve(fittingState, conditions, { defense, turretDrains, ewar, boosts, missileBoosts, sensorBoosts, commandBursts, propulsionModuleId: fittingState.propulsionModule?.moduleId });
    const resources = this.resourcesCalculator.resolve(fittingState, conditions);

    return {
      profile: resolved.profile,
      fittingName: resolved.fittingName,
      fitted: hullSide.fitted,
      fittingState,
      propulsion,
      turret,
      turrets: turrets.length > 0 ? turrets : undefined,
      launcher,
      vortons,
      drones,
      fighters,
      cargoCharges,
      ewar,
      energyWarfareResistancePercent,
      boosts,
      missileBoosts,
      sensorSpec,
      sensorBoosts,
      hullBonuses: fittingState.hullBonuses,
      defense,
      commandBursts,
      capacitor,
      resources,
    };
  }

  summarize(text: string): FittingSummary | undefined {
    const parsed = parseEft(text);
    if (!parsed) return undefined;

    const resolved = this.resolveEftDocument(parsed);
    if (!resolved) return undefined;

    const imported = this.importFitting(text, PREVIEW_CONDITIONS);
    const capacitor = imported ? capacitorSummaryFrom(imported.capacitor) : undefined;
    const resources = imported ? imported.resources : undefined;
    return {
      hullName: resolved.profile.name,
      fittingName: resolved.fittingName,
      sections: buildSections(resolved),
      ...(capacitor ? { capacitor } : {}),
      ...(resources ? { resources } : {}),
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
      const chargeId = candidates.find((id) => isChargeRole(id, this.db));
      const fighterId = candidates.find((id) => this.db.fighters[id] !== undefined);
      // Classification is type-driven; the source band (preferDrone) only breaks ties when a
      // name resolves to both a drone and a charge. Items that are neither follow the band,
      // which the parser flags as ambiguous when it could be either the drone bay or the cargo hold.
      if (droneId !== undefined && chargeId !== undefined) {
        const id = preferDrone ? droneId : chargeId;
        return { kind: "resolved", id, name: this.itemNameCatalog.nameForId(id, "en"), quantity: item.quantity, bay: preferDrone ? "drone" : "cargo" };
      }
      if (droneId !== undefined) return { kind: "resolved", id: droneId, name: this.itemNameCatalog.nameForId(droneId, "en"), quantity: item.quantity, bay: "drone" };
      if (chargeId !== undefined) return { kind: "resolved", id: chargeId, name: this.itemNameCatalog.nameForId(chargeId, "en"), quantity: item.quantity, bay: "cargo" };
      if (fighterId !== undefined) return { kind: "resolved", id: fighterId, name: this.itemNameCatalog.nameForId(fighterId, "en"), quantity: item.quantity, bay: "fighter" };
      if (candidates.length > 0) return { kind: "resolved", id: candidates[0], name: this.itemNameCatalog.nameForId(candidates[0], "en"), quantity: item.quantity, bay: preferDrone ? "drone" : "cargo" };
      return { kind: "unrecognized", name: item.name, quantity: item.quantity, bay: preferDrone ? "drone" : "cargo" };
    };

    const resolvedDrones: ResolvedQuantity[] = [];
    const resolvedCargo: ResolvedQuantity[] = [];

    const dronesBandTrusted = !document.droneBandAmbiguous;
    for (const item of document.drones) resolvedDrones.push(resolveQuantity(item, dronesBandTrusted));
    for (const item of document.cargo) resolvedCargo.push(resolveQuantity(item, false));

    const drones: ResolvedQuantity[] = [];
    const fighters: ResolvedQuantity[] = [];
    const cargo: ResolvedQuantity[] = [];
    for (const item of resolvedDrones) pushByBay(item, drones, fighters, cargo);
    for (const item of resolvedCargo) pushByBay(item, drones, fighters, cargo);

    return { profile, language, fittingName: document.fittingName, banks, drones, fighters, cargo };
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
  readonly fighters: readonly ResolvedQuantity[];
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
  | { readonly kind: "resolved"; readonly id: TypeId; readonly name: string; readonly quantity: number; readonly bay: QuantityBay }
  | { readonly kind: "unrecognized"; readonly name: string; readonly quantity: number; readonly bay: QuantityBay; readonly id?: TypeId };

// Quantity items land in the drone bay, the fighter hangar, or the cargo hold. Fighters display
// inside the drones section of summaries.
type QuantityBay = "drone" | "fighter" | "cargo";

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
    db.vortons[id] !== undefined ||
    db.subsystemBonuses[id] !== undefined ||
    db.subsystems[id] !== undefined ||
    db.stasisWebs[id] !== undefined ||
    db.stasisGrapplers[id] !== undefined ||
    db.trackingComputers[id] !== undefined ||
    db.trackingDisruptors[id] !== undefined ||
    db.warpScramblers[id] !== undefined ||
    db.targetPainters[id] !== undefined ||
    db.jammers[id] !== undefined ||
    db.missileGuidanceComputers[id] !== undefined ||
    db.missileGuidanceEnhancers[id] !== undefined ||
    db.omnidirectionalTrackingLinks[id] !== undefined ||
    db.omnidirectionalTrackingEnhancers[id] !== undefined ||
    db.commandBursts[id] !== undefined
  );
}

function isChargeRole(id: TypeId, db: FittingDb): boolean {
  return db.charges[id] !== undefined || db.scripts[id] !== undefined || db.disruptionScripts[id] !== undefined || db.missiles[id] !== undefined || db.missileScripts[id] !== undefined || db.sensorBoosterScripts[id] !== undefined || db.sensorDampenerScripts[id] !== undefined;
}

function moduleByName(db: FittingDb, name: string): FittingModuleStats | undefined {
  for (const stats of Object.values(db.modules)) {
    if (stats.name === name) return stats;
  }
  return undefined;
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
  for (const item of resolved.fighters) classifyQuantity(buckets, item);
  for (const item of resolved.cargo) classifyQuantity(buckets, item);

  const sections: FittingSection[] = [];
  for (const kind of SECTION_ORDER) {
    if (buckets[kind].length > 0) sections.push({ kind, rows: buckets[kind] });
  }
  return sections;
}

function classifyQuantity(buckets: Record<FittingSectionKind, FittingRow[]>, item: ResolvedQuantity): void {
  if (item.kind === "resolved") {
    buckets[item.bay === "cargo" ? "cargo" : "drones"].push({ name: item.name, id: item.id, quantity: item.quantity });
  } else {
    buckets[item.bay === "cargo" ? "cargo" : "drones"].push({ name: item.name, quantity: item.quantity });
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

  if (resolved.drones.length > 0 || resolved.fighters.length > 0 || resolved.cargo.length > 0) {
    if (lines.length > 1) {
      lines.push("");
      lines.push("");
    } else {
      lines.push("");
    }
    for (const item of resolved.drones) lines.push(`${item.name} x${item.quantity}`);
    if (resolved.drones.length > 0 && resolved.fighters.length > 0) lines.push("");
    for (const item of resolved.fighters) lines.push(`${item.name} x${item.quantity}`);
    if ((resolved.drones.length > 0 || resolved.fighters.length > 0) && resolved.cargo.length > 0) {
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

function collectModuleEntries(resolved: ResolvedEft): readonly FittingModuleEntry[] {
  const entries: FittingModuleEntry[] = [];
  for (const bank of resolved.banks) {
    for (const line of bank.lines) {
      if (line.kind !== "module") continue;
      entries.push({ moduleId: line.moduleId, chargeId: line.chargeId, offline: line.offline });
    }
  }
  return entries;
}

function collectCargoEntries(items: readonly ResolvedQuantity[]): readonly CargoEntry[] {
  const entries: CargoEntry[] = [];
  for (const item of items) {
    if (item.kind === "resolved") entries.push({ id: item.id, quantity: item.quantity });
  }
  return entries;
}

function pushByBay(item: ResolvedQuantity, drones: ResolvedQuantity[], fighters: ResolvedQuantity[], cargo: ResolvedQuantity[]): void {
  if (item.bay === "drone") drones.push(item);
  else if (item.bay === "fighter") fighters.push(item);
  else cargo.push(item);
}

/** Raw SDE warfare buff ids mapped to the sim effect kinds the engagement sim models; unmapped ids (EWAR support, ewar resistance, mining) have no sim surface. */
const WARFARE_BUFF_KINDS: Readonly<Record<number, BurstEffectKind>> = {
  10: "shieldResonance",
  11: "shieldRepair",
  12: "shieldHp",
  13: "armorResonance",
  14: "armorRepair",
  15: "armorHp",
  16: "scanResolution",
  26: "targetingRange",
  18: "scanStrength",
  20: "signatureRadius",
  60: "inertia",
  22: "propulsionSpeed",
};

function resolveCommandBurstSpecs(fitting: FittingState, db: FittingDb): readonly CommandBurstSpec[] {
  const specs: CommandBurstSpec[] = [];
  for (const mod of fitting.commandBurstModules) {
    const stats = db.commandBursts[mod.moduleId];
    if (!stats || stats.capacitorNeed <= 0) continue;
    specs.push({ moduleName: stats.name, moduleId: mod.moduleId, capacitorNeed: stats.capacitorNeed, cycleTime: stats.cycleTime, effects: burstEffects(db, mod.chargeId) });
  }
  return specs;
}

function burstEffects(db: FittingDb, chargeId: TypeId | undefined): readonly BurstEffectSpec[] {
  if (chargeId === undefined) return [];
  const buffs = db.charges[chargeId]?.warfareBuffs;
  if (!buffs) return [];
  const effects: BurstEffectSpec[] = [];
  for (const buff of buffs) {
    const kind = WARFARE_BUFF_KINDS[buff.buffId];
    if (kind !== undefined) effects.push({ kind, multiplier: 1 + buff.multiplier / 100 });
  }
  return effects;
}

const PREVIEW_CONDITIONS: StatConditions = { skillLevel: 5 as SkillLevel, overloaded: false, weaponOverloaded: false };

function capacitorSummaryFrom(stats: CapacitorStats): NonNullable<FittingSummary["capacitor"]> {
  return {
    capacity: stats.spec.capacity,
    rechargeTime: stats.spec.rechargeTime,
    usagePerSecond: stats.usagePerSecond,
    ...(stats.stablePercent !== undefined ? { stablePercent: stats.stablePercent } : {}),
    ...(stats.depletesInSeconds !== undefined ? { depletesInSeconds: stats.depletesInSeconds } : {}),
  };
}
