import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PALETTE } from "./palette";

function camelToKebab(value: string): string {
  return value.replace(/([A-Z])/g, "-$1").toLowerCase();
}

describe("PALETTE", () => {
  test("mirrors the :root tokens in src/styles/tokens.css", async () => {
    const css = await readFile(join(import.meta.dir, "..", "styles", "tokens.css"), "utf-8");
    const rootBlock = css.match(/:root\s*\{([^}]+)\}/s)?.[1] ?? "";
    const vars: Record<string, string> = {};
    for (const match of rootBlock.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      vars[match[1]] = match[2].trim();
    }
    for (const [key, value] of Object.entries(PALETTE)) {
      const cssVar = vars[camelToKebab(key)];
      expect(cssVar).toBe(value);
    }
  });
});
