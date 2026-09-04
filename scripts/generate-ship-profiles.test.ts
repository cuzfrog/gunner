import { _buildAttributeNameMap, _buildShipNameToType, _extractDefenseData, _parseDroneLimits, _parseProfile, _resolveShipIds, _slugify } from "./generate-ship-profiles";
import type { SdeDogmaAttribute, SdeGroup, SdeType, SdeTypeDogma } from "./generate-ship-profiles";

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
  const emptyTypedogmas: Record<string, SdeTypeDogma> = {};
  const emptyAttributeNames = new Map<number, string>();

  test("parses a valid profile and resolves ids", () => {
    const raw = {
      name: "Rifter",
      faction: "Minmatar Republic",
      hullType: "Standard Frigates",
      navigation: { maxVelocity: "365 m/s", inertiaModifier: "3" },
      structure: { mass: "1,067,000 kg" },
      targeting: { sigRadius: "35 m", scanResolution: "200 mm", maxTargetingRange: "30 km", maxLockedTargets: 4 },
      drones: { droneCapacity: "25 m³", droneBandwidth: "25 Mbit/sec" },
    };
    const profile = _parseProfile(raw, 0, shipNameToType, emptyTypedogmas, emptyAttributeNames);
    expect(String(profile.id)).toBe("587");
    expect(profile.name).toBe("Rifter");
    expect(String(profile.factionId)).toBe("minmatar-republic");
    expect(String(profile.hullTypeId)).toBe("25");
    expect(profile.mass).toBe(1_067_000);
    expect(profile.baseSpeed).toBe(365);
    expect(profile.sigRadius).toBe(35);
    expect(profile.droneBandwidth).toBe(25);
    expect(profile.droneCapacity).toBe(25);
    expect(profile.maxActiveDrones).toBe(5);
  });

  test("defaults drone limits to zero when drones block is absent", () => {
    const raw = {
      name: "Rifter",
      faction: "Minmatar Republic",
      hullType: "Standard Frigates",
      navigation: { maxVelocity: "365 m/s", inertiaModifier: "3" },
      structure: { mass: "1,067,000 kg" },
      targeting: { sigRadius: "35 m", scanResolution: "200 mm", maxTargetingRange: "30 km", maxLockedTargets: 4 },
    };
    const profile = _parseProfile(raw, 0, shipNameToType, emptyTypedogmas, emptyAttributeNames);
    expect(profile.droneBandwidth).toBe(0);
    expect(profile.droneCapacity).toBe(0);
    expect(profile.maxActiveDrones).toBe(0);
  });

  test("extracts defense data from typedogma when ship is matched", () => {
    const attributeNames = new Map<number, string>([
      [263, "shieldCapacity"], [479, "shieldRechargeRate"], [265, "armorHP"], [9, "hp"],
      [267, "armorEmDamageResonance"], [270, "armorThermalDamageResonance"], [269, "armorKineticDamageResonance"], [268, "armorExplosiveDamageResonance"],
      [271, "shieldEmDamageResonance"], [274, "shieldThermalDamageResonance"], [273, "shieldKineticDamageResonance"], [272, "shieldExplosiveDamageResonance"],
      [113, "emDamageResonance"], [110, "thermalDamageResonance"], [109, "kineticDamageResonance"], [111, "explosiveDamageResonance"],
    ]);
    const typedogmas: Record<string, SdeTypeDogma> = {
      "587": {
        dogmaAttributes: [
          { attributeID: 263, value: 375 }, { attributeID: 479, value: 625000 }, { attributeID: 265, value: 250 }, { attributeID: 9, value: 400 },
          { attributeID: 267, value: 0.5 }, { attributeID: 270, value: 0.35 }, { attributeID: 269, value: 0.25 }, { attributeID: 268, value: 0.2 },
          { attributeID: 271, value: 0.5 }, { attributeID: 274, value: 0.6 }, { attributeID: 273, value: 0.7 }, { attributeID: 272, value: 0.75 },
          { attributeID: 113, value: 0.67 }, { attributeID: 110, value: 0.67 }, { attributeID: 109, value: 0.67 }, { attributeID: 111, value: 0.67 },
        ],
      },
    };
    const raw = {
      name: "Rifter",
      faction: "Minmatar Republic",
      hullType: "Standard Frigates",
      navigation: { maxVelocity: "365 m/s", inertiaModifier: "3" },
      structure: { mass: "1,067,000 kg" },
      targeting: { sigRadius: "35 m", scanResolution: "200 mm", maxTargetingRange: "30 km", maxLockedTargets: 4 },
    };
    const profile = _parseProfile(raw, 0, shipNameToType, typedogmas, attributeNames);
    expect(profile.shieldHp).toBe(375);
    expect(profile.shieldRechargeTime).toBe(625);
    expect(profile.armorHp).toBe(250);
    expect(profile.hullHp).toBe(400);
    expect(profile.shieldResists).toEqual({ em: 0.5, thermal: 0.4, kinetic: 0.3, explosive: 0.25 });
    expect(profile.armorResists).toEqual({ em: 0.5, thermal: 0.65, kinetic: 0.75, explosive: 0.8 });
    expect(profile.hullResists).toEqual({ em: 0.33, thermal: 0.33, kinetic: 0.33, explosive: 0.33 });
  });

  test("defaults defense to zero when typedogma is missing", () => {
    const raw = {
      name: "Rifter",
      faction: "Minmatar Republic",
      hullType: "Standard Frigates",
      navigation: { maxVelocity: "365 m/s", inertiaModifier: "3" },
      structure: { mass: "1,067,000 kg" },
      targeting: { sigRadius: "35 m", scanResolution: "200 mm", maxTargetingRange: "30 km", maxLockedTargets: 4 },
    };
    const profile = _parseProfile(raw, 0, shipNameToType, emptyTypedogmas, emptyAttributeNames);
    expect(profile.shieldHp).toBe(0);
    expect(profile.shieldRechargeTime).toBe(0);
    expect(profile.armorHp).toBe(0);
    expect(profile.hullHp).toBe(0);
    expect(profile.shieldResists).toEqual({ em: 0, thermal: 0, kinetic: 0, explosive: 0 });
    expect(profile.armorResists).toEqual({ em: 0, thermal: 0, kinetic: 0, explosive: 0 });
    expect(profile.hullResists).toEqual({ em: 0, thermal: 0, kinetic: 0, explosive: 0 });
  });

  test("throws for a non-object entry", () => {
    expect(() => _parseProfile(null, 0, shipNameToType, emptyTypedogmas, emptyAttributeNames)).toThrow("Entry 0 is not an object");
  });

  test("throws for an empty name", () => {
    expect(() => _parseProfile({ name: "" }, 0, shipNameToType, emptyTypedogmas, emptyAttributeNames)).toThrow("Entry 0 has an empty name");
  });
});

