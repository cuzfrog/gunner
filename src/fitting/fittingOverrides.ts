import type { TypeId } from "../gamedata/ids";
import type { FittingState, TurretGroup, LauncherGroup, FittedModule } from "./fittingState";

export interface FittingOverrides {
  readonly turretModuleReplacements: ReadonlyMap<TypeId, TypeId>;
  readonly turretChargeReplacements: ReadonlyMap<TypeId, TypeId>;
  readonly launcherModuleReplacements: ReadonlyMap<TypeId, TypeId>;
  readonly launcherChargeReplacements: ReadonlyMap<TypeId, TypeId>;
  readonly propulsionModuleReplacement?: TypeId;
}

export interface FittingOverridesStore {
  setTurretModule(originalModuleId: TypeId, replacementModuleId: TypeId): void;
  setTurretCharge(turretModuleId: TypeId, chargeId: TypeId): void;
  setLauncherModule(originalModuleId: TypeId, replacementModuleId: TypeId): void;
  setLauncherCharge(launcherModuleId: TypeId, chargeId: TypeId): void;
  setPropulsionModule(moduleId: TypeId): void;
  clearTurret(): void;
  clearLauncher(): void;
  clearPropulsion(): void;
  clear(): void;
  get(): FittingOverrides;
}

export class FittingOverridesStoreImpl implements FittingOverridesStore {
  private readonly turretModuleReplacements = new Map<TypeId, TypeId>();
  private readonly turretChargeReplacements = new Map<TypeId, TypeId>();
  private readonly launcherModuleReplacements = new Map<TypeId, TypeId>();
  private readonly launcherChargeReplacements = new Map<TypeId, TypeId>();
  private propulsionModuleReplacement: TypeId | undefined;

  setTurretModule(originalModuleId: TypeId, replacementModuleId: TypeId): void {
    this.turretModuleReplacements.set(originalModuleId, replacementModuleId);
  }

  setTurretCharge(turretModuleId: TypeId, chargeId: TypeId): void {
    this.turretChargeReplacements.set(turretModuleId, chargeId);
  }

  setLauncherModule(originalModuleId: TypeId, replacementModuleId: TypeId): void {
    this.launcherModuleReplacements.set(originalModuleId, replacementModuleId);
  }

  setLauncherCharge(launcherModuleId: TypeId, chargeId: TypeId): void {
    this.launcherChargeReplacements.set(launcherModuleId, chargeId);
  }

  setPropulsionModule(moduleId: TypeId): void {
    this.propulsionModuleReplacement = moduleId;
  }

  clearTurret(): void {
    this.turretModuleReplacements.clear();
    this.turretChargeReplacements.clear();
  }

  clearLauncher(): void {
    this.launcherModuleReplacements.clear();
    this.launcherChargeReplacements.clear();
  }

  clearPropulsion(): void {
    this.propulsionModuleReplacement = undefined;
  }

  clear(): void {
    this.clearTurret();
    this.clearLauncher();
    this.clearPropulsion();
  }

  get(): FittingOverrides {
    return {
      turretModuleReplacements: this.turretModuleReplacements,
      turretChargeReplacements: this.turretChargeReplacements,
      launcherModuleReplacements: this.launcherModuleReplacements,
      launcherChargeReplacements: this.launcherChargeReplacements,
      propulsionModuleReplacement: this.propulsionModuleReplacement,
    };
  }
}

export function applyFittingOverrides(state: FittingState, overrides: FittingOverrides): FittingState {
  const hasTurretOverrides = overrides.turretModuleReplacements.size > 0 || overrides.turretChargeReplacements.size > 0;
  const hasLauncherOverrides = overrides.launcherModuleReplacements.size > 0 || overrides.launcherChargeReplacements.size > 0;
  const hasPropulsionOverride = overrides.propulsionModuleReplacement !== undefined;
  if (!hasTurretOverrides && !hasLauncherOverrides && !hasPropulsionOverride) return state;

  const turretGroups = hasTurretOverrides ? applyTurretOverrides(state.turretGroups, overrides) : state.turretGroups;
  const launcherGroups = hasLauncherOverrides ? applyLauncherOverrides(state.launcherGroups, overrides) : state.launcherGroups;
  const propulsionModule = hasPropulsionOverride ? { moduleId: overrides.propulsionModuleReplacement!, chargeId: undefined, offline: false } satisfies FittedModule : state.propulsionModule;

  return { ...state, turretGroups, launcherGroups, propulsionModule };
}

function applyTurretOverrides(groups: readonly TurretGroup[], overrides: FittingOverrides): readonly TurretGroup[] {
  const result: TurretGroup[] = [];
  const merged = new Map<TypeId, { chargeId?: TypeId; count: number; order: number }>();
  let order = 0;

  for (const group of groups) {
    const replacedModule = overrides.turretModuleReplacements.get(group.moduleId) ?? group.moduleId;
    const replacedCharge = overrides.turretChargeReplacements.get(replacedModule) ?? group.chargeId;
    const existing = merged.get(replacedModule);
    if (existing) {
      existing.count += group.count;
      if (existing.chargeId === undefined && replacedCharge !== undefined) existing.chargeId = replacedCharge;
    } else {
      merged.set(replacedModule, { chargeId: replacedCharge, count: group.count, order: order++ });
    }
  }

  for (const [moduleId, entry] of merged) {
    result.push({ moduleId, chargeId: entry.chargeId, count: entry.count });
  }
  return result.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return merged.get(a.moduleId)!.order - merged.get(b.moduleId)!.order;
  });
}

function applyLauncherOverrides(groups: readonly LauncherGroup[], overrides: FittingOverrides): readonly LauncherGroup[] {
  const result: LauncherGroup[] = [];
  const merged = new Map<TypeId, { chargeId?: TypeId; count: number; order: number }>();
  let order = 0;

  for (const group of groups) {
    const replacedModule = overrides.launcherModuleReplacements.get(group.moduleId) ?? group.moduleId;
    const replacedCharge = overrides.launcherChargeReplacements.get(replacedModule) ?? group.chargeId;
    const existing = merged.get(replacedModule);
    if (existing) {
      existing.count += group.count;
      if (existing.chargeId === undefined && replacedCharge !== undefined) existing.chargeId = replacedCharge;
    } else {
      merged.set(replacedModule, { chargeId: replacedCharge, count: group.count, order: order++ });
    }
  }

  for (const [moduleId, entry] of merged) {
    result.push({ moduleId, chargeId: entry.chargeId, count: entry.count });
  }
  return result.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return merged.get(a.moduleId)!.order - merged.get(b.moduleId)!.order;
  });
}
