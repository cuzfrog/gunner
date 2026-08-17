#!/usr/bin/env bun
// Usage: bun run scripts/ensure-file-end-newline.ts [root] [--check]
//   root     directory to scan (default: current working directory)
//   --check  report files missing a trailing newline and exit 1, without writing
// Scans text files (skips binary and build/tooling dirs) and ensures each ends with a single newline.
import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";

interface DirEntry {
  readonly name: string;
  readonly isDirectory: () => boolean;
  readonly isFile: () => boolean;
  readonly isSymbolicLink: () => boolean;
}

interface FileSystem {
  readonly readdir: (dir: string) => DirEntry[];
  readonly readFile: (file: string) => Buffer;
  readonly writeFile: (file: string, content: string) => void;
}

interface EnsureOptions {
  readonly checkOnly: boolean;
  readonly ignoreDirs: readonly string[];
  readonly fileSystem: FileSystem;
}

interface ScanSummary {
  readonly inspected: number;
  readonly fixed: readonly string[];
  readonly skippedBinary: number;
}

const DEFAULT_IGNORE_DIRS = [
  "node_modules",
  ".git",
  ".jie",
  ".pi",
  ".claude",
  ".vscode",
  ".codemie",
  ".idea",
  "tmp",
  "dist",
  "build",
  "target",
  "coverage",
  ".turbo",
  ".next",
] as const;

export function ensureFileEndNewline(root: string, options: Partial<EnsureOptions> = {}): ScanSummary {
  const ignoreDirs: readonly string[] = options.ignoreDirs ?? DEFAULT_IGNORE_DIRS;
  const checkOnly = options.checkOnly ?? false;
  const impl: FileSystem = options.fileSystem ?? nodeFileSystem;
  return scanAndFix(root, ignoreDirs, checkOnly, impl);
}

function scanAndFix(root: string, ignoreDirs: readonly string[], checkOnly: boolean, impl: FileSystem): ScanSummary {
  const files = collectFiles(root, new Set(ignoreDirs), impl);
  let inspected = 0;
  let skippedBinary = 0;
  const fixed: string[] = [];
  for (const file of files) {
    const buffer = impl.readFile(file);
    if (buffer.length === 0) continue;
    if (isBinary(buffer)) {
      skippedBinary++;
      continue;
    }
    const content = buffer.toString("utf8");
    if (hasTrailingNewline(content)) continue;
    inspected++;
    const next = ensureTrailingNewline(content);
    if (!checkOnly) impl.writeFile(file, next);
    fixed.push(path.relative(root, file));
  }
  return { inspected, fixed, skippedBinary };
}

function collectFiles(root: string, ignoreDirs: ReadonlySet<string>, impl: FileSystem): string[] {
  const files: string[] = [];
  const dirs: string[] = [root];
  while (dirs.length > 0) {
    const current = dirs.pop() as string;
    const entries = impl.readdir(current);
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (ignoreDirs.has(entry.name)) continue;
        dirs.push(full);
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
  }
  return files;
}

function isBinary(buffer: Buffer): boolean {
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

function ensureTrailingNewline(content: string): string {
  if (content.length === 0) return content;
  if (hasTrailingNewline(content)) return content;
  return content + "\n";
}

function hasTrailingNewline(content: string): boolean {
  return content.length > 0 && content.endsWith("\n");
}

const nodeFileSystem: FileSystem = {
  readdir: (dir) => fs.readdirSync(dir, { withFileTypes: true }),
  readFile: (file) => fs.readFileSync(file),
  writeFile: (file, content) => fs.writeFileSync(file, content, "utf8"),
};

function parseArgs(argv: readonly string[]): { root: string; checkOnly: boolean } {
  let checkOnly = false;
  let root = process.cwd();
  for (const arg of argv) {
    if (arg === "--check" || arg === "-c") {
      checkOnly = true;
    } else if (!arg.startsWith("-")) {
      root = path.resolve(arg);
    }
  }
  return { root, checkOnly };
}

function printSummary(summary: ScanSummary, root: string, checkOnly: boolean): void {
  const verb = checkOnly ? "would fix" : "fixed";
  console.log(`Scanned: ${root}`);
  console.log(`  inspected text files: ${summary.inspected}`);
  console.log(`  skipped binary files: ${summary.skippedBinary}`);
  console.log(`  ${verb}: ${summary.fixed.length}`);
  for (const file of summary.fixed) console.log(`    + ${file}`);
  if (checkOnly && summary.fixed.length > 0) {
    console.log("Trailing newline check failed.");
    process.exit(1);
  }
}

if (import.meta.main) {
  const { root, checkOnly } = parseArgs(process.argv.slice(2));
  const summary = ensureFileEndNewline(root, { checkOnly });
  printSummary(summary, root, checkOnly);
}
