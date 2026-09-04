import type { GunFamily, GunFamilies } from "../../fitting";
import type { SigResolutionClass } from "../../sim";
import type { DimensionKeyer } from "./dimensionKeyer";
import type { StoredSelection } from "./selectionSession";

export interface TurretDimension {
  readonly family: GunFamily;
  readonly sigRes: SigResolutionClass;
}

export class TurretDimensionKeyerImpl implements DimensionKeyer<TurretDimension> {
  private readonly gunFamilies: GunFamilies;

  constructor(gunFamilies: GunFamilies) {
    this.gunFamilies = gunFamilies;
  }

  key(dimension: TurretDimension): string {
    return `turret:${dimension.family}:${dimension.sigRes}`;
  }

  fallback(dimension: TurretDimension): StoredSelection {
    return { moduleId: this.gunFamilies.representativeOf(dimension.family, dimension.sigRes) };
  }
}
