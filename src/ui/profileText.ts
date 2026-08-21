import { SIG_RESOLUTIONS, type AutopilotMode, type SigResolutionClass } from "../sim";
import { USER_SETTINGS_VERSION, type FittedHullSummary, type ProfileParamOverrides, type ProfileSettings } from "./settings";

export const PROFILE_TEXT_HEADER = "# gunner v1" as const;

export function serializeProfile(settings: ProfileSettings): string {
  const lines: string[] = [PROFILE_TEXT_HEADER];

  for (const field of GLOBAL_FIELDS) {
    serializeScalar(lines, dotKeyFromField(field), settings[field]);
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

  const raw: Record<string, unknown> = {};
  let overrideAttacker: Partial<ProfileParamOverrides> = {};
  let overrideTarget: Partial<ProfileParamOverrides> = {};

  let i = firstLine + 1;
  while (i < rawLines.length) {
    const line = stripCarriageReturn(rawLines[i]);
    i++;
    if (line === "") continue;
    if (line === "---") return undefined;

    if (line.endsWith(".fitting:")) {
      const side = parseSideFromDotKey(line.slice(0, line.length - ".fitting:".length));
      if (!side) return undefined;
      const { body, nextIndex } = readFittingBlock(rawLines, i);
      if (body === undefined) return undefined;
      if (body.split("\n").some((line) => stripCarriageReturn(line) === "---")) return undefined;
      raw[`${side}Fitting`] = body;
      i = nextIndex;
      continue;
    }

    const eq = line.indexOf("=");
    if (eq < 0) return undefined;
    const dotKey = line.slice(0, eq);
    const value = line.slice(eq + 1);

    if (dotKey.startsWith("override.attacker.")) {
      const short = dotKey.slice("override.attacker.".length);
      const full = overrideKeyFor("attacker", short);
      if (!full) return undefined;
      const parsed = parseOverrideValue(full, value);
      if (parsed === undefined) return undefined;
      overrideAttacker = { ...overrideAttacker, [full]: parsed };
      continue;
    }

    if (dotKey.startsWith("override.target.")) {
      const short = dotKey.slice("override.target.".length);
      const full = overrideKeyFor("target", short);
      if (!full) return undefined;
      const parsed = parseOverrideValue(full, value);
      if (parsed === undefined) return undefined;
      overrideTarget = { ...overrideTarget, [full]: parsed };
      continue;
    }

    const field = fieldFromDotKey(dotKey);
    if (!field) return undefined;
    const parsed = parseScalarValue(field, value);
    if (parsed === undefined) return undefined;
    raw[field] = parsed;
  }

  if (Object.keys(overrideAttacker).length > 0) raw.attackerOverrides = overrideAttacker;
  if (Object.keys(overrideTarget).length > 0) raw.targetOverrides = overrideTarget;

  return asProfileSettings(raw);
}

const GLOBAL_FIELDS: (keyof ProfileSettings)[] = [
  "version",
  "tracking",
  "sigRes",
  "optimal",
  "falloff",
  "initialDistance",
  "simSpeed",
  "maneuverAggressivity",
  "gridBrightness",
];

const ATTACKER_FIELDS: (keyof ProfileSettings)[] = [
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
];

const TARGET_FIELDS: (keyof ProfileSettings)[] = [
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
];

const REQUIRED_FIELDS: (keyof ProfileSettings)[] = [
  "version",
  "tracking",
  "sigRes",
  "optimal",
  "falloff",
  "attackerSpeed",
  "attackerMode",
  "attackerRange",
  "attackerMass",
  "attackerInertia",
  "initialDistance",
  "targetSpeed",
  "targetMode",
  "targetRange",
  "targetMass",
  "targetInertia",
  "targetSig",
  "simSpeed",
];

const ALL_FIELDS: Set<keyof ProfileSettings> = new Set([
  ...GLOBAL_FIELDS,
  ...ATTACKER_FIELDS,
  ...TARGET_FIELDS,
  "attackerFitting",
  "targetFitting",
  "attackerOverrides",
  "targetOverrides",
]);

const OVERRIDE_KEYS: (keyof ProfileParamOverrides)[] = [
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
];

function serializeScalar(lines: string[], dotKey: string, value: unknown): void {
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
  if (isFittedHullSummary(value)) {
    lines.push(`${dotKey}=${JSON.stringify(value)}`);
  }
}

function serializeSide(lines: string[], side: "attacker" | "target", settings: ProfileSettings): void {
  const fittingKey = `${side}Fitting` as keyof ProfileSettings;
  const fitting = settings[fittingKey] as string | undefined;
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
    const dotKey = dotKeyFromField(field);
    serializeScalar(lines, dotKey, settings[field]);
  }

  const overrides = settings[`${side}Overrides` as keyof ProfileSettings] as Partial<ProfileParamOverrides> | undefined;
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      const short = overrideShortKey(side, key as keyof ProfileParamOverrides);
      if (short === undefined) continue;
      const serialized = key === "sigRes" ? String(value) : formatNumber(value as number);
      lines.push(`override.${side}.${short}=${serialized}`);
    }
  }
}

