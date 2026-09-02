const ASTRO_GLOB = "src/**/*.astro";
const TS_GLOB = "src/ui/**/*.ts";
const CSS_GLOB = "src/styles/**/*.css";

// Classes used in HTML/TS that have no matching CSS rule yet.
// Each entry must name the phase that removes it.
const ALLOWED_UNDEFINED = new Set<string>([
  "portrait-hp-bars-ship-a",
  "portrait-hp-bars-ship-b",
  "portrait-hp-bar-shield",
  "portrait-hp-bar-armor",
  "portrait-hp-bar-hull",
]);

// CSS classes not referenced by the literal scan (built dynamically or stale rules pending removal).
// Each entry must name the phase that removes it.
const ALLOWED_ORPHAN = new Set<string>([
  // Phase 4: generated at runtime by rangeOverlayController for each overlay kind.
  "range-overlay-web",
  "range-overlay-grappler",
  "range-overlay-scrambler",
  "range-overlay-disruptor",
  // Astro components generate per-side class names from `prefix-${side}` at build time.
  // The literal scanner sees only the prefix (ending with `-`, which is skipped); the
  // full names appear only in dist/index.html which may not exist when the test runs in CI.
  "combatant-portrait-ship-a",
  "combatant-portrait-ship-b",
  "portrait-image-ship-a",
  "portrait-image-ship-b",
  "result-side-a",
  "result-side-b",
  "side-panel-ship-a",
  "side-panel-ship-b",
  "popup-below",
  "popup-above",
]);

// Approved component / primitive prefixes. A class is valid if it equals one of these or starts with `<prefix>-`.
const APPROVED_PREFIXES = [
  "app",
  "side-panel",
  "side-panel-weapon-area",
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
  "hover-hint",
  "dps-hint",
  "segmented-control",
  "skill-tuner",
  "skill",
  "defense-skill",
  "defense-skills",
  "ammo",
  "launcher",
  "drone",
  "selectable-item",
  "weapon-system",
  "weapon-kind",
  "weapon-panel",
  "weapon-selector",
  "weapon-variant",
  "weapon-overload",
  "turret-variants",
  "turret-variant",
  "turret-mode",
  "sigres",
  "overload-button",
  "propulsion",
  "choice-selector",
  "ewar",
  "defense",
  "booster",
  "profile",
  "new-profile",
  "menu-popup",
  "paste",
  "confirm",
  "hints-slide",
  "hint",
  "fitting",
  "preview",
  "result-grid",
  "result-card",
  "result-side",
  "result-range",
  "result-hero",
  "result-metric",
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
  "choice-icon",
  "choice-value",
];

type StringMap = Map<string, Set<string>>;

function isApproved(className: string): boolean {
  return APPROVED_PREFIXES.some((prefix) => className === prefix || className.startsWith(`${prefix}-`));
}

function extractClassExpressions(text: string): string[] {
  const expressions: string[] = [];
  const pattern = /class=\{/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const start = match.index + match[0].length;
    let depth = 1;
    let i = start;
    while (i < text.length && depth > 0) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      i++;
    }
    if (depth === 0) expressions.push(text.slice(start, i - 1));
  }
  return expressions;
}

function extractFrontmatter(text: string): string | undefined {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : undefined;
}

function extractFrontmatterClassStrings(frontmatter: string): Set<string> {
  const tokens = new Set<string>();
  for (const m of frontmatter.matchAll(/(?:const|let)\s+\w*class\w*\s*=\s*([\s\S]*?);/gi)) {
    for (const t of extractStringLiteralTokens(m[1])) tokens.add(t);
  }
  for (const m of frontmatter.matchAll(/\.push\(\s*"([^"]*)"\s*\)/g)) {
    for (const token of m[1].split(/\s+/)) if (token) tokens.add(token);
  }
  for (const m of frontmatter.matchAll(/\.push\(\s*`([^`]*)`\s*\)/g)) {
    const cleaned = m[1].replace(/\$\{[^}]*\}/g, " ");
    for (const token of cleaned.split(/\s+/)) if (token && !token.endsWith("-")) tokens.add(token);
  }
  return tokens;
}

async function astroClasses(): Promise<Set<string>> {
  const found = new Set<string>();
  const glob = new Bun.Glob(ASTRO_GLOB);
  for await (const path of glob.scan({ cwd: "." })) {
    const text = await Bun.file(path).text();
    for (const m of text.matchAll(/class="([^"]*)"/g)) {
      for (const token of m[1].split(/\s+/)) if (token) found.add(token);
    }
    for (const expr of extractClassExpressions(text)) {
      for (const t of extractStringLiteralTokens(expr)) found.add(t);
    }
    for (const m of text.matchAll(/(?:extraClass|labelClass)\s*=\s*"([^"]*)"/g)) {
      for (const token of m[1].split(/\s+/)) if (token) found.add(token);
    }
    const frontmatter = extractFrontmatter(text);
    if (frontmatter) {
      for (const t of extractFrontmatterClassStrings(frontmatter)) found.add(t);
    }
  }
  if (await Bun.file("dist/index.html").exists()) {
    const html = await Bun.file("dist/index.html").text();
    for (const m of html.matchAll(/class="([^"]*)"/g)) {
      for (const token of m[1].split(/\s+/)) if (token) found.add(token);
    }
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

    // SelectableList shape class properties (itemClass, nameClass, iconClass, quantityClass, extraButtonClass)
    for (const m of text.matchAll(/(?:itemClass|nameClass|iconClass|quantityClass|extraButtonClass)\s*:\s*"([^"]*)"/g)) {
      for (const token of m[1].split(/\s+/)) if (token) hits.add(token);
    }

    // ChoiceGroup shape class properties (buttonClass, iconClass, labelClass)
    for (const m of text.matchAll(/(?:buttonClass|labelClass)\s*:\s*"([^"]*)"/g)) {
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
  const used = await astroClasses();
  for (const hits of (await tsClasses()).values()) for (const c of hits) used.add(c);
  const defined = cssClasses(await cssText());
  const missing = [...used].filter((c) => !defined.has(c) && !ALLOWED_UNDEFINED.has(c));
  expect(missing).toEqual([]);
});

test("every CSS class is referenced somewhere", async () => {
  const used = await astroClasses();
  for (const hits of (await tsClasses()).values()) for (const c of hits) used.add(c);
  const defined = cssClasses(await cssText());
  const orphans = [...defined].filter((c) => !used.has(c) && !ALLOWED_ORPHAN.has(c));
  expect(orphans).toEqual([]);
});

test("every CSS file starts with an @layer wrapper", async () => {
  const glob = new Bun.Glob(CSS_GLOB);
  for await (const path of glob.scan({ cwd: "." })) {
    if (path === "src/styles/styles.css") continue;
    const text = await Bun.file(path).text();
    expect(text.trimStart().startsWith("@layer")).toBe(true);
  }
});

test("viewport @media queries are confined to layout.css", async () => {
  const glob = new Bun.Glob(CSS_GLOB);
  for await (const path of glob.scan({ cwd: "." })) {
    if (path === "src/styles/layout.css") continue;
    const text = await Bun.file(path).text();
    expect(text.includes("@media")).toBe(false);
  }
});

test("every used class is an approved component or primitive prefix", async () => {
  const used = await astroClasses();
  for (const hits of (await tsClasses()).values()) for (const c of hits) used.add(c);
  const bad = [...used].filter((c) => !isApproved(c));
  expect(bad).toEqual([]);
});
