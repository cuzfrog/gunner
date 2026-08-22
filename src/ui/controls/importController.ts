import {
  ClipboardUnavailableError,
  type ClipboardProvider,
  type FittedHullSummary,
  type ProfileSettings,
  type UserSettings,
} from "../settings";
import { type FittingImport, type ImportedFitting } from "../../fitting";
import { type SavedFittings } from "../savedFittings";
import { parseProfile, PROFILE_TEXT_HEADER, serializeProfile } from "../profileText";
import { NEUTRAL_STAT_CONDITIONS, profileSettingsOf } from "../controlsFormat";
import { PopupGroup, type Popup } from "../popupGroup";
import { type Side, type SidePanel } from "../sidePanel";
import type { TurretController } from "./turretController";
import type { PreferencesController } from "./preferencesController";
import type { ProfileController } from "./profileController";

export interface ImportEls {
  readonly importProfile: HTMLButtonElement;
  readonly importSidePopup: HTMLElement;
  readonly importSideAttacker: HTMLButtonElement;
  readonly importSideTarget: HTMLButtonElement;
}

export class ImportController {
  private readonly clipboard: ClipboardProvider;
  private readonly fittingImport: FittingImport;
  private readonly savedFittings: SavedFittings;
  private readonly popupGroup: PopupGroup;
  private readonly els: ImportEls;
  private readonly sidePanel: (side: Side) => SidePanel;
  private readonly turret: TurretController;
  private readonly preferences: PreferencesController;
  private readonly profileController: ProfileController;
  private readonly getSettings: () => UserSettings;
  private readonly onConfigPersisted: () => void;
  private readonly onProfileTextLoaded: (settings: UserSettings) => void;
  private readonly popupValue: Popup;
  private pendingImportText?: string;
  private importSidePopupOpen = false;

  constructor(deps: {
    clipboard: ClipboardProvider;
    fittingImport: FittingImport;
    savedFittings: SavedFittings;
    popupGroup: PopupGroup;
    els: ImportEls;
    sidePanel: (side: Side) => SidePanel;
    turret: TurretController;
    preferences: PreferencesController;
    profileController: ProfileController;
    getSettings: () => UserSettings;
    onConfigPersisted: () => void;
    onProfileTextLoaded: (settings: UserSettings) => void;
  }) {
    this.clipboard = deps.clipboard;
    this.fittingImport = deps.fittingImport;
    this.savedFittings = deps.savedFittings;
    this.popupGroup = deps.popupGroup;
    this.els = deps.els;
    this.sidePanel = deps.sidePanel;
    this.turret = deps.turret;
    this.preferences = deps.preferences;
    this.profileController = deps.profileController;
    this.getSettings = deps.getSettings;
    this.onConfigPersisted = deps.onConfigPersisted;
    this.onProfileTextLoaded = deps.onProfileTextLoaded;
    this.popupValue = {
      isOpen: () => this.importSidePopupOpen,
      open: () => this.openImportSidePopup(),
      close: () => this.closeImportSidePopup(),
      focusTrigger: () => this.els.importProfile.focus(),
      contains: (target) => target instanceof Element && target.closest("#import-side-popup, #import-profile") !== null,
    };
  }

  get popup(): Popup {
    return this.popupValue;
  }

  async importFromClipboard(side: Side): Promise<void> {
    const panel = this.sidePanel(side);
    const pastePopup = panel.getPastePopup();
    if (pastePopup.isOpen()) {
      this.popupGroup.close(pastePopup);
      return;
    }
    this.popupGroup.close(this.sidePanel("attacker").getPastePopup());
    this.popupGroup.close(this.sidePanel("target").getPastePopup());
    let text: string;
    try {
      text = await this.clipboard.readText();
    } catch (error) {
      if (error instanceof ClipboardUnavailableError) {
        this.popupGroup.open(pastePopup);
        return;
      }
      panel.clearImportHintTimeout();
      panel.showImportHint("status.clipboardDenied", true);
      return;
    }
    await this.importFromText(side, text);
  }

