import type { SdeDogmaEffect, SdeTypeDogma } from "./dogmaTypes";
import { classifyCombatEffect, type CombatIntent, type TurretIntent, type MissileIntent } from "./effectClassifier";
import type { TurretWeaponGroupName } from "./combatAttributes";

export interface TurretModuleStats {
  readonly turretWeaponGroup?: TurretWeaponGroupName;
  readonly turretDamageMultiplier?: number;
  readonly turretSpeedMultiplier?: number;
  readonly missileDamageMultiplier?: number;
  readonly missileCycleTimeMultiplier?: number;
}

export interface BuildModuleStatsContext {
  readonly values: Map<string, number>;
  readonly effects: Set<number>;
  readonly dogmaEffects: Readonly<Record<string, SdeDogmaEffect>>;
  readonly typeDogma: SdeTypeDogma | undefined;
}

export function buildCombatModuleStats(ctx: BuildModuleStatsContext): TurretModuleStats | undefined {
  const intents = resolveCombatIntents(ctx.effects, ctx.dogmaEffects, ctx.typeDogma);
  if (intents.length === 0) return undefined;
  const stats: { -readonly [K in keyof TurretModuleStats]?: TurretModuleStats[K] } = {};
  let weaponGroup: TurretWeaponGroupName | undefined;
  let hasTurretDamage = false;
  let hasTurretSpeed = false;
  let hasMissileDamage = false;
  let hasMissileSpeed = false;
  for (const intent of intents) {
    if (intent.tag === "turretDamage") {
      weaponGroup = intent.weaponGroup;
      hasTurretDamage = true;
    } else if (intent.tag === "turretSpeed") {
      weaponGroup = intent.weaponGroup;
      hasTurretSpeed = true;
    } else if (intent.tag === "missileDamage") {
      hasMissileDamage = true;
    } else if (intent.tag === "missileSpeed") {
      hasMissileSpeed = true;
    }
  }
  if (hasTurretDamage || hasTurretSpeed) {
    const damageMultiplier = optionalNumber(ctx.values.get("damageMultiplier"));
    const speedMultiplier = optionalNumber(ctx.values.get("speedMultiplier"));
    if ((damageMultiplier !== undefined && damageMultiplier !== 0) || (speedMultiplier !== undefined && speedMultiplier !== 0)) {
      stats.turretWeaponGroup = weaponGroup;
      if (damageMultiplier !== undefined && damageMultiplier !== 0) stats.turretDamageMultiplier = damageMultiplier;
      if (speedMultiplier !== undefined && speedMultiplier !== 0) stats.turretSpeedMultiplier = speedMultiplier;
    }
  }
  if (hasMissileDamage || hasMissileSpeed) {
    const missileDamageMultiplier = optionalNumber(ctx.values.get("missileDamageMultiplierBonus"));
    const missileCycleTimeMultiplier = optionalNumber(ctx.values.get("speedMultiplier"));
    if (missileDamageMultiplier !== undefined && missileDamageMultiplier !== 0) stats.missileDamageMultiplier = missileDamageMultiplier;
    if (missileCycleTimeMultiplier !== undefined && missileCycleTimeMultiplier !== 0) stats.missileCycleTimeMultiplier = missileCycleTimeMultiplier;
  }
  if (Object.keys(stats).length === 0) return undefined;
  return { ...stats };
}

function resolveCombatIntents(effectIds: Set<number>, dogmaEffects: Readonly<Record<string, SdeDogmaEffect>>, typeDogma: SdeTypeDogma | undefined): readonly CombatIntent[] {
  const intents: CombatIntent[] = [];
  for (const eid of effectIds) {
    const effect = dogmaEffects[String(eid)];
    if (!effect) continue;
    const intent = classifyCombatEffect(effect, typeDogma);
    if (!intent) continue;
    if (isTurretOrMissileIntent(intent)) intents.push(intent);
  }
  return intents;
}

function isTurretOrMissileIntent(intent: CombatIntent): intent is TurretIntent | MissileIntent {
  return intent.tag === "turretDamage" || intent.tag === "turretSpeed" || intent.tag === "missileDamage" || intent.tag === "missileSpeed";
}

function optionalNumber(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (Number.isNaN(value)) return undefined;
  return value;
}
