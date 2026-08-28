import { FITTING_DB, type FittingDb, type LauncherStats } from "../gamedata/fittingDb";
import { toTypeId, type TypeId } from "../gamedata/ids";
import type { HullTier } from "../ships";

export type LauncherClass =
  | "rocket" | "light"
  | "ham" | "heavy" | "rapidLight"
  | "torpedo" | "cruise" | "rapidHeavy"
  | "xlTorpedo" | "xlCruise" | "rapidTorpedo";

export interface LauncherClasses {
  classOf(moduleId: TypeId): LauncherClass;
  representativeOf(launcherClass: LauncherClass): TypeId;
  classesForTiers(tiers: readonly HullTier[]): readonly LauncherClass[];
}

interface LauncherClassesDeps {
  readonly fittingDb: Pick<FittingDb, "launchers">;
}

const LAUNCHER_CLASS_GROUPS: Readonly<Record<LauncherClass, number>> = {
  rocket: 507, light: 509, ham: 771, heavy: 510, rapidLight: 511,
  torpedo: 508, cruise: 506, rapidHeavy: 1245,
  xlTorpedo: 524, xlCruise: 1674, rapidTorpedo: 1673,
} as const;

const LAUNCHER_CLASS_TIERS: Readonly<Record<LauncherClass, HullTier>> = {
  rocket: "small", light: "small",
  ham: "medium", heavy: "medium", rapidLight: "medium",
  torpedo: "large", cruise: "large", rapidHeavy: "large",
  xlTorpedo: "capital", xlCruise: "capital", rapidTorpedo: "capital",
} as const;

const LAUNCHER_CLASS_ORDER: readonly LauncherClass[] = [
  "rocket", "light", "ham", "heavy", "rapidLight",
  "torpedo", "cruise", "rapidHeavy",
  "xlTorpedo", "xlCruise", "rapidTorpedo",
] as const;

export class LauncherClassesImpl implements LauncherClasses {
  private readonly launchers: Readonly<Record<string, LauncherStats>>;
  private readonly groupToClass: ReadonlyMap<number, LauncherClass>;
  private readonly representatives: Readonly<Record<LauncherClass, TypeId>>;

  constructor({ fittingDb }: LauncherClassesDeps) {
    this.launchers = fittingDb.launchers;
    this.groupToClass = invertClassGroups();
    this.representatives = buildRepresentatives(this.launchers);
    if (fittingDb.launchers === FITTING_DB.launchers) assertLauncherClasses(this.launchers, this.groupToClass, this.representatives);
  }

  classOf(moduleId: TypeId): LauncherClass {
    const stats = this.launchers[moduleId];
    if (!stats) throw new Error(`Unknown launcher module: ${moduleId}`);
    const cls = this.groupToClass.get(stats.launcherGroup);
    if (!cls) throw new Error(`Unknown launcher group ${stats.launcherGroup} for module ${stats.name}`);
    return cls;
  }

  representativeOf(launcherClass: LauncherClass): TypeId {
    const id = this.representatives[launcherClass];
    if (!id) throw new Error(`No representative launcher for class ${launcherClass}`);
    return id;
  }

  classesForTiers(tiers: readonly HullTier[]): readonly LauncherClass[] {
    const tierSet = new Set(tiers);
    return LAUNCHER_CLASS_ORDER.filter((cls) => tierSet.has(LAUNCHER_CLASS_TIERS[cls]));
  }
}

function invertClassGroups(): ReadonlyMap<number, LauncherClass> {
  const map = new Map<number, LauncherClass>();
  for (const cls of LAUNCHER_CLASS_ORDER) map.set(LAUNCHER_CLASS_GROUPS[cls], cls);
  return map;
}

function buildRepresentatives(launchers: Readonly<Record<string, LauncherStats>>): Readonly<Record<LauncherClass, TypeId>> {
  const result: Partial<Record<LauncherClass, TypeId>> = {};
  for (const cls of LAUNCHER_CLASS_ORDER) {
    const group = LAUNCHER_CLASS_GROUPS[cls];
    const candidates = Object.values(launchers).filter((s) => s.launcherGroup === group);
    const techI = candidates.find((s) => s.name.endsWith(" I") && !s.name.includes(" II"));
    const chosen = techI ?? candidates[0];
    if (chosen) result[cls] = chosen.id;
  }
  return result as Readonly<Record<LauncherClass, TypeId>>;
}

function assertLauncherClasses(
  launchers: Readonly<Record<string, LauncherStats>>,
  groupToClass: ReadonlyMap<number, LauncherClass>,
  representatives: Readonly<Record<LauncherClass, TypeId>>,
): void {
  for (const cls of LAUNCHER_CLASS_ORDER) {
    if (!representatives[cls]) throw new Error(`No launcher found for class ${cls} (group ${LAUNCHER_CLASS_GROUPS[cls]})`);
  }
  for (const stats of Object.values(launchers)) {
    if (!groupToClass.has(stats.launcherGroup)) throw new Error(`Unmapped launcher group ${stats.launcherGroup} for ${stats.name}`);
  }
}

export { LAUNCHER_CLASS_GROUPS as _launcherClassGroups, LAUNCHER_CLASS_TIERS as _launcherClassTiers, LAUNCHER_CLASS_ORDER as _launcherClassOrder };
