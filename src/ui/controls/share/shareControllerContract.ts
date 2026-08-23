import type { Popup } from "../popup";

export interface ShareEls {
  readonly shareLink: HTMLButtonElement;
  readonly sharePopup: HTMLElement;
  readonly shareCopyUrl: HTMLButtonElement;
  readonly shareCopyText: HTMLButtonElement;
}

export interface ShareController {
  readonly popup: Popup;
  onCopyUrlClicked(): Promise<void>;
  onCopyTextClicked(): Promise<void>;
}
