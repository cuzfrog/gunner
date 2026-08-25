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

export function createPanelOverrides(side: Side, turretOverrides: TurretOverrides): PanelOverrides {
  if (side === "shipA") return new ShipAPanelOverrides(turretOverrides);
  return new ShipBPanelOverrides();
}

class ShipAPanelOverrides implements PanelOverrides {
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
    return {};
  }

  set(_overrides: Partial<ProfileParamOverrides>): void {
    // ShipA side panel state never owns the turret override store;
    // the store is restored separately by the session codec.
  }
}

class ShipBPanelOverrides implements PanelOverrides {
  private overrides: Partial<ProfileParamOverrides> = {};

  isOverridden(key: keyof ProfileParamOverrides): boolean {
    return this.overrides[key] !== undefined;
  }

  record<K extends keyof ProfileParamOverrides>(key: K, value: ProfileParamOverrides[K]): void {
    this.overrides = { ...this.overrides, [key]: value };
  }

  clear(): void {
    this.overrides = {};
  }

  get(): Partial<ProfileParamOverrides> {
    return { ...this.overrides };
  }

  set(overrides: Partial<ProfileParamOverrides>): void {
    this.overrides = { ...overrides };
  }
}
