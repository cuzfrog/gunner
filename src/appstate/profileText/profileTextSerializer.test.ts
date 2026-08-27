import type { TypeId } from "../../gamedata/ids";
import { ProfileTextSerializer } from "./profileTextSerializer";
import { FULL_PROFILE, MINIMAL_PROFILE } from "./profileText.testSupport";

const serializer = new ProfileTextSerializer();

describe("profileTextSerializer", () => {
  test("emits shipA and shipB ammo lines as symmetric side keys", () => {
    const profile = { ...MINIMAL_PROFILE, shipAAmmo: "Hail S" as TypeId, shipBAmmo: "Republic Fleet EMP S" as TypeId };
    const text = serializer.serialize(profile);
    expect(text).toContain("shipA.ammo=Hail S");
    expect(text).toContain("shipB.ammo=Republic Fleet EMP S");
    expect(text).not.toContain("\nammo=");
  });

  test("emits only shipA and shipB dot keys and no attacker or target keys", () => {
    const text = serializer.serialize(MINIMAL_PROFILE);
    expect(text).toContain("shipA.speed=");
    expect(text).toContain("shipB.sig=");
    expect(text).not.toContain("attacker.");
    expect(text).not.toContain("target.");
  });

  test("rejects a fitting body containing the block terminator", () => {
    const fitting = `[Rifter, Brawler]\n---\n5MN Microwarpdrive`;
    expect(() => serializer.serialize({ ...MINIMAL_PROFILE, shipAFitting: fitting })).toThrow();
  });

  test("serializes overrides under side-scoped override keys", () => {
    const text = serializer.serialize(FULL_PROFILE);
    expect(text).toContain("override.shipA.mass=2000000");
    expect(text).toContain("override.shipA.tracking=0.12");
    expect(text).toContain("override.shipB.mass=11000000");
  });
});
