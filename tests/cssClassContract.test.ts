const HTML_PATH = "public/index.html";
const TS_GLOB = "src/ui/**/*.ts";
const CSS_GLOB = "public/styles/**/*.css";

// Classes used in HTML/TS that have no matching CSS rule yet.
// Each entry must name the phase that removes it.
const ALLOWED_UNDEFINED = new Set<string>([]);

// CSS classes not referenced by the literal scan (built dynamically or stale rules pending removal).
// Each entry must name the phase that removes it.
const ALLOWED_ORPHAN = new Set<string>([
  // Phase 4: generated at runtime by rangeOverlayController for each overlay kind.
  "range-overlay-web",
  "range-overlay-grappler",
  "range-overlay-scrambler",
  "range-overlay-disruptor",
]);

// Approved component / primitive prefixes. A class is valid if it equals one of these or starts with `<prefix>-`.
const APPROVED_PREFIXES = [
  "app",
  "side-panel",
  "hull",
  "canvas-frame",
  "control-bar",
  "zoom",
  "speed-control",
  "grid-brightness",
  "auto-zoom",
  "weapon-range",
  "form-slider",
  "form-field",
  "form-maneuver",
  "tracking",
  "input-with-unit",
  "input-suffix",
  "effective-value",
  "info-hint",
  "segmented-control",
  "skill-tuner",
  "skill",
  "ammo",
  "turret-mode",
  "sigres",
  "overload-button",
  "propulsion",
  "choice-selector",
  "ewar",
  "booster",
  "profile",
  "new-profile",
  "import-side-popup",
  "paste",
  "confirm",
  "hints-slide",
  "hint",
  "fitting",
  "preview",
  "result-grid",
  "result-card",
  "range-overlay",
  "combatant-portrait",
  "portrait",
  "ship-select",
  "sim-canvas",
  "footer",
  "is",
  "icon",
  "surface-panel",
  "popup",
  "trigger",
  "btn",
  "icon-button",
  "field-label",
  "input-field",
  "mono",
  "truncate",
  "chevron",
];

type StringMap = Map<string, Set<string>>;

function htmlClasses(html: string): Set<string> {
  const found = new Set<string>();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const token of m[1].split(/\s+/)) if (token) found.add(token);
  }
  return found;
}

function addClassTokens(raw: string, out: Set<string>): void {
  for (const token of raw.split(/\s+/)) {
    if (token.endsWith("-")) continue; // skip dynamic-prefix fragments like "range-overlay-"
    if (token) out.add(token);
  }
}

function extractStringLiteralTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const m of text.matchAll(/"((?:\\.|[^"\\])*)"/g)) addClassTokens(m[1], tokens);
  for (const m of text.matchAll(/'((?:\\.|[^'\\])*)'/g)) addClassTokens(m[1], tokens);
  for (const m of text.matchAll(/`([^`]*)`/g)) addClassTokens(m[1].replace(/\$\{[^}]*\}/g, " "), tokens);
  return tokens;
}

function extractClassListArg(arg: string, out: Set<string>): void {
  const trimmed = arg.trim();
  if (/^"((?:\\.|[^"\\])*)"$/.test(trimmed)) {
    addClassTokens(trimmed.slice(1, -1), out);
  } else if (/^'((?:\\.|[^'\\])*)'$/.test(trimmed)) {
    addClassTokens(trimmed.slice(1, -1), out);
  } else if (/^`([^`]*)`$/.test(trimmed)) {
    addClassTokens(trimmed.slice(1, -1).replace(/\$\{[^}]*\}/g, " "), out);
  }
}

