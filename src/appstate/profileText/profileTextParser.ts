import type { ProfileParamOverrides, ProfileSettings, StoredBoosterActivation, StoredDisruptionScript, StoredEwarActivation, StoredMissileBoosterActivation, StoredSensorBoosterActivation } from "../userSettings";
import type { ChargeCatalog } from "../../fitting";
import type { ItemNameResolver } from "../../gamedata/itemNames";
import type { SimValueParser } from "../../sim";
import type { Ships } from "../../ships";
import { resolveBoosterScript, resolveDisruptionScript } from "../settingsCompat";
import { isOptionalBoosterActivations, isOptionalEwarActivation, isOptionalMissileBoosterActivations, isOptionalSensorBoosterActivations } from "../validators";
import { DOT_KEY_TO_FIELD, OVERRIDE_DOT_KEY_TO_FULL, sideFromFittingDotKey, type ScalarField } from "./profileTextFields";
import { parseFittedHullSummary, parseOverrideValue, parseScalarValue, profileSettingsFromRaw } from "./profileTextValidate";
import { PROFILE_TEXT_HEADER, stripCarriageReturn } from "./profileTextFormat";

const DEGRADABLE_FIELDS: ReadonlySet<ScalarField> = new Set([
  "shipAHullId",
  "shipBHullId",
  "shipAPropulsion",
  "shipBPropulsion",
]);

export class ProfileTextParser {
  private readonly simValueParser: SimValueParser;
  private readonly ships: Ships;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly itemNameResolver: ItemNameResolver;

