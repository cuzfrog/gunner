import { ClipboardUnavailableError, type ClipboardProvider, type ProfileTextCodec, type SavedFittings, type UserSettings } from "../../../appstate";
import type { FittingImport, ImportedFitting } from "../../../fitting";
import { NEUTRAL_STAT_CONDITIONS } from "../controlsFormat";
import type { UiEvents } from "../../events";
import type { Popup, PopupGroup } from "../popup";
import type { PreferencesController } from "../preferencesController";
import type { ProfileController } from "../profileController";
import type { Side } from "..";
import type { SidePanel } from "../sidePanel";
import type { AttackerTurret } from "./attackerTurret";
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
  private readonly attackerSide: SidePanel;
  private readonly targetSide: SidePanel;
  private readonly preferences: PreferencesController;
  private readonly profileController: ProfileController;
  private readonly profileTextCodec: ProfileTextCodec;
  private readonly turret: AttackerTurret;
  private readonly eftSideImporter: EftSideImporter;
  private readonly profileTextImporter: ProfileTextImporter;
  private readonly events: UiEvents;
  private readonly popupValue: Popup;
  private pendingImportText?: string;
  private importSidePopupOpen = false;

  constructor(deps: {
    clipboard: ClipboardProvider;
    fittingImport: FittingImport;
    savedFittings: SavedFittings;
    popupGroup: PopupGroup;
    els: ImportEls;
    attackerSide: SidePanel;
    targetSide: SidePanel;
    turret: AttackerTurret;
    preferences: PreferencesController;
    profileController: ProfileController;
    profileTextCodec: ProfileTextCodec;
    events: UiEvents;
  }) {
    this.clipboard = deps.clipboard;
    this.fittingImport = deps.fittingImport;
    this.savedFittings = deps.savedFittings;
    this.popupGroup = deps.popupGroup;
    this.els = deps.els;
    this.attackerSide = deps.attackerSide;
    this.targetSide = deps.targetSide;
    this.turret = deps.turret;
    this.preferences = deps.preferences;
    this.profileController = deps.profileController;
    this.profileTextCodec = deps.profileTextCodec;
    this.events = deps.events;
    this.eftSideImporter = new EftSideImporter({
      attackerSide: deps.attackerSide,
      targetSide: deps.targetSide,
      turret: deps.turret,
      fittingImport: deps.fittingImport,
    });
    this.profileTextImporter = new ProfileTextImporter({
      fittingImport: deps.fittingImport,
      turret: deps.turret,
      preferences: deps.preferences,
      profileTextCodec: deps.profileTextCodec,
    });
    this.els.importProfile.addEventListener("click", () => void this.importProfileClicked());
    this.els.importSideAttacker.addEventListener("click", () => void this.onImportSideClick("attacker"));
    this.els.importSideTarget.addEventListener("click", () => void this.onImportSideClick("target"));
    this.popupValue = {
      isOpen: () => this.importSidePopupOpen,
      open: () => this.openImportSidePopup(),
      close: () => this.closeImportSidePopup(),
      focusTrigger: () => this.els.importProfile.focus(),
      contains: (target) => target instanceof Element && target.closest("#import-side-popup, #import-profile") !== null,
    };
  }

  get popup(): Popup { return this.popupValue; }

  private panel(side: Side): SidePanel {
    return side === "attacker" ? this.attackerSide : this.targetSide;
  }

  async importFromClipboard(side: Side): Promise<void> {
    const panel = this.panel(side);
    const pastePopup = panel.getPastePopup();
    if (pastePopup.isOpen()) {
      this.popupGroup.close(pastePopup);
      return;
    }
    this.popupGroup.close(this.attackerSide.getPastePopup());
    this.popupGroup.close(this.targetSide.getPastePopup());
    let text: string;
    try {
      text = await this.clipboard.readText();
    } catch (error) {
      if (error instanceof ClipboardUnavailableError) {
        this.popupGroup.open(pastePopup);
        return;
      }
      panel.sections.paste.clearImportHintTimeout();
      panel.sections.paste.showImportHint("status.clipboardDenied", true);
      return;
    }
    await this.importFromText(side, text);
  }

  async importFromText(side: Side, text: string): Promise<void> {
    const panel = this.panel(side);
    panel.sections.paste.clearImportHintTimeout();
    const trimmed = text.trimStart();
    if (this.profileTextImporter.isProfileText(trimmed)) {
      const fitting = this.profileTextImporter.fittingFromProfileText(side, trimmed);
      if (fitting === undefined) {
        panel.sections.paste.showImportHint("status.fittingInvalid", true);
        return;
      }
      const imported = this.importEftFitting(side, fitting);
      if (imported) this.recordSavedFitting(imported, panel.fittingText ?? fitting);
      return;
    }
    const imported = this.importEftFitting(side, text);
    if (imported) this.recordSavedFitting(imported, panel.fittingText ?? text);
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
      this.events.emitProfileTextLoaded(settings);
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
    const imported = this.eftSideImporter.importEftFitting(side, text, persist);
    if (!imported) return undefined;
    this.events.emitFittingImported(side, imported);
    if (persist) this.events.emitConfigInvalidated(true);
    return imported;
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
