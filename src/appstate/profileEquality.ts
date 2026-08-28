import type { ProfileSettings } from "./userSettings";

export interface ProfileEquality {
  equal(a: ProfileSettings, b: ProfileSettings): boolean;
}

export class CanonicalProfileEquality implements ProfileEquality {
  equal(a: ProfileSettings, b: ProfileSettings): boolean {
    return profilesEqual(a, b);
  }
}

function profilesEqual(a: ProfileSettings, b: ProfileSettings): boolean {
  return jsonValueEqual(a, b);
}

type JsonValue =
  | undefined
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }
  | object;

function jsonValueEqual(a: JsonValue, b: JsonValue): boolean {
  if (a === b) return true;
  if (isJsonArray(a) && isJsonArray(b)) {
    return a.length === b.length && a.every((item, index) => jsonValueEqual(item, b[index]));
  }
  if (isJsonObject(a) && isJsonObject(b)) {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    return (
      keysA.length === keysB.length &&
      keysA.every((key, index) => key === keysB[index] && jsonValueEqual(a[key], b[keysB[index]]))
    );
  }
  return false;
}

function isJsonArray(value: JsonValue): value is readonly JsonValue[] {
  return Array.isArray(value);
}

function isJsonObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return value !== null && typeof value === "object" && !isJsonArray(value);
}