describe("_parseDroneLimits", () => {
  test("returns zeros when drones block is absent", () => {
    const limits = _parseDroneLimits(undefined, "Test");
    expect(limits).toEqual({ bandwidth: 0, capacity: 0, maxActive: 0 });
  });

  test("parses bandwidth and capacity with default maxActive 5", () => {
    const limits = _parseDroneLimits({ droneBandwidth: "75 Mbit/sec", droneCapacity: "75 m³" }, "Test");
    expect(limits).toEqual({ bandwidth: 75, capacity: 75, maxActive: 5 });
  });

  test("returns zeros when both bandwidth and capacity are zero", () => {
    const limits = _parseDroneLimits({ droneBandwidth: "0 Mbit/sec", droneCapacity: "0 m³" }, "Test");
    expect(limits).toEqual({ bandwidth: 0, capacity: 0, maxActive: 0 });
  });

  test("returns maxActive 5 when only bandwidth is non-zero", () => {
    const limits = _parseDroneLimits({ droneBandwidth: "50 Mbit/sec", droneCapacity: "0 m³" }, "Test");
    expect(limits).toEqual({ bandwidth: 50, capacity: 0, maxActive: 5 });
  });

  test("throws when droneBandwidth is missing from a present drones block", () => {
    expect(() => _parseDroneLimits({ droneCapacity: "25 m³" }, "Test")).toThrow("Test drones: missing or invalid droneBandwidth");
  });

  test("throws when droneCapacity is missing from a present drones block", () => {
    expect(() => _parseDroneLimits({ droneBandwidth: "25 Mbit/sec" }, "Test")).toThrow("Test drones: missing or invalid droneCapacity");
  });

  test("treats empty string values as zero", () => {
    const limits = _parseDroneLimits({ droneBandwidth: "", droneCapacity: "" }, "Test");
    expect(limits).toEqual({ bandwidth: 0, capacity: 0, maxActive: 0 });
  });

  test("takes the upper bound of range strings for T3 strategic cruisers", () => {
    expect(_parseDroneLimits({ droneBandwidth: "0-50 Mbit/sec", droneCapacity: "0-200 m³" }, "Legion")).toEqual({ bandwidth: 50, capacity: 200, maxActive: 5 });
    expect(_parseDroneLimits({ droneBandwidth: "25–40 Mbit/sec", droneCapacity: "25–50 m³" }, "Loki")).toEqual({ bandwidth: 40, capacity: 50, maxActive: 5 });
    expect(_parseDroneLimits({ droneBandwidth: "25-125 Mbit/sec", droneCapacity: "50-300 m³" }, "Proteus")).toEqual({ bandwidth: 125, capacity: 300, maxActive: 5 });
    expect(_parseDroneLimits({ droneBandwidth: "0-25 Mbit/sec", droneCapacity: "0-50 m³" }, "Tengu")).toEqual({ bandwidth: 25, capacity: 50, maxActive: 5 });
  });
});

