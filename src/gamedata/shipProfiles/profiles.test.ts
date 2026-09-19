import type { ShipProfile } from "../../ships";
import { SHIP_PROFILES } from "./profiles";

const PROFILE_BY_NAME = new Map(SHIP_PROFILES.map((profile) => [profile.name, profile]));

function profileByName(name: string): ShipProfile {
  const profile = PROFILE_BY_NAME.get(name);
  if (!profile) throw new Error(`Missing ship profile "${name}".`);
  return profile;
}

describe("SHIP_PROFILES data contract", () => {
  test("contains no legacy ids and no duplicate ids or names", () => {
    const ids = new Set<string>();
    const names = new Set<string>();
    for (const profile of SHIP_PROFILES) {
      expect(profile.id.startsWith("legacy-")).toBe(false);
      expect(ids.has(profile.id)).toBe(false);
      expect(names.has(profile.name)).toBe(false);
      ids.add(profile.id);
      names.add(profile.name);
    }
  });

  test("keeps core attributes positive for every profile", () => {
    for (const profile of SHIP_PROFILES) {
      expect(profile.mass).toBeGreaterThan(0);
      expect(profile.inertiaModifier).toBeGreaterThan(0);
      expect(profile.baseSpeed).toBeGreaterThan(0);
      expect(profile.sigRadius).toBeGreaterThan(0);
      expect(profile.hullHp).toBeGreaterThan(0);
      expect(profile.armorHp).toBeGreaterThan(0);
      expect(profile.shieldHp).toBeGreaterThan(0);
      expect(profile.capacitorCapacity).toBeGreaterThan(0);
      expect(profile.capacitorRechargeTime).toBeGreaterThan(0);
    }
  });

  test("matches the SDE snapshot on audited ships", () => {
    expect(profileByName("Abaddon").mass).toBe(103_200_000);
    expect(profileByName("Apostle").sigRadius).toBe(10_500);
    expect(profileByName("Python").maxTargetingRange).toBe(93_600);
    expect(profileByName("Valravn").maxTargetingRange).toBe(92_500);
    expect(profileByName("Stabber Fleet Issue").scanResolution).toBe(305);
    expect(profileByName("Scorpion").sigRadius).toBe(440);
    expect(profileByName("Skiff").medSlots).toBe(5);
  });

  test("leaves T3 strategic cruiser drone limits at zero for subsystems to grant", () => {
    for (const name of ["Loki", "Proteus", "Legion", "Tengu"]) {
      expect(profileByName(name).droneCapacity).toBe(0);
      expect(profileByName(name).droneBandwidth).toBe(0);
    }
  });

  test("applies the maxActiveDrones fallback from drone capability", () => {
    expect(profileByName("Tristan").maxActiveDrones).toBe(5);
    expect(profileByName("Rifter").maxActiveDrones).toBe(0);
  });

  test("extracts fighter bay fields from the SDE snapshot", () => {
    expect(profileByName("Archon").fighterCapacity).toBe(65000);
    expect(profileByName("Archon").fighterTubes).toBe(4);
    expect(profileByName("Archon").fighterLightSlots).toBe(3);
    expect(profileByName("Archon").fighterSupportSlots).toBe(2);
    expect(profileByName("Archon").fighterHeavySlots).toBe(0);
    expect(profileByName("Hel").fighterHeavySlots).toBe(4);
    expect(profileByName("Hel").fighterTubes).toBe(5);
    expect(profileByName("Rifter").fighterCapacity).toBe(0);
    expect(profileByName("Rifter").fighterTubes).toBe(0);
  });

  test("allows zeros only where the SDE lacks the attribute", () => {
    const shuttle = profileByName("Amarr Shuttle");
    expect(shuttle.scanResolution).toBe(0);
    expect(shuttle.maxLockedTargets).toBe(2);
  });

  test("keeps every bonus group non-empty and free of glued wiki residue", () => {
    for (const profile of SHIP_PROFILES) {
      for (const group of profile.bonuses) {
        expect(group.lines.length).toBeGreaterThan(0);
        expect(group.header.endsWith(":")).toBe(false);
        expect(group.header).not.toMatch(/\u00a0/);
        for (const line of group.lines) {
          expect(line.length).toBeGreaterThan(0);
          expect(line).not.toMatch(/[a-z][0-9]+%/);
          expect(line).not.toMatch(/bonuses \(per skill level\):?[0-9]/);
          expect(line).not.toMatch(/\u00a0/);
          expect(line).not.toMatch(/(?<=.)•/);
          expect(line).not.toMatch(/:$/);
          expect(line).not.toMatch(/^• .+ Mode$/i);
          expect(line).not.toMatch(/bonuses( per level)?$/i);
          expect(line).not.toMatch(/^[A-Z][A-Za-z]+( [A-Z][A-Za-z]+){1,3}$/);
        }
      }
    }
  });

  test("keeps skill and role bonus groups separated", () => {
    expect(profileByName("Abaddon").bonuses).toEqual([
      { header: "Amarr Battleship bonuses (per skill level)", lines: ["7.5% bonus to Large Energy Turret damage", "4% bonus to all armor resistances"] },
      { header: "Role Bonus", lines: ["100% bonus to Shield Extender hitpoints", "50% bonus to Armor Plate hitpoints", "5% Additional bonus to Reinforced Bulkhead hitpoints"] },
    ]);
  });

  test("carries no bonuses for hulls without scraped bonus text", () => {
    expect(profileByName("Civilian Amarr Shuttle").bonuses).toEqual([]);
    expect(profileByName("Medusa").bonuses).toEqual([]);
  });
});
