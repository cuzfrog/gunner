import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { toTypeId } from "../src/gamedata/ids";
import { TYPE_ICON_FILES } from "../src/ui/icons/typeIconFiles";

const DISTRIBUTION_DIRECTORY = "dist";
const STYLES_LINK_PATTERN = /href="styles-[a-f0-9]{8}\.css"/;
const SCRIPT_SRC_PATTERN = /src="\.\/main-[A-Za-z0-9_-]{8}\.js"/;
const STYLES_FILE_PATTERN = /^styles-[a-f0-9]{8}\.css$/;
const MAIN_FILE_PATTERN = /^main-[A-Za-z0-9_-]{8}\.js$/;

describe("build", () => {
  test("produces hashed main.js, hashed styles.css and updated index.html", async () => {
    await import("./build");

    const distFiles = readdirSync(DISTRIBUTION_DIRECTORY);
    const indexHtml = readFileSync(join(DISTRIBUTION_DIRECTORY, "index.html"), "utf-8");

    const mainJs = distFiles.find((name) => MAIN_FILE_PATTERN.test(name));
    const stylesCss = distFiles.find((name) => STYLES_FILE_PATTERN.test(name));

    if (mainJs === undefined) throw new Error("No hashed main.js found in dist");
    if (stylesCss === undefined) throw new Error("No hashed styles.css found in dist");

    expect(existsSync(join(DISTRIBUTION_DIRECTORY, mainJs))).toBe(true);
    expect(existsSync(join(DISTRIBUTION_DIRECTORY, stylesCss))).toBe(true);

    expect(indexHtml).toMatch(STYLES_LINK_PATTERN);
    expect(indexHtml).toMatch(SCRIPT_SRC_PATTERN);

    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "styles"))).toBe(false);
    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "styles.css"))).toBe(false);

    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "favicon.svg"))).toBe(true);
    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "author-portrait.jpg"))).toBe(true);
    expect(existsSync(join(DISTRIBUTION_DIRECTORY, "corporation-emblem.png"))).toBe(true);
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
});
