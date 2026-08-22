import { TURRETS } from "./fittingDb";
import { gunFamilyOf, gunIconNames, type GunFamily } from "./gunFamilies";
import { ITEM_ICON_IDS } from "./iconIds";

const FAMILIES: readonly GunFamily[] = ["pulseLaser", "beamLaser", "railgun", "blaster", "autocannon", "artillery"];

const REPRESENTATIVE_CANONICALS: { readonly family: GunFamily; readonly S: string; readonly M: string; readonly L: string; readonly XL: string }[] = [
  { family: "pulseLaser", S: "Gatling Pulse Laser I", M: "Heavy Pulse Laser I", L: "Mega Pulse Laser I", XL: "Dual Giga Pulse Laser I" },
  { family: "beamLaser", S: "Small Focused Beam Laser I", M: "Heavy Beam Laser I", L: "Tachyon Beam Laser I", XL: "Dual Giga Beam Laser I" },
  { family: "blaster", S: "Light Neutron Blaster I", M: "Heavy Neutron Blaster I", L: "Neutron Blaster Cannon I", XL: "Ion Siege Blaster I" },
  { family: "railgun", S: "150mm Railgun I", M: "250mm Railgun I", L: "425mm Railgun I", XL: "Dual 1000mm Railgun I" },
  { family: "autocannon", S: "200mm AutoCannon I", M: "425mm AutoCannon I", L: "800mm Repeating Cannon I", XL: "Quad 800mm Repeating Cannon I" },
  { family: "artillery", S: "280mm Howitzer Artillery I", M: "720mm Howitzer Artillery I", L: "1400mm Howitzer Artillery I", XL: "Quad 3500mm Siege Artillery I" },
] as const;

const TRICKY_VARIANTS: { readonly name: string; readonly family: GunFamily }[] = [
  { name: "Dark Blood Mega Pulse Laser", family: "pulseLaser" },
  { name: "Gatling Modal Laser I", family: "pulseLaser" },
  { name: "Quad Afocal Light Laser I", family: "beamLaser" },
  { name: "Shadow Serpentis Dual 1000mm Railgun", family: "railgun" },
  { name: "Tuvan\'s Modified Neutron Blaster Cannon", family: "blaster" },
  { name: "Domination Quad 800mm Repeating Cannon", family: "autocannon" },
  { name: "Hakim\'s Modified 1400mm Howitzer Artillery", family: "artillery" },
] as const;

function assertFamily(name: string, family: GunFamily): void {
  const result = gunFamilyOf(name);
  if (result !== family) {
    throw new Error(`Expected ${name} to be ${family}, got ${result}`);
  }
}

describe("gunFamilyOf", () => {
  test("exhaustive: does not throw for every TURRETS key", () => {
    for (const name of Object.keys(TURRETS)) {
      const result = gunFamilyOf(name);
      expect(FAMILIES).toContain(result);
    }
  });

  for (const { family, S, M, L, XL } of REPRESENTATIVE_CANONICALS) {
    test(`classifies ${family} representatives`, () => {
      assertFamily(S, family);
      assertFamily(M, family);
      assertFamily(L, family);
      assertFamily(XL, family);
    });
  }

  for (const { name, family } of TRICKY_VARIANTS) {
    test(`classifies tricky variant ${name}`, () => {
      assertFamily(name, family);
    });
  }
});

describe("gunIconNames", () => {
  for (const { family, S, M, L, XL } of REPRESENTATIVE_CANONICALS) {
    test(`returns the representative table for ${family}`, () => {
      const names = gunIconNames(family);
      expect(names.S).toBe(S);
      expect(names.M).toBe(M);
      expect(names.L).toBe(L);
      expect(names.XL).toBe(XL);
      expect(ITEM_ICON_IDS[S]).toBeDefined();
      expect(ITEM_ICON_IDS[M]).toBeDefined();
      expect(ITEM_ICON_IDS[L]).toBeDefined();
      expect(ITEM_ICON_IDS[XL]).toBeDefined();
    });
  }
});
