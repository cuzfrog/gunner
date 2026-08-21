import type { AutopilotMode, SigResolutionClass } from "../sim";
import type { FittedHull, PropulsionStats, SkillLevel } from "../ships";
import { USER_SETTINGS_VERSION, type FittedHullSummary, type ProfileParamOverrides, type ProfileSettings } from "./settings";

export const PROFILE_TEXT_HEADER = "# gunner v1" as const;

type Side = "attacker" | "target";
type ScalarField = keyof Omit<ProfileSettings, "attackerFitting" | "targetFitting" | "attackerOverrides" | "targetOverrides">;
type ScalarValue = string | number | boolean | FittedHullSummary;

export function serializeProfile(settings: ProfileSettings): string {
  const lines: string[] = [PROFILE_TEXT_HEADER];

  for (const field of GLOBAL_FIELDS) {
    serializeScalar(lines, dotKeyForField(field), settings[field]);
  }

  serializeSide(lines, "attacker", settings);
  serializeSide(lines, "target", settings);

  return lines.join("\n");
}

export function parseProfile(text: string): ProfileSettings | undefined {
  const rawLines = text.split("\n");
  let firstLine = 0;
  while (firstLine < rawLines.length && rawLines[firstLine].trim() === "") firstLine++;
  if (stripCarriageReturn(rawLines[firstLine]) !== PROFILE_TEXT_HEADER) return undefined;

  let raw: Partial<ProfileSettings> = {};
  let attackerOverrides: Partial<ProfileParamOverrides> = {};
  let targetOverrides: Partial<ProfileParamOverrides> = {};

  let i = firstLine + 1;
  while (i < rawLines.length) {
    const line = stripCarriageReturn(rawLines[i]);
    i++;
    if (line === "") continue;
    if (line === "---") return undefined;

    if (line.endsWith(".fitting:")) {
      const side = sideFromFittingDotKey(line.slice(0, line.length - ".fitting:".length));
      if (side === undefined) return undefined;
      const { body, nextIndex } = readFittingBlock(rawLines, i);
      if (body === undefined) return undefined;
      if (body.split("\n").some((l) => stripCarriageReturn(l) === "---")) return undefined;
      if (side === "attacker") {
        raw = { ...raw, attackerFitting: body };
      } else {
        raw = { ...raw, targetFitting: body };
      }
      i = nextIndex;
      continue;
    }

    const eq = line.indexOf("=");
    if (eq < 0) return undefined;
    const dotKey = line.slice(0, eq);
    const value = line.slice(eq + 1);

    const override = OVERRIDE_DOT_KEY_TO_FULL.get(dotKey);
    if (override !== undefined) {
      const parsed = parseOverrideValue(override, value);
      if (parsed === undefined) return undefined;
      if (dotKey.startsWith("override.attacker.")) {
        attackerOverrides = { ...attackerOverrides, [override]: parsed };
      } else {
        targetOverrides = { ...targetOverrides, [override]: parsed };
      }
      continue;
    }

    const field = DOT_KEY_TO_FIELD.get(dotKey);
    if (field === undefined) return undefined;
    const parsed = parseScalarValue(field, value);
    if (parsed === undefined) return undefined;
    raw = { ...raw, [field]: parsed };
  }

  if (Object.keys(attackerOverrides).length > 0) raw = { ...raw, attackerOverrides };
  if (Object.keys(targetOverrides).length > 0) raw = { ...raw, targetOverrides };

  return profileSettingsFromRaw(raw);
}

const GLOBAL_FIELDS: readonly ScalarField[] = [
  "version",
  "tracking",
  "sigRes",
  "optimal",
  "falloff",
  "initialDistance",
  "simSpeed",
  "maneuverAggressivity",
  "gridBrightness",
] as const;

