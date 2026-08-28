import type { CargoCharge, ChargeCatalog, FittingImport, ImportedFitting, ImportedTurret } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { StatConditions } from "../../../ships";

interface TurretStateResolverDeps {
  readonly chargeCatalog: ChargeCatalog;
  readonly fittingImport: FittingImport;
}

export interface TurretResolution {
  readonly turret: ImportedTurret | undefined;
  readonly cargoCharges: readonly CargoCharge[];
  readonly ammo: TypeId;
}

export class TurretStateResolver {
  private readonly chargeCatalog: ChargeCatalog;
  private readonly fittingImport: FittingImport;

  constructor(deps: TurretStateResolverDeps) {
    this.chargeCatalog = deps.chargeCatalog;
    this.fittingImport = deps.fittingImport;
  }

  resolveFromImported(imported: ImportedFitting): TurretResolution {
    const turret = imported.turret;
    if (turret) {
      return { turret, cargoCharges: imported.cargoCharges, ammo: turret.chargeId };
    }
    return { turret: undefined, cargoCharges: [], ammo: this.chargeCatalog.usualForChargeSize(1) };
  }

  resolveFromFitting(fitting: string, conditions: StatConditions, ammo?: string): TurretResolution {
    const imported = this.fittingImport.importFitting(fitting, conditions);
    if (!imported?.turret) {
      return { turret: undefined, cargoCharges: [], ammo: this.chargeCatalog.usualForChargeSize(1) };
    }
    const options = this.chargeCatalog.chargesForTurret(imported.turret);
    const option = ammo ? options.find((c) => c.name === ammo || String(c.id) === ammo) : undefined;
    const currentAmmo = option ? option.id : imported.turret.chargeId;
    const restored = this.chargeCatalog.withCharge(imported.turret, currentAmmo);
    return { turret: restored, cargoCharges: imported.cargoCharges, ammo: restored.chargeId };
  }
}
