import { setText } from "./controlsDom";
import { profilesEqual, type ProfileSettings, type SettingsStore, type StartupState } from "../settings";
import type { I18n } from "../i18n";
import type { TimeoutId, Timer } from "../timer";

export interface ProfileEls {
  readonly profileName: HTMLInputElement;
  readonly profileSave: HTMLButtonElement;
  readonly profileSelect: HTMLSelectElement;
  readonly profileDelete: HTMLButtonElement;
  readonly shareStatus: HTMLElement;
}

export interface ProfileController {
  selectedName(): string;
  restoreFromStartup(startup: StartupState): boolean;
  refresh(selected?: string): void;
  markLoaded(selected: string): void;
  updateDirtyState(): void;
  saveProfile(): void;
  loadProfile(): void;
  deleteProfile(): void;
  showStatus(key: string): void;
}

export class ProfileControllerImpl implements ProfileController {
  private readonly els: ProfileEls;
  private readonly settingsStore: SettingsStore;
  private readonly timer: Timer;
  private readonly i18n: I18n;
  private readonly captureCurrent: () => ProfileSettings;
  private readonly onLoaded: (name: string) => void;
  private selectedProfile: ProfileSettings | null = null;
  private shareStatusTimeout?: TimeoutId;

  constructor(deps: {
    els: ProfileEls;
    settingsStore: SettingsStore;
    timer: Timer;
    i18n: I18n;
    captureCurrent: () => ProfileSettings;
    onLoaded: (name: string) => void;
  }) {
    this.els = deps.els;
    this.settingsStore = deps.settingsStore;
    this.timer = deps.timer;
    this.i18n = deps.i18n;
    this.captureCurrent = deps.captureCurrent;
    this.onLoaded = deps.onLoaded;
  }

  selectedName(): string {
    return this.els.profileSelect.value;
  }

  restoreFromStartup(startup: StartupState): boolean {
    const selected = startup.selectedProfileName;
    const profile = selected ? this.settingsStore.loadProfile(selected) : null;
    if (selected && profile) {
      this.settingsStore.selectProfile(selected);
      this.onLoaded(selected);
      return true;
    }
    return false;
  }

  refresh(selected = ""): void {
    const names = this.settingsStore.listProfiles();
    const select = this.els.profileSelect;
    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = this.i18n.t("select.profile");
    select.appendChild(placeholder);
    for (const name of names) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    }
    select.value = selected;
  }

  markLoaded(selected: string): void {
    this.selectedProfile = this.captureCurrent();
    this.refresh(selected);
    this.updateDirtyState();
  }

  updateDirtyState(): void {
    const selected = this.els.profileSelect.value;
    const name = this.els.profileName.value.trim();
    let saved: ProfileSettings | null = null;
    if (name && name !== selected) {
      saved = this.settingsStore.loadProfile(name);
    } else if (selected) {
      saved = this.selectedProfile;
    }
    const current = this.captureCurrent();
    const pending = saved ? !profilesEqual(saved, current) : name.length > 0;
    this.els.profileSave.classList.toggle("unsaved", pending);
  }

  saveProfile(): void {
    const selected = this.els.profileSelect.value;
    const name = this.els.profileName.value.trim();
    const profileName = name || selected;
    if (!profileName) return;
    const profile = this.captureCurrent();
    this.settingsStore.saveProfile(profileName, profile);
    this.settingsStore.selectProfile(profileName);
    this.els.profileName.value = "";
    this.selectedProfile = profile;
    this.refresh(profileName);
    this.updateDirtyState();
  }

  loadProfile(): void {
    const name = this.els.profileSelect.value;
    if (!name) return;
    const profile = this.settingsStore.loadProfile(name);
    if (!profile) return;
    this.settingsStore.selectProfile(name);
    this.onLoaded(name);
  }

  deleteProfile(): void {
    const name = this.els.profileSelect.value;
    if (!name) return;
    this.settingsStore.deleteProfile(name);
    this.selectedProfile = null;
    this.refresh();
    this.updateDirtyState();
  }

  showStatus(key: string): void {
    setText(this.els.shareStatus, this.i18n.t(key));
    if (this.shareStatusTimeout) this.timer.clearTimeout(this.shareStatusTimeout);
    this.shareStatusTimeout = this.timer.setTimeout(() => setText(this.els.shareStatus, ""), 2000);
  }
}
