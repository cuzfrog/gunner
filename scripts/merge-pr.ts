#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import * as process from "node:process";
import { parseArgs } from "node:util";

const VALID_METHODS = ["squash", "rebase", "merge"] as const;
type MergeMethod = (typeof VALID_METHODS)[number];

const USAGE = "usage: bun run scripts/merge-pr.ts <pr-number> [--method squash|rebase|merge] [--delete]";

interface CliOptions {
  readonly prNumber: number;
  readonly method: MergeMethod;
  readonly shouldDelete: boolean;
}

interface CommandResult {
  readonly stdout: string;
  readonly stderr: string;
}

export function parseCliArgs(argv: readonly string[]): CliOptions {
  const parsed = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      method: { type: "string", short: "m", default: "squash" },
      delete: { type: "boolean", short: "d", default: false },
    },
  });
  if (parsed.positionals.length > 1) {
    throw new Error("Expected a single PR number");
  }
  const positional = parsed.positionals[0];
  const prNumber = positional === undefined ? NaN : Number(positional);
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    throw new Error(`Invalid PR number: ${positional ?? "missing"}`);
  }
  const methodValue = typeof parsed.values.method === "string" ? parsed.values.method : "squash";
  const method = parseMergeMethod(methodValue);
  const shouldDelete = parsed.values.delete === true;
  return { prNumber, method, shouldDelete };
}

function isMergeMethod(value: string): value is MergeMethod {
  return VALID_METHODS.some((method) => method === value);
}

function parseMergeMethod(value: string): MergeMethod {
  if (!isMergeMethod(value)) {
    throw new Error(`Invalid merge method: ${value}`);
  }
  return value;
}

function main(argv: readonly string[]): void {
  try {
    run(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unexpected error";
    printUsage();
    printErrorAndExit(message);
  }
}

function printUsage(): void {
  console.error(USAGE);
}

function printErrorAndExit(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function run(argv: readonly string[]): void {
  const { prNumber, method, shouldDelete } = parseCliArgs(argv);
  console.log(`waiting for checks on #${prNumber}`);
  const checksStatus = runVisible("gh", ["pr", "checks", String(prNumber), "--watch", "--fail-fast"]);
  if (checksStatus !== 0) {
    console.error("checks failed");
    reportFailingChecks(prNumber);
  }
  console.log("checks passed");
  const repoSlug = getRepoSlug();
  const { headSha, headRefName } = getPrHeadInfo(prNumber);
  console.log(`merging #${prNumber} with method ${method}`);
  mergePullRequest(prNumber, method, headSha, repoSlug);
  console.log(`merged #${prNumber}`);
  syncMain();
  if (shouldDelete) {
    deleteLocalBranch(headRefName);
  }
  process.exit(0);
}

function runVisible(command: string, args: readonly string[]): number {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error !== undefined) {
    printErrorAndExit(`${command} ${args.join(" ")}: ${result.error.message}`);
  }
  if (result.signal !== null) {
    printErrorAndExit(`${command} killed by ${result.signal}`);
  }
  return result.status ?? 1;
}

function runSilent(command: string, args: readonly string[]): CommandResult {
  const result = spawnSync(command, args, { encoding: "utf-8", stdio: "pipe" });
  if (result.error !== undefined) {
    printErrorAndExit(`${command} ${args.join(" ")}: ${result.error.message}`);
  }
  if (result.signal !== null) {
    printErrorAndExit(`${command} killed by ${result.signal}`);
  }
  if (result.status !== 0) {
    printErrorAndExit(`${command} ${args.join(" ")}: ${result.stderr.trim() || "unknown error"}`);
  }
  return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

function getRepoSlug(): string {
  const result = runSilent("gh", ["repo", "view", "--json", "owner,name", "--template", "{{.owner.login}}/{{.name}}"]);
  return result.stdout;
}

function getPrHeadInfo(prNumber: number): { readonly headSha: string; readonly headRefName: string } {
  const result = runSilent("gh", ["pr", "view", String(prNumber), "--json", "headRefOid,headRefName", "--template", "{{.headRefOid}}\t{{.headRefName}}"]);
  const [headSha, headRefName] = result.stdout.split("\t");
  if (headSha === undefined || headRefName === undefined) {
    printErrorAndExit("could not parse PR head info");
  }
  return { headSha: headSha.trim(), headRefName: headRefName.trim() };
}

function mergePullRequest(prNumber: number, method: MergeMethod, headSha: string, repoSlug: string): void {
  const parts = repoSlug.split("/");
  if (parts.length !== 2 || parts[0] === undefined || parts[1] === undefined) {
    printErrorAndExit(`invalid repo slug: ${repoSlug}`);
  }
  const [owner, repo] = parts;
  const result = runSilent("gh", [
    "api",
    "--method",
    "PUT",
    `repos/${owner}/${repo}/pulls/${prNumber}/merge`,
    "-F",
    `merge_method=${method}`,
    "-F",
    `sha=${headSha}`,
    "--template",
    "{{.merged}}",
  ]);
  if (result.stdout !== "true") {
    printErrorAndExit(`merge failed: ${result.stdout || "unknown"}`);
  }
}

function reportFailingChecks(prNumber: number): never {
  const result = runSilent("gh", [
    "pr",
    "checks",
    String(prNumber),
    "--json",
    "name,bucket",
    "--template",
    '{{range .}}{{.name}}\t{{.bucket}}{{"\\n"}}{{end}}',
  ]);
  const lines = result.stdout.split("\n").filter((line) => line.length > 0);
  const failing: string[] = [];
  for (const line of lines) {
    const [name, bucket] = line.split("\t");
    if (name === undefined || bucket === undefined) continue;
    if (bucket !== "pass" && bucket !== "skipping") {
      failing.push(name);
    }
  }
  if (failing.length > 0) {
    console.error("failing checks:");
    for (const name of failing) {
      console.error(`  - ${name}`);
    }
  } else {
    console.error("checks did not pass");
  }
  process.exit(1);
}

function syncMain(): void {
  const fetchStatus = runVisible("git", ["fetch", "origin"]);
  if (fetchStatus !== 0) {
    printErrorAndExit("git fetch origin failed");
  }
  console.log("fetched origin");
  const checkoutStatus = runVisible("git", ["checkout", "main"]);
  if (checkoutStatus !== 0) {
    printErrorAndExit("git checkout main failed");
  }
  console.log("checked out main");
  const pullStatus = runVisible("git", ["pull", "--ff-only"]);
  if (pullStatus !== 0) {
    console.log("fast-forward pull failed; resetting to origin/main");
    const fetchMainStatus = runVisible("git", ["fetch", "origin", "main"]);
    if (fetchMainStatus !== 0) {
      printErrorAndExit("git fetch origin main failed");
    }
    runSilent("git", ["reset", "--hard", "origin/main"]);
    console.log("reset to origin/main");
  } else {
    console.log("pulled main");
  }
  runSilent("git", ["fetch", "-p"]);
  console.log("pruned remotes");
}

function deleteLocalBranch(branchName: string): void {
  const check = spawnSync("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${branchName}`], { encoding: "utf-8", stdio: "pipe" });
  if (check.error !== undefined) {
    printErrorAndExit(`git rev-parse: ${check.error.message}`);
  }
  if (check.status !== 0) {
    console.log(`local branch ${branchName} does not exist; skipping delete`);
    return;
  }
  const deletion = runSilent("git", ["branch", "-d", branchName]);
  if (deletion.stdout.length > 0) {
    console.log(deletion.stdout);
  }
  console.log(`deleted local branch ${branchName}`);
}

if (import.meta.main) {
  main(process.argv.slice(2));
}
