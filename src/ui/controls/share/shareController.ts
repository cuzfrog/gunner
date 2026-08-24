import { type ClipboardProvider, type ProfileTextCodec, type SettingsStore } from "../../../appstate";
import { profileSettingsOf } from "../controlsFormat";
import type { Popup, PopupGroup } from "../popup";
import type { ProfileController } from "../profileController";
import type { SessionCodec } from "../session";
import type { ShareController, ShareEls } from "./shareControllerContract";

export type { ShareController, ShareEls } from "./shareControllerContract";

export class ShareControllerImpl implements ShareController {
  private readonly clipboard: ClipboardProvider;
  private readonly settingsStore: SettingsStore;
  private readonly sessionCodec: SessionCodec;
  private readonly popupGroup: PopupGroup;
  private readonly els: ShareEls;
  private readonly profileController: ProfileController;
  private readonly profileTextCodec: ProfileTextCodec;
  private readonly popupValue: Popup;
  private sharePopupOpen = false;

  constructor(deps: {
    clipboard: ClipboardProvider;
    settingsStore: SettingsStore;
    sessionCodec: SessionCodec;
    popupGroup: PopupGroup;
    els: ShareEls;
    profileController: ProfileController;
    profileTextCodec: ProfileTextCodec;
  }) {
    this.clipboard = deps.clipboard;
    this.settingsStore = deps.settingsStore;
    this.sessionCodec = deps.sessionCodec;
    this.popupGroup = deps.popupGroup;
    this.els = deps.els;
    this.profileController = deps.profileController;
    this.profileTextCodec = deps.profileTextCodec;
    this.popupValue = {
      isOpen: () => this.sharePopupOpen,
      open: () => this.openSharePopup(),
      close: () => this.closeSharePopup(),
      focusTrigger: () => this.els.shareLink.focus(),
      contains: (target) => target instanceof Element && target.closest("#share-popup, #share-link") !== null,
    };
    this.els.shareLink.addEventListener("click", () => this.popupGroup.toggle(this.popupValue));
    this.els.shareCopyUrl.addEventListener("click", () => void this.onCopyUrlClicked());
    this.els.shareCopyText.addEventListener("click", () => void this.onCopyTextClicked());
  }

  get popup(): Popup { return this.popupValue; }

  async onCopyUrlClicked(): Promise<void> {
    const profile = profileSettingsOf(this.sessionCodec.capture());
    const url = this.settingsStore.encodeUrl(profile);
    await this.writeAndClose(url);
  }

  async onCopyTextClicked(): Promise<void> {
    const text = this.profileTextCodec.serialize(profileSettingsOf(this.sessionCodec.capture()));
    await this.writeAndClose(text);
  }

  private async writeAndClose(text: string): Promise<void> {
    try {
      await this.clipboard.writeText(text);
      this.profileController.showStatus("status.copied");
    } catch {
      this.profileController.showStatus("status.failed");
    } finally {
      this.popupGroup.close(this.popupValue);
    }
  }

  private openSharePopup(): void {
    this.els.sharePopup.hidden = false;
    this.els.shareLink.setAttribute("aria-expanded", "true");
    this.sharePopupOpen = true;
    this.els.shareCopyUrl.focus();
  }

  private closeSharePopup(): void {
    this.els.sharePopup.hidden = true;
    this.els.shareLink.setAttribute("aria-expanded", "false");
    this.sharePopupOpen = false;
  }
}
