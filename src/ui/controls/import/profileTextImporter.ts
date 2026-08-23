import { parseProfile, PROFILE_TEXT_HEADER, type ProfileSettings, type UserSettings } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import type { PreferencesController } from "../preferencesController";
import type { AttackerTurret } from "./attackerTurret";

interface ProfileTextImporterDeps {
  readonly fittingImport: FittingImport;
  readonly turret: AttackerTurret;
  readonly preferences: PreferencesController;
}

export class ProfileTextImporter {
  private readonly fittingImport: FittingImport;
  private readonly turret: AttackerTurret;
  private readonly preferences: PreferencesController;

  constructor(deps: ProfileTextImporterDeps) {
    this.fittingImport = deps.fittingImport;
    this.turret = deps.turret;
    this.preferences = deps.preferences;
  }

  isProfileText(text: string): boolean {
    return text.trimStart().startsWith(PROFILE_TEXT_HEADER);
  }

  profileFromText(text: string): UserSettings | undefined {
    const parsed = parseProfile(text.trimStart());
    if (!parsed) return undefined;
    const ammo = this.resolveProfileAmmo(parsed);
    return { ...parsed, attackerAmmo: ammo, ...this.preferences.capture() };
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
