import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { toTypeId } from "../src/gamedata/ids";
import { TYPE_ICON_FILES } from "../src/ui/icons/typeIconFiles";

const DISTRIBUTION_DIRECTORY = "dist";
const ASTRO_DIRECTORY = "_astro";
const CSS_LINK_PATTERN = /href="\/_astro\/[^"]+\.css"/;
const MODULE_SCRIPT_PATTERN = /src="\/_astro\/[^"]+\.js"/;

describe("build", () => {
  beforeAll(() => {
    spawnSync("bun", ["run", "build"], { stdio: "inherit" });
  });

  test("produces hashed JS, hashed CSS and updated index.html", () => {
    const distFiles = readdirSync(DISTRIBUTION_DIRECTORY);
    const indexHtml = readFileSync(join(DISTRIBUTION_DIRECTORY, "index.html"), "utf-8");

    const astroDir = join(DISTRIBUTION_DIRECTORY, ASTRO_DIRECTORY);
    const astroFiles = readdirSync(astroDir);
    const jsFiles = astroFiles.filter((name) => name.endsWith(".js"));
    const cssFiles = astroFiles.filter((name) => name.endsWith(".css"));

    if (jsFiles.length === 0) throw new Error("No JS bundle found in dist/_astro");
    if (cssFiles.length === 0) throw new Error("No CSS bundle found in dist/_astro");

    for (const js of jsFiles) {
      expect(existsSync(join(astroDir, js))).toBe(true);
    }
    for (const css of cssFiles) {
      expect(existsSync(join(astroDir, css))).toBe(true);
    }

    expect(indexHtml).toMatch(CSS_LINK_PATTERN);
    expect(indexHtml).toMatch(MODULE_SCRIPT_PATTERN);

    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "styles"))).toBe(false);
    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "styles.css"))).toBe(false);

    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "favicon.svg"))).toBe(true);
    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "author-portrait.jpg"))).toBe(true);
    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "corporation-emblem.png"))).toBe(true);
    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "icons.svg"))).toBe(true);
    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "images", "ships", "Abaddon.webp"))).toBe(true);

    const hailIconFile = TYPE_ICON_FILES[toTypeId("12608")];
    if (hailIconFile === undefined) throw new Error("Hail S has no icon file");
    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "images", hailIconFile))).toBe(true);
    const droneIconFile = TYPE_ICON_FILES[toTypeId("2454")];
    if (droneIconFile === undefined) throw new Error("Hobgoblin I has no icon file");
    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "images", droneIconFile))).toBe(true);
    const waspIconFile = TYPE_ICON_FILES[toTypeId("1201")];
    if (waspIconFile === undefined) throw new Error("Wasp I has no icon file");
    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "images", waspIconFile))).toBe(true);
  });

  test("JS bundle size is within +5% of the 2.71 MB baseline", () => {
    const astroDir = join(DISTRIBUTION_DIRECTORY, ASTRO_DIRECTORY);
    const jsFiles = readdirSync(astroDir).filter((name) => name.endsWith(".js"));
    const totalJsSize = jsFiles.reduce((sum, name) => sum + statSync(join(astroDir, name)).size, 0);
    const baseline = 2_709_846;
    const limit = Math.ceil(baseline * 1.05);
    expect(totalJsSize).toBeLessThanOrEqual(limit);
  });
});
