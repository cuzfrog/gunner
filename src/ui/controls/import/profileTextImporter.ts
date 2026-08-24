import { type ProfileTextCodec, type ProfileSettings, type UserSettings } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import type { PreferencesController } from "../preferencesController";
import type { Side } from "../sidePanel";
import type { AttackerTurret } from "./attackerTurret";

interface ProfileTextImporterDeps {
  readonly fittingImport: FittingImport;
  readonly turret: AttackerTurret;
  readonly preferences: PreferencesController;
  readonly profileTextCodec: ProfileTextCodec;
}

export class ProfileTextImporter {
  private readonly fittingImport: FittingImport;
  private readonly turret: AttackerTurret;
  private readonly preferences: PreferencesController;
  private readonly profileTextCodec: ProfileTextCodec;

  constructor(deps: ProfileTextImporterDeps) {
    this.fittingImport = deps.fittingImport;
    this.turret = deps.turret;
    this.preferences = deps.preferences;
    this.profileTextCodec = deps.profileTextCodec;
  }

  isProfileText(text: string): boolean {
    return this.profileTextCodec.hasHeader(text);
  }

  profileFromText(text: string): UserSettings | undefined {
    const parsed = this.profileTextCodec.parse(text.trimStart());
    if (!parsed) return undefined;
    const ammo = this.resolveProfileAmmo(parsed);
    return { ...parsed, attackerAmmo: ammo, ...this.preferences.capture() };
  }

  fittingFromProfileText(side: Side, text: string): string | undefined {
    const parsed = this.profileTextCodec.parse(text.trimStart());
    if (!parsed) return undefined;
    return side === "attacker" ? parsed.attackerFitting : parsed.targetFitting;
  }

  private resolveProfileAmmo(parsed: ProfileSettings): string {
    if (parsed.attackerAmmo) return parsed.attackerAmmo;
    if (parsed.attackerFitting) {
      const imported = this.fittingImport.importFitting(parsed.attackerFitting, {
        skillLevel: parsed.attackerSkillLevel ?? 5,
        overloaded: parsed.attackerOverload ?? true,
      });
      if (imported?.turret) return imported.turret.charge;
    }
    return this.turret.ammo();
  }
}
