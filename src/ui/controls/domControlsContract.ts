import type { Ships } from "../../ships";
import type { HitChance } from "../../sim";
import type { ChargeCatalog, FittingImport, GunFamilies, PresetFittings } from "../../fitting";
import type { I18n } from "../i18n";
import type { ImageCatalog } from "../icons";
import type { SavedFittings, ClipboardProvider, SettingsStore, UserSettings } from "../../appstate";
import type { Timer } from "../timer";
import type { UiEvents } from "../events";
import type { EventRouterHost, SessionControl } from "./session";

export interface DomControlsDeps {
  hitChance: HitChance; i18n: I18n; settingsStore: SettingsStore; ships: Ships; fittingImport: FittingImport;
  gunFamilies: GunFamilies; presetFittings: PresetFittings; savedFittings: SavedFittings; clipboard: ClipboardProvider;
  timer: Timer; chargeCatalog: ChargeCatalog; imageCatalog: ImageCatalog; events: UiEvents;
}

interface ProfileEvents {
  onProfileLoaded(name: string): void;
  onProfileTextLoaded(settings: UserSettings): void;
  captureSettings(): UserSettings;
  persistConfigChange(notify?: boolean): void;
}

export interface DomControlsHost extends EventRouterHost, SessionControl, ProfileEvents {
  wireControls(): void;
  currentDistance(): number;
}
