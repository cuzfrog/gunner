import type { TypeId } from "../gamedata/ids";
import { FITTING_DB } from "../gamedata/fittingDb";
import type { FittingDb, FittingModuleStats, TurretStats } from "../gamedata/fittingDb";
import { GunFamiliesImpl, type GunFamily } from "./gunFamilies";

const gunFamilies = new GunFamiliesImpl({ fittingDb: FITTING_DB });

const FAMILIES: readonly GunFamily[] = ["pulseLaser", "beamLaser", "railgun", "blaster", "autocannon", "artillery"];

const REPRESENTATIVE_CANONICALS: { readonly family: GunFamily; readonly S: string; readonly M: string; readonly L: string; readonly XL: string }[] = [
  { family: "pulseLaser", S: "Gatling Pulse Laser I", M: "Heavy Pulse Laser I", L: "Mega Pulse Laser I", XL: "Dual Giga Pulse Laser I" },
  { family: "beamLaser", S: "Small Focused Beam Laser I", M: "Heavy Beam Laser I", L: "Tachyon Beam Laser I", XL: "Dual Giga Beam Laser I" },
  { family: "blaster", S: "Light Neutron Blaster I", M: "Heavy Neutron Blaster I", L: "Neutron Blaster Cannon I", XL: "Ion Siege Blaster I" },
  { family: "railgun", S: "150mm Railgun I", M: "250mm Railgun I", L: "425mm Railgun I", XL: "Dual 1000mm Railgun I" },
  { family: "autocannon", S: "200mm AutoCannon I", M: "425mm AutoCannon I", L: "800mm Repeating Cannon I", XL: "Quad 800mm Repeating Cannon I" },
  { family: "artillery", S: "280mm Howitzer Artillery I", M: "720mm Howitzer Artillery I", L: "1400mm Howitzer Artillery I", XL: "Quad 3500mm Siege Artillery I" },
] as const;

const TRICKY_MODULES: Record<string, FittingModuleStats> = {
  "dark-blood-mega-pulse": { id: "dark-blood-mega-pulse" as TypeId, name: "Dark Blood Mega Pulse Laser" },
  "gatling-modal-laser": { id: "gatling-modal-laser" as TypeId, name: "Gatling Modal Laser I" },
  "gatling-modulated-energy-beam": { id: "gatling-modulated-energy-beam" as TypeId, name: "Gatling Modulated Energy Beam I" },
  "quad-afocal-light-laser": { id: "quad-afocal-light-laser" as TypeId, name: "Quad Afocal Light Laser I" },
  "shadow-serpentis-dual-1000mm": { id: "shadow-serpentis-dual-1000mm" as TypeId, name: "Shadow Serpentis Dual 1000mm Railgun" },
  "tuvan-neutron-blaster-cannon": { id: "tuvan-neutron-blaster-cannon" as TypeId, name: "Tuvan's Modified Neutron Blaster Cannon" },
  "domination-quad-800mm": { id: "domination-quad-800mm" as TypeId, name: "Domination Quad 800mm Repeating Cannon" },
  "hakim-1400mm-howitzer": { id: "hakim-1400mm-howitzer" as TypeId, name: "Hakim's Modified 1400mm Howitzer Artillery" },
};

const TRICKY_DB: FittingDb = { ...FITTING_DB, modules: { ...FITTING_DB.modules, ...TRICKY_MODULES } };
const trickyGunFamilies = new GunFamiliesImpl({ fittingDb: TRICKY_DB });

function turretIdForName(name: string): TypeId {
  for (const stats of Object.values(FITTING_DB.turrets)) {
    if (stats.name === name) return stats.id;
  }
  for (const stats of Object.values(TRICKY_MODULES)) {
    if (stats.name === name) return stats.id;
  }
  throw new Error(`Missing turret ${name}`);
}

function assertFamily(id: TypeId, family: GunFamily, families = gunFamilies): void {
  const result = families.familyOf(id);
  if (result !== family) {
    throw new Error(`Expected ${id} to be ${family}, got ${result}`);
  }
}

describe("GunFamiliesImpl", () => {
  describe("familyOf", () => {
    test("exhaustive: does not throw for every TURRETS entry", () => {
      for (const stats of Object.values(FITTING_DB.turrets)) {
        const result = gunFamilies.familyOf(stats.id);
        expect(FAMILIES).toContain(result);
      }
    });

    for (const { family, S, M, L, XL } of REPRESENTATIVE_CANONICALS) {
      test(`classifies ${family} representatives`, () => {
        assertFamily(turretIdForName(S), family);
        assertFamily(turretIdForName(M), family);
        assertFamily(turretIdForName(L), family);
        assertFamily(turretIdForName(XL), family);
      });
    }

    test("classifies tricky variants", () => {
      assertFamily(turretIdForName("Dark Blood Mega Pulse Laser"), "pulseLaser", trickyGunFamilies);
      assertFamily(turretIdForName("Gatling Modal Laser I"), "pulseLaser", trickyGunFamilies);
      assertFamily(turretIdForName("Gatling Modulated Energy Beam I"), "pulseLaser", trickyGunFamilies);
      assertFamily(turretIdForName("Quad Afocal Light Laser I"), "beamLaser", trickyGunFamilies);
      assertFamily(turretIdForName("Shadow Serpentis Dual 1000mm Railgun"), "railgun", trickyGunFamilies);
      assertFamily(turretIdForName("Tuvan's Modified Neutron Blaster Cannon"), "blaster", trickyGunFamilies);
      assertFamily(turretIdForName("Domination Quad 800mm Repeating Cannon"), "autocannon", trickyGunFamilies);
      assertFamily(turretIdForName("Hakim's Modified 1400mm Howitzer Artillery"), "artillery", trickyGunFamilies);
    });
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