  constructor(deps: { simValueParser: SimValueParser; ships: Ships; chargeCatalog: ChargeCatalog; itemNameResolver: ItemNameResolver }) {
    this.simValueParser = deps.simValueParser;
    this.ships = deps.ships;
    this.chargeCatalog = deps.chargeCatalog;
    this.itemNameResolver = deps.itemNameResolver;
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
    let shipAMissileBoosterActivationRaw: string | undefined;
    let shipBMissileBoosterActivationRaw: string | undefined;
    let shipASensorBoosterActivationRaw: string | undefined;
    let shipBSensorBoosterActivationRaw: string | undefined;

    let i = firstLine + 1;
    while (i < rawLines.length) {
      const line = stripCarriageReturn(rawLines[i]);
      i++;
      if (line === "") continue;
      if (line === "---") return undefined;

      if (line.endsWith(".fitting:")) {
        const dotKey = line.slice(0, line.length - ".fitting:".length);
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
      const dotKey = line.slice(0, eq);
      const value = line.slice(eq + 1);

      const override = OVERRIDE_DOT_KEY_TO_FULL.get(dotKey);
      if (override !== undefined) {
        const parsed = parseOverrideValue(override, value, this.simValueParser);
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
      if (field === "shipAMissileBoosterActivation") {
        shipAMissileBoosterActivationRaw = value;
        continue;
      }
      if (field === "shipBMissileBoosterActivation") {
        shipBMissileBoosterActivationRaw = value;
        continue;
      }
      if (field === "shipASensorBoosterActivation") {
        shipASensorBoosterActivationRaw = value;
        continue;
      }
      if (field === "shipBSensorBoosterActivation") {
        shipBSensorBoosterActivationRaw = value;
        continue;
      }
      const parsed = parseScalarValue(field, value, this.simValueParser, this.ships, this.chargeCatalog);
      if (parsed === undefined) {
        if (DEGRADABLE_FIELDS.has(field)) continue;
        return undefined;
      }
      raw = { ...raw, [field]: parsed };
    }

    if (Object.keys(shipAOverrides).length > 0) raw = { ...raw, shipAOverrides };
    if (Object.keys(shipBOverrides).length > 0) raw = { ...raw, shipBOverrides };

    if (shipABoosterActivationRaw !== undefined) {
      const activation = this.parseBoosterActivation(shipABoosterActivationRaw);
      if (activation !== undefined) raw = { ...raw, shipABoosterActivation: activation };
    }
    if (shipBBoosterActivationRaw !== undefined) {
      const activation = this.parseBoosterActivation(shipBBoosterActivationRaw);
      if (activation !== undefined) raw = { ...raw, shipBBoosterActivation: activation };
    }

    if (shipAMissileBoosterActivationRaw !== undefined) {
      const activation = this.parseMissileBoosterActivation(shipAMissileBoosterActivationRaw);
      if (activation !== undefined) raw = { ...raw, shipAMissileBoosterActivation: activation };
    }
    if (shipBMissileBoosterActivationRaw !== undefined) {
      const activation = this.parseMissileBoosterActivation(shipBMissileBoosterActivationRaw);
      if (activation !== undefined) raw = { ...raw, shipBMissileBoosterActivation: activation };
    }

    if (shipASensorBoosterActivationRaw !== undefined) {
      const activation = this.parseSensorBoosterActivation(shipASensorBoosterActivationRaw);
      if (activation !== undefined) raw = { ...raw, shipASensorBoosterActivation: activation };
    }
    if (shipBSensorBoosterActivationRaw !== undefined) {
      const activation = this.parseSensorBoosterActivation(shipBSensorBoosterActivationRaw);
      if (activation !== undefined) raw = { ...raw, shipBSensorBoosterActivation: activation };
    }

    if (shipAEwarActivationRaw !== undefined) {
      const activation = this.parseEwarActivation(shipAEwarActivationRaw, raw.shipAOverload !== false);
      if (activation !== undefined) raw = { ...raw, shipAEwarActivation: activation };
    }
    if (shipBEwarActivationRaw !== undefined) {
      const activation = this.parseEwarActivation(shipBEwarActivationRaw, raw.shipBOverload !== false);
      if (activation !== undefined) raw = { ...raw, shipBEwarActivation: activation };
    }

    raw.shipATracking ??= 0;
    raw.shipASigRes ??= "S";
    raw.shipAOptimal ??= 0;
    raw.shipAFalloff ??= 0;
    raw.shipBTracking ??= 0;
    raw.shipBSigRes ??= "S";
    raw.shipBOptimal ??= 0;
    raw.shipBFalloff ??= 0;

    return profileSettingsFromRaw(raw);
  }

  private parseEwarActivation(value: string, sideOverload: boolean): StoredEwarActivation | undefined {
    try {
      const parsed: unknown = JSON.parse(value);
      if (!isRecord(parsed)) return undefined;
      const webs = this.migrateToggleableArray(parsed.webs, sideOverload);
      const grapplers = this.migrateToggleableArray(parsed.grapplers, sideOverload);
      const scramblers = this.migrateToggleableArray(parsed.scramblers, sideOverload);
      const painters = this.migrateToggleableArray(parsed.painters, sideOverload);
      const disruptors = parsed.disruptors !== undefined ? this.migrateDisruptorArray(parsed.disruptors, sideOverload) : undefined;
      if (disruptors === undefined && parsed.disruptors !== undefined) return undefined;
      const result: StoredEwarActivation = {
        ...(webs !== undefined ? { webs } : {}),
        ...(grapplers !== undefined ? { grapplers } : {}),
        ...(disruptors !== undefined ? { disruptors } : {}),
        ...(scramblers !== undefined ? { scramblers } : {}),
        ...(painters !== undefined ? { painters } : {}),
      };
      return isOptionalEwarActivation(result) ? result : undefined;
    } catch {
      return undefined;
    }
  }

  private parseBoosterActivation(raw: string): readonly StoredBoosterActivation[] | undefined {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return undefined;
      const result: StoredBoosterActivation[] = [];
      for (const item of parsed) {
        const row = this.parseBoosterRow(item);
        if (row === undefined) return undefined;
        result.push(row);
      }
      return isOptionalBoosterActivations(result) ? result : undefined;
    } catch {
      return undefined;
    }
  }

  private parseMissileBoosterActivation(raw: string): readonly StoredMissileBoosterActivation[] | undefined {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return undefined;
      const result: StoredMissileBoosterActivation[] = [];
      for (const item of parsed) {
        const row = this.parseMissileBoosterRow(item);
        if (row === undefined) return undefined;
        result.push(row);
      }
      return isOptionalMissileBoosterActivations(result) ? result : undefined;
    } catch {
      return undefined;
    }
  }

