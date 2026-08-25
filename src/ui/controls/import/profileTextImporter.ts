import { type ProfileTextCodec, type ProfileSettings } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import type { Side } from "../side";
import type { ShipATurret } from "./shipATurret";

interface ProfileTextImporterDeps {
  readonly fittingImport: FittingImport;
  readonly turrets: Record<Side, ShipATurret>;
  readonly profileTextCodec: ProfileTextCodec;
}

export class ProfileTextImporter {
  private readonly fittingImport: FittingImport;
  private readonly turrets: Record<Side, ShipATurret>;
  private readonly profileTextCodec: ProfileTextCodec;

  constructor(deps: ProfileTextImporterDeps) {
    this.fittingImport = deps.fittingImport;
    this.turrets = deps.turrets;
    this.profileTextCodec = deps.profileTextCodec;
  }

  isProfileText(text: string): boolean {
    return this.profileTextCodec.hasHeader(text);
  }

  profileFromText(text: string): ProfileSettings | undefined {
    const parsed = this.profileTextCodec.parse(text.trimStart());
    if (!parsed) return undefined;
    const shipAAmmo = this.resolveProfileAmmo(parsed, "shipA");
    const shipBAmmo = this.resolveProfileAmmo(parsed, "shipB");
    return { ...parsed, shipAAmmo, shipBAmmo };
  }

  fittingFromProfileText(side: Side, text: string): string | undefined {
    const parsed = this.profileTextCodec.parse(text.trimStart());
    if (!parsed) return undefined;
    return side === "shipA" ? parsed.shipAFitting : parsed.shipBFitting;
  }

  private resolveProfileAmmo(parsed: ProfileSettings, side: Side): string {
    const ammoKey = side === "shipA" ? "shipAAmmo" : "shipBAmmo";
    const existing = parsed[ammoKey];
    if (existing) return existing;
    const fittingKey = side === "shipA" ? "shipAFitting" : "shipBFitting";
    const fitting = parsed[fittingKey];
    if (fitting) {
      const skillLevelKey = side === "shipA" ? "shipASkillLevel" : "shipBSkillLevel";
      const overloadKey = side === "shipA" ? "shipAOverload" : "shipBOverload";
      const imported = this.fittingImport.importFitting(fitting, {
        skillLevel: parsed[skillLevelKey] ?? 5,
        overloaded: parsed[overloadKey] ?? true,
      });
      if (imported?.turret) return imported.turret.charge;
    }
    return this.turrets[side].ammo();
  }
}
