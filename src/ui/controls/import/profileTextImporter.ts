import { type ProfileTextCodec, type ProfileSettings } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import type { Side } from "../side";
import type { ShipATurret } from "./shipATurret";

interface ProfileTextImporterDeps {
  readonly fittingImport: FittingImport;
  readonly turret: ShipATurret;
  readonly profileTextCodec: ProfileTextCodec;
}

export class ProfileTextImporter {
  private readonly fittingImport: FittingImport;
  private readonly turret: ShipATurret;
  private readonly profileTextCodec: ProfileTextCodec;

  constructor(deps: ProfileTextImporterDeps) {
    this.fittingImport = deps.fittingImport;
    this.turret = deps.turret;
    this.profileTextCodec = deps.profileTextCodec;
  }

  isProfileText(text: string): boolean {
    return this.profileTextCodec.hasHeader(text);
  }

  profileFromText(text: string): ProfileSettings | undefined {
    const parsed = this.profileTextCodec.parse(text.trimStart());
    if (!parsed) return undefined;
    const ammo = this.resolveProfileAmmo(parsed);
    return { ...parsed, shipAAmmo: ammo };
  }

  fittingFromProfileText(side: Side, text: string): string | undefined {
    const parsed = this.profileTextCodec.parse(text.trimStart());
    if (!parsed) return undefined;
    return side === "shipA" ? parsed.shipAFitting : parsed.shipBFitting;
  }

  private resolveProfileAmmo(parsed: ProfileSettings): string {
    if (parsed.shipAAmmo) return parsed.shipAAmmo;
    if (parsed.shipAFitting) {
      const imported = this.fittingImport.importFitting(parsed.shipAFitting, {
        skillLevel: parsed.shipASkillLevel ?? 5,
        overloaded: parsed.shipAOverload ?? true,
      });
      if (imported?.turret) return imported.turret.charge;
    }
    return this.turret.ammo();
  }
}
