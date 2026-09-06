import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";

export interface DomControlsDeps {
  i18n: I18n;
  events: UiEvents;
}

export interface DomControlsHost {
  wireControls(): void;
  onPlayPause(): void;
  onReset(): void;
  onSpeedChange(speed: number): void;
  onConfigChange(): void;
  onDisplayChange(): void;
  persistConfigChange(notify?: boolean): void;
}