const ATTACKER_FIELDS: readonly ScalarField[] = [
  "attackerSpeed",
  "attackerMode",
  "attackerRange",
  "attackerMass",
  "attackerInertia",
  "attackerSkillLevel",
  "attackerOverload",
  "attackerHull",
  "attackerPropulsion",
  "attackerFittedHull",
] as const;

const TARGET_FIELDS: readonly ScalarField[] = [
  "targetSpeed",
  "targetMode",
  "targetRange",
  "targetMass",
  "targetInertia",
  "targetSig",
  "targetSkillLevel",
  "targetOverload",
  "targetHull",
  "targetPropulsion",
  "targetFittedHull",
] as const;

const ALL_FIELDS: readonly ScalarField[] = [...GLOBAL_FIELDS, ...ATTACKER_FIELDS, ...TARGET_FIELDS];

const OVERRIDE_KEYS: readonly (keyof ProfileParamOverrides)[] = [
  "attackerMass",
  "attackerInertia",
  "attackerSpeed",
  "targetMass",
  "targetInertia",
  "targetSig",
  "targetSpeed",
  "tracking",
  "sigRes",
  "optimal",
  "falloff",
] as const;

const DOT_KEY_TO_FIELD: ReadonlyMap<string, ScalarField> = buildDotKeyToFieldMap();
const OVERRIDE_DOT_KEY_TO_FULL: ReadonlyMap<string, keyof ProfileParamOverrides> = buildOverrideDotKeyToFullMap();

function buildDotKeyToFieldMap(): ReadonlyMap<string, ScalarField> {
  const map = new Map<string, ScalarField>();
  for (const field of ALL_FIELDS) {
    map.set(dotKeyForField(field), field);
  }
  return map;
}

function buildOverrideDotKeyToFullMap(): ReadonlyMap<string, keyof ProfileParamOverrides> {
  const map = new Map<string, keyof ProfileParamOverrides>();
  for (const key of OVERRIDE_KEYS) {
    const attackerDot = overrideDotKeyForFull("attacker", key);
    if (attackerDot !== undefined) map.set(attackerDot, key);
    const targetDot = overrideDotKeyForFull("target", key);
    if (targetDot !== undefined) map.set(targetDot, key);
  }
  return map;
}

function dotKeyForField(field: ScalarField): string {
  if (field.startsWith("attacker")) return `attacker.${lowerFirst(field.slice("attacker".length))}`;
  if (field.startsWith("target")) return `target.${lowerFirst(field.slice("target".length))}`;
  return field;
}

function sideFromFittingDotKey(dotKey: string): Side | undefined {
  if (dotKey === "attacker") return "attacker";
  if (dotKey === "target") return "target";
  return undefined;
}

function overrideDotKeyForFull(side: Side, full: keyof ProfileParamOverrides): string | undefined {
  if (full === "tracking" || full === "sigRes" || full === "optimal" || full === "falloff") {
    return `override.${side}.${full}`;
  }
  if (side === "attacker" && full.startsWith("attacker")) {
    return `override.attacker.${lowerFirst(full.slice("attacker".length))}`;
  }
  if (side === "target" && full.startsWith("target")) {
    return `override.target.${lowerFirst(full.slice("target".length))}`;
  }
  return undefined;
}

function serializeSide(lines: string[], side: Side, settings: ProfileSettings): void {
  const fitting = side === "attacker" ? settings.attackerFitting : settings.targetFitting;
  if (fitting !== undefined) {
    if (fitting.split("\n").some((line) => stripCarriageReturn(line) === "---")) {
      throw new Error(`fitting text for ${side} contains block terminator`);
    }
    lines.push(`${side}.fitting:`);
    lines.push(fitting);
    lines.push("---");
  }

  const fields = side === "attacker" ? ATTACKER_FIELDS : TARGET_FIELDS;
  for (const field of fields) {
    serializeScalar(lines, dotKeyForField(field), settings[field]);
  }

  const overrides = side === "attacker" ? settings.attackerOverrides : settings.targetOverrides;
  if (overrides !== undefined) {
    for (const key of OVERRIDE_KEYS) {
      const dotKey = overrideDotKeyForFull(side, key);
      if (dotKey === undefined) continue;
      if (key === "sigRes") {
        const sigResValue = overrides[key];
        if (sigResValue === undefined) continue;
        lines.push(`${dotKey}=${sigResValue}`);
      } else {
        const numValue = overrides[key];
        if (numValue === undefined) continue;
        lines.push(`${dotKey}=${formatNumber(numValue)}`);
      }
    }
  }
}

