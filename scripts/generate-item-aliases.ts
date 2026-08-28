#!/usr/bin/env bun
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as process from "node:process";
import { ITEM_NAMES_EN } from "../src/gamedata/itemNames/item-names-en";

const CONVERSIONS_DIR = process.argv[2] ?? join(homedir(), "workspace", "Pyfa", "service", "conversions");
const OUTPUT_PATH = "src/gamedata/itemNames/item-name-aliases-en.ts";

const MAX_CHAIN_DEPTH = 50;

function resolveChains(conversions: Readonly<Record<string, string>>): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const source of Object.keys(conversions)) {
    resolved[source] = resolveChain(source, conversions);
  }
  return resolved;
}

function filterAliases(aliases: Readonly<Record<string, string>>, currentNames: ReadonlySet<string>): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const [source, target] of Object.entries(aliases)) {
    if (source === target) continue;
    if (currentNames.has(source)) continue;
    if (!currentNames.has(target)) continue;
    filtered[source] = target;
  }
  return filtered;
}

function resolveChain(source: string, conversions: Readonly<Record<string, string>>): string {
  let current = source;
  const visited = new Set<string>([source]);
  for (let i = 0; i < MAX_CHAIN_DEPTH; i++) {
    const next = conversions[current];
    if (next === undefined || visited.has(next)) return current;
    visited.add(next);
    current = next;
  }
  return current;
}

function parseConversionsFile(filePath: string): Record<string, string> {
  const source = readFileSync(filePath, "utf8");
  const match = source.match(/^CONVERSIONS\s*=\s*\{/m);
  if (!match) return {};
  const start = match.index! + match[0].length;
  const end = findDictEnd(source, start);
  const dictBody = source.slice(start, end);
  return parseDictLiteral(dictBody);
}

function findDictEnd(source: string, start: number): number {
  let depth = 1;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error("Unterminated CONVERSIONS dict");
}

function parseDictLiteral(body: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pattern = /(['"])((?:[^\\]|\\.)*?)\1\s*:\s*(['"])((?:[^\\]|\\.)*?)\3/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    result[unescapePythonString(match[2])] = unescapePythonString(match[4]);
  }
  return result;
}

function unescapePythonString(s: string): string {
  return s.replace(/\\(.)/g, (_match, char: string) => (char === "n" ? "\n" : char));
}

function loadAllConversions(): Record<string, string> {
  const all: Record<string, string> = {};
  for (const file of readdirSync(CONVERSIONS_DIR).filter((f) => f.endsWith(".py") && f !== "__init__.py").sort()) {
    const conversions = parseConversionsFile(join(CONVERSIONS_DIR, file));
    for (const [source, target] of Object.entries(conversions)) all[source] = target;
  }
  return all;
}

function generateAliasesContent(aliases: Readonly<Record<string, string>>): string {
  const lines = Object.keys(aliases)
    .sort()
    .map((source) => `  ${JSON.stringify(source)}: ${JSON.stringify(aliases[source])},`);
  return `// Generated from pyfa conversion tables. Do not edit by hand.\n/* eslint-disable */\n\nexport const ITEM_NAME_ALIASES_EN: Readonly<Record<string, string>> = {\n${lines.join("\n")}\n};\n`;
}

function main(): void {
  const allConversions = loadAllConversions();
  const resolved = resolveChains(allConversions);
  const currentNames = new Set(Object.values(ITEM_NAMES_EN));
  const aliases = filterAliases(resolved, currentNames);
  writeFileSync(OUTPUT_PATH, generateAliasesContent(aliases), "utf8");
  console.log(`Wrote ${OUTPUT_PATH} with ${Object.keys(aliases).length} aliases.`);
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

export { resolveChains as _resolveChains, filterAliases as _filterAliases };