  private parseSensorBoosterActivation(raw: string): readonly StoredSensorBoosterActivation[] | undefined {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return undefined;
      const result: StoredSensorBoosterActivation[] = [];
      for (const item of parsed) {
        const row = this.parseSensorBoosterRow(item);
        if (row === undefined) return undefined;
        result.push(row);
      }
      return isOptionalSensorBoosterActivations(result) ? result : undefined;
    } catch {
      return undefined;
    }
  }

  private migrateToggleableArray(value: unknown, sideOverload: boolean): readonly { active: boolean; overloaded: boolean }[] | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value)) return undefined;
    const result: { active: boolean; overloaded: boolean }[] = [];
    for (const item of value) {
      const row = this.migrateToggleableActivation(item, sideOverload);
      if (row === undefined) return undefined;
      result.push(row);
    }
    return result;
  }

  private migrateToggleableActivation(item: unknown, sideOverload: boolean): { active: boolean; overloaded: boolean } | undefined {
    if (typeof item === "boolean") return { active: item, overloaded: sideOverload };
    if (!isRecord(item)) return undefined;
    if (typeof item.active !== "boolean") return undefined;
    return { active: item.active, overloaded: typeof item.overloaded === "boolean" ? item.overloaded : sideOverload };
  }

  private migrateDisruptorArray(
    value: unknown,
    sideOverload: boolean,
  ): readonly { active: boolean; overloaded: boolean; script: StoredDisruptionScript }[] | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value)) return undefined;
    const result: { active: boolean; overloaded: boolean; script: StoredDisruptionScript }[] = [];
    for (const item of value) {
      const row = this.migrateDisruptorActivation(item, sideOverload);
      if (row === undefined) return undefined;
      result.push(row);
    }
    return result;
  }

  private migrateDisruptorActivation(item: unknown, sideOverload: boolean): { active: boolean; overloaded: boolean; script: StoredDisruptionScript } | undefined {
    if (typeof item === "boolean") return { active: item, overloaded: sideOverload, script: "none" };
    if (!isRecord(item)) return undefined;
    if (typeof item.active !== "boolean") return undefined;
    if (typeof item.script !== "string" || item.script.length === 0) return undefined;
    return { active: item.active, overloaded: typeof item.overloaded === "boolean" ? item.overloaded : sideOverload, script: resolveDisruptionScript(item.script, this.itemNameResolver) };
  }

  private parseBoosterRow(item: unknown): StoredBoosterActivation | undefined {
    if (typeof item === "boolean") return { active: item, script: "none" };
    if (!isRecord(item)) return undefined;
    const active = typeof item.active === "boolean" ? item.active : false;
    if (item.script === undefined) return { active, script: "none" };
    if (typeof item.script !== "string") return undefined;
    return { active, script: resolveBoosterScript(item.script, this.itemNameResolver) };
  }

  private parseMissileBoosterRow(item: unknown): StoredMissileBoosterActivation | undefined {
    if (typeof item === "boolean") return { active: item, overloaded: false, script: "none" };
    if (!isRecord(item)) return undefined;
    const active = typeof item.active === "boolean" ? item.active : false;
    const overloaded = typeof item.overloaded === "boolean" ? item.overloaded : false;
    if (item.script === undefined) return { active, overloaded, script: "none" };
    if (typeof item.script !== "string") return undefined;
    return { active, overloaded, script: resolveDisruptionScript(item.script, this.itemNameResolver) };
  }

  private parseSensorBoosterRow(item: unknown): StoredSensorBoosterActivation | undefined {
    if (typeof item === "boolean") return { active: item, overloaded: false, script: "none" };
    if (!isRecord(item)) return undefined;
    const active = typeof item.active === "boolean" ? item.active : false;
    const overloaded = typeof item.overloaded === "boolean" ? item.overloaded : false;
    if (item.script === undefined) return { active, overloaded, script: "none" };
    if (typeof item.script !== "string") return undefined;
    return { active, overloaded, script: resolveDisruptionScript(item.script, this.itemNameResolver) };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
