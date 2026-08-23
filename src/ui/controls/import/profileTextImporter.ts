import {
  parseProfile,
  PROFILE_TEXT_HEADER,
  serializeProfile,
  type ClipboardProvider,
  type ProfileSettings,
  type UserSettings,
} from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import { profileSettingsOf } from "../controlsFormat";
import type { PreferencesController } from "../preferencesController";
import type { ProfileController } from "../profileController";
import type { AttackerTurret } from "./attackerTurret";

interface ProfileTextImporterDeps {
  readonly fittingImport: FittingImport;
  readonly turret: AttackerTurret;
  readonly preferences: PreferencesController;
  readonly clipboard: ClipboardProvider;
  readonly getSettings: () => UserSettings;
  readonly profileController: ProfileController;
}

export class ProfileTextImporter {
  private readonly fittingImport: FittingImport;
  private readonly turret: AttackerTurret;
  private readonly preferences: PreferencesController;
  private readonly clipboard: ClipboardProvider;
  private readonly getSettings: () => UserSettings;
  private readonly profileController: ProfileController;

  constructor(deps: ProfileTextImporterDeps) {
    this.fittingImport = deps.fittingImport;
    this.turret = deps.turret;
    this.preferences = deps.preferences;
    this.clipboard = deps.clipboard;
    this.getSettings = deps.getSettings;
    this.profileController = deps.profileController;
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

  async copyProfile(): Promise<void> {
    try {
      await this.clipboard.writeText(serializeProfile(profileSettingsOf(this.getSettings())));
      this.profileController.showStatus("status.copied");
    } catch {
      this.profileController.showStatus("status.failed");
    }
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