function serializeScalar(lines: string[], dotKey: string, value: ScalarValue | undefined): void {
  if (value === undefined) return;
  if (typeof value === "boolean") {
    lines.push(`${dotKey}=${value ? "true" : "false"}`);
    return;
  }
  if (typeof value === "number") {
    lines.push(`${dotKey}=${formatNumber(value)}`);
    return;
  }
  if (typeof value === "string") {
    lines.push(`${dotKey}=${value}`);
    return;
  }
  lines.push(`${dotKey}=${JSON.stringify(value)}`);
}

function readFittingBlock(lines: string[], start: number): { body: string | undefined; nextIndex: number } {
  const bodyLines: string[] = [];
  let i = start;
  while (i < lines.length) {
    const line = stripCarriageReturn(lines[i]);
    if (line === "---") {
      i++;
      break;
    }
    bodyLines.push(line);
    i++;
  }
  if (bodyLines.length === 0) return { body: undefined, nextIndex: i };
  return { body: bodyLines.join("\n"), nextIndex: i };
}

function parseScalarValue(field: ScalarField, value: string): ScalarValue | undefined {
  if (value === "") return undefined;

  if (field === "version") return value === String(USER_SETTINGS_VERSION) ? USER_SETTINGS_VERSION : undefined;
  if (field === "attackerOverload" || field === "targetOverload") return value === "true" ? true : value === "false" ? false : undefined;
  if (field === "attackerMode" || field === "targetMode") return isAutopilotMode(value) ? value : undefined;
  if (field === "attackerSkillLevel" || field === "targetSkillLevel") {
    const num = Number(value);
    return isSkillLevelValue(num) ? num : undefined;
  }
  if (field === "sigRes") return isSigResolutionClass(value) ? value : undefined;
  if (field === "attackerFittedHull" || field === "targetFittedHull") return parseFittedHullSummary(value);
  if (field === "attackerHull" || field === "attackerPropulsion" || field === "targetHull" || field === "targetPropulsion") return value;

  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (field === "initialDistance" || field === "simSpeed" || field === "targetSig") return num > 0 ? num : undefined;
  if (field === "maneuverAggressivity") return num >= 0 ? num : undefined;
  if (field === "gridBrightness") return num >= 0 && num <= 1 ? num : undefined;
  return num >= 0 ? num : undefined;
}

function parseOverrideValue(key: keyof ProfileParamOverrides, value: string): ProfileParamOverrides[keyof ProfileParamOverrides] | undefined {
  if (value === "") return undefined;
  if (key === "sigRes") return isSigResolutionClass(value) ? value : undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (key === "targetSig") return num > 0 ? num : undefined;
  return num >= 0 ? num : undefined;
}

