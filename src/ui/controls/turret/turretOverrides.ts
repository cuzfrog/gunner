import type { ProfileParamOverrides } from "../../../appstate";

const TURRET_OVERRIDE_KEYS = ["tracking", "sigRes", "optimal", "falloff"] as const;
type TurretOverrideKey = (typeof TURRET_OVERRIDE_KEYS)[number];

export interface TurretOverrides {
  get(): Partial<ProfileParamOverrides>;
  set(patch: Partial<ProfileParamOverrides>): void;
  clearTurret(): void;
  clear(): void;
}

export class TurretOverridesStore implements TurretOverrides {
  private overrides: Partial<ProfileParamOverrides> = {};

  get(): Partial<ProfileParamOverrides> { return { ...this.overrides }; }
  set(patch: Partial<ProfileParamOverrides>): void { this.overrides = { ...this.overrides, ...patch }; }
  clearTurret(): void {
    for (const key of TURRET_OVERRIDE_KEYS) delete this.overrides[key];
  }
  clear(): void { this.overrides = {}; }
}
