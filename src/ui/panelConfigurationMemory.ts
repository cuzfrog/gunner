import type { TypeId } from "../gamedata/ids";
import type { SigResolutionClass } from "../sim";
import type { PropulsionKind } from "../ships";
import type { LauncherClass } from "../fitting";

export interface WeaponSelection {
  readonly moduleId: TypeId;
  readonly ammoId: TypeId;
}

export interface PanelConfigurationMemory {
  recallTurret(family: string, sigRes: SigResolutionClass): WeaponSelection | undefined;
  rememberTurret(family: string, sigRes: SigResolutionClass, selection: WeaponSelection): void;
  recallLauncher(launcherClass: LauncherClass): WeaponSelection | undefined;
  rememberLauncher(launcherClass: LauncherClass, selection: WeaponSelection): void;
  recallPropulsion(kind: PropulsionKind): TypeId | undefined;
  rememberPropulsion(kind: PropulsionKind, moduleId: TypeId): void;
  clear(): void;
}

export class PanelConfigurationMemoryImpl implements PanelConfigurationMemory {
  private readonly turretByFamilySigRes = new Map<string, WeaponSelection>();
  private readonly launcherByClass = new Map<LauncherClass, WeaponSelection>();
  private readonly propulsionByKind = new Map<PropulsionKind, TypeId>();

  recallTurret(family: string, sigRes: SigResolutionClass): WeaponSelection | undefined {
    return this.turretByFamilySigRes.get(turretKey(family, sigRes));
  }

  rememberTurret(family: string, sigRes: SigResolutionClass, selection: WeaponSelection): void {
    this.turretByFamilySigRes.set(turretKey(family, sigRes), selection);
  }

  recallLauncher(launcherClass: LauncherClass): WeaponSelection | undefined {
    return this.launcherByClass.get(launcherClass);
  }

  rememberLauncher(launcherClass: LauncherClass, selection: WeaponSelection): void {
    this.launcherByClass.set(launcherClass, selection);
  }

  recallPropulsion(kind: PropulsionKind): TypeId | undefined {
    return this.propulsionByKind.get(kind);
  }

  rememberPropulsion(kind: PropulsionKind, moduleId: TypeId): void {
    this.propulsionByKind.set(kind, moduleId);
  }

  clear(): void {
    this.turretByFamilySigRes.clear();
    this.launcherByClass.clear();
    this.propulsionByKind.clear();
  }
}

function turretKey(family: string, sigRes: SigResolutionClass): string {
  return `${family}:${sigRes}`;
}
