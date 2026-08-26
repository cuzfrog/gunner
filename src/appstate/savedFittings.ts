import type { ShipId } from "../gamedata/ids";
import type { ShipProfile, Ships } from "../ships";
import type { StorageProvider } from "./providers";

export interface SavedFitting {
  readonly id: string;
  readonly hullId: ShipId;
  readonly name: string;
  readonly text: string;
  readonly savedAt: number;
}

export interface SavedFittings {
  listForHull(hullId: ShipId): readonly SavedFitting[];
  mostRecentFor(hullId: ShipId): SavedFitting | undefined;
  record(fitting: { hullId: ShipId; name: string; text: string }): SavedFitting | undefined;
  remove(id: string): void;
}

const SAVED_FITTINGS_KEY = "gunner-saved-fittings-v1";
const SAVED_FITTINGS_VERSION = 2;
const MAX_SAVED_FITTINGS = 50;

interface LegacyFitting {
  readonly hull: string;
  readonly name: string;
  readonly text: string;
  readonly savedAt: number;
}

interface SavedFittingsStorage {
  readonly version: number;
  readonly fittings: readonly SavedFitting[];
  unresolved?: readonly LegacyFitting[];
}

interface SavedFittingsState {
  readonly resolved: SavedFitting[];
  readonly unresolved: LegacyFitting[];
}

export class LocalSavedFittings implements SavedFittings {
  private readonly storage: StorageProvider;
  private readonly ships: Ships;

  constructor({ storage, ships }: { storage: StorageProvider; ships: Ships }) {
    this.storage = storage;
    this.ships = ships;
  }

  listForHull(hullId: ShipId): readonly SavedFitting[] {
    return this.readAll().resolved.filter((f) => f.hullId === hullId).sort((a, b) => b.savedAt - a.savedAt);
  }

  mostRecentFor(hullId: ShipId): SavedFitting | undefined {
    return this.listForHull(hullId)[0];
  }

  record(fitting: { hullId: ShipId; name: string; text: string }): SavedFitting | undefined {
    const hullId = fitting.hullId;
    const name = fitting.name.trim();
    const text = fitting.text.trim();
    if (hullId.length === 0 || name.length === 0 || text.length === 0) return undefined;
    const saved: SavedFitting = { id: idFor(hullId, name), hullId, name, text, savedAt: Date.now() };
    const { resolved, unresolved } = this.readAll();
    const all = resolved.filter((f) => f.id !== saved.id);
    all.push(saved);
    all.sort((a, b) => a.savedAt - b.savedAt);
    while (all.length > MAX_SAVED_FITTINGS) all.shift();
    this.saveAll({ resolved: all, unresolved });
    return saved;
  }

  remove(id: string): void {
    const { resolved, unresolved } = this.readAll();
    const all = resolved.filter((f) => f.id !== id);
    if (all.length === 0 && unresolved.length === 0) {
      this.storage.removeItem(SAVED_FITTINGS_KEY);
    } else {
      this.saveAll({ resolved: all, unresolved });
    }
  }

  private readAll(): SavedFittingsState {
    const raw = this.storage.getItem(SAVED_FITTINGS_KEY);
    if (!raw) return { resolved: [], unresolved: [] };
    const parsed = parseSavedFittings(raw, this.ships);
    if (parsed.version !== SAVED_FITTINGS_VERSION && (parsed.state.resolved.length > 0 || parsed.state.unresolved.length > 0)) {
      this.saveAll(parsed.state);
    }
    return parsed.state;
  }

  private saveAll(state: SavedFittingsState): void {
    const storage: SavedFittingsStorage = { version: SAVED_FITTINGS_VERSION, fittings: state.resolved };
    if (state.unresolved.length > 0) storage.unresolved = state.unresolved;
    this.storage.setItem(SAVED_FITTINGS_KEY, JSON.stringify(storage));
  }
}

function idFor(hullId: ShipId, name: string): string {
  return `${hullId}::${name}`;
}

function parseSavedFittings(raw: string, ships: Ships): { version: number; state: SavedFittingsState } {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSavedFittingStorage(parsed)) return { version: -1, state: { resolved: [], unresolved: [] } };
    if (parsed.version === 1) return { version: 1, state: migrateV1Fittings(parsed, ships) };
    if (parsed.version === SAVED_FITTINGS_VERSION) return { version: SAVED_FITTINGS_VERSION, state: parseV2Fittings(parsed, ships) };
    return { version: parsed.version, state: { resolved: [], unresolved: [] } };
  } catch {
    return { version: -1, state: { resolved: [], unresolved: [] } };
  }
}

function isSavedFittingStorage(value: unknown): value is { version: number; fittings: unknown[]; unresolved?: unknown[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.version === "number" &&
    Number.isFinite(s.version) &&
    Array.isArray(s.fittings) &&
    (s.unresolved === undefined || Array.isArray(s.unresolved))
  );
}

function migrateV1Fittings(storage: { version: number; fittings: unknown[]; unresolved?: unknown[] }, ships: Ships): SavedFittingsState {
  const resolved: SavedFitting[] = [];
  const unresolved: LegacyFitting[] = [];
  for (const value of storage.fittings) {
    if (!isLegacyFitting(value)) continue;
    const profile = resolveHull(value.hull, ships);
    if (profile) {
      resolved.push({ id: idFor(profile.id, value.name), hullId: profile.id, name: value.name, text: value.text, savedAt: value.savedAt });
    } else {
      unresolved.push(value);
    }
  }
  return { resolved, unresolved };
}

function parseV2Fittings(storage: { version: number; fittings: unknown[]; unresolved?: unknown[] }, ships: Ships): SavedFittingsState {
  const resolved: SavedFitting[] = [];
  for (const value of storage.fittings) {
    if (isSavedFitting(value)) resolved.push(value);
  }
  const unresolved: LegacyFitting[] = [];
  if (storage.unresolved) {
    for (const value of storage.unresolved) {
      if (isLegacyFitting(value)) unresolved.push(value);
    }
  }
  return { resolved, unresolved };
}

function resolveHull(hull: string, ships: Ships): ShipProfile | undefined {
  const trimmed = hull.trim();
  const byId = /^\d+$/.test(trimmed) ? ships.findHullById(trimmed as ShipId) : undefined;
  return byId ?? ships.findHull(trimmed);
}

function isLegacyFitting(value: unknown): value is LegacyFitting {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.hull === "string" &&
    s.hull.length > 0 &&
    typeof s.name === "string" &&
    s.name.length > 0 &&
    typeof s.text === "string" &&
    s.text.length > 0 &&
    typeof s.savedAt === "number" &&
    Number.isFinite(s.savedAt) &&
    s.savedAt >= 0
  );
}

function isSavedFitting(value: unknown): value is SavedFitting {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    s.id.length > 0 &&
    typeof s.hullId === "string" &&
    s.hullId.length > 0 &&
    typeof s.name === "string" &&
    s.name.length > 0 &&
    typeof s.text === "string" &&
    s.text.length > 0 &&
    typeof s.savedAt === "number" &&
    Number.isFinite(s.savedAt) &&
    s.savedAt >= 0
  );
}