async function tsClasses(): Promise<StringMap> {
  const perFile: StringMap = new Map();
  const glob = new Bun.Glob(TS_GLOB);
  for await (const path of glob.scan({ cwd: "." })) {
    if (path.includes(".test.")) continue;
    const text = await Bun.file(path).text();
    const hits = new Set<string>();

    // className = <expr>; (including ternary and template)
    for (const m of text.matchAll(/className\s*=\s*([^;]+);/g)) {
      for (const t of extractStringLiteralTokens(m[1])) hits.add(t);
    }

    // classList.add/remove/toggle("a", "b", ...)
    for (const m of text.matchAll(/classList\.(?:add|remove|toggle)\s*\(\s*([^)]+)\)/g)) {
      for (const arg of m[1].split(",")) extractClassListArg(arg, hits);
    }

    // innerHTML/template strings containing class="..."
    for (const m of text.matchAll(/class="([^"]*)"/g)) {
      for (const token of m[1].split(/\s+/)) if (token) hits.add(token);
    }

    if (hits.size > 0) perFile.set(path, hits);
  }
  return perFile;
}

async function cssText(): Promise<string> {
  const glob = new Bun.Glob(CSS_GLOB);
  const paths: string[] = [];
  for await (const path of glob.scan({ cwd: "." })) {
    paths.push(path);
  }
  paths.sort();
  const parts: string[] = [];
  for (const path of paths) {
    parts.push(await Bun.file(path).text());
  }
  return parts.join("");
}

function cssClasses(cssText: string): Set<string> {
  const found = new Set<string>();
  const noComments = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
  parseBlock(noComments);
  return found;

  function parseBlock(block: string): void {
    let lastClose = -1;
    for (let i = 0; i < block.length; i++) {
      if (block[i] === "{") {
        const selector = block.slice(lastClose + 1, i).trim();
        const isAtRule = selector.startsWith("@");
        const blockStart = i;
        let depth = 1;
        i++;
        while (i < block.length && depth > 0) {
          if (block[i] === "{") depth++;
          else if (block[i] === "}") depth--;
          i++;
        }
        const inner = block.slice(blockStart + 1, i - 1);
        if (isAtRule) {
          parseBlock(inner);
        } else if (selector) {
          for (const token of selector.split(/[\s,>+~]+/)) {
            const parts = token.split(".");
            for (let j = 1; j < parts.length; j++) {
              const name = parts[j].match(/^[a-zA-Z_-][a-zA-Z0-9_-]*/);
              if (name) found.add(name[0]);
            }
          }
        }
        lastClose = i - 1;
      }
    }
  }
}

test("every used class has a CSS definition", async () => {
  const html = await Bun.file(HTML_PATH).text();
  const used = htmlClasses(html);
  for (const hits of (await tsClasses()).values()) for (const c of hits) used.add(c);
  const defined = cssClasses(await cssText());
  const missing = [...used].filter((c) => !defined.has(c) && !ALLOWED_UNDEFINED.has(c));
  expect(missing).toEqual([]);
});

test("every CSS class is referenced somewhere", async () => {
  const html = await Bun.file(HTML_PATH).text();
  const used = htmlClasses(html);
  for (const hits of (await tsClasses()).values()) for (const c of hits) used.add(c);
  const defined = cssClasses(await cssText());
  const orphans = [...defined].filter((c) => !used.has(c) && !ALLOWED_ORPHAN.has(c));
  expect(orphans).toEqual([]);
});

function isApproved(className: string): boolean {
  return APPROVED_PREFIXES.some((prefix) => className === prefix || className.startsWith(`${prefix}-`));
}

test("every CSS file starts with an @layer wrapper", async () => {
  const glob = new Bun.Glob(CSS_GLOB);
  for await (const path of glob.scan({ cwd: "." })) {
    const text = await Bun.file(path).text();
    expect(text.trimStart().startsWith("@layer")).toBe(true);
  }
});

test("viewport @media queries are confined to layout.css", async () => {
  const glob = new Bun.Glob(CSS_GLOB);
  for await (const path of glob.scan({ cwd: "." })) {
    if (path === "public/styles/layout.css") continue;
    const text = await Bun.file(path).text();
    expect(text.includes("@media")).toBe(false);
  }
});

test("every used class is an approved component or primitive prefix", async () => {
  const html = await Bun.file(HTML_PATH).text();
  const used = htmlClasses(html);
  for (const hits of (await tsClasses()).values()) for (const c of hits) used.add(c);
  const bad = [...used].filter((c) => !isApproved(c));
  expect(bad).toEqual([]);
});
