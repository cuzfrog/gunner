import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

describe("build", () => {
  test("produces dist/main.js and dist/index.html", async () => {
    // build.ts is a side-effect module that exits on failure.
    await import("../build");

    expect(existsSync(join("dist", "main.js"))).toBe(true);
    expect(existsSync(join("dist", "index.html"))).toBe(true);
    expect(existsSync(join("dist", "styles.css"))).toBe(true);
    expect(existsSync(join("dist", "favicon.svg"))).toBe(true);
    expect(existsSync(join("dist", "author-portrait.jpg"))).toBe(true);
    expect(existsSync(join("dist", "corporation-emblem.png"))).toBe(true);
  });
});
