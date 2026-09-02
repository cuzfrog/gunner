import type { ShipId, FactionId, HullTypeId } from "../gamedata/ids";
import type {
  FittedHull,
  HullTier,
  HullView,
  PropulsionId,
  PropulsionModule,
  PropulsionStats,
  ShipNameLanguage,
  ShipProfile,
  Ships,
  ShipStats,
  SkillLevel,
  StatConditions,
} from "../ships";
import type { StorageProvider } from "./providers";
import { LocalSavedFittings, type SavedFittings } from "./savedFittings";

const RIFTER: ShipProfile = {
  id: "587" as ShipId,
  name: "Rifter",
  factionId: "minmatar-republic" as FactionId,
  hullTypeId: "25" as HullTypeId,
  mass: 1_000_000,
  inertiaModifier: 3,
  baseSpeed: 365,
  sigRadius: 36,
  droneBandwidth: 0,
  droneCapacity: 0,
  maxActiveDrones: 5,
  shieldHp: 0,
  shieldRechargeTime: 0,
  armorHp: 0,
  hullHp: 0,
  shieldResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  armorResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
};

const THRASHER: ShipProfile = {
  id: "16242" as ShipId,
  name: "Thrasher",
  factionId: "minmatar-republic" as FactionId,
  hullTypeId: "420" as HullTypeId,
  mass: 1_600_000,
  inertiaModifier: 3,
  baseSpeed: 250,
  sigRadius: 120,
  droneBandwidth: 0,
  droneCapacity: 0,
  maxActiveDrones: 5,
  shieldHp: 0,
  shieldRechargeTime: 0,
  armorHp: 0,
  hullHp: 0,
  shieldResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  armorResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
};

