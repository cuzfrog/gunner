import { LEGACY_DISRUPTION_SCRIPT_NAMES } from "../legacyScriptNames";
import type { ProfileParamOverrides, ProfileSettings, StoredBoosterActivation, StoredEwarActivation } from "../userSettings";
import { isOptionalBoosterActivations, isOptionalEwarActivation } from "../validators";
import { DOT_KEY_TO_FIELD, OVERRIDE_DOT_KEY_TO_FULL, sideFromFittingDotKey } from "./profileTextFields";
import { parseFittedHullSummary, parseOverrideValue, parseScalarValue, profileSettingsFromRaw } from "./profileTextValidate";
import { PROFILE_TEXT_HEADER, stripCarriageReturn } from "./profileTextFormat";

export class ProfileTextParser {
  hasHeader(text: string): boolean {
    return text.trimStart().startsWith(PROFILE_TEXT_HEADER);
  }

  parse(text: string): ProfileSettings | undefined {
    const rawLines = text.split("\n");
    let firstLine = 0;
    while (firstLine < rawLines.length && rawLines[firstLine].trim() === "") firstLine++;
    if (stripCarriageReturn(rawLines[firstLine]) !== PROFILE_TEXT_HEADER) return undefined;

    let raw: Partial<ProfileSettings> = {};
    let attackerOverrides: Partial<ProfileParamOverrides> = {};
    let targetOverrides: Partial<ProfileParamOverrides> = {};
    let attackerEwarActivationRaw: string | undefined;
    let targetEwarActivationRaw: string | undefined;
    let attackerBoosterActivationRaw: string | undefined;
    let targetBoosterActivationRaw: string | undefined;

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
        raw = side === "attacker" ? { ...raw, attackerFitting: body } : { ...raw, targetFitting: body };
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
      if (field === "attackerEwarActivation") {
        attackerEwarActivationRaw = value;
        continue;
      }
      if (field === "targetEwarActivation") {
        targetEwarActivationRaw = value;
        continue;
      }
      if (field === "attackerBoosterActivation") {
        attackerBoosterActivationRaw = value;
        continue;
      }
      if (field === "targetBoosterActivation") {
        targetBoosterActivationRaw = value;
        continue;
      }
      const parsed = parseScalarValue(field, value);
      if (parsed === undefined) return undefined;
      raw = { ...raw, [field]: parsed };
    }

    if (Object.keys(attackerOverrides).length > 0) raw = { ...raw, attackerOverrides };
    if (Object.keys(targetOverrides).length > 0) raw = { ...raw, targetOverrides };

    if (attackerBoosterActivationRaw !== undefined) {
      const activation = parseBoosterActivation(attackerBoosterActivationRaw);
      if (activation !== undefined) raw = { ...raw, attackerBoosterActivation: activation };
    }
    if (targetBoosterActivationRaw !== undefined) {
      const activation = parseBoosterActivation(targetBoosterActivationRaw);
      if (activation !== undefined) raw = { ...raw, targetBoosterActivation: activation };
    }

    if (attackerEwarActivationRaw !== undefined) {
      const activation = parseEwarActivation(attackerEwarActivationRaw, raw.attackerOverload !== false);
      if (activation !== undefined) raw = { ...raw, attackerEwarActivation: activation };
    }
    if (targetEwarActivationRaw !== undefined) {
      const activation = parseEwarActivation(targetEwarActivationRaw, raw.targetOverload !== false);
      if (activation !== undefined) raw = { ...raw, targetEwarActivation: activation };
    }

    return profileSettingsFromRaw(raw);
  }
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

function parseEwarActivation(value: string, sideOverload: boolean): StoredEwarActivation | undefined {
  try {
    const parsed = JSON.parse(value);
    if (isOptionalEwarActivation(parsed) && parsed !== undefined) {
      const migratedWebs = parsed.webs?.map((item) => migrateToggleableActivation(item, sideOverload));
      const migratedGrapplers = parsed.grapplers?.map((item) => migrateToggleableActivation(item, sideOverload));
      const migratedDisruptors = parsed.disruptors?.map((item) => migrateDisruptorActivation(item, sideOverload));
      const migratedScramblers = parsed.scramblers?.map((item) => migrateToggleableActivation(item, sideOverload));
      const result: StoredEwarActivation = {
        ...(migratedWebs !== undefined ? { webs: migratedWebs } : {}),
        ...(migratedGrapplers !== undefined ? { grapplers: migratedGrapplers } : {}),
        ...(migratedDisruptors !== undefined ? { disruptors: migratedDisruptors } : {}),
        ...(migratedScramblers !== undefined ? { scramblers: migratedScramblers } : {}),
      };
      return result;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function migrateToggleableActivation(
  item: Readonly<{ active: boolean; overloaded?: boolean }> | boolean,
  sideOverload: boolean,
): Readonly<{ active: boolean; overloaded: boolean }> {
  if (typeof item === "boolean") return { active: item, overloaded: sideOverload };
  return { active: item.active, overloaded: item.overloaded ?? sideOverload };
}

function migrateDisruptorActivation(
  item: Readonly<{ active: boolean; overloaded?: boolean; script: string }>,
  sideOverload: boolean,
): Readonly<{ active: boolean; overloaded: boolean; script: string }> {
  const script = LEGACY_DISRUPTION_SCRIPT_NAMES[item.script] ?? item.script;
  return { active: item.active, overloaded: item.overloaded ?? sideOverload, script };
}

function parseBoosterActivation(raw: string): readonly StoredBoosterActivation[] | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    const result = parsed.map((item) => (typeof item === "boolean" ? { active: item, script: "" } : item));
    return isOptionalBoosterActivations(result) ? result : undefined;
  } catch {
    return undefined;
  }
}
