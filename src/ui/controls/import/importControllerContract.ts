import type { FittingImport, ImportedFitting } from "../../../fitting";
import type { ClipboardProvider, SavedFittings, UserSettings } from "../../../appstate";
import type { Popup, PopupGroup } from "../popup";
import type { PreferencesController } from "../preferencesController";
import type { ProfileController } from "../profileController";
import type { Side, SidePanel } from "../sidePanel";

export interface ImportEls {
  readonly importProfile: HTMLButtonElement;
  readonly importSidePopup: HTMLElement;
  readonly importSideAttacker: HTMLButtonElement;
  readonly importSideTarget: HTMLButtonElement;
}

export interface ImportController {
  readonly popup: Popup;
  importFromClipboard(side: Side): Promise<void>;
  importFromText(side: Side, text: string): Promise<void>;
  importProfileClicked(): Promise<void>;
  onImportSideClick(side: Side): Promise<void>;
  importEftFitting(side: Side, text: string, persist?: boolean): ImportedFitting | undefined;
  setOnConfigPersisted(onConfigPersisted: () => void): void;
  setOnProfileTextLoaded(onProfileTextLoaded: (settings: UserSettings) => void): void;
}
