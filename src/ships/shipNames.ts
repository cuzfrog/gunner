import { SHIP_PROFILES } from "./profiles";
import { SHIP_NAMES } from "./ship-names-i18n";
import type { ShipProfile } from "./types";

export type ShipNameLanguage = "en" | "zh" | "ja";

export function shipDisplayName(name: string, language: ShipNameLanguage): string {
  return SHIP_NAMES[name]?.[language] || name;
}

export function findShipProfileByName(input: string): ShipProfile | undefined {
  return LOOKUP.get(normalize(input));
}

const LOOKUP = buildLookup();

function buildLookup(): ReadonlyMap<string, ShipProfile> {
  const map = new Map<string, ShipProfile>();
  for (const profile of SHIP_PROFILES) {
    map.set(normalize(profile.name), profile);
  }
  for (const profile of SHIP_PROFILES) {
    const names = SHIP_NAMES[profile.name];
    if (!names) continue;
    for (const language of ["en", "zh", "ja"] as const) {
      const localized = names[language].trim();
      if (localized.length === 0) continue;
      const key = normalize(localized);
      if (map.has(key)) continue;
      map.set(key, profile);
    }
  }
  return map;
}

function normalize(input: string): string {
  return input.trim().toLowerCase();
}
