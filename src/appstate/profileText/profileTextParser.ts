import { LEGACY_DISRUPTION_SCRIPT_NAMES } from "../legacyScriptNames";
import type { ProfileParamOverrides, ProfileSettings, StoredBoosterActivation, StoredEwarActivation } from "../userSettings";
import type { SettingGuards } from "../settingGuards";
import { isOptionalBoosterActivations, isOptionalEwarActivation } from "../validators";
import { DOT_KEY_TO_FIELD, OVERRIDE_DOT_KEY_TO_FULL, sideFromFittingDotKey } from "./profileTextFields";
import { normalizeProfileTextDotKey } from "./profileTextCompat";
import { parseFittedHullSummary, parseOverrideValue, parseScalarValue, profileSettingsFromRaw } from "./profileTextValidate";
import { PROFILE_TEXT_HEADER, stripCarriageReturn } from "./profileTextFormat";

export class ProfileTextParser {
  private readonly guards: SettingGuards;

  constructor(settingGuards: SettingGuards) {
    this.guards = settingGuards;
  }

  hasHeader(text: string): boolean {
    return text.trimStart().startsWith(PROFILE_TEXT_HEADER);
  }

  parse(text: string): ProfileSettings | undefined {
    const rawLines = text.split("\n");
    let firstLine = 0;
    while (firstLine < rawLines.length && rawLines[firstLine].trim() === "") firstLine++;
    if (stripCarriageReturn(rawLines[firstLine]) !== PROFILE_TEXT_HEADER) return undefined;

    let raw: Partial<ProfileSettings> = {};
    let shipAOverrides: Partial<ProfileParamOverrides> = {};
    let shipBOverrides: Partial<ProfileParamOverrides> = {};
    let shipAEwarActivationRaw: string | undefined;
    let shipBEwarActivationRaw: string | undefined;
    let shipABoosterActivationRaw: string | undefined;
    let shipBBoosterActivationRaw: string | undefined;

    let i = firstLine + 1;
    while (i < rawLines.length) {
      const line = stripCarriageReturn(rawLines[i]);
      i++;
      if (line === "") continue;
      if (line === "---") return undefined;

      if (line.endsWith(".fitting:")) {
        const dotKey = normalizeProfileTextDotKey(line.slice(0, line.length - ".fitting:".length));
        const side = sideFromFittingDotKey(dotKey);
        if (side === undefined) return undefined;
        const { body, nextIndex } = readFittingBlock(rawLines, i);
        if (body === undefined) return undefined;
        if (body.split("\n").some((l) => stripCarriageReturn(l) === "---")) return undefined;
        raw = side === "shipA" ? { ...raw, shipAFitting: body } : { ...raw, shipBFitting: body };
        i = nextIndex;
        continue;
      }

      const eq = line.indexOf("=");
      if (eq < 0) return undefined;
      const dotKey = normalizeProfileTextDotKey(line.slice(0, eq));
      const value = line.slice(eq + 1);

      const override = OVERRIDE_DOT_KEY_TO_FULL.get(dotKey);
      if (override !== undefined) {
        const parsed = parseOverrideValue(override, value, this.guards);
        if (parsed === undefined) return undefined;
        if (dotKey.startsWith("override.shipA.")) {
          shipAOverrides = { ...shipAOverrides, [override]: parsed };
        } else {
          shipBOverrides = { ...shipBOverrides, [override]: parsed };
        }
        continue;
      }

      const field = DOT_KEY_TO_FIELD.get(dotKey);
      if (field === undefined) continue;
      if (field === "shipAEwarActivation") {
        shipAEwarActivationRaw = value;
        continue;
      }
      if (field === "shipBEwarActivation") {
        shipBEwarActivationRaw = value;
        continue;
      }
      if (field === "shipABoosterActivation") {
        shipABoosterActivationRaw = value;
        continue;
      }
      if (field === "shipBBoosterActivation") {
        shipBBoosterActivationRaw = value;
        continue;
      }
      const parsed = parseScalarValue(field, value, this.guards);
      if (parsed === undefined) return undefined;
      raw = { ...raw, [field]: parsed };
    }

    if (Object.keys(shipAOverrides).length > 0) raw = { ...raw, shipAOverrides };
    if (Object.keys(shipBOverrides).length > 0) raw = { ...raw, shipBOverrides };

    if (shipABoosterActivationRaw !== undefined) {
      const activation = parseBoosterActivation(shipABoosterActivationRaw);
      if (activation !== undefined) raw = { ...raw, shipABoosterActivation: activation };
    }
    if (shipBBoosterActivationRaw !== undefined) {
      const activation = parseBoosterActivation(shipBBoosterActivationRaw);
      if (activation !== undefined) raw = { ...raw, shipBBoosterActivation: activation };
    }

    if (shipAEwarActivationRaw !== undefined) {
      const activation = parseEwarActivation(shipAEwarActivationRaw, raw.shipAOverload !== false);
      if (activation !== undefined) raw = { ...raw, shipAEwarActivation: activation };
    }
    if (shipBEwarActivationRaw !== undefined) {
      const activation = parseEwarActivation(shipBEwarActivationRaw, raw.shipBOverload !== false);
      if (activation !== undefined) raw = { ...raw, shipBEwarActivation: activation };
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
    const result = parsed.map((item) => {
      if (typeof item === "boolean") return { active: item, script: "none" };
      if (!item || typeof item !== "object" || Array.isArray(item)) return { active: false, script: "none" };
      const record = item as Record<string, unknown>;
      const active = typeof record.active === "boolean" ? record.active : false;
      const script = typeof record.script === "string" && record.script !== "" ? record.script : "none";
      return { active, script };
    });
    return isOptionalBoosterActivations(result) ? result : undefined;
  } catch {
    return undefined;
  }
}
