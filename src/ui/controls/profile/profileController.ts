import { setText } from "../controlsDom";
import { type ProfileSettings, type SettingsStore, type StartupState } from "../../../appstate";
import type { ConfirmController } from "../confirm";
import type { ProfileChangeTracker } from "./profileChangeTracker";
import type { I18n } from "../../i18n";
import type { Popup, PopupGroup } from "../popup";
import type { TimeoutId, Timer } from "../../timer";
import type { UiEvents } from "../../events";

export interface ProfileEls {
  readonly profileSave: HTMLButtonElement;
  readonly profileSelectTrigger: HTMLButtonElement;
  readonly profileSelectLabel: HTMLElement;
  readonly profilePopup: HTMLElement;
  readonly profileDelete: HTMLButtonElement;
  readonly profileNew: HTMLButtonElement;
  readonly newProfilePopup: HTMLElement;
  readonly newProfileName: HTMLInputElement;
  readonly newProfileConfirm: HTMLButtonElement;
  readonly newProfileCancel: HTMLButtonElement;
  readonly shareStatus: HTMLElement;
}

export interface ProfileController {
  selectedName(): string;
  restoreFromStartup(startup: StartupState): boolean;
  refresh(selected?: string): void;
  markLoaded(selected?: string): void;
  updateActionBarState(): void;
  toggleProfileSelector(): void;
  toggleNewProfilePopup(): void;
  saveProfile(): Promise<void>;
  loadProfile(name: string): Promise<void>;
  deleteProfile(): Promise<void>;
  showStatus(key: string): void;
}

interface ProfileControllerDeps {
  readonly els: ProfileEls;
  readonly settingsStore: SettingsStore;
  readonly timer: Timer;
  readonly i18n: I18n;
  readonly events: UiEvents;
  readonly confirmController: ConfirmController;
  readonly popupGroup: PopupGroup;
  readonly changeTracker: ProfileChangeTracker;
  readonly snapshotSource: () => ProfileSettings;
}

export class ProfileControllerImpl implements ProfileController {
  private readonly els: ProfileEls;
  private readonly settingsStore: SettingsStore;
  private readonly timer: Timer;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly confirmController: ConfirmController;
  private readonly popupGroup: PopupGroup;
  private readonly changeTracker: ProfileChangeTracker;
  private readonly snapshotSource: () => ProfileSettings;
  private readonly selectorPopupValue: Popup;
  private readonly newProfilePopupValue: Popup;
  private shareStatusTimeout?: TimeoutId;
  private lastAppliedSelection = "";
  private selectedNameValue = "";
  private profileMenuItems: HTMLButtonElement[] = [];
  private selectorOpen = false;
  private newProfileOpen = false;

