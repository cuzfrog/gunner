import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { TAG_BY_ID } from "../src/ui/controls";
import pkg from "../package.json";

const DIST_HTML = "dist/index.html";
const BASELINE_PATH = "tests/markup-parity-baseline.json";
const SRC_DIRS = ["src/components", "src/layouts", "src/pages"];

interface Baseline {
  readonly ids: readonly string[];
  readonly classes: readonly string[];
  readonly i18nKeys: readonly string[];
}

function newestMtime(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) newest = Math.max(newest, newestMtime(path));
    else newest = Math.max(newest, stat.mtimeMs);
  }
  return newest;
}

function ensureBuild(): void {
  if (existsSync(DIST_HTML)) {
    const distMtime = statSync(DIST_HTML).mtimeMs;
    const srcNewest = Math.max(...SRC_DIRS.filter(existsSync).map(newestMtime));
    if (distMtime > srcNewest) return;
  }
  spawnSync("bun", ["run", "build"], { stdio: "inherit" });
}

function extractIds(html: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) {
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  return counts;
}

function extractClasses(html: string): Set<string> {
  const found = new Set<string>();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const token of m[1].split(/\s+/)) if (token) found.add(token);
  }
  return found;
}

function extractI18nKeys(html: string): Set<string> {
  const found = new Set<string>();
  for (const m of html.matchAll(/\sdata-i18n(?:-aria-label)?="([^"]+)"/g)) found.add(m[1]);
  return found;
}

function loadBaseline(): Baseline {
  return JSON.parse(readFileSync(BASELINE_PATH, "utf-8")) as Baseline;
}

describe("markup parity", () => {
  beforeAll(ensureBuild);

  test("every contract element id appears exactly once", () => {
    const html = readFileSync(DIST_HTML, "utf-8");
    const idCounts = extractIds(html);
    const contractIds = Object.keys(TAG_BY_ID);
    const missing: string[] = [];
    const duplicated: string[] = [];
    for (const id of contractIds) {
      const count = idCounts.get(id);
      if (count === undefined) missing.push(id);
      else if (count > 1) duplicated.push(`${id} (${count}x)`);
    }
    expect(missing).toEqual([]);
    expect(duplicated).toEqual([]);
  });

  test("class-name set equals baseline", () => {
    const html = readFileSync(DIST_HTML, "utf-8");
    const actual = extractClasses(html);
    const baseline = new Set(loadBaseline().classes);
    const missing = [...baseline].filter((c) => !actual.has(c));
    const added = [...actual].filter((c) => !baseline.has(c));
    expect(missing).toEqual([]);
    expect(added).toEqual([]);
  });

  test("i18n key set equals baseline", () => {
    const html = readFileSync(DIST_HTML, "utf-8");
    const actual = extractI18nKeys(html);
    const baseline = new Set(loadBaseline().i18nKeys);
    const missing = [...baseline].filter((k) => !actual.has(k));
    const added = [...actual].filter((k) => !baseline.has(k));
    expect(missing).toEqual([]);
    expect(added).toEqual([]);
  });

  test("id set equals baseline", () => {
    const html = readFileSync(DIST_HTML, "utf-8");
    const actual = new Set(extractIds(html).keys());
    const baseline = new Set(loadBaseline().ids);
    const missing = [...baseline].filter((id) => !actual.has(id));
    const added = [...actual].filter((id) => !baseline.has(id));
    expect(missing).toEqual([]);
    expect(added).toEqual([]);
  });

  test("app-version span renders package.json version", () => {
    const html = readFileSync(DIST_HTML, "utf-8");
    const m = html.match(/id="app-version"[^>]*>([^<]+)</);
    if (m === null) throw new Error("#app-version span not found in dist/index.html");
    expect(m[1]).toBe(`v${pkg.version}`);
  });

  test("side-panel ids are mirror-images modulo ship-a/ship-b prefix", () => {
    const html = readFileSync(DIST_HTML, "utf-8");
    const allIds = new Set(extractIds(html).keys());
    const shipAIds = [...allIds].filter((id) => id.startsWith("ship-a-")).map((id) => id.slice("ship-a-".length));
    const shipBIds = [...allIds].filter((id) => id.startsWith("ship-b-")).map((id) => id.slice("ship-b-".length));
    const aSet = new Set(shipAIds);
    const bSet = new Set(shipBIds);
    const missingInB = shipAIds.filter((id) => !bSet.has(id));
    const missingInA = shipBIds.filter((id) => !aSet.has(id));
    expect(missingInB).toEqual([]);
    expect(missingInA).toEqual([]);
  });
});
