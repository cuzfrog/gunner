import type { ShipId } from "../ids";
import type { ShipProfile } from "../../ships";
import { SHIP_PROFILES } from "./profiles";

export interface ShipProfileCatalog {
  byId(id: ShipId): ShipProfile | undefined;
  byName(name: string): ShipProfile | undefined;
  all(): readonly ShipProfile[];
}

export class StaticShipProfileCatalog implements ShipProfileCatalog {
  private readonly profiles: readonly ShipProfile[];
  private readonly byIdLookup: ReadonlyMap<ShipId, ShipProfile>;
  private readonly byNameLookup: ReadonlyMap<string, ShipProfile>;

  constructor(profiles: readonly ShipProfile[] = SHIP_PROFILES) {
    this.profiles = profiles;
    const idMap = new Map<ShipId, ShipProfile>();
    const nameMap = new Map<string, ShipProfile>();
    for (const profile of profiles) {
      idMap.set(profile.id, profile);
      nameMap.set(normalize(profile.name), profile);
    }
    this.byIdLookup = idMap;
    this.byNameLookup = nameMap;
  }

  byId(id: ShipId): ShipProfile | undefined {
    return this.byIdLookup.get(id);
  }

  byName(name: string): ShipProfile | undefined {
    return this.byNameLookup.get(normalize(name));
  }

  all(): readonly ShipProfile[] {
    return this.profiles;
  }
}

function normalize(input: string): string {
  return input.trim().toLowerCase();
}
