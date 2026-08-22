import type { Ships } from "../../ships";
import type { HitChance } from "../../sim";
import type { ChargeCatalog, FittingImport, GunFamilies, PresetFittings } from "../../fitting";
import type { I18n } from "../i18n";
import type { ImageCatalog } from "../icons";
import type { SavedFittings, ClipboardProvider, SettingsStore, UserSettings } from "../settings";
import type { Timer } from "../timer";
import type { ChoiceGroup } from "./choiceGroup";
import type { Els } from "./elementsContract";
import type { EngagementReadout } from "./engagementReadout";
import type { EventRouterHost } from "./eventRouter";
import type { FittingPopupController } from "./fittingPopupController";
import type { FittingPreviewManager } from "./fittingPreviewManager";
import type { IHintRotator } from "./hintRotator";
import type { HullDatalist } from "./hullDatalist";
import type { ImportController } from "./importController";
import type { LanguageRefresh } from "./languageRefresh";
import type { Popup, PopupGroup } from "./popupGroup";
import type { PreferencesController } from "./preferencesController";
import type { ProfileController } from "./profileController";
import type { SessionCodec } from "./sessionCodec";
import type { SidePanel } from "./sidePanel";
import type { TurretController } from "./turretController";

export interface DomControlsDeps {
  hitChance: HitChance; i18n: I18n; settingsStore: SettingsStore; ships: Ships; fittingImport: FittingImport;
  gunFamilies: GunFamilies; presetFittings: PresetFittings; savedFittings: SavedFittings; clipboard: ClipboardProvider;
  timer: Timer; chargeCatalog: ChargeCatalog; imageCatalog: ImageCatalog;
}

export interface DomControlsHost extends EventRouterHost {
  isPlaying(): boolean;
  setPlaying(playing: boolean): void;
  fireConfigChange(): void;
  fireDisplayChange(): void;
  onProfileLoaded(name: string): void;
  onProfileTextLoaded(settings: UserSettings): void;
  captureSettings(): UserSettings;
  persistConfigChange(notify?: boolean): void;
}

export interface DomControlsParts {
  deps: DomControlsDeps;
  els: Els;
  popupGroup: PopupGroup;
  hintRotator: IHintRotator;
  hullDatalist: HullDatalist;
  preferencesController: PreferencesController;
  profileController: ProfileController;
  engagementReadout: EngagementReadout;
  sigResChoice: ChoiceGroup;
  attackerSide: SidePanel;
  targetSide: SidePanel;
  attackerAmmoPopup: Popup;
  turretController: TurretController;
  sessionCodec: SessionCodec;
  importController: ImportController;
  previewManager: FittingPreviewManager;
  attackerFittingPopup: FittingPopupController;
  targetFittingPopup: FittingPopupController;
  languageRefresh: LanguageRefresh;
}
