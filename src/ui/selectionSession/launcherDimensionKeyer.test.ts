import { LauncherDimensionKeyerImpl } from "./launcherDimensionKeyer";
import type { LauncherClass, LauncherClasses } from "../../fitting";
import { toTypeId, type TypeId } from "../../gamedata/ids";

function makeLauncherClasses(): LauncherClasses {
  const representatives: Record<string, TypeId> = {
    rocket: toTypeId("500"),
    light: toTypeId("501"),
  };
  return {
    classOf(): "rocket" { return "rocket"; },
    representativeOf(launcherClass: string): TypeId {
      return representatives[launcherClass] ?? toTypeId("999");
    },
    classesForTiers(): never[] { return []; },
    allClasses(): readonly LauncherClass[] { return ["rocket", "light"]; },
    variantsForClass(): never[] { return []; },
  };
}

describe("LauncherDimensionKeyerImpl", () => {
  test("key uses launcher class", () => {
    const keyer = new LauncherDimensionKeyerImpl(makeLauncherClasses());
    expect(keyer.key("rocket")).toBe("launcher:rocket");
  });

  test("fallback returns representative module with no ammo", () => {
    const keyer = new LauncherDimensionKeyerImpl(makeLauncherClasses());
    const fallback = keyer.fallback("rocket");
    expect(fallback.moduleId).toBe(toTypeId("500"));
    expect(fallback.ammoId).toBeUndefined();
  });

  test("different class produces different key and fallback", () => {
    const keyer = new LauncherDimensionKeyerImpl(makeLauncherClasses());
    expect(keyer.key("light")).toBe("launcher:light");
    expect(keyer.fallback("light").moduleId).toBe(toTypeId("501"));
  });
});
