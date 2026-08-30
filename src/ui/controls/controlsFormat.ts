import { type DisruptionScriptSpec, type TurretScriptSpec } from "../../sim";
import type { ChargeOption } from "../../fitting";
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
  const parts = [`range x${formatMultiplier(option.rangeMultiplier)}`, `track x${formatMultiplier(option.trackingMultiplier)}`];
  if (option.falloffMultiplier !== 1) {
    parts.splice(1, 0, `falloff x${formatMultiplier(option.falloffMultiplier)}`);
  }
  return parts.join(" · ");
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

export function formatMultiplier(value: number): string {
  return String(Number(value.toFixed(2)));
}
