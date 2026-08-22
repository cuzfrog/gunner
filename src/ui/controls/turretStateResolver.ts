import type { CargoCharge, ChargeCatalog, FittingImport, ImportedFitting, ImportedTurret } from "../../fitting";
import type { StatConditions } from "../../ships";

interface TurretStateResolverDeps {
  readonly chargeCatalog: ChargeCatalog;
  readonly fittingImport: FittingImport;
}

export interface TurretResolution {
  readonly turret: ImportedTurret | undefined;
  readonly cargoCharges: readonly CargoCharge[];
  readonly ammo: string;
}

export class TurretStateResolver {
  private readonly chargeCatalog: ChargeCatalog;
  private readonly fittingImport: FittingImport;

  constructor(deps: TurretStateResolverDeps) {
    this.chargeCatalog = deps.chargeCatalog;
    this.fittingImport = deps.fittingImport;
  }

  resolveFromImported(imported: ImportedFitting, _currentAmmo?: string): TurretResolution {
    const turret = imported.turret;
    if (turret) {
      return { turret, cargoCharges: imported.cargoCharges, ammo: turret.charge };
    }
    return { turret: undefined, cargoCharges: [], ammo: this.chargeCatalog.usualForChargeSize(1) };
  }

  resolveFromFitting(fitting: string, conditions: StatConditions, ammo?: string): TurretResolution {
    const imported = this.fittingImport.importFitting(fitting, conditions);
    if (!imported?.turret) {
      return { turret: undefined, cargoCharges: [], ammo: this.chargeCatalog.usualForChargeSize(1) };
    }
    const currentAmmo = ammo ?? imported.turret.charge;
    const restored = this.chargeCatalog.withCharge(imported.turret, currentAmmo);
    return { turret: restored, cargoCharges: imported.cargoCharges, ammo: restored.charge };
  }
}
