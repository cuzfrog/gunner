import { _buildAttributeNameMap, _buildShipNameToType, _extractCapacitorData, _extractDefenseData, _parseProfile, _resolveShipIds } from "./generate-ship-profiles";
import type { SdeDogmaAttribute, SdeGroup, SdeType, SdeTypeDogma } from "./generate-ship-profiles";

// Attribute IDs in these fixtures are arbitrary; only the id-to-name mapping matters to the unit under test.
const ATTRIBUTE_NAMES = new Map<number, string>([
  [501, "agility"], [502, "maxVelocity"], [503, "signatureRadius"],
  [504, "scanResolution"], [505, "maxTargetRange"], [506, "maxLockedTargets"],
  [507, "hiSlots"], [508, "medSlots"], [509, "lowSlots"], [510, "rigSlots"],
  [511, "droneCapacity"], [512, "droneBandwidth"], [513, "maxActiveDrones"],
  [520, "hp"], [521, "armorHP"], [522, "shieldCapacity"], [523, "capacitorCapacity"], [524, "rechargeRate"], [525, "shieldRechargeRate"],
]);

const DEFENSE_ATTRIBUTE_NAMES = new Map<number, string>([
  ...ATTRIBUTE_NAMES,
  [263, "shieldCapacity"], [479, "shieldRechargeRate"], [265, "armorHP"], [9, "hp"], [482, "capacitorCapacity"], [55, "rechargeRate"],
  [267, "armorEmDamageResonance"], [270, "armorThermalDamageResonance"], [269, "armorKineticDamageResonance"], [268, "armorExplosiveDamageResonance"],
  [271, "shieldEmDamageResonance"], [274, "shieldThermalDamageResonance"], [273, "shieldKineticDamageResonance"], [272, "shieldExplosiveDamageResonance"],
  [113, "emDamageResonance"], [110, "thermalDamageResonance"], [109, "kineticDamageResonance"], [111, "explosiveDamageResonance"],
]);

const RIFTER_TYPE: SdeType = { typeID: 587, "typeName_en-us": "Rifter", groupID: 25, published: 1, mass: 1_067_000 };
const SHIP_NAME_TO_TYPE = new Map<string, SdeType>([["Rifter", RIFTER_TYPE]]);

function dogmaFor(values: Readonly<Record<string, number>>, names: ReadonlyMap<number, string> = ATTRIBUTE_NAMES): SdeTypeDogma {
  const nameToId = new Map([...names].map(([id, name]) => [name, id]));
  return {
    dogmaAttributes: Object.entries(values).map(([name, value]) => {
      const attributeID = nameToId.get(name);
      if (attributeID === undefined) throw new Error(`Unknown attribute name "${name}" in fixture.`);
      return { attributeID, value };
    }),
  };
}

const MINIMAL_DOGMA: Readonly<Record<string, number>> = {
  agility: 3.2, maxVelocity: 365, signatureRadius: 35,
  hp: 400, armorHP: 250, shieldCapacity: 375, capacitorCapacity: 250, rechargeRate: 625_000,
};

