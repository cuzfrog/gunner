import { ClipboardUnavailableError, type ClipboardProvider, type ProfileTextCodec, type SavedFittings } from "../../../appstate";
import type { FittingImport, ImportedFitting } from "../../../fitting";
import type { ItemNameLoader } from "../../../gamedata";
import { NEUTRAL_STAT_CONDITIONS } from "../controlsFormat";
import type { UiEvents } from "../../events";
import type { Popup, PopupGroup } from "../popup";
import type { ProfileController } from "../profile";
import type { Side } from "../side";
import type { SidePanel, WeaponSystemSwitch } from "../sidePanel";
import type { ShipATurret } from "./shipATurret";
import type { ShipALauncher } from "./shipALauncher";
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
  private readonly shipASide: SidePanel;
  private readonly shipBSide: SidePanel;
  private readonly profileController: ProfileController;
  private readonly profileTextCodec: ProfileTextCodec;
  private readonly turrets: Record<Side, ShipATurret>;
  private readonly launchers: Record<Side, ShipALauncher>;
  private readonly weaponSystemSwitches: Record<Side, WeaponSystemSwitch>;
  private readonly eftSideImporter: EftSideImporter;
  private readonly profileTextImporter: ProfileTextImporter;
  private readonly events: UiEvents;
  private readonly itemNameLoader: ItemNameLoader;
  private readonly popupValue: Popup;
  private pendingImportText?: string;
  private importSidePopupOpen = false;

  constructor(deps: {
    clipboard: ClipboardProvider;
    fittingImport: FittingImport;
    savedFittings: SavedFittings;
    popupGroup: PopupGroup;
    els: ImportEls;
    shipASide: SidePanel;
    shipBSide: SidePanel;
    turrets: Record<Side, ShipATurret>;
    launchers: Record<Side, ShipALauncher>;
    weaponSystemSwitches: Record<Side, WeaponSystemSwitch>;
    profileController: ProfileController;
    profileTextCodec: ProfileTextCodec;
    events: UiEvents;
    itemNameLoader: ItemNameLoader;
  }) {
    this.clipboard = deps.clipboard;
    this.fittingImport = deps.fittingImport;
    this.savedFittings = deps.savedFittings;
    this.popupGroup = deps.popupGroup;
    this.els = deps.els;
    this.shipASide = deps.shipASide;
    this.shipBSide = deps.shipBSide;
    this.turrets = deps.turrets;
    this.launchers = deps.launchers;
    this.weaponSystemSwitches = deps.weaponSystemSwitches;
    this.profileController = deps.profileController;
    this.profileTextCodec = deps.profileTextCodec;
    this.events = deps.events;
    this.itemNameLoader = deps.itemNameLoader;
    this.eftSideImporter = new EftSideImporter({
      shipASide: deps.shipASide,
      shipBSide: deps.shipBSide,
      turrets: deps.turrets,
      launchers: deps.launchers,
      weaponSystemSwitches: deps.weaponSystemSwitches,
      fittingImport: deps.fittingImport,
    });
    this.profileTextImporter = new ProfileTextImporter({
      fittingImport: deps.fittingImport,
      turrets: deps.turrets,
      profileTextCodec: deps.profileTextCodec,
    });
    this.els.importProfile.addEventListener("click", () => void this.importProfileClicked());
    this.els.importSideShipA.addEventListener("click", () => void this.onImportSideClick("shipA"));
    this.els.importSideShipB.addEventListener("click", () => void this.onImportSideClick("shipB"));
    this.popupValue = {
      isOpen: () => this.importSidePopupOpen,
      open: () => this.openImportSidePopup(),
      close: () => this.closeImportSidePopup(),
      focusTrigger: () => this.els.importProfile.focus(),
      contains: (domTarget) => domTarget instanceof Element && domTarget.closest("#import-side-popup, #import-profile") !== null,
    };
  }

  get popup(): Popup { return this.popupValue; }

  private panel(side: Side): SidePanel {
    return side === "shipA" ? this.shipASide : this.shipBSide;
  }

  async importFromClipboard(side: Side): Promise<void> {
    const panel = this.panel(side);
    const pastePopup = panel.getPastePopup();
    if (pastePopup.isOpen()) {
      this.popupGroup.close(pastePopup);
      return;
    }
    this.popupGroup.close(this.shipASide.getPastePopup());
    this.popupGroup.close(this.shipBSide.getPastePopup());
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
    const language = this.fittingImport.detectLanguageFromText(trimmed);
    if (language) await this.itemNameLoader.load(language);
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
    const language = this.fittingImport.detectLanguageFromText(trimmed);
    if (language) await this.itemNameLoader.load(language);
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

  importEftFitting(side: Side, text: string, options: { readonly persist?: boolean; readonly showImportedHint?: boolean } | boolean = true): ImportedFitting | undefined {
    const opts = typeof options === "boolean" ? { persist: options } : options;
    const { persist = true, showImportedHint = true } = opts;
    const imported = this.eftSideImporter.importEftFitting(side, text, { persist, showImportedHint });
    if (!imported) return undefined;
    this.events.emitFittingImported(side, imported);
    if (persist) this.events.emitConfigInvalidated();
    return imported;
  }

  private openImportSidePopup(): void {
    this.els.importSidePopup.hidden = false;
    this.els.importProfile.setAttribute("aria-expanded", "true");
    this.importSidePopupOpen = true;
    this.els.importSideShipA.focus();
  }

  private closeImportSidePopup(): void {
    this.els.importSidePopup.hidden = true;
    this.els.importProfile.setAttribute("aria-expanded", "false");
    this.pendingImportText = undefined;
    this.importSidePopupOpen = false;
  }

  private recordSavedFitting(imported: ImportedFitting, text: string): void {
    this.savedFittings.record({ hullId: imported.profile.id, name: imported.fittingName, text });
  }
}
