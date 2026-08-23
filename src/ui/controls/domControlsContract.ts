import type { Ships } from "../../ships";
import type { HitChance } from "../../sim";
import type { ChargeCatalog, FittingImport, GunFamilies, PresetFittings } from "../../fitting";
import type { I18n } from "../i18n";
import type { ImageCatalog } from "../icons";
import type { SavedFittings, ClipboardProvider, SettingsStore, UserSettings } from "../../appstate";
import type { Timer } from "../timer";
import type { ChoiceGroup } from "./choiceGroup";
import type { Els } from "./elementsContract";
import type { EngagementReadout } from "./engagementReadout";
import type { FittingPopupController, FittingPreviewManager, Popup, PopupGroup } from "./popup";
import type { EventRouter, EventRouterHost, HullDatalist, LanguageRefresh, SessionCodec, SessionControl } from "./session";
import type { HintRotator } from "./hints";
import type { ImportController } from "./import";
import type { PreferencesController } from "./preferencesController";
import type { ProfileController } from "./profileController";
import type { SidePanel } from "./sidePanel";
import type { TurretController } from "./turret";

export interface DomControlsDeps {
  hitChance: HitChance; i18n: I18n; settingsStore: SettingsStore; ships: Ships; fittingImport: FittingImport;
  gunFamilies: GunFamilies; presetFittings: PresetFittings; savedFittings: SavedFittings; clipboard: ClipboardProvider;
  timer: Timer; chargeCatalog: ChargeCatalog; imageCatalog: ImageCatalog;
}

interface ProfileEvents {
  onProfileLoaded(name: string): void;
  onProfileTextLoaded(settings: UserSettings): void;
  captureSettings(): UserSettings;
  persistConfigChange(notify?: boolean): void;
}

interface ConfigEvents {
  fireConfigChange(): void;
  fireDisplayChange(): void;
}

export interface DomControlsHost extends EventRouterHost, SessionControl, ProfileEvents, ConfigEvents {}
export interface DomControlsParts {
  deps: DomControlsDeps;
  els: Els;
  popupGroup: PopupGroup;
  hintRotator: HintRotator;
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
  eventRouter: EventRouter;
}