describe("_buildShipNameToType", () => {
  function makeType(overrides: { typeID: number; typeName: string; groupID: number; published?: number; mass?: number }): SdeType {
    return {
      typeID: overrides.typeID,
      "typeName_en-us": overrides.typeName,
      groupID: overrides.groupID,
      published: overrides.published ?? 1,
      mass: overrides.mass ?? 1_000_000,
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
  const map = new Map<string, SdeType>([["Rifter", RIFTER_TYPE]]);

  test("resolves type and group ids from the SDE type record", () => {
    const result = _resolveShipIds({
      name: "Rifter",
      faction: "Minmatar Republic",
      hullType: "Standard Frigates",
    }, map);
    expect(String(result.id)).toBe("587");
    expect(String(result.factionId)).toBe("minmatar-republic");
    expect(String(result.hullTypeId)).toBe("25");
    expect(result.type).toBe(RIFTER_TYPE);
  });

  test("throws for a ship name that has no SDE match", () => {
    expect(() => _resolveShipIds({
      name: "Eidolon",
      faction: "Jovian Directorate",
      hullType: "Standard Battleships",
    }, map)).toThrow('No SDE ship for "Eidolon"');
  });
});

describe("_parseProfile", () => {
  const typedogmas: Record<string, SdeTypeDogma> = { "587": dogmaFor(MINIMAL_DOGMA) };

  test("resolves numerics from the SDE type record and typedogma, ignoring scraped wiki blocks", () => {
    const raw = {
      name: "Rifter",
      faction: "Minmatar Republic",
      hullType: "Standard Frigates",
      navigation: { maxVelocity: "999 m/s", inertiaModifier: "9" },
      structure: { mass: "42 kg" },
      targeting: { sigRadius: "999 m", scanResolution: "999 mm", maxTargetingRange: "999 km", maxLockedTargets: 99 },
      drones: { droneCapacity: "999 m³", droneBandwidth: "999 Mbit/sec" },
      fittings: { highSlots: 9, mediumSlots: 9 },
    };
    const typedogmas: Record<string, SdeTypeDogma> = {
      "587": dogmaFor({ ...MINIMAL_DOGMA, scanResolution: 660, maxTargetRange: 22_500, maxLockedTargets: 4, hiSlots: 3, medSlots: 3, lowSlots: 4, rigSlots: 3, droneCapacity: 0, droneBandwidth: 0 }),
    };
    const profile = _parseProfile(raw, 0, SHIP_NAME_TO_TYPE, typedogmas, ATTRIBUTE_NAMES);
    expect(String(profile.id)).toBe("587");
    expect(profile.name).toBe("Rifter");
    expect(String(profile.factionId)).toBe("minmatar-republic");
    expect(String(profile.hullTypeId)).toBe("25");
    expect(profile.mass).toBe(1_067_000);
    expect(profile.inertiaModifier).toBe(3.2);
    expect(profile.baseSpeed).toBe(365);
    expect(profile.sigRadius).toBe(35);
    expect(profile.scanResolution).toBe(660);
    expect(profile.maxTargetingRange).toBe(22_500);
    expect(profile.maxLockedTargets).toBe(4);
    expect(profile.highSlots).toBe(3);
    expect(profile.medSlots).toBe(3);
    expect(profile.lowSlots).toBe(4);
    expect(profile.rigSlots).toBe(3);
    expect(profile.droneBandwidth).toBe(0);
    expect(profile.droneCapacity).toBe(0);
    expect(profile.maxActiveDrones).toBe(0);
  });

  test("defaults scan resolution, targeting range, locks, and slots to zero when the SDE lacks them", () => {
    const profile = _parseProfile({ name: "Rifter", faction: "Minmatar Republic", hullType: "Standard Frigates" }, 0, SHIP_NAME_TO_TYPE, typedogmas, ATTRIBUTE_NAMES);
    expect(profile.scanResolution).toBe(0);
    expect(profile.maxTargetingRange).toBe(0);
    expect(profile.maxLockedTargets).toBe(0);
    expect(profile.highSlots).toBe(0);
    expect(profile.medSlots).toBe(0);
    expect(profile.lowSlots).toBe(0);
    expect(profile.rigSlots).toBe(0);
  });

  test("falls back to maxActiveDrones 5 for drone-capable hulls", () => {
    const typedogmas: Record<string, SdeTypeDogma> = {
      "587": dogmaFor({ ...MINIMAL_DOGMA, droneCapacity: 40, droneBandwidth: 25 }),
    };
    const profile = _parseProfile({ name: "Rifter", faction: "Minmatar Republic", hullType: "Standard Frigates" }, 0, SHIP_NAME_TO_TYPE, typedogmas, ATTRIBUTE_NAMES);
    expect(profile.droneCapacity).toBe(40);
    expect(profile.droneBandwidth).toBe(25);
    expect(profile.maxActiveDrones).toBe(5);
  });

  test("respects an explicit maxActiveDrones dogma attribute when present", () => {
    const typedogmas: Record<string, SdeTypeDogma> = {
      "587": dogmaFor({ ...MINIMAL_DOGMA, droneCapacity: 40, droneBandwidth: 25, maxActiveDrones: 7 }),
    };
    const profile = _parseProfile({ name: "Rifter", faction: "Minmatar Republic", hullType: "Standard Frigates" }, 0, SHIP_NAME_TO_TYPE, typedogmas, ATTRIBUTE_NAMES);
    expect(profile.maxActiveDrones).toBe(7);
  });

  test("throws for a ship name that has no SDE match", () => {
    expect(() => _parseProfile({ name: "Penitence", faction: "Amarr Empire", hullType: "Recon Ships" }, 0, SHIP_NAME_TO_TYPE, typedogmas, ATTRIBUTE_NAMES)).toThrow('No SDE ship for "Penitence"');
  });

  test("throws naming the attribute when a required dogma value is missing", () => {
    const typedogmas: Record<string, SdeTypeDogma> = {
      "587": dogmaFor({ agility: 3.2, maxVelocity: 365, hp: 400, armorHP: 250, shieldCapacity: 375, capacitorCapacity: 250, rechargeRate: 625_000 }),
    };
    expect(() => _parseProfile({ name: "Rifter", faction: "Minmatar Republic", hullType: "Standard Frigates" }, 0, SHIP_NAME_TO_TYPE, typedogmas, ATTRIBUTE_NAMES)).toThrow('Rifter: SDE attribute "signatureRadius" is missing or not positive.');
  });

  test("throws naming the attribute when a required dogma value is zero", () => {
    const typedogmas: Record<string, SdeTypeDogma> = {
      "587": dogmaFor({ ...MINIMAL_DOGMA, maxVelocity: 0 }),
    };
    expect(() => _parseProfile({ name: "Rifter", faction: "Minmatar Republic", hullType: "Standard Frigates" }, 0, SHIP_NAME_TO_TYPE, typedogmas, ATTRIBUTE_NAMES)).toThrow('Rifter: SDE attribute "maxVelocity" is missing or not positive.');
  });

  test("throws when the SDE type record mass is missing or not positive", () => {
    const zeroMassType: SdeType = { ...RIFTER_TYPE, mass: 0 };
    const map = new Map<string, SdeType>([["Rifter", zeroMassType]]);
    expect(() => _parseProfile({ name: "Rifter", faction: "Minmatar Republic", hullType: "Standard Frigates" }, 0, map, typedogmas, ATTRIBUTE_NAMES)).toThrow('Rifter: SDE type record "mass" is missing or not positive.');
  });

  test("carries defense data from typedogma into the profile", () => {
    const typedogmas: Record<string, SdeTypeDogma> = {
      "587": dogmaFor({
        ...MINIMAL_DOGMA,
        shieldRechargeRate: 625_000,
        armorEmDamageResonance: 0.5, armorThermalDamageResonance: 0.35, armorKineticDamageResonance: 0.25, armorExplosiveDamageResonance: 0.2,
        shieldEmDamageResonance: 0.5, shieldThermalDamageResonance: 0.6, shieldKineticDamageResonance: 0.7, shieldExplosiveDamageResonance: 0.75,
        emDamageResonance: 0.67, thermalDamageResonance: 0.67, kineticDamageResonance: 0.67, explosiveDamageResonance: 0.67,
      }, DEFENSE_ATTRIBUTE_NAMES),
    };
    const profile = _parseProfile({ name: "Rifter", faction: "Minmatar Republic", hullType: "Standard Frigates" }, 0, SHIP_NAME_TO_TYPE, typedogmas, DEFENSE_ATTRIBUTE_NAMES);
    expect(profile.shieldHp).toBe(375);
    expect(profile.shieldRechargeTime).toBe(625);
    expect(profile.armorHp).toBe(250);
    expect(profile.hullHp).toBe(400);
    expect(profile.shieldResists).toEqual({ em: 0.5, thermal: 0.4, kinetic: 0.3, explosive: 0.25 });
    expect(profile.armorResists).toEqual({ em: 0.5, thermal: 0.65, kinetic: 0.75, explosive: 0.8 });
    expect(profile.hullResists).toEqual({ em: 0.33, thermal: 0.33, kinetic: 0.33, explosive: 0.33 });
    expect(profile.capacitorCapacity).toBe(250);
    expect(profile.capacitorRechargeTime).toBe(625);
  });

  test("throws for a non-object entry", () => {
    expect(() => _parseProfile(null, 0, SHIP_NAME_TO_TYPE, {}, ATTRIBUTE_NAMES)).toThrow("Entry 0 is not an object");
  });

  test("throws for an empty name", () => {
    expect(() => _parseProfile({ name: "" }, 0, SHIP_NAME_TO_TYPE, {}, ATTRIBUTE_NAMES)).toThrow("Entry 0 has an empty name");
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

describe("_extractCapacitorData", () => {
  function makeAttributeNames(): Map<number, string> {
    return new Map<number, string>([[482, "capacitorCapacity"], [55, "rechargeRate"]]);
  }

  test("extracts capacitor capacity and recharge time in seconds", () => {
    const typedogmas: Record<string, SdeTypeDogma> = {
      "24692": { dogmaAttributes: [{ attributeID: 482, value: 6375 }, { attributeID: 55, value: 1250000 }] },
    };
    const capacitor = _extractCapacitorData("24692", typedogmas, makeAttributeNames());
    expect(capacitor.capacitorCapacity).toBe(6375);
    expect(capacitor.capacitorRechargeTime).toBe(1250);
  });

  test("throws when the typedogma is missing", () => {
    expect(() => _extractCapacitorData("99999", {}, makeAttributeNames())).toThrow("99999: missing typedogma");
  });

  test("throws when the typedogma lacks capacitorCapacity", () => {
    const typedogmas: Record<string, SdeTypeDogma> = {
      "587": { dogmaAttributes: [{ attributeID: 55, value: 1250000 }] },
    };
    expect(() => _extractCapacitorData("587", typedogmas, makeAttributeNames())).toThrow("587: missing capacitorCapacity dogma attribute");
  });

  test("throws when the typedogma lacks rechargeRate", () => {
    const typedogmas: Record<string, SdeTypeDogma> = {
      "587": { dogmaAttributes: [{ attributeID: 482, value: 6375 }] },
    };
    expect(() => _extractCapacitorData("587", typedogmas, makeAttributeNames())).toThrow("587: missing rechargeRate dogma attribute");
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

  test("throws when the typedogma is missing", () => {
    expect(() => _extractDefenseData("99999", {}, makeAttributeNames())).toThrow("99999: missing typedogma");
  });
});
