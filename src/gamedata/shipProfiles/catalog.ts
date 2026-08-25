import type { ShipProfile } from "../../ships";
import { SHIP_PROFILES } from "./profiles";

export interface ShipProfileCatalog {
  byName(name: string): ShipProfile | undefined;
  all(): readonly ShipProfile[];
}

export class StaticShipProfileCatalog implements ShipProfileCatalog {
  private readonly profiles: readonly ShipProfile[];
  private readonly lookup: ReadonlyMap<string, ShipProfile>;

  constructor(profiles: readonly ShipProfile[] = SHIP_PROFILES) {
    this.profiles = profiles;
    const map = new Map<string, ShipProfile>();
    for (const profile of profiles) {
      map.set(normalize(profile.name), profile);
    }
    this.lookup = map;
  }

  byName(name: string): ShipProfile | undefined {
    return this.lookup.get(normalize(name));
  }

  all(): readonly ShipProfile[] {
    return this.profiles;
  }
}

function normalize(input: string): string {
  return input.trim().toLowerCase();
}
