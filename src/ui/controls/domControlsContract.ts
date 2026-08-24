import type { SettingsStore, UserSettings } from "../../appstate";
import type { I18n } from "../i18n";
import type { UiEvents } from "../events";

export interface DomControlsDeps {
  i18n: I18n;
  settingsStore: SettingsStore;
  events: UiEvents;
}

export interface DomControlsHost {
  wireControls(): void;
  currentDistance(): number;
  onPlayPause(): void;
  onReset(): void;
  onNewProfile(): void;
  onSpeedChange(speed: number): void;
  onConfigChange(): void;
  onDisplayChange(): void;
  persistConfigChange(notify?: boolean): void;
  captureSettings(): UserSettings;
  onProfileLoaded(name: string): void;
  onProfileTextLoaded(settings: UserSettings): void;
}
