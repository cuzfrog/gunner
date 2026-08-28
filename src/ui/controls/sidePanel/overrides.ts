import type { ProfileParamOverrides } from "../../../appstate";
import type { TurretOverrides } from "../turret";
import type { Side } from "../side";

export interface PanelOverrides {
  isOverridden(key: keyof ProfileParamOverrides): boolean;
  record<K extends keyof ProfileParamOverrides>(key: K, value: ProfileParamOverrides[K]): void;
  clear(): void;
  get(): Partial<ProfileParamOverrides>;
  set(overrides: Partial<ProfileParamOverrides>): void;
}

export function createPanelOverrides(side: Side, turretOverridesBySide: Record<Side, TurretOverrides>): PanelOverrides {
  return new SidePanelOverrides(turretOverridesBySide[side]);
}

class SidePanelOverrides implements PanelOverrides {
  constructor(private readonly turretOverrides: TurretOverrides) {}

  isOverridden(key: keyof ProfileParamOverrides): boolean {
    return this.turretOverrides.get()[key] !== undefined;
  }

  record<K extends keyof ProfileParamOverrides>(key: K, value: ProfileParamOverrides[K]): void {
    this.turretOverrides.set({ [key]: value });
  }

  clear(): void {
    this.turretOverrides.clear();
  }

  get(): Partial<ProfileParamOverrides> {
    return this.turretOverrides.get();
  }

  set(overrides: Partial<ProfileParamOverrides>): void {
    this.turretOverrides.set(overrides);
  }
}