function profileSettingsFromRaw(raw: Partial<ProfileSettings>): ProfileSettings | undefined {
  const version = raw.version;
  const tracking = raw.tracking;
  const sigRes = raw.sigRes;
  const optimal = raw.optimal;
  const falloff = raw.falloff;
  const attackerSpeed = raw.attackerSpeed;
  const attackerMode = raw.attackerMode;
  const attackerRange = raw.attackerRange;
  const attackerMass = raw.attackerMass;
  const attackerInertia = raw.attackerInertia;
  const initialDistance = raw.initialDistance;
  const targetSpeed = raw.targetSpeed;
  const targetMode = raw.targetMode;
  const targetRange = raw.targetRange;
  const targetMass = raw.targetMass;
  const targetInertia = raw.targetInertia;
  const targetSig = raw.targetSig;
  const simSpeed = raw.simSpeed;

  if (
    version === undefined ||
    tracking === undefined ||
    sigRes === undefined ||
    optimal === undefined ||
    falloff === undefined ||
    attackerSpeed === undefined ||
    attackerMode === undefined ||
    attackerRange === undefined ||
    attackerMass === undefined ||
    attackerInertia === undefined ||
    initialDistance === undefined ||
    targetSpeed === undefined ||
    targetMode === undefined ||
    targetRange === undefined ||
    targetMass === undefined ||
    targetInertia === undefined ||
    targetSig === undefined ||
    simSpeed === undefined
  ) {
    return undefined;
  }

  return {
    version,
    tracking,
    sigRes,
    optimal,
    falloff,
    attackerSpeed,
    attackerMode,
    attackerRange,
    attackerMass,
    attackerInertia,
    initialDistance,
    targetSpeed,
    targetMode,
    targetRange,
    targetMass,
    targetInertia,
    targetSig,
    simSpeed,
    attackerSkillLevel: raw.attackerSkillLevel,
    attackerOverload: raw.attackerOverload,
    attackerHull: raw.attackerHull,
    attackerPropulsion: raw.attackerPropulsion,
    attackerFitting: raw.attackerFitting,
    attackerOverrides: raw.attackerOverrides,
    attackerFittedHull: raw.attackerFittedHull,
    targetSkillLevel: raw.targetSkillLevel,
    targetOverload: raw.targetOverload,
    targetHull: raw.targetHull,
    targetPropulsion: raw.targetPropulsion,
    targetFitting: raw.targetFitting,
    targetOverrides: raw.targetOverrides,
    targetFittedHull: raw.targetFittedHull,
    maneuverAggressivity: raw.maneuverAggressivity,
    gridBrightness: raw.gridBrightness,
  };
}

function parseFittedHullSummary(value: string): FittedHullSummary | undefined {
  try {
    const parsed = JSON.parse(value);
    return isFittedHullSummary(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isFittedHullSummary(value: unknown): value is FittedHullSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  if (typeof s.fittingName !== "string" || s.fittingName.length === 0) return false;
  if (!isFittedHull(s.fitted)) return false;
  if (s.propulsionId !== undefined && typeof s.propulsionId !== "string") return false;
  if (s.propulsion !== undefined && !isPropulsionStats(s.propulsion)) return false;
  return true;
}

function isFittedHull(value: unknown): value is FittedHull {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return (
    isNonNegativeNumber(s.mass) &&
    isPositiveNumber(s.massMultiplier) &&
    isPositiveNumber(s.speedMultiplier) &&
    isPositiveNumber(s.inertiaMultiplier) &&
    isPositiveNumber(s.sigMultiplier) &&
    isNonNegativeNumber(s.sigRadiusAdd)
  );
}

function isPropulsionStats(value: unknown): value is PropulsionStats {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return (
    isNonNegativeNumber(s.thrust) &&
    isNonNegativeNumber(s.speedBonus) &&
    isNonNegativeNumber(s.massAddition) &&
    isNonNegativeNumber(s.sigBloom)
  );
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isAutopilotMode(value: string): value is AutopilotMode {
  return value === "orbit" || value === "keepAtRange" || value === "midships";
}

function isSigResolutionClass(value: string): value is SigResolutionClass {
  return value === "S" || value === "M" || value === "L" || value === "XL";
}

function isSkillLevelValue(value: number): value is SkillLevel {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function formatNumber(value: number): string {
  return String(value);
}

function lowerFirst(value: string): string {
  if (value === "") return value;
  return value[0].toLowerCase() + value.slice(1);
}

function upperFirst(value: string): string {
  if (value === "") return value;
  return value[0].toUpperCase() + value.slice(1);
}

function stripCarriageReturn(line: string): string {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}
