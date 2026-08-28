import { _buildShipNameToType, _parseProfile, _resolveShipIds, _slugify } from "./generate-ship-profiles";
import type { SdeGroup, SdeType } from "./generate-ship-profiles";

describe("_slugify", () => {
  test("lowercases and joins words with hyphens", () => {
    expect(_slugify("Amarr Empire")).toBe("amarr-empire");
    expect(_slugify("Jovian Directorate")).toBe("jovian-directorate");
  });

  test("strips apostrophes and collapses punctuation", () => {
    expect(_slugify("Mordu's Legion")).toBe("mordus-legion");
    expect(_slugify("Sisters of EVE")).toBe("sisters-of-eve");
  });

  test("trims leading and trailing non-alphanumerics", () => {
    expect(_slugify("  Gallente Federation  ")).toBe("gallente-federation");
  });
});

describe("_buildShipNameToType", () => {
  function makeType(overrides: { typeID: number; typeName: string; groupID: number; published?: number }): SdeType {
    return {
      typeID: overrides.typeID,
      "typeName_en-us": overrides.typeName,
      groupID: overrides.groupID,
      published: overrides.published ?? 1,
    };
  }

  function makeGroup(overrides: { groupID: number; categoryID: number }): SdeGroup {
    return {
      groupID: overrides.groupID,
      categoryID: overrides.categoryID,
      "groupName_en-us": "Group",
      published: 1,
    };
  }

  test("indexes only types in the ship category", () => {
    const types: Record<string, SdeType> = {
      "1": makeType({ typeID: 1, typeName: "Rifter", groupID: 25 }),
      "2": makeType({ typeID: 2, typeName: "Gecko", groupID: 100 }),
    };
    const groups: Record<string, SdeGroup> = {
      "25": makeGroup({ groupID: 25, categoryID: 6 }),
      "100": makeGroup({ groupID: 100, categoryID: 18 }),
    };
    const map = _buildShipNameToType(types, groups);
    expect(map.get("Rifter")?.typeID).toBe(1);
    expect(map.has("Gecko")).toBe(false);
  });

  test("throws on duplicate ship names", () => {
    const types: Record<string, SdeType> = {
      "1": makeType({ typeID: 1, typeName: "Rifter", groupID: 25 }),
      "2": makeType({ typeID: 2, typeName: "Rifter", groupID: 25 }),
    };
    const groups: Record<string, SdeGroup> = { "25": makeGroup({ groupID: 25, categoryID: 6 }) };
    expect(() => _buildShipNameToType(types, groups)).toThrow('Duplicate ship name "Rifter" in SDE.');
  });
});

describe("_resolveShipIds", () => {
  function rifterType(): SdeType {
    return { typeID: 587, "typeName_en-us": "Rifter", groupID: 25, published: 1 };
  }

  const map = new Map<string, SdeType>([["Rifter", rifterType()]]);

  test("resolves type and group ids for a known ship", () => {
    const result = _resolveShipIds({
      name: "Rifter",
      faction: "Minmatar Republic",
      hullType: "Standard Frigates",
    }, map);
    expect(String(result.id)).toBe("587");
    expect(String(result.factionId)).toBe("minmatar-republic");
    expect(String(result.hullTypeId)).toBe("25");
    expect(result.matched).toBe(true);
  });

  test("falls back to legacy ids for a missing ship", () => {
    const result = _resolveShipIds({
      name: "Eidolon",
      faction: "Jovian Directorate",
      hullType: "Standard Battleships",
    }, map);
    expect(String(result.id)).toBe("legacy-eidolon");
    expect(String(result.factionId)).toBe("jovian-directorate");
    expect(String(result.hullTypeId)).toBe("legacy-standard-battleships");
    expect(result.matched).toBe(false);
  });
});

describe("_parseProfile", () => {
  const shipNameToType = new Map<string, SdeType>([["Rifter", { typeID: 587, "typeName_en-us": "Rifter", groupID: 25, published: 1 }]]);

  test("parses a valid profile and resolves ids", () => {
    const raw = {
      name: "Rifter",
      faction: "Minmatar Republic",
      hullType: "Standard Frigates",
      navigation: { maxVelocity: "365 m/s", inertiaModifier: "3" },
      structure: { mass: "1,067,000 kg" },
      targeting: { sigRadius: "35 m" },
    };
    const profile = _parseProfile(raw, 0, shipNameToType);
    expect(String(profile.id)).toBe("587");
    expect(profile.name).toBe("Rifter");
    expect(String(profile.factionId)).toBe("minmatar-republic");
    expect(String(profile.hullTypeId)).toBe("25");
    expect(profile.mass).toBe(1_067_000);
    expect(profile.baseSpeed).toBe(365);
    expect(profile.sigRadius).toBe(35);
  });

  test("throws for a non-object entry", () => {
    expect(() => _parseProfile(null, 0, shipNameToType)).toThrow("Entry 0 is not an object");
  });

  test("throws for an empty name", () => {
    expect(() => _parseProfile({ name: "" }, 0, shipNameToType)).toThrow("Entry 0 has an empty name");
  });
});
