import { type DisruptionScriptSpec, type MissileScriptSpec, type TurretScriptSpec } from "../../sim";
import type { ChargeOption, DamageType, MissileOption } from "../../fitting";
import type { PropulsionModule, SkillLevel, StatConditions } from "../../ships";
import type { I18n } from "../i18n";

export const DEFAULT_GRID_BRIGHTNESS = 0.5;
export const NEUTRAL_STAT_CONDITIONS: StatConditions = { skillLevel: 5, overloaded: true, weaponOverloaded: false };

export function formatWithCommas(value: number, decimals = 0): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatDistance(m: number, t: (key: string) => string): string {
  const roundedM = Math.round(m);
  if (roundedM >= 10000) return `${formatWithCommas(m / 1000, 1)} ${t("unit.kilometer")}`;
  return `${formatWithCommas(roundedM)} ${t("unit.meter")}`;
}

export function formatNumber(value: number, decimals = 2): string {
  return String(Number(value.toFixed(decimals)));
}

export function hitChanceClass(chance: number): string {
  if (chance >= 0.9) return "is-optimal";
  if (chance >= 0.5) return "is-good";
  if (chance >= 0.25) return "is-caution";
  if (chance >= 0.05) return "is-warn";
  return "is-danger";
}

export function propulsionOptionLabel(module: PropulsionModule): string {
  return module.id.replace(/^.*-/, "").toUpperCase();
}

export function skillLevelFromString(value: string): SkillLevel {
  const level = Number.parseInt(value, 10);
  if (level === 0 || level === 1 || level === 2 || level === 3 || level === 4 || level === 5) return level;
  return 0;
}

export function skillOptionLabel(i18n: I18n, level: SkillLevel): string {
  return `${i18n.t("skill.level")} ${level}`;
}

export function chargeStatSuffix(option: ChargeOption): string {
  const parts: string[] = [];
  const damagePrefix = damageHintPrefix(option.damageByType);
  if (damagePrefix) parts.push(damagePrefix);
  parts.push(`range x${formatMultiplier(option.rangeMultiplier)}`, `track x${formatMultiplier(option.trackingMultiplier)}`);
  if (option.falloffMultiplier !== 1) {
    parts.splice(parts.length - 1, 0, `falloff x${formatMultiplier(option.falloffMultiplier)}`);
  }
  return parts.join(" · ");
}

export function missileDamageHint(option: MissileOption): string {
  return damageHintPrefix({ [option.damageType]: option.damage }) ?? "";
}

function damageHintPrefix(damageByType: Readonly<Partial<Record<DamageType, number>>>): string | undefined {
  const parts = damageTypeParts(damageByType);
  if (parts.length === 0) return undefined;
  return `DMG ${formatBaseDamage(damageByType)} (${parts.join(" · ")})`;
}

function damageTypeParts(damageByType: Readonly<Partial<Record<DamageType, number>>>): string[] {
  const parts: string[] = [];
  const types: readonly DamageType[] = ["em", "thermal", "kinetic", "explosive"];
  for (const type of types) {
    const value = damageByType[type];
    if (value) parts.push(`${type} ${formatNumber(value, 1)}`);
  }
  return parts;
}

function formatBaseDamage(damageByType: Readonly<Partial<Record<DamageType, number>>>): string {
  const total = (damageByType.em ?? 0) + (damageByType.thermal ?? 0) + (damageByType.kinetic ?? 0) + (damageByType.explosive ?? 0);
  return formatNumber(total, 1);
}

export function scriptStatSuffix(script: DisruptionScriptSpec): string {
  const parts = [
    `optimal x${formatMultiplier(script.optimalMultiplier)}`,
    `falloff x${formatMultiplier(script.falloffMultiplier)}`,
    `track x${formatMultiplier(script.trackingMultiplier)}`,
  ];
  return parts.join(" · ");
}

export function boosterScriptStatSuffix(script: TurretScriptSpec): string {
  const parts = [
    `track x${formatMultiplier(script.trackingMultiplier)}`,
    `optimal x${formatMultiplier(script.optimalMultiplier)}`,
    `falloff x${formatMultiplier(script.falloffMultiplier)}`,
  ];
  return parts.join(" · ");
}

export function missileScriptStatSuffix(script: MissileScriptSpec): string {
  const parts = [
    `explosion radius x${formatMultiplier(script.explosionRadiusMultiplier)}`,
    `explosion velocity x${formatMultiplier(script.explosionVelocityMultiplier)}`,
    `missile velocity x${formatMultiplier(script.missileVelocityMultiplier)}`,
    `flight time x${formatMultiplier(script.flightTimeMultiplier)}`,
  ];
  return parts.join(" · ");
}

export function formatMultiplier(value: number): string {
  return String(Number(value.toFixed(2)));
}