function dotKeyFromField(field: keyof ProfileSettings): string {
  if (field.startsWith("attacker")) return `attacker.${lowerFirst(field.slice("attacker".length))}`;
  if (field.startsWith("target")) return `target.${lowerFirst(field.slice("target".length))}`;
  return field;
}

function fieldFromDotKey(dotKey: string): keyof ProfileSettings | undefined {
  if (dotKey.startsWith("attacker.")) {
    const short = dotKey.slice("attacker.".length);
    const field = `attacker${upperFirst(short)}` as keyof ProfileSettings;
    return ALL_FIELDS.has(field) ? field : undefined;
  }
  if (dotKey.startsWith("target.")) {
    const short = dotKey.slice("target.".length);
    const field = `target${upperFirst(short)}` as keyof ProfileSettings;
    return ALL_FIELDS.has(field) ? field : undefined;
  }
  const field = dotKey as keyof ProfileSettings;
  return ALL_FIELDS.has(field) ? field : undefined;
}

function parseSideFromDotKey(dotKey: string): "attacker" | "target" | undefined {
  if (dotKey === "attacker" || dotKey.startsWith("attacker.")) return "attacker";
  if (dotKey === "target" || dotKey.startsWith("target.")) return "target";
  return undefined;
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

function parseScalarValue(field: keyof ProfileSettings, value: string): unknown | undefined {
  if (value === "") return undefined;

  if (field === "version") return value === String(USER_SETTINGS_VERSION) ? USER_SETTINGS_VERSION : undefined;
  if (field === "attackerOverload" || field === "targetOverload") return value === "true" ? true : value === "false" ? false : undefined;
  if (field === "attackerMode" || field === "targetMode") return isAutopilotMode(value) ? value : undefined;
  if (field === "attackerSkillLevel" || field === "targetSkillLevel") return isSkillLevel(value) ? Number(value) : undefined;
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

function overrideShortKey(side: "attacker" | "target", key: keyof ProfileParamOverrides): string | undefined {
  if (side === "attacker" && key.startsWith("attacker")) return lowerFirst(key.slice("attacker".length));
  if (side === "target" && key.startsWith("target")) return lowerFirst(key.slice("target".length));
  if (key === "tracking" || key === "sigRes" || key === "optimal" || key === "falloff") return key;
  return undefined;
}

function overrideKeyFor(side: "attacker" | "target", short: string): keyof ProfileParamOverrides | undefined {
  if (OVERRIDE_KEYS.includes(short as keyof ProfileParamOverrides)) return short as keyof ProfileParamOverrides;
  const full = `${side}${upperFirst(short)}` as keyof ProfileParamOverrides;
  return OVERRIDE_KEYS.includes(full) ? full : undefined;
}

function parseOverrideValue(key: keyof ProfileParamOverrides, value: string): ProfileParamOverrides[keyof ProfileParamOverrides] | undefined {
  if (value === "") return undefined;
  if (key === "sigRes") return isSigResolutionClass(value) ? value : undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (key === "targetSig") return num > 0 ? num : undefined;
  return num >= 0 ? num : undefined;
}

function asProfileSettings(raw: Record<string, unknown>): ProfileSettings | undefined {
  for (const field of REQUIRED_FIELDS) {
    if (raw[field] === undefined) return undefined;
  }
  return raw as ProfileSettings;
}

function parseFittedHullSummary(value: string): FittedHullSummary | undefined {
  try {
    const parsed = JSON.parse(value) as unknown;
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

function isFittedHull(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.mass === "number" && Number.isFinite(s.mass) && s.mass >= 0 &&
    isPositiveMultiplier(s.massMultiplier) &&
    isPositiveMultiplier(s.speedMultiplier) &&
    isPositiveMultiplier(s.inertiaMultiplier) &&
    isPositiveMultiplier(s.sigMultiplier) &&
    typeof s.sigRadiusAdd === "number" && Number.isFinite(s.sigRadiusAdd) && s.sigRadiusAdd >= 0
  );
}

function isPositiveMultiplier(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isPropulsionStats(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.thrust === "number" && Number.isFinite(s.thrust) && s.thrust >= 0 &&
    typeof s.speedBonus === "number" && Number.isFinite(s.speedBonus) && s.speedBonus >= 0 &&
    typeof s.massAddition === "number" && Number.isFinite(s.massAddition) && s.massAddition >= 0 &&
    typeof s.sigBloom === "number" && Number.isFinite(s.sigBloom) && s.sigBloom >= 0
  );
}

function isAutopilotMode(value: string): value is AutopilotMode {
  return value === "orbit" || value === "keepAtRange";
}

function isSigResolutionClass(value: string): value is SigResolutionClass {
  return value === "S" || value === "M" || value === "L" || value === "XL";
}

function isSkillLevel(value: string): value is `${0 | 1 | 2 | 3 | 4 | 5}` {
  return /^[0-5]$/.test(value);
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
