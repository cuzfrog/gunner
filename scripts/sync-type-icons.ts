#!/usr/bin/env bun
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as process from "node:process";
import { buildTypeIconEntries, IN_SCOPE_CATEGORY_IDS, readSdeGroups, readSdeTypes, syncTypeIcons, verifyTypeIcons, type TypeIconFetchResult, type TypeIconFetcher, type TypeIconProblems, type TypeIconStore } from "./iconAssets";

const SDE_DIR = join(import.meta.dir, "..", "sde");
const TYPE_ICONS_DIR = join("data", "ship-modules", "type-icons");
const EXIT_PROBLEMS = 1;

function main(): void {
  void run(process.argv.slice(2)).catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
}

async function run(args: readonly string[]): Promise<void> {
  const flags = args.filter((arg) => arg.startsWith("--"));
  const store = nodeTypeIconStore(TYPE_ICONS_DIR);
  const entries = buildTypeIconEntries(readSdeTypes(SDE_DIR), readSdeGroups(SDE_DIR), IN_SCOPE_CATEGORY_IDS);
  if (flags.includes("--verify")) {
    const problems = await verifyTypeIcons({ entries, store });
    reportProblems(problems);
    if (problems.invalid.length + problems.orphaned.length > 0) process.exit(EXIT_PROBLEMS);
    return;
  }
  const prune = flags.includes("--prune");
  const report = await syncTypeIcons({ entries, store, fetcher: httpTypeIconFetcher(), prune });
  console.log(`Fetched ${report.fetched.length} icon(s)${report.fetched.length > 0 ? `: ${report.fetched.join(", ")}` : ""}.`);
  for (const failure of report.failed) console.warn(`Failed typeId ${failure.typeId}: ${failure.reason}`);
  if (report.unavailable.length > 0) console.log(`Unavailable at source (no icon published): ${report.unavailable.length} typeId(s).`);
  if (report.pruned.length > 0) console.log(`Pruned ${report.pruned.length} orphaned file(s): ${report.pruned.join(", ")}`);
  if (report.failed.length > 0) console.warn(`Done with ${report.failed.length} failure(s); re-run to retry.`);
  if (report.failed.length > 0) process.exit(EXIT_PROBLEMS);
}

function reportProblems(problems: TypeIconProblems): void {
  for (const problem of problems.invalid) console.warn(`Invalid ${problem.name}: ${problem.reason}`);
  if (problems.orphaned.length > 0) console.warn(`Orphaned files (run sync with --prune): ${problems.orphaned.join(", ")}`);
  if (problems.missing.length > 0) console.log(`Missing on disk (run sync to fetch; some may be unavailable at source): ${problems.missing.length} typeId(s).`);
  const total = problems.invalid.length + problems.orphaned.length;
  console.log(total === 0 ? "All on-disk type icons verified." : `${total} problem(s) found.`);
}

function nodeTypeIconStore(dir: string): TypeIconStore {
  return {
    fileNames: () => existsSync(dir) ? readdirSync(dir) : [],
    read: (name) => existsSync(join(dir, name)) ? readFileSync(join(dir, name)) : undefined,
    write: (name, bytes) => {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, name), bytes);
    },
    delete: (name) => rmSync(join(dir, name)),
  };
}

function httpTypeIconFetcher(): TypeIconFetcher {
  return {
    fetch: async (typeId): Promise<TypeIconFetchResult> => {
      const response = await fetch(`https://images.evetech.net/types/${typeId}/icon`);
      if (response.status === 404) return { status: "unavailable" };
      if (!response.ok) return { status: "failed", reason: `HTTP ${response.status}` };
      return { status: "ok", bytes: new Uint8Array(await response.arrayBuffer()) };
    },
  };
}

if (import.meta.main) {
  main();
}