describe("_buildAttributeNameMap", () => {
  function makeAttr(id: number, name: string): SdeDogmaAttribute {
    return { attributeID: id, name };
  }

  test("maps attributeID to name", () => {
    const attrs: Record<string, SdeDogmaAttribute> = { "263": makeAttr(263, "shieldCapacity"), "9": makeAttr(9, "hp") };
    const map = _buildAttributeNameMap(attrs);
    expect(map.get(263)).toBe("shieldCapacity");
    expect(map.get(9)).toBe("hp");
  });

  test("keeps the first occurrence on duplicate attributeIDs", () => {
    const attrs: Record<string, SdeDogmaAttribute> = { "1": makeAttr(263, "shieldCapacity"), "2": makeAttr(263, "duplicate") };
    const map = _buildAttributeNameMap(attrs);
    expect(map.get(263)).toBe("shieldCapacity");
  });
});

describe("_extractDefenseData", () => {
  function makeAttributeNames(): Map<number, string> {
    return new Map<number, string>([
      [263, "shieldCapacity"], [479, "shieldRechargeRate"], [265, "armorHP"], [9, "hp"],
      [267, "armorEmDamageResonance"], [270, "armorThermalDamageResonance"], [269, "armorKineticDamageResonance"], [268, "armorExplosiveDamageResonance"],
      [271, "shieldEmDamageResonance"], [274, "shieldThermalDamageResonance"], [273, "shieldKineticDamageResonance"], [272, "shieldExplosiveDamageResonance"],
      [113, "emDamageResonance"], [110, "thermalDamageResonance"], [109, "kineticDamageResonance"], [111, "explosiveDamageResonance"],
    ]);
  }

  test("extracts HP, recharge time, and resists from typedogma", () => {
    const typedogmas: Record<string, SdeTypeDogma> = {
      "24692": {
        dogmaAttributes: [
          { attributeID: 263, value: 7700 }, { attributeID: 479, value: 2500000 }, { attributeID: 265, value: 9350 }, { attributeID: 9, value: 8800 },
          { attributeID: 267, value: 0.5 }, { attributeID: 270, value: 0.65 }, { attributeID: 269, value: 0.75 }, { attributeID: 268, value: 0.8 },
          { attributeID: 271, value: 1.0 }, { attributeID: 274, value: 0.8 }, { attributeID: 273, value: 0.6 }, { attributeID: 272, value: 0.5 },
          { attributeID: 113, value: 0.67 }, { attributeID: 110, value: 0.67 }, { attributeID: 109, value: 0.67 }, { attributeID: 111, value: 0.67 },
        ],
      },
    };
    const defense = _extractDefenseData("24692", typedogmas, makeAttributeNames());
    expect(defense.shieldHp).toBe(7700);
    expect(defense.shieldRechargeTime).toBe(2500);
    expect(defense.armorHp).toBe(9350);
    expect(defense.hullHp).toBe(8800);
    expect(defense.shieldResists).toEqual({ em: 0, thermal: 0.2, kinetic: 0.4, explosive: 0.5 });
    expect(defense.armorResists).toEqual({ em: 0.5, thermal: 0.35, kinetic: 0.25, explosive: 0.2 });
    expect(defense.hullResists).toEqual({ em: 0.33, thermal: 0.33, kinetic: 0.33, explosive: 0.33 });
  });

  test("returns zero HP and zero resists when typedogma is missing", () => {
    const defense = _extractDefenseData("99999", {}, makeAttributeNames());
    expect(defense.shieldHp).toBe(0);
    expect(defense.shieldRechargeTime).toBe(0);
    expect(defense.armorHp).toBe(0);
    expect(defense.hullHp).toBe(0);
    expect(defense.shieldResists).toEqual({ em: 0, thermal: 0, kinetic: 0, explosive: 0 });
    expect(defense.armorResists).toEqual({ em: 0, thermal: 0, kinetic: 0, explosive: 0 });
    expect(defense.hullResists).toEqual({ em: 0, thermal: 0, kinetic: 0, explosive: 0 });
  });
});
