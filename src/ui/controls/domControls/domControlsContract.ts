import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";

export interface DomControlsDeps {
  i18n: I18n;
  events: UiEvents;
}

export interface DomControlsHost {
  wireControls(): void;
  currentDistance(): number;
  onPlayPause(): void;
  onReset(): void;
  onSpeedChange(speed: number): void;
  onConfigChange(persist?: boolean): void;
  onDisplayChange(): void;
  persistConfigChange(notify?: boolean): void;
}
