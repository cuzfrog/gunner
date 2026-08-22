import { PROFILE_TEXT_HEADER, parseProfile, serializeProfile } from "./profileText";
import { FULL_PROFILE, MINIMAL_PROFILE } from "./profileText.testSupport";
import type { ProfileSettings } from "../userSettings";

describe("profileText", () => {
  test("serializeProfile starts with the v1 header", () => {
    const text = serializeProfile(MINIMAL_PROFILE);
    expect(text.split("\n")[0]).toBe(PROFILE_TEXT_HEADER);
  });

  test("round-trips a full profile with fittings, overrides and fitted hulls", () => {
    const text = serializeProfile(FULL_PROFILE);
    const parsed = parseProfile(text);
    expect(parsed).toEqual(FULL_PROFILE);
  });

  test("round-trips a minimal profile without fittings or overrides", () => {
    const text = serializeProfile(MINIMAL_PROFILE);
    const parsed = parseProfile(text);
    expect(parsed).toEqual(MINIMAL_PROFILE);
  });

  test("round-trips a profile with deselected propulsion modules", () => {
    const profile: ProfileSettings = { ...MINIMAL_PROFILE, attackerPropulsion: "none", targetPropulsion: "none" };
    const text = serializeProfile(profile);
    const parsed = parseProfile(text);
    expect(parsed).toEqual(profile);
  });

  test("fitting body preserves blank lines and empty slot stubs", () => {
    const fitting = `[Rifter, Brawler]
5MN Y-T8 Compact Microwarpdrive

[Empty Low slot]
[Empty Low slot]`;
    const profile = { ...MINIMAL_PROFILE, attackerFitting: fitting };
    const text = serializeProfile(profile);
    const parsed = parseProfile(text);
    expect(parsed?.attackerFitting).toBe(fitting);
  });

  test("fitting body rejects the terminator inside the body", () => {
    const fitting = `[Rifter, Brawler]\n---\n5MN Microwarpdrive`;
    expect(() => serializeProfile({ ...MINIMAL_PROFILE, attackerFitting: fitting })).toThrow();
  });
});
