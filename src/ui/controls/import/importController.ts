import { ClipboardUnavailableError, parseProfile, type ClipboardProvider, type SavedFittings, type UserSettings } from "../../../appstate";
import type { FittingImport, ImportedFitting } from "../../../fitting";
import { NEUTRAL_STAT_CONDITIONS } from "../controlsFormat";
import type { Popup, PopupGroup } from "../popup";
import type { Side, SidePanel } from "../sidePanel";
import type { AttackerTurret } from "./attackerTurret";
import type { PreferencesController } from "../preferencesController";
import type { ProfileController } from "../profileController";
import { EftSideImporter } from "./eftSideImporter";
import { ProfileTextImporter } from "./profileTextImporter";
import type { ImportController, ImportEls } from "./importControllerContract";

export type { ImportController, ImportEls } from "./importControllerContract";

export class ImportControllerImpl implements ImportController {
  private readonly clipboard: ClipboardProvider;
  private readonly fittingImport: FittingImport;
  private readonly savedFittings: SavedFittings;
  private readonly popupGroup: PopupGroup;
  private readonly els: ImportEls;
  private readonly sidePanel: (side: Side) => SidePanel;
  private readonly preferences: PreferencesController;
  private readonly profileController: ProfileController;
  private readonly getSettings: () => UserSettings;
  private readonly onConfigPersisted: () => void;
  private readonly onProfileTextLoaded: (settings: UserSettings) => void;
  private readonly eftSideImporter: EftSideImporter;
  private readonly profileTextImporter: ProfileTextImporter;
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
    turret: AttackerTurret;
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
    this.preferences = deps.preferences;
    this.profileController = deps.profileController;
    this.getSettings = deps.getSettings;
    this.onConfigPersisted = deps.onConfigPersisted;
    this.onProfileTextLoaded = deps.onProfileTextLoaded;
    this.eftSideImporter = new EftSideImporter({
      sidePanel: deps.sidePanel,
      turret: deps.turret,
      fittingImport: deps.fittingImport,
      onConfigPersisted: deps.onConfigPersisted,
    });
    this.profileTextImporter = new ProfileTextImporter({
      fittingImport: deps.fittingImport,
      turret: deps.turret,
      preferences: deps.preferences,
      clipboard: deps.clipboard,
      getSettings: deps.getSettings,
      profileController: deps.profileController,
    });
    this.popupValue = {
      isOpen: () => this.importSidePopupOpen,
      open: () => this.openImportSidePopup(),
      close: () => this.closeImportSidePopup(),
      focusTrigger: () => this.els.importProfile.focus(),
      contains: (target) => target instanceof Element && target.closest("#import-side-popup, #import-profile") !== null,
    };
  }

  get popup(): Popup { return this.popupValue; }

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
    if (this.profileTextImporter.isProfileText(trimmed)) {
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
    if (this.profileTextImporter.isProfileText(trimmed)) {
      const settings = this.profileTextImporter.profileFromText(text);
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
    return this.eftSideImporter.importEftFitting(side, text, persist);
  }

  copyProfile(): Promise<void> {
    return this.profileTextImporter.copyProfile();
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
}