  async importFromText(side: Side, text: string): Promise<void> {
    const panel = this.sidePanel(side);
    panel.clearImportHintTimeout();
    const trimmed = text.trimStart();
    if (trimmed.startsWith(PROFILE_TEXT_HEADER)) {
      const parsed = parseProfile(trimmed);
      const fitting = parsed === undefined ? undefined : side === "attacker" ? parsed.attackerFitting : parsed.targetFitting;
      if (fitting === undefined) {
        panel.showImportHint("status.fittingInvalid", true);
        return;
      }
      const imported = this.importEftFitting(side, fitting);
      if (imported) this.recordSavedFitting(imported, fitting);
      return;
    }
    const imported = this.importEftFitting(side, text);
    if (imported) this.recordSavedFitting(imported, text);
  }

  async importProfileClicked(): Promise<void> {
    if (this.importSidePopupOpen) {
      this.popupGroup.close(this.popupValue);
      this.popupValue.focusTrigger();
      return;
    }
    let text: string;
    try {
      text = await this.clipboard.readText();
    } catch {
      this.profileController.showStatus("status.clipboardDenied");
      return;
    }
    const trimmed = text.trimStart();
    if (trimmed.startsWith(PROFILE_TEXT_HEADER)) {
      const settings = this.profileFromText(text);
      if (!settings) {
        this.profileController.showStatus("status.importInvalid");
        return;
      }
      this.onProfileTextLoaded(settings);
      return;
    }
    if (this.fittingImport.importFitting(text, NEUTRAL_STAT_CONDITIONS) === undefined) {
      this.profileController.showStatus("status.importInvalid");
      return;
    }
    this.pendingImportText = text;
    this.popupGroup.open(this.popupValue);
  }

  async onImportSideClick(side: Side): Promise<void> {
    const text = this.pendingImportText;
    this.popupGroup.close(this.popupValue);
    if (text === undefined) return;
    await this.importFromText(side, text);
  }

  importEftFitting(side: Side, text: string, persist = true): ImportedFitting | undefined {
    const panel = this.sidePanel(side);
    const conditions = panel.skillConditions();
    const imported = this.fittingImport.importFitting(text, conditions);
    if (!imported) {
      panel.showImportHint("status.fittingInvalid", true);
      return undefined;
    }
    panel.clearFittedHull();
    panel.fittingText = text;
    panel.overrides = {};
    panel.loadHull(imported.profile.name, imported.propulsion?.propulsionId);
    panel.applyImportedFitting(fittedHullSummary(imported));
    if (side === "attacker") this.turret.applyImported(imported);
    if (persist) {
      panel.lastCommittedHull = imported.profile.name;
      this.onConfigPersisted();
    }
    panel.showImportHint("status.fittingImported");
    return imported;
  }

  async copyProfile(): Promise<void> {
    try {
      await this.clipboard.writeText(serializeProfile(profileSettingsOf(this.getSettings())));
      this.profileController.showStatus("status.copied");
    } catch {
      this.profileController.showStatus("status.failed");
    }
  }

  private openImportSidePopup(): void {
    this.els.importSidePopup.hidden = false;
    this.els.importProfile.setAttribute("aria-expanded", "true");
    this.importSidePopupOpen = true;
    this.els.importSideAttacker.focus();
  }

  private closeImportSidePopup(): void {
    this.els.importSidePopup.hidden = true;
    this.els.importProfile.setAttribute("aria-expanded", "false");
    this.pendingImportText = undefined;
    this.importSidePopupOpen = false;
  }

  private recordSavedFitting(imported: ImportedFitting, text: string): void {
    this.savedFittings.record({ hull: imported.profile.name, name: imported.fittingName, text });
  }

  private profileFromText(text: string): UserSettings | undefined {
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

function fittedHullSummary(imported: ImportedFitting): FittedHullSummary {
  return {
    fittingName: imported.fittingName,
    propulsionId: imported.propulsion?.propulsionId,
    propulsionName: imported.propulsion?.propulsionName,
    fitted: imported.fitted,
    propulsion: imported.propulsion,
  };
}
