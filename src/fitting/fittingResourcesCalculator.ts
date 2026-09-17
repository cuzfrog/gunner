import type {
  CommandBurstStats,
  FittingDb,
  FittingModuleStats,
  FittingResource,
  FittingResources,
  HullBonus,
  LauncherStats,
  ModuleBonusAttribute,
  ShipOutputBonusAttribute,
  ShipStatFlatAttribute,
  TurretStats,
} from "../gamedata/fittingDb";
import type { TypeId } from "../gamedata/ids";
import type { StackingPenalty } from "../sim";
import type { StatConditions, SkillLevel } from "../ships";
import type { FittingState, FittedModule } from "./fittingState";
import { applyRigDrawbackReduction, moduleSkillMultiplier } from "./skillMultiplier";

/** Resolves the fitting-window powergrid (MW) and CPU (tf) readout: module needs versus the ship's modified output. Soft display only; nothing here blocks a fitting. */
export interface FittingResourcesCalculator {
  resolve(fitting: FittingState, conditions: StatConditions): FittingResources;
}

export interface FittingResourcesCalculatorDeps {
  readonly fittingDb: FittingDb;
  readonly stackingPenalty: StackingPenalty;
}

type FittingResourceKind = "powerGrid" | "cpu";

export class FittingResourcesCalculatorImpl implements FittingResourcesCalculator {
  private readonly db: FittingDb;
  private readonly stacking: StackingPenalty;

  constructor(deps: FittingResourcesCalculatorDeps) {
    this.db = deps.fittingDb;
    this.stacking = deps.stackingPenalty;
  }

  resolve(fitting: FittingState, conditions: StatConditions): FittingResources {
    return {
      powerGrid: resolveResource(fitting, conditions, "powerGrid", this.db, this.stacking),
      cpu: resolveResource(fitting, conditions, "cpu", this.db, this.stacking),
    };
  }
}

const NEED_BONUS_TYPES: Record<FittingResourceKind, ModuleBonusAttribute> = { powerGrid: "powerGridNeed", cpu: "cpuNeed" };
const FLAT_OUTPUT_ATTRIBUTES: Record<FittingResourceKind, ShipStatFlatAttribute> = { powerGrid: "powerGridFlat", cpu: "cpuFlat" };
const PERCENT_OUTPUT_ATTRIBUTES: Record<FittingResourceKind, ShipOutputBonusAttribute> = { powerGrid: "powerGridOutputPercent", cpu: "cpuOutputPercent" };
// EVE: Engineering 5%/level powergrid output, CPU Management 5%/level CPU output; the uniform skill level trains both to the same level.
const OUTPUT_SKILL_BONUS_PER_LEVEL: Record<FittingResourceKind, number> = { powerGrid: 0.05, cpu: 0.05 };

function resolveResource(fitting: FittingState, conditions: StatConditions, kind: FittingResourceKind, db: FittingDb, stacking: StackingPenalty): FittingResource {
  return { used: resolveUsed(fitting, conditions, kind, db), output: resolveOutput(fitting, conditions, kind, db, stacking) };
}

function resolveUsed(fitting: FittingState, conditions: StatConditions, kind: FittingResourceKind, db: FittingDb): number {
  const rigMultipliers = rigNeedMultipliers(fitting, conditions, kind, db);
  let total = 0;
  for (const consumer of resourceConsumers(fitting)) {
    const facts = consumerFacts(consumer.moduleId, db);
    if (!facts) continue;
    const need = facts.needs?.[kind] ?? 0;
    if (need === 0) continue;
    const multiplier = needMultiplier(facts, fitting.hullBonuses, rigMultipliers, conditions.skillLevel, db, kind);
    total += Math.max(0, need * multiplier) * consumer.count;
  }
  return total;
}

interface ResourceConsumer {
  readonly moduleId: TypeId;
  readonly count: number;
}

function resourceConsumers(fitting: FittingState): readonly ResourceConsumer[] {
  return [
    ...fitting.turretGroups.map((group) => ({ moduleId: group.moduleId, count: group.count })),
    ...fitting.launcherGroups.map((group) => ({ moduleId: group.moduleId, count: group.count })),
    ...fittedModules(fitting).map((mod) => ({ moduleId: mod.moduleId, count: 1 })),
  ];
}

function fittedModules(fitting: FittingState): readonly FittedModule[] {
  return [
    ...fitting.supportModules, ...fitting.defenseModules, ...fitting.ewarModules, ...fitting.boosterModules,
    ...fitting.missileBoosterModules, ...fitting.droneBoosterModules, ...fitting.sensorBoosterModules,
    ...fitting.sensorAmplifierModules, ...fitting.commandBurstModules, ...(fitting.propulsionModule ? [fitting.propulsionModule] : []),
  ];
}

interface ConsumerFacts {
  readonly requiredSkillIds: readonly TypeId[];
  readonly groupID?: number;
  readonly needs: Partial<Record<FittingResourceKind, number>> | undefined;
}

function consumerFacts(moduleId: TypeId, db: FittingDb): ConsumerFacts | undefined {
  const turret = db.turrets[moduleId];
  if (turret) return turretFacts(turret, db);
  const launcher = db.launchers[moduleId];
  if (launcher) return launcherFacts(launcher, db);
  const burst = db.commandBursts[moduleId];
  if (burst) return burstFacts(burst, db);
  const module = db.modules[moduleId];
  if (module) return moduleFacts(module, db);
  return undefined;
}

function turretFacts(turret: TurretStats, db: FittingDb): ConsumerFacts {
  return { requiredSkillIds: turret.requiredSkillIds, groupID: turret.groupID, needs: db.needs[String(turret.id)] };
}

