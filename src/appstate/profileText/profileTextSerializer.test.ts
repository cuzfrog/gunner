import { ProfileTextSerializer } from "./profileTextSerializer";
import { FULL_PROFILE, MINIMAL_PROFILE } from "./profileText.testSupport";

const serializer = new ProfileTextSerializer();

describe("profileTextSerializer", () => {
  test("emits the global ammo line as a global key", () => {
    const profile = { ...MINIMAL_PROFILE, attackerAmmo: "Hail S" };
    const text = serializer.serialize(profile);
    expect(text).toContain("ammo=Hail S");
    expect(text).not.toContain("attacker.ammo=");
  });

  test("rejects a fitting body containing the block terminator", () => {
    const fitting = `[Rifter, Brawler]\n---\n5MN Microwarpdrive`;
    expect(() => serializer.serialize({ ...MINIMAL_PROFILE, attackerFitting: fitting })).toThrow();
  });

  test("serializes overrides under side-scoped override keys", () => {
    const text = serializer.serialize(FULL_PROFILE);
    expect(text).toContain("override.attacker.mass=2000000");
    expect(text).toContain("override.attacker.tracking=0.12");
    expect(text).toContain("override.target.mass=11000000");
  });
});
