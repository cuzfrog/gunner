import { spriteIcon, spriteIconStroked } from "./spriteIcon";

describe("spriteIcon", () => {
  test("generates a filled SVG sprite reference", () => {
    expect(spriteIcon("gear")).toBe(
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><use href="icons.svg#gear"></use></svg>',
    );
  });

  test("accepts a custom size", () => {
    expect(spriteIcon("delete", 12)).toContain('width="12"');
    expect(spriteIcon("delete", 12)).toContain('height="12"');
  });

  test("accepts a custom fill", () => {
    expect(spriteIcon("eye", 14, "none")).toContain('fill="none"');
  });

  test("accepts an SVG class", () => {
    expect(spriteIcon("overload", 14, "currentColor", "overload-button-icon")).toContain("class=overload-button-icon");
  });

  test("omits class attribute when svgClass is empty", () => {
    expect(spriteIcon("gear")).not.toContain("class=");
  });
});

describe("spriteIconStroked", () => {
  test("generates a stroked SVG sprite reference", () => {
    expect(spriteIconStroked("delete", 12)).toBe(
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><use href="icons.svg#delete"></use></svg>',
    );
  });

  test("accepts a custom stroke width", () => {
    expect(spriteIconStroked("eye", 14, 3)).toContain('stroke-width="3"');
  });

  test("accepts an SVG class", () => {
    expect(spriteIconStroked("eye", 14, 2, "custom-class")).toContain("class=custom-class");
  });
});
