import { semanticAttributeToHullBonus, isOutOfScopeAttribute, isNonScalingEffect, effectDrawbackKind } from "./classifyLookup";

describe("classifyLookup", () => {
  test("semanticAttributeToHullBonus returns HullBonusAttribute for semantic entries", () => {
    expect(semanticAttributeToHullBonus(64)).toBe("turretDamage");
    expect(semanticAttributeToHullBonus(70)).toBe("agility");
    expect(semanticAttributeToHullBonus(554)).toBe("mwdSigBloom");
  });

  test("semanticAttributeToHullBonus returns undefined for out-of-scope attributes", () => {
    expect(semanticAttributeToHullBonus(552)).toBeUndefined();
    expect(semanticAttributeToHullBonus(6)).toBeUndefined();
  });

  test("semanticAttributeToHullBonus returns undefined for unknown attributes", () => {
    expect(semanticAttributeToHullBonus(99999)).toBeUndefined();
  });

  test("isOutOfScopeAttribute returns true for out-of-scope entries", () => {
    expect(isOutOfScopeAttribute(552)).toBe(true);
    expect(isOutOfScopeAttribute(1138)).toBe(true);
  });

  test("isOutOfScopeAttribute returns false for semantic entries", () => {
    expect(isOutOfScopeAttribute(64)).toBe(false);
    expect(isOutOfScopeAttribute(70)).toBe(false);
  });

  test("isOutOfScopeAttribute returns false for unknown attributes", () => {
    expect(isOutOfScopeAttribute(99999)).toBe(false);
  });

  test("isNonScalingEffect returns true for known non-scaling effects", () => {
    expect(isNonScalingEffect(2132)).toBe(true);
    expect(isNonScalingEffect(1218)).toBe(true);
  });

  test("isNonScalingEffect returns false for scaling effects", () => {
    expect(isNonScalingEffect(99999)).toBe(false);
  });

  test("isNonScalingEffect uses classification table for modifier effects", () => {
    expect(isNonScalingEffect(2716)).toBe(false);
  });

  test("effectDrawbackKind returns kind for modifier effects with drawback", () => {
    expect(effectDrawbackKind(2716)).toBe("signature");
    expect(effectDrawbackKind(2717)).toBe("agility");
  });

  test("effectDrawbackKind returns undefined for non-modifier effects", () => {
    expect(effectDrawbackKind(2132)).toBeUndefined();
    expect(effectDrawbackKind(99999)).toBeUndefined();
  });
});
