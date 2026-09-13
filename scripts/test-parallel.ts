import { spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { cpus } from "node:os";

const ROOTS = ["src", "tests", "scripts"];
const MIN_SHARDS = 1;
const MAX_SHARDS = 4;

function walkTestFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return walkTestFiles(path);
    return path.endsWith(".test.ts") ? [path] : [];
  });
}

function shardCount(fileCount: number): number {
  const byCores = Math.max(MIN_SHARDS, Math.floor(cpus().length / 2));
  return Math.min(MAX_SHARDS, byCores, fileCount);
}

function shardPaths(files: string[], shards: number): string[][] {
  const shardsByBytes: string[][] = Array.from({ length: shards }, () => []);
  const bytes = Array.from({ length: shards }, () => 0);
  const sized = files.map((path) => ({ path, size: statSync(path).size })).sort((a, b) => b.size - a.size);
  for (const file of sized) {
    const smallest = bytes.indexOf(Math.min(...bytes));
    shardsByBytes[smallest].push(file.path);
    bytes[smallest] += file.size;
  }
  return shardsByBytes;
}

async function runShard(index: number, paths: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("bun", ["test", ...paths], { stdio: ["ignore", "inherit", "inherit"] });
    child.on("exit", (code) => {
      if (code !== 0) console.error(`shard ${index} failed (exit ${code})`);
      resolve(code ?? 1);
    });
  });
}

const files = ROOTS.flatMap((root) => (existsSafe(root) ? walkTestFiles(root) : []));
const shards = shardPaths(files, shardCount(files.length));
const codes = await Promise.all(shards.map((paths, index) => (paths.length === 0 ? 0 : runShard(index, paths))));
process.exit(codes.some((code) => code !== 0) ? 1 : 0);

function existsSafe(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
