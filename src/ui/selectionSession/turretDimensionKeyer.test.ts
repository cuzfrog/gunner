import { TurretDimensionKeyerImpl } from "./turretDimensionKeyer";
import type { GunFamilies } from "../../fitting";
import { toTypeId, type TypeId } from "../../gamedata/ids";
import type { SigResolutionClass } from "../../sim";

function makeGunFamilies(): GunFamilies {
  const representatives: Record<string, TypeId> = {
    "pulseLaser:S": toTypeId("100"),
    "pulseLaser:M": toTypeId("200"),
  };
  return {
    familyOf(): "pulseLaser" { return "pulseLaser"; },
    representativeOf(family: string, sigRes: SigResolutionClass): TypeId {
      return representatives[`${family}:${sigRes}`] ?? toTypeId("999");
    },
    variantsForFamily(): never[] { return []; },
  };
}

describe("TurretDimensionKeyerImpl", () => {
  test("key combines family and sigRes", () => {
    const keyer = new TurretDimensionKeyerImpl(makeGunFamilies());
    expect(keyer.key({ family: "pulseLaser", sigRes: "S" })).toBe("turret:pulseLaser:S");
  });

  test("fallback returns representative module with no ammo", () => {
    const keyer = new TurretDimensionKeyerImpl(makeGunFamilies());
    const fallback = keyer.fallback({ family: "pulseLaser", sigRes: "S" });
    expect(fallback.moduleId).toBe(toTypeId("100"));
    expect(fallback.ammoId).toBeUndefined();
  });

  test("different sigRes produces different key and fallback", () => {
    const keyer = new TurretDimensionKeyerImpl(makeGunFamilies());
    expect(keyer.key({ family: "pulseLaser", sigRes: "M" })).toBe("turret:pulseLaser:M");
    expect(keyer.fallback({ family: "pulseLaser", sigRes: "M" }).moduleId).toBe(toTypeId("200"));
  });
});