  constructor(deps: ProfileControllerDeps) {
    this.els = deps.els;
    this.settingsStore = deps.settingsStore;
    this.timer = deps.timer;
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.confirmController = deps.confirmController;
    this.popupGroup = deps.popupGroup;
    this.changeTracker = deps.changeTracker;
    this.snapshotSource = deps.snapshotSource;
    this.selectorPopupValue = {
      isOpen: () => this.selectorOpen,
      open: () => this.openProfileSelector(),
      close: () => this.closeProfileSelector(),
      focusTrigger: () => this.els.profileSelectTrigger.focus(),
      contains: (target) => this.containsProfileSelector(target),
    };
    this.newProfilePopupValue = {
      isOpen: () => this.newProfileOpen,
      open: () => this.openNewProfilePopup(),
      close: () => this.closeNewProfilePopup(),
      focusTrigger: () => this.els.profileNew.focus(),
      contains: (target) => this.containsNewProfile(target),
    };
    this.popupGroup.register(this.selectorPopupValue);
    this.popupGroup.register(this.newProfilePopupValue);
    this.els.newProfileConfirm.addEventListener("click", () => void this.onConfirmNewProfile());
    this.els.newProfileCancel.addEventListener("click", () => this.closeNewProfilePopup());
    this.els.newProfileName.addEventListener("input", () => this.updateNewProfileConfirmState());
    this.els.newProfileName.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key !== "Enter" || this.els.newProfileConfirm.disabled) return;
      event.preventDefault();
      void this.onConfirmNewProfile();
    });
    this.events.onLanguageChanged(() => this.refresh(this.selectedNameValue));
    this.els.profileSave.addEventListener("click", () => void this.saveProfile());
    this.els.profileSelectTrigger.addEventListener("click", () => this.toggleProfileSelector());
    this.els.profileDelete.addEventListener("click", () => void this.deleteProfile());
    this.els.profileNew.addEventListener("click", () => this.toggleNewProfilePopup());
  }

  selectedName(): string {
    return this.selectedNameValue;
  }

  restoreFromStartup(startup: StartupState): boolean {
    const selected = startup.selectedProfileName;
    const profile = selected ? this.settingsStore.loadProfile(selected) : null;
    if (selected && profile) {
      this.settingsStore.selectProfile(selected);
      this.events.emitProfileLoaded(selected);
      return true;
    }
    if (selected) this.settingsStore.clearSelectedProfile();
    return false;
  }

  refresh(selected = ""): void {
    const names = this.settingsStore.listProfiles();
    const popup = this.els.profilePopup;
    popup.innerHTML = "";
    this.profileMenuItems = [];
    for (const name of names) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "profile-menu-item";
      item.setAttribute("role", "menuitem");
      item.textContent = name;
      item.addEventListener("click", () => void this.loadProfile(name));
      if (name === selected) item.setAttribute("aria-current", "true");
      popup.appendChild(item);
      this.profileMenuItems.push(item);
    }
    this.selectedNameValue = names.includes(selected) ? selected : "";
    this.els.profileSelectLabel.textContent = this.selectedNameValue || this.i18n.t("select.profile");
  }

  markLoaded(selected?: string): void {
    this.els.newProfileName.value = "";
    this.changeTracker.setBaseline(this.snapshotSource());
    this.refresh(selected ?? this.selectedNameValue);
    this.lastAppliedSelection = this.selectedNameValue;
    this.updateActionBarState();
  }

  updateActionBarState(): void {
    const dirty = this.isDirty();
    const canSave = this.canSave(this.selectedNameValue, dirty);
    this.els.profileSave.classList.toggle("unsaved", canSave);
    this.els.profileSave.disabled = !canSave;
    this.els.profileDelete.disabled = this.selectedNameValue.length === 0;
  }

  toggleProfileSelector(): void {
    if (this.selectorOpen) this.closeProfileSelector();
    else this.popupGroup.open(this.selectorPopupValue);
  }

  toggleNewProfilePopup(): void {
    if (this.newProfileOpen) this.closeNewProfilePopup();
    else this.popupGroup.open(this.newProfilePopupValue);
  }

  async saveProfile(): Promise<void> {
    const selected = this.selectedNameValue;
    if (!selected) return;
    const profile = this.snapshotSource();
    if (!profile) return;
    this.settingsStore.saveProfile(selected, profile);
    this.settingsStore.selectProfile(selected);
    this.changeTracker.setBaseline(profile);
    this.refresh(selected);
    this.lastAppliedSelection = selected;
    this.updateActionBarState();
    this.showStatus("status.profileSaved");
  }

  async loadProfile(name: string): Promise<void> {
    if (!name) return;
    if (this.isDirty() && !(await this.confirmController.confirm("confirm.discardChanges"))) {
      this.refresh(this.lastAppliedSelection);
      if (this.selectorOpen) this.focusSelectedProfileItem();
      return;
    }
    const profile = this.settingsStore.loadProfile(name);
    if (!profile) {
      this.refresh(this.lastAppliedSelection);
      if (this.selectorOpen) this.focusSelectedProfileItem();
      return;
    }
    this.settingsStore.selectProfile(name);
    this.events.emitProfileLoaded(name);
    this.lastAppliedSelection = name;
    this.refresh(name);
    this.closeProfileSelector();
    this.showStatus("status.profileLoaded");
  }

  async deleteProfile(): Promise<void> {
    const name = this.selectedNameValue;
    if (!name) return;
    if (!(await this.confirmController.confirm("confirm.deleteProfile"))) return;
    this.settingsStore.deleteProfile(name);
    this.changeTracker.clearBaseline();
    this.lastAppliedSelection = "";
    this.refresh();
    this.updateActionBarState();
    this.showStatus("status.profileDeleted");
  }

  showStatus(key: string): void {
    setText(this.els.shareStatus, this.i18n.t(key));
    if (this.shareStatusTimeout) this.timer.clearTimeout(this.shareStatusTimeout);
    this.shareStatusTimeout = this.timer.setTimeout(() => setText(this.els.shareStatus, ""), 2000);
  }

  private async onConfirmNewProfile(): Promise<void> {
    const name = this.els.newProfileName.value.trim();
    this.closeNewProfilePopup();
    this.events.emitNewProfile();
    if (!this.isNewProfileNameValid(name)) return;
    const profile = this.snapshotSource();
    if (!profile) return;
    this.settingsStore.saveProfile(name, profile);
    this.settingsStore.selectProfile(name);
    this.changeTracker.setBaseline(profile);
    this.refresh(name);
    this.lastAppliedSelection = name;
    this.updateActionBarState();
    this.showStatus("status.profileSaved");
  }

  private openProfileSelector(): void {
    this.els.profilePopup.hidden = false;
    this.selectorOpen = true;
    this.els.profileSelectTrigger.setAttribute("aria-expanded", "true");
    this.focusSelectedProfileItem();
  }

  private closeProfileSelector(): void {
    if (!this.selectorOpen && this.els.profilePopup.hidden) return;
    this.els.profilePopup.hidden = true;
    this.selectorOpen = false;
    this.els.profileSelectTrigger.setAttribute("aria-expanded", "false");
  }

  private containsProfileSelector(target: EventTarget): boolean {
    if (!(target instanceof Element)) return false;
    return this.els.profilePopup.contains(target) || target === this.els.profileSelectTrigger;
  }

  private focusSelectedProfileItem(): void {
    const index = this.profileMenuItems.findIndex((item) => item.getAttribute("aria-current") === "true");
    const item = index >= 0 ? this.profileMenuItems[index] : this.profileMenuItems[0];
    item?.focus();
  }

  private openNewProfilePopup(): void {
    this.els.newProfileName.value = "";
    this.updateNewProfileConfirmState();
    this.els.newProfilePopup.hidden = false;
    this.newProfileOpen = true;
    this.els.newProfileName.focus();
  }

  private closeNewProfilePopup(): void {
    if (!this.newProfileOpen && this.els.newProfilePopup.hidden) return;
    this.els.newProfilePopup.hidden = true;
    this.newProfileOpen = false;
  }

  private containsNewProfile(target: EventTarget): boolean {
    if (!(target instanceof Element)) return false;
    return this.els.newProfilePopup.contains(target) || target === this.els.profileNew;
  }

  private isDirty(): boolean {
    return this.changeTracker.hasUnsavedChanges(this.snapshotSource());
  }

  private canSave(selected: string, dirty: boolean): boolean {
    return selected.length > 0 && dirty;
  }

  private isNewProfileNameValid(name: string): boolean {
    if (name.length === 0) return false;
    return !this.settingsStore.listProfiles().includes(name);
  }

  private updateNewProfileConfirmState(): void {
    this.els.newProfileConfirm.disabled = !this.isNewProfileNameValid(this.els.newProfileName.value.trim());
  }
}