function launcherFacts(launcher: LauncherStats, db: FittingDb): ConsumerFacts {
  return { requiredSkillIds: launcher.requiredSkillIds, groupID: launcher.launcherGroup, needs: db.needs[String(launcher.id)] };
}

function burstFacts(burst: CommandBurstStats, db: FittingDb): ConsumerFacts {
  return { requiredSkillIds: burst.requiredSkillIds, needs: db.needs[String(burst.id)] };
}

function moduleFacts(module: FittingModuleStats, db: FittingDb): ConsumerFacts {
  return { requiredSkillIds: module.requiredSkillIds ?? [], groupID: module.groupID, needs: db.needs[String(module.id)] };
}

function needMultiplier(facts: ConsumerFacts, hullBonuses: readonly HullBonus[], rigMultipliers: RigNeedMultipliers, skillLevel: SkillLevel, db: FittingDb, kind: FittingResourceKind): number {
  const needType = NEED_BONUS_TYPES[kind];
  const skill = moduleSkillMultiplier(db.skillBonuses, facts.requiredSkillIds, needType, skillLevel, facts.groupID);
  const hull = hullNeedMultiplier(hullBonuses, needType, facts, skillLevel);
  const rig = rigMultipliers(facts);
  return skill * hull * rig;
}

function hullNeedMultiplier(hullBonuses: readonly HullBonus[], needType: ModuleBonusAttribute, facts: ConsumerFacts, skillLevel: SkillLevel): number {
  let multiplier = 1;
  for (const bonus of hullBonuses) {
    if (bonus.attribute !== needType) continue;
    if (bonus.moduleSkillId !== undefined && !facts.requiredSkillIds.includes(bonus.moduleSkillId)) continue;
    if (bonus.moduleGroupId !== undefined && bonus.moduleGroupId !== facts.groupID) continue;
    multiplier *= 1 + hullBonusPercent(bonus, skillLevel) / 100;
  }
  return multiplier;
}

function hullBonusPercent(bonus: HullBonus, skillLevel: number): number {
  return bonus.magnitude * (bonus.scalesWithHullSkill ? skillLevel : 1);
}

interface RigNeedMultipliers {
  (facts: ConsumerFacts): number;
}

function rigNeedMultipliers(fitting: FittingState, conditions: StatConditions, kind: FittingResourceKind, db: FittingDb): RigNeedMultipliers {
  const drawbackKind = kind === "powerGrid" ? "powerNeed" : "cpuNeed";
  const entries: { readonly targetGroupId?: number; readonly targetSkillId?: TypeId; readonly multiplier: number }[] = [];
  for (const mod of fittedModules(fitting)) {
    const drawback = db.modules[mod.moduleId]?.rigDrawback;
    if (!drawback || drawback.kind !== drawbackKind) continue;
    const reducedPercent = applyRigDrawbackReduction(drawback, db.rigDrawbackReductions, conditions.skillLevel);
    entries.push({ targetGroupId: drawback.targetGroupId, targetSkillId: drawback.targetSkillId, multiplier: 1 + reducedPercent / 100 });
  }
  if (entries.length === 0) return () => 1;
  return (facts) => entries.reduce((acc, entry) => (matchesDrawback(entry, facts) ? acc * entry.multiplier : acc), 1);
}

function matchesDrawback(entry: { readonly targetGroupId?: number; readonly targetSkillId?: TypeId }, facts: ConsumerFacts): boolean {
  if (entry.targetGroupId !== undefined) return entry.targetGroupId === facts.groupID;
  if (entry.targetSkillId !== undefined) return facts.requiredSkillIds.includes(entry.targetSkillId);
  return false;
}

function resolveOutput(fitting: FittingState, conditions: StatConditions, kind: FittingResourceKind, db: FittingDb, stacking: StackingPenalty): number {
  const base = kind === "powerGrid" ? fitting.profile.powerGrid : fitting.profile.cpuOutput;
  const flat = flatSum(fitting.hullBonuses, FLAT_OUTPUT_ATTRIBUTES[kind]);
  const multipliers: number[] = [];
  const percentAttribute = PERCENT_OUTPUT_ATTRIBUTES[kind];
  for (const mod of fittedModules(fitting)) {
    const percent = db.modules[mod.moduleId]?.[percentAttribute];
    if (percent !== undefined) multipliers.push(1 + percent / 100);
  }
  for (const bonus of fitting.hullBonuses) {
    if (bonus.attribute === percentAttribute) multipliers.push(1 + hullBonusPercent(bonus, conditions.skillLevel) / 100);
  }
  if (kind === "cpu") multipliers.push(...cpuOutputDrawbackMultipliers(fitting, conditions, db));
  const multiplier = stacking.apply(multipliers);
  return (base + flat) * multiplier * (1 + OUTPUT_SKILL_BONUS_PER_LEVEL[kind] * conditions.skillLevel);
}

function cpuOutputDrawbackMultipliers(fitting: FittingState, conditions: StatConditions, db: FittingDb): readonly number[] {
  const multipliers: number[] = [];
  for (const mod of fittedModules(fitting)) {
    const drawback = db.modules[mod.moduleId]?.rigDrawback;
    if (!drawback || drawback.kind !== "cpu") continue;
    const reducedPercent = applyRigDrawbackReduction(drawback, db.rigDrawbackReductions, conditions.skillLevel);
    multipliers.push(1 + reducedPercent / 100);
  }
  return multipliers;
}

function flatSum(hullBonuses: readonly HullBonus[], attribute: ShipStatFlatAttribute): number {
  return hullBonuses.reduce((sum, bonus) => (bonus.attribute === attribute ? sum + bonus.magnitude : sum), 0);
}
