import { expectedTypeIconFile, TYPE_ICON_FILE_PREFIX } from "./iconScope";
import { pngDimensions } from "./pngDimensions";

export const MIN_TYPE_ICON_EDGE = 32;
export const DEFAULT_FETCH_CONCURRENCY = 8;

export interface TypeIconStore {
  fileNames(): readonly string[];
  read(name: string): Uint8Array | undefined;
  write(name: string, bytes: Uint8Array): void;
  delete(name: string): void;
}

export type TypeIconFetchResult = { status: "ok"; bytes: Uint8Array } | { status: "unavailable" } | { status: "failed"; reason: string };

export interface TypeIconFetcher {
  fetch(typeId: number): Promise<TypeIconFetchResult>;
}

export interface IconFileProblem {
  readonly name: string;
  readonly reason: string;
}

export interface TypeIconProblems {
  readonly invalid: readonly IconFileProblem[];
  readonly missing: readonly number[];
  readonly orphaned: readonly string[];
}

export interface TypeIdProblem {
  readonly typeId: number;
  readonly reason: string;
}

export interface TypeIconSyncReport {
  readonly fetched: readonly number[];
  readonly failed: readonly TypeIdProblem[];
  readonly unavailable: readonly number[];
  readonly pruned: readonly string[];
}

export interface TypeIconSyncDeps {
  readonly entries: Readonly<Record<string, string>>;
  readonly store: TypeIconStore;
  readonly fetcher: TypeIconFetcher;
  readonly prune?: boolean;
  readonly concurrency?: number;
}

export interface TypeIconVerifyDeps {
  readonly entries: Readonly<Record<string, string>>;
  readonly store: TypeIconStore;
}

export function validateTypeIconBytes(bytes: Uint8Array): string | undefined {
  const dims = pngDimensions(bytes);
  if (dims === undefined) return "not a valid PNG";
  if (dims.width < MIN_TYPE_ICON_EDGE || dims.height < MIN_TYPE_ICON_EDGE) {
    return `dimensions ${dims.width}x${dims.height} below minimum ${MIN_TYPE_ICON_EDGE}x${MIN_TYPE_ICON_EDGE}`;
  }
  return undefined;
}

export async function verifyTypeIcons(deps: TypeIconVerifyDeps): Promise<TypeIconProblems> {
  return scanTypeIcons(deps.entries, deps.store);
}

export async function syncTypeIcons(deps: TypeIconSyncDeps): Promise<TypeIconSyncReport> {
  const problems = scanTypeIcons(deps.entries, deps.store);
  const pruned = problems.orphaned.filter(() => deps.prune === true);
  for (const name of pruned) deps.store.delete(name);
  const targets = [...problems.missing, ...problems.invalid.map((problem) => fileTypeId(problem.name))];
  targets.sort((a, b) => a - b);
  const outcomes = await fetchTargets(targets, deps);
  return { fetched: outcomes.fetched, failed: outcomes.failed, unavailable: outcomes.unavailable, pruned };
}

async function fetchTargets(targets: readonly number[], deps: TypeIconSyncDeps): Promise<{ fetched: number[]; failed: TypeIdProblem[]; unavailable: number[] }> {
  const fetched: number[] = [];
  const failed: TypeIdProblem[] = [];
  const unavailable: number[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(deps.concurrency ?? DEFAULT_FETCH_CONCURRENCY, targets.length) }, () => fetchWorker());
  await Promise.all(workers);
  const byId = (a: number, b: number): number => a - b;
  return { fetched: fetched.sort(byId), failed: failed.sort((a, b) => a.typeId - b.typeId), unavailable: unavailable.sort(byId) };

  async function fetchWorker(): Promise<void> {
    while (cursor < targets.length) {
      const typeId = targets[cursor++];
      const result = await deps.fetcher.fetch(typeId);
      if (result.status === "unavailable") {
        unavailable.push(typeId);
        continue;
      }
      if (result.status === "failed") {
        failed.push({ typeId, reason: result.reason });
        continue;
      }
      const reason = validateTypeIconBytes(result.bytes);
      if (reason !== undefined) {
        failed.push({ typeId, reason });
        continue;
      }
      deps.store.write(fileFor(typeId), result.bytes);
      fetched.push(typeId);
    }
  }
}

function scanTypeIcons(entries: Readonly<Record<string, string>>, store: TypeIconStore): TypeIconProblems {
  const expected = new Map<string, number>();
  for (const [tid, file] of Object.entries(entries)) {
    if (file.startsWith(TYPE_ICON_FILE_PREFIX)) expected.set(file.slice(TYPE_ICON_FILE_PREFIX.length), Number(tid));
  }
  const invalid: IconFileProblem[] = [];
  const orphaned: string[] = [];
  const onDisk = new Set<string>();
  for (const name of store.fileNames()) {
    onDisk.add(name);
    if (!expected.has(name)) {
      orphaned.push(name);
      continue;
    }
    const bytes = store.read(name);
    if (bytes === undefined) continue;
    const reason = validateTypeIconBytes(bytes);
    if (reason !== undefined) invalid.push({ name, reason });
  }
  const missing = [...expected.entries()].filter(([name]) => !onDisk.has(name)).map(([, typeId]) => typeId);
  missing.sort((a, b) => a - b);
  orphaned.sort();
  return { invalid, missing, orphaned };
}

function fileFor(typeId: number): string {
  return expectedTypeIconFile(typeId).slice(TYPE_ICON_FILE_PREFIX.length);
}

function fileTypeId(name: string): number {
  return Number(name.slice(0, name.indexOf("@")));
}
