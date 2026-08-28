import { FITTING_DB } from "../gamedata/fittingDb";
import { toTypeId } from "../gamedata/ids";
import { LauncherClassesImpl, _launcherClassGroups, _launcherClassOrder, _launcherClassTiers, type LauncherClass } from "./launcherClasses";

function createClasses(): LauncherClassesImpl {
  return new LauncherClassesImpl({ fittingDb: FITTING_DB });
}

describe("LauncherClasses", () => {
  describe("classOf", () => {
    test("returns rocket for a rocket launcher module", () => {
      const cls = createClasses();
      const rocketLauncher = findLauncherByGroup(FITTING_DB.launchers, 507);
      expect(rocketLauncher).toBeDefined();
      expect(cls.classOf(rocketLauncher!.id)).toBe("rocket");
    });

    test("returns light for a light missile launcher module", () => {
      const cls = createClasses();
      const lightLauncher = findLauncherByGroup(FITTING_DB.launchers, 509);
      expect(lightLauncher).toBeDefined();
      expect(cls.classOf(lightLauncher!.id)).toBe("light");
    });

    test("returns ham for a heavy assault missile launcher module", () => {
      const cls = createClasses();
      const hamLauncher = findLauncherByGroup(FITTING_DB.launchers, 771);
      expect(hamLauncher).toBeDefined();
      expect(cls.classOf(hamLauncher!.id)).toBe("ham");
    });

    test("throws for an unknown module id", () => {
      const cls = createClasses();
      expect(() => cls.classOf(toTypeId("999999"))).toThrow();
    });
  });

  describe("representativeOf", () => {
    test("returns a valid launcher module for every class", () => {
      const cls = createClasses();
      for (const launcherClass of _launcherClassOrder) {
        const id = cls.representativeOf(launcherClass);
        expect(FITTING_DB.launchers[id]).toBeDefined();
      }
    });

    test("returns a Tech I launcher when available", () => {
      const cls = createClasses();
      const id = cls.representativeOf("rocket");
      const stats = FITTING_DB.launchers[id];
      expect(stats.name).toMatch(/\sI$/);
      expect(stats.name).not.toMatch(/\sII$/);
    });
  });

  describe("classesForTiers", () => {
    test("returns rocket and light for small tier", () => {
      const cls = createClasses();
      expect(cls.classesForTiers(["small"])).toEqual<readonly LauncherClass[]>(["rocket", "light"]);
    });

    test("returns ham, heavy, rapidLight for medium tier", () => {
      const cls = createClasses();
      expect(cls.classesForTiers(["medium"])).toEqual<readonly LauncherClass[]>(["ham", "heavy", "rapidLight"]);
    });

    test("returns torpedo, cruise, rapidHeavy for large tier", () => {
      const cls = createClasses();
      expect(cls.classesForTiers(["large"])).toEqual<readonly LauncherClass[]>(["torpedo", "cruise", "rapidHeavy"]);
    });

    test("returns xlTorpedo, xlCruise, rapidTorpedo for capital tier", () => {
      const cls = createClasses();
      expect(cls.classesForTiers(["capital"])).toEqual<readonly LauncherClass[]>(["xlTorpedo", "xlCruise", "rapidTorpedo"]);
    });

    test("returns empty for empty tiers", () => {
      const cls = createClasses();
      expect(cls.classesForTiers([])).toEqual([]);
    });

    test("combines multiple tiers preserving order", () => {
      const cls = createClasses();
      expect(cls.classesForTiers(["small", "medium"])).toEqual<readonly LauncherClass[]>(["rocket", "light", "ham", "heavy", "rapidLight"]);
    });
  });

  describe("data integrity", () => {
    test("every launcher class has a group mapping", () => {
      for (const cls of _launcherClassOrder) {
        expect(_launcherClassGroups[cls]).toBeGreaterThan(0);
      }
    });

    test("every launcher class has a tier mapping", () => {
      for (const cls of _launcherClassOrder) {
        expect(_launcherClassTiers[cls]).toBeDefined();
      }
    });

    test("every launcher in the db maps to a known class", () => {
      const cls = createClasses();
      for (const stats of Object.values(FITTING_DB.launchers)) {
        expect(() => cls.classOf(stats.id)).not.toThrow();
      }
    });
  });
});

function findLauncherByGroup(
  launchers: Readonly<Record<string, { readonly launcherGroup: number; readonly id: import("../gamedata/ids").TypeId }>>,
  group: number,
): { readonly launcherGroup: number; readonly id: import("../gamedata/ids").TypeId } | undefined {
  return Object.values(launchers).find((s) => s.launcherGroup === group);
}
