import type { StorageProvider } from "./providers";

export interface SavedFitting {
  readonly id: string;
  readonly hull: string;
  readonly name: string;
  readonly text: string;
  readonly savedAt: number;
}

export interface SavedFittings {
  listForHull(hull: string): readonly SavedFitting[];
  mostRecentFor(hull: string): SavedFitting | undefined;
  record(fitting: { hull: string; name: string; text: string }): SavedFitting | undefined;
  remove(id: string): void;
}

const SAVED_FITTINGS_KEY = "gunner-saved-fittings-v1";
const SAVED_FITTINGS_VERSION = 1;
const MAX_SAVED_FITTINGS = 50;

export class LocalSavedFittings implements SavedFittings {
  private readonly storage: StorageProvider;

  constructor({ storage }: { storage: StorageProvider }) {
    this.storage = storage;
  }

  listForHull(hull: string): readonly SavedFitting[] {
    return this.loadAll().filter((f) => f.hull === hull).sort((a, b) => b.savedAt - a.savedAt);
  }

  mostRecentFor(hull: string): SavedFitting | undefined {
    return this.listForHull(hull)[0];
  }

  record(fitting: { hull: string; name: string; text: string }): SavedFitting | undefined {
    const hull = fitting.hull.trim();
    const name = fitting.name.trim();
    const text = fitting.text.trim();
    if (hull.length === 0 || name.length === 0 || text.length === 0) return undefined;
    const saved: SavedFitting = { hull, name, text, id: idFor(hull, name), savedAt: Date.now() };
    const all = this.loadAll().filter((f) => f.id !== saved.id);
    all.push(saved);
    all.sort((a, b) => a.savedAt - b.savedAt);
    while (all.length > MAX_SAVED_FITTINGS) all.shift();
    this.saveAll(all);
    return saved;
  }

  remove(id: string): void {
    const all = this.loadAll().filter((f) => f.id !== id);
    if (all.length === 0) {
      this.storage.removeItem(SAVED_FITTINGS_KEY);
    } else {
      this.saveAll(all);
    }
  }

  private loadAll(): SavedFitting[] {
    const raw = this.storage.getItem(SAVED_FITTINGS_KEY);
    if (!raw) return [];
    return parseSavedFittings(raw);
  }

  private saveAll(fittings: SavedFitting[]): void {
    this.storage.setItem(SAVED_FITTINGS_KEY, JSON.stringify({ version: SAVED_FITTINGS_VERSION, fittings }));
  }
}

function idFor(hull: string, name: string): string {
  return `${hull}::${name}`;
}

function parseSavedFittings(raw: string): SavedFitting[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSavedFittingStorage(parsed)) return [];
    const fittings: SavedFitting[] = [];
    for (const value of parsed.fittings) {
      if (isSavedFitting(value)) fittings.push({ ...value, id: idFor(value.hull, value.name) });
    }
    return fittings;
  } catch {
    return [];
  }
}

function isSavedFittingStorage(value: unknown): value is { version: number; fittings: unknown[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return s.version === SAVED_FITTINGS_VERSION && Array.isArray(s.fittings);
}

function isSavedFitting(value: unknown): value is Omit<SavedFitting, "id"> {
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
