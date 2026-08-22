import { TURRETS } from "./fittingDb";
import { GunFamiliesImpl, type GunFamily } from "./gunFamilies";

const gunFamilies = new GunFamiliesImpl();

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
  { name: "Gatling Modulated Energy Beam I", family: "pulseLaser" },
  { name: "Quad Afocal Light Laser I", family: "beamLaser" },
  { name: "Shadow Serpentis Dual 1000mm Railgun", family: "railgun" },
  { name: "Tuvan's Modified Neutron Blaster Cannon", family: "blaster" },
  { name: "Domination Quad 800mm Repeating Cannon", family: "autocannon" },
  { name: "Hakim's Modified 1400mm Howitzer Artillery", family: "artillery" },
] as const;

function assertFamily(name: string, family: GunFamily): void {
  const result = gunFamilies.familyOf(name);
  if (result !== family) {
    throw new Error(`Expected ${name} to be ${family}, got ${result}`);
  }
}

describe("GunFamiliesImpl", () => {
  describe("familyOf", () => {
    test("exhaustive: does not throw for every TURRETS key", () => {
      for (const name of Object.keys(TURRETS)) {
        const result = gunFamilies.familyOf(name);
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

  describe("representativeOf", () => {
    for (const { family, S, M, L, XL } of REPRESENTATIVE_CANONICALS) {
      test(`returns the representative for ${family}`, () => {
        expect(gunFamilies.representativeOf(family, "S")).toBe(S);
        expect(gunFamilies.representativeOf(family, "M")).toBe(M);
        expect(gunFamilies.representativeOf(family, "L")).toBe(L);
        expect(gunFamilies.representativeOf(family, "XL")).toBe(XL);
      });
    }
  });
});
