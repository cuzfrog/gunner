import type { StorageProvider } from "./providers";
import { LocalSavedFittings, type SavedFittings } from "./savedFittings";

function fakeStorage(): StorageProvider {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

function buildSavedFittings(storage?: StorageProvider): { storage: StorageProvider; savedFittings: SavedFittings } {
  const s = storage ?? fakeStorage();
  return { storage: s, savedFittings: new LocalSavedFittings({ storage: s }) };
}

describe("LocalSavedFittings", () => {
  afterEach(() => {
    vi.setSystemTime();
  });

  test("listForHull returns empty when nothing is stored", () => {
    const { savedFittings } = buildSavedFittings();
    expect(savedFittings.listForHull("Rifter")).toEqual([]);
    expect(savedFittings.mostRecentFor("Rifter")).toBeUndefined();
  });

  test("record returns the saved fitting and persists it", () => {
    vi.setSystemTime(1000);
    const { storage, savedFittings } = buildSavedFittings();
    const saved = savedFittings.record({ hull: "Rifter", name: "Brawler", text: "[Rifter, Brawler]\nMWD" })!;
    expect(saved).toEqual({ id: "Rifter::Brawler", hull: "Rifter", name: "Brawler", text: "[Rifter, Brawler]\nMWD", savedAt: 1000 });
    expect(savedFittings.listForHull("Rifter")).toEqual([saved]);
    expect(storage.getItem("gunner-saved-fittings-v1")).toContain("Rifter");
  });

  test("listForHull is sorted by savedAt descending", () => {
    const { savedFittings } = buildSavedFittings();
    vi.setSystemTime(1000);
    savedFittings.record({ hull: "Rifter", name: "Old", text: "old" });
    vi.setSystemTime(2000);
    savedFittings.record({ hull: "Rifter", name: "New", text: "new" });
    expect(savedFittings.listForHull("Rifter").map((f) => f.name)).toEqual(["New", "Old"]);
  });

  test("mostRecentFor returns the most recently saved fitting for the hull", () => {
    const { savedFittings } = buildSavedFittings();
    vi.setSystemTime(1000);
    savedFittings.record({ hull: "Rifter", name: "First", text: "first" });
    vi.setSystemTime(2000);
    savedFittings.record({ hull: "Rifter", name: "Second", text: "second" });
    expect(savedFittings.mostRecentFor("Rifter")?.name).toBe("Second");
    expect(savedFittings.mostRecentFor("Thrasher")).toBeUndefined();
  });

  test("record with the same hull and name overwrites the text and bumps savedAt", () => {
    const { savedFittings } = buildSavedFittings();
    vi.setSystemTime(1000);
    savedFittings.record({ hull: "Rifter", name: "Brawler", text: "old" });
    vi.setSystemTime(2000);
    const saved = savedFittings.record({ hull: "Rifter", name: "Brawler", text: "new" })!;
    const list = savedFittings.listForHull("Rifter");
    expect(list).toHaveLength(1);
    expect(saved).toEqual({ id: "Rifter::Brawler", hull: "Rifter", name: "Brawler", text: "new", savedAt: 2000 });
    expect(list[0]).toEqual(saved);
  });

  test("remove deletes a saved fitting by id and leaves others", () => {
    const { savedFittings } = buildSavedFittings();
    vi.setSystemTime(1000);
    savedFittings.record({ hull: "Rifter", name: "A", text: "a" });
    savedFittings.record({ hull: "Thrasher", name: "B", text: "b" });
    savedFittings.remove("Rifter::A");
    expect(savedFittings.listForHull("Rifter")).toEqual([]);
    expect(savedFittings.listForHull("Thrasher")).toHaveLength(1);
  });

  test("remove of the last entry removes the storage key", () => {
    const { storage, savedFittings } = buildSavedFittings();
    savedFittings.record({ hull: "Rifter", name: "A", text: "a" });
    savedFittings.remove("Rifter::A");
    expect(storage.getItem("gunner-saved-fittings-v1")).toBeNull();
  });

  test("corrupt or wrong-version storage is treated as empty", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-saved-fittings-v1", "not json");
    const { savedFittings } = buildSavedFittings(storage);
    expect(savedFittings.listForHull("Rifter")).toEqual([]);
  });

  test("version-mismatch storage is treated as empty", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-saved-fittings-v1", JSON.stringify({ version: 2, fittings: [{ hull: "Rifter", name: "Brawler", text: "[Rifter]", savedAt: 1000 }] }));
    const { savedFittings } = buildSavedFittings(storage);
    expect(savedFittings.listForHull("Rifter")).toEqual([]);
  });

  test("record rejects empty or missing fields", () => {
    const { savedFittings } = buildSavedFittings();
    expect(savedFittings.record({ hull: "", name: "Brawler", text: "[Rifter]" })).toBeUndefined();
    expect(savedFittings.record({ hull: "Rifter", name: "", text: "[Rifter]" })).toBeUndefined();
    expect(savedFittings.record({ hull: "Rifter", name: "Brawler", text: "" })).toBeUndefined();
    expect(savedFittings.listForHull("Rifter")).toEqual([]);
  });

  test("record trims whitespace", () => {
    const { savedFittings } = buildSavedFittings();
    vi.setSystemTime(1000);
    const saved = savedFittings.record({ hull: "  Rifter  ", name: "  Brawler  ", text: "  [Rifter, Brawler]\nMWD  " });
    expect(saved).toEqual({ id: "Rifter::Brawler", hull: "Rifter", name: "Brawler", text: "[Rifter, Brawler]\nMWD", savedAt: 1000 });
  });

  test("record evicts the oldest fitting when over the cap", () => {
    const { savedFittings } = buildSavedFittings();
    for (let i = 0; i < 52; i++) {
      vi.setSystemTime(1000 + i);
      savedFittings.record({ hull: "Rifter", name: `Fit${i}`, text: `text${i}` });
    }
    const list = savedFittings.listForHull("Rifter");
    expect(list).toHaveLength(50);
    expect(list.some((f) => f.name === "Fit0")).toBe(false);
    expect(list.some((f) => f.name === "Fit1")).toBe(false);
    expect(list[list.length - 1].name).toBe("Fit2");
    expect(list[0].name).toBe("Fit51");
  });
});