function fakeStorage(): StorageProvider {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

function fakeShips(): Ships {
  const profiles = [RIFTER, THRASHER];
  return {
    hulls: vi.fn((_language: ShipNameLanguage): readonly HullView[] => []),
    hullView: vi.fn((profile: ShipProfile, _language: ShipNameLanguage): HullView => ({ name: profile.name, hullType: "Standard Frigates", faction: "Minmatar Republic" })),
    findHull: vi.fn((name: string): ShipProfile | undefined => {
      const normalized = name.trim().toLowerCase();
      return profiles.find((p) => p.name.toLowerCase() === normalized);
    }),
    findHullById: vi.fn((id: ShipId): ShipProfile | undefined => profiles.find((p) => p.id === id)),
    findHullByName: vi.fn((_name: string, _language: ShipNameLanguage): ShipProfile | undefined => undefined),
    parsePropulsionId: vi.fn((_value: unknown): PropulsionId | undefined => undefined),
    fittingOptions: vi.fn((_profile: ShipProfile): readonly PropulsionModule[] => []),
    allFittingOptions: vi.fn((): readonly PropulsionModule[] => []),
    fittingOption: vi.fn((_profile: ShipProfile, _id: PropulsionId): PropulsionModule | undefined => undefined),
    turretSizeOptions: vi.fn((_profile: ShipProfile): readonly HullTier[] => []),
    shipTier: vi.fn((_profile: ShipProfile): HullTier | undefined => undefined),
    fittedStats: vi.fn(
      (_profile: ShipProfile, _fitted?: FittedHull, _module?: PropulsionStats, _conditions?: StatConditions, _maxSpeedOverride?: number): ShipStats => ({
        mass: 0,
        inertiaModifier: 0,
        sigRadius: 0,
        maxSpeed: 0,
        baseMaxSpeed: 0,
        alignTime: 0,
      }),
    ),
    maxSpeedForFittedMass: vi.fn((): number => 0),
    alignTime: vi.fn((_mass: number, _inertiaModifier: number): number => 0),
  };
}

function buildSavedFittings(storage?: StorageProvider): { storage: StorageProvider; savedFittings: SavedFittings } {
  const s = storage ?? fakeStorage();
  return { storage: s, savedFittings: new LocalSavedFittings({ storage: s, ships: fakeShips() }) };
}

describe("LocalSavedFittings", () => {
  afterEach(() => {
    vi.setSystemTime();
  });

  test("listForHull returns empty when nothing is stored", () => {
    const { savedFittings } = buildSavedFittings();
    expect(savedFittings.listForHull(RIFTER.id)).toEqual([]);
    expect(savedFittings.mostRecentFor(RIFTER.id)).toBeUndefined();
  });

  test("record returns the saved fitting and persists it", () => {
    vi.setSystemTime(1000);
    const { storage, savedFittings } = buildSavedFittings();
    const saved = savedFittings.record({ hullId: RIFTER.id, name: "Brawler", text: "[Rifter, Brawler]\nMWD" })!;
    expect(saved).toEqual({ id: "587::Brawler", hullId: RIFTER.id, name: "Brawler", text: "[Rifter, Brawler]\nMWD", savedAt: 1000 });
    expect(savedFittings.listForHull(RIFTER.id)).toEqual([saved]);
    expect(storage.getItem("gunner-saved-fittings-v1")).toContain('"hullId":"587"');
  });

  test("listForHull is sorted by savedAt descending", () => {
    const { savedFittings } = buildSavedFittings();
    vi.setSystemTime(1000);
    savedFittings.record({ hullId: RIFTER.id, name: "Old", text: "old" });
    vi.setSystemTime(2000);
    savedFittings.record({ hullId: RIFTER.id, name: "New", text: "new" });
    expect(savedFittings.listForHull(RIFTER.id).map((f) => f.name)).toEqual(["New", "Old"]);
  });

  test("mostRecentFor returns the most recently saved fitting for the hull", () => {
    const { savedFittings } = buildSavedFittings();
    vi.setSystemTime(1000);
    savedFittings.record({ hullId: RIFTER.id, name: "First", text: "first" });
    vi.setSystemTime(2000);
    savedFittings.record({ hullId: RIFTER.id, name: "Second", text: "second" });
    expect(savedFittings.mostRecentFor(RIFTER.id)?.name).toBe("Second");
    expect(savedFittings.mostRecentFor(THRASHER.id)).toBeUndefined();
  });

  test("record with the same hull and name overwrites the text and bumps savedAt", () => {
    const { savedFittings } = buildSavedFittings();
    vi.setSystemTime(1000);
    savedFittings.record({ hullId: RIFTER.id, name: "Brawler", text: "old" });
    vi.setSystemTime(2000);
    const saved = savedFittings.record({ hullId: RIFTER.id, name: "Brawler", text: "new" })!;
    const list = savedFittings.listForHull(RIFTER.id);
    expect(list).toHaveLength(1);
    expect(saved).toEqual({ id: "587::Brawler", hullId: RIFTER.id, name: "Brawler", text: "new", savedAt: 2000 });
    expect(list[0]).toEqual(saved);
  });

  test("remove deletes a saved fitting by id and leaves others", () => {
    const { savedFittings } = buildSavedFittings();
    vi.setSystemTime(1000);
    savedFittings.record({ hullId: RIFTER.id, name: "A", text: "a" });
    savedFittings.record({ hullId: THRASHER.id, name: "B", text: "b" });
    savedFittings.remove("587::A");
    expect(savedFittings.listForHull(RIFTER.id)).toEqual([]);
    expect(savedFittings.listForHull(THRASHER.id)).toHaveLength(1);
  });

  test("remove of the last entry removes the storage key", () => {
    const { storage, savedFittings } = buildSavedFittings();
    savedFittings.record({ hullId: RIFTER.id, name: "A", text: "a" });
    savedFittings.remove("587::A");
    expect(storage.getItem("gunner-saved-fittings-v1")).toBeNull();
  });

  test("corrupt or wrong-version storage is treated as empty", () => {
    const storage = fakeStorage();
    storage.setItem("gunner-saved-fittings-v1", "not json");
    const { savedFittings } = buildSavedFittings(storage);
    expect(savedFittings.listForHull(RIFTER.id)).toEqual([]);
  });

  test("v1 storage with resolvable hull names is migrated to hull ids", () => {
    const storage = fakeStorage();
    storage.setItem(
      "gunner-saved-fittings-v1",
      JSON.stringify({ version: 1, fittings: [{ hull: "Rifter", name: "Brawler", text: "[Rifter]", savedAt: 1000 }] }),
    );
    const { savedFittings } = buildSavedFittings(storage);
    const list = savedFittings.listForHull(RIFTER.id);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ hullId: "587", name: "Brawler", text: "[Rifter]", savedAt: 1000 });
  });

  test("v1 storage with unresolvable hull names is preserved as unresolved", () => {
    const storage = fakeStorage();
    storage.setItem(
      "gunner-saved-fittings-v1",
      JSON.stringify({ version: 1, fittings: [{ hull: "Unknown Ship", name: "Brawler", text: "[Unknown]", savedAt: 1000 }] }),
    );
    const { savedFittings } = buildSavedFittings(storage);
    expect(savedFittings.listForHull(RIFTER.id)).toEqual([]);
    const raw = storage.getItem("gunner-saved-fittings-v1");
    expect(raw).toContain('"unresolved"');
    expect(raw).toContain("Unknown Ship");
  });

  test("record rejects empty or missing fields", () => {
    const { savedFittings } = buildSavedFittings();
    expect(savedFittings.record({ hullId: "" as ShipId, name: "Brawler", text: "[Rifter]" })).toBeUndefined();
    expect(savedFittings.record({ hullId: RIFTER.id, name: "", text: "[Rifter]" })).toBeUndefined();
    expect(savedFittings.record({ hullId: RIFTER.id, name: "Brawler", text: "" })).toBeUndefined();
    expect(savedFittings.listForHull(RIFTER.id)).toEqual([]);
  });

  test("record trims whitespace", () => {
    const { savedFittings } = buildSavedFittings();
    vi.setSystemTime(1000);
    const saved = savedFittings.record({ hullId: RIFTER.id, name: "  Brawler  ", text: "  [Rifter, Brawler]\nMWD  " })!;
    expect(saved).toEqual({ id: "587::Brawler", hullId: RIFTER.id, name: "Brawler", text: "[Rifter, Brawler]\nMWD", savedAt: 1000 });
  });

  test("record evicts the oldest fitting when over the cap", () => {
    const { savedFittings } = buildSavedFittings();
    for (let i = 0; i < 52; i++) {
      vi.setSystemTime(1000 + i);
      savedFittings.record({ hullId: RIFTER.id, name: `Fit${i}`, text: `text${i}` });
    }
    const list = savedFittings.listForHull(RIFTER.id);
    expect(list).toHaveLength(50);
    expect(list.some((f) => f.name === "Fit0")).toBe(false);
    expect(list.some((f) => f.name === "Fit1")).toBe(false);
    expect(list[list.length - 1].name).toBe("Fit2");
    expect(list[0].name).toBe("Fit51");
  });
});
