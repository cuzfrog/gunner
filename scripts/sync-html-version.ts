#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import * as process from "node:process";

const pkg: { version: string } = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.version;
if (typeof version !== "string" || version.length === 0) {
  throw new Error("package.json must contain a non-empty version");
}

const htmlPath = "public/index.html";
const html = readFileSync(htmlPath, "utf8");
const pattern = /(<span[^>]*id="app-version"[^>]*>)v[^<]+(<\/span>)/;

if (!pattern.test(html)) {
  console.error(`Could not find #app-version span in ${htmlPath}`);
  process.exit(1);
}

const updated = html.replace(pattern, `$1v${version}$2`);
writeFileSync(htmlPath, updated);
console.log(`Synced ${htmlPath} to v${version}`);
