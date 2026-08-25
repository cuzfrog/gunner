import type { DisruptionScriptSpec, TurretScriptSpec } from "../../sim";
import type { ChargeOption } from "../../fitting";
import { PALETTE } from "../palette";
import type { PropulsionModule, SkillLevel, StatConditions } from "../../ships";
import type { I18n } from "../i18n";

export const AGGRESSIVITY_MIN = 0.01;
export const AGGRESSIVITY_MAX = 100;
export const DEFAULT_GRID_BRIGHTNESS = 0.5;
export const NEUTRAL_STAT_CONDITIONS: StatConditions = { skillLevel: 5, overloaded: true };

export function aggressivityFromPosition(pos: number): number {
  const clamped = Math.max(0, Math.min(1, pos));
  return AGGRESSIVITY_MIN * (AGGRESSIVITY_MAX / AGGRESSIVITY_MIN) ** clamped;
}

export function positionFromAggressivity(value: number): number {
  const clamped = Math.max(AGGRESSIVITY_MIN, Math.min(AGGRESSIVITY_MAX, value));
  return Math.log(clamped / AGGRESSIVITY_MIN) / Math.log(AGGRESSIVITY_MAX / AGGRESSIVITY_MIN);
}

export function parseManeuverAggressivity(input: HTMLInputElement): number {
  const value = Number.parseFloat(input.value);
  if (!Number.isFinite(value)) return 1;
  return Math.max(AGGRESSIVITY_MIN, Math.min(AGGRESSIVITY_MAX, value));
}

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

export function hitChanceColor(chance: number): string {
  if (chance >= 0.9) return PALETTE.optimalGreen;
  if (chance >= 0.5) return PALETTE.accentTeal;
  if (chance >= 0.25) return PALETTE.warnYellow;
  if (chance >= 0.05) return PALETTE.accentOrange;
  return PALETTE.dangerRed;
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

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
