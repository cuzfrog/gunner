const HTML_PATH = "public/index.html";
const TS_GLOB = "src/ui/**/*.ts";
const CSS_PATH = "public/styles.css";

// Classes used in HTML/TS that have no matching CSS rule yet.
// Each entry must name the phase that removes it.
const ALLOWED_UNDEFINED = new Set<string>([
  // Phase 2/3: no rule yet; will gain one or be renamed.
  "sigres-group",
  "mode-group",
  "booster-trigger",
  "footer-author-line",
  // Phase 4: hintRotator adds this category but the style is not yet isolated.
  "hint",
]);

// CSS classes not referenced by the literal scan (built dynamically or stale rules pending removal).
// Each entry must name the phase that removes it.
const ALLOWED_ORPHAN = new Set<string>([
  // Phase 2/3: built from ternary className in ewar/booster controllers.
  "ewar-row",
  "ewar-row-inactive",
  // Phase 2/3: built from ternary className in fittingPreview.
  "preview-row",
  "preview-row-empty",
  // Phase 2/3: built dynamically in rangeOverlayController.
  "range-overlay-web",
  "range-overlay-grappler",
  "range-overlay-scrambler",
  "range-overlay-disruptor",
  // Phase 2/3: stale rules to be removed or re-applied.
  "ammo-stat-suffix",
  "ammo-empty",
  "fitting-name-label",
  // Phase 3: .disabled state class will become .is-disabled.
  "disabled",
]);

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

    // hintRotator uses classList.add(category) where category is one of these.
    if (text.includes("classList.add(category)")) {
      for (const c of ["hint", "tip", "lore"]) hits.add(c);
    }

    if (hits.size > 0) perFile.set(path, hits);
  }
  return perFile;
}

function cssClasses(cssText: string): Set<string> {
  const found = new Set<string>();
  const noComments = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
  let lastClose = -1;
  for (let i = 0; i < noComments.length; i++) {
    if (noComments[i] === "{") {
      const selector = noComments.slice(lastClose + 1, i).trim();
      if (selector && !selector.startsWith("@")) {
        for (const token of selector.split(/[\s,>+~]+/)) {
          const parts = token.split(".");
          for (let j = 1; j < parts.length; j++) {
            const name = parts[j].match(/^[a-zA-Z_-][a-zA-Z0-9_-]*/);
            if (name) found.add(name[0]);
          }
        }
      }
      let depth = 1;
      i++;
      while (i < noComments.length && depth > 0) {
        if (noComments[i] === "{") depth++;
        else if (noComments[i] === "}") depth--;
        i++;
      }
      lastClose = i - 1;
    }
  }
  return found;
}

test("every used class has a CSS definition", async () => {
  const html = await Bun.file(HTML_PATH).text();
  const used = htmlClasses(html);
  for (const hits of (await tsClasses()).values()) for (const c of hits) used.add(c);
  const defined = cssClasses(await Bun.file(CSS_PATH).text());
  const missing = [...used].filter((c) => !defined.has(c) && !ALLOWED_UNDEFINED.has(c));
  expect(missing).toEqual([]);
});

test("every CSS class is referenced somewhere", async () => {
  const html = await Bun.file(HTML_PATH).text();
  const used = htmlClasses(html);
  for (const hits of (await tsClasses()).values()) for (const c of hits) used.add(c);
  const defined = cssClasses(await Bun.file(CSS_PATH).text());
  const orphans = [...defined].filter((c) => !used.has(c) && !ALLOWED_ORPHAN.has(c));
  expect(orphans).toEqual([]);
});
