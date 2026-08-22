import type { ProfileParamOverrides, ProfileSettings } from "./userSettings";
import {
  ATTACKER_FIELDS,
  DOT_KEY_TO_FIELD,
  GLOBAL_FIELDS,
  OVERRIDE_DOT_KEY_TO_FULL,
  OVERRIDE_KEYS,
  TARGET_FIELDS,
  dotKeyForField,
  overrideDotKeyForFull,
  sideFromFittingDotKey,
  type ScalarValue,
  type Side,
} from "./profileTextFields";
import { parseFittedHullSummary, parseOverrideValue, parseScalarValue, profileSettingsFromRaw } from "./profileTextValidate";

export const PROFILE_TEXT_HEADER = "# gunner v1" as const;

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
    if (field === undefined) continue;
    const parsed = parseScalarValue(field, value);
    if (parsed === undefined) return undefined;
    raw = { ...raw, [field]: parsed };
  }

  if (Object.keys(attackerOverrides).length > 0) raw = { ...raw, attackerOverrides };
  if (Object.keys(targetOverrides).length > 0) raw = { ...raw, targetOverrides };

  return profileSettingsFromRaw(raw);
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

function formatNumber(value: number): string {
  return String(value);
}

function stripCarriageReturn(line: string): string {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}
