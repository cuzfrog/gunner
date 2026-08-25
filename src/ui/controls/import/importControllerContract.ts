import type { FittingImport, ImportedFitting } from "../../../fitting";
import type { ClipboardProvider, SavedFittings } from "../../../appstate";
import type { Popup, PopupGroup } from "../popup";
import type { PreferencesController } from "../preferences";
import type { ProfileController } from "../profile";
import type { Side } from "../side";
import type { SidePanel } from "../sidePanel";

export interface ImportEls {
  readonly importProfile: HTMLButtonElement;
  readonly importSidePopup: HTMLElement;
  readonly importSideShipA: HTMLButtonElement;
  readonly importSideShipB: HTMLButtonElement;
}

export interface ImportController {
  readonly popup: Popup;
  importFromClipboard(side: Side): Promise<void>;
  importFromText(side: Side, text: string): Promise<void>;
  importProfileClicked(): Promise<void>;
  onImportSideClick(side: Side): Promise<void>;
  importEftFitting(side: Side, text: string, options?: { readonly persist?: boolean; readonly showImportedHint?: boolean } | boolean): ImportedFitting | undefined;
}
