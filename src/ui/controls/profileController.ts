import { setText } from "./controlsDom";
import { profilesEqual, type ProfileSettings, type SettingsStore, type StartupState } from "../../appstate";
import type { I18n } from "../i18n";
import type { TimeoutId, Timer } from "../timer";
import type { UiEvents } from "../events";

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
  setSnapshotSource(source: () => ProfileSettings): void;
  setOnProfileLoaded(onProfileLoaded: (name: string) => void): void;
  markLoaded(selected?: string): void;
  updateDirtyState(): void;
  saveProfile(): void;
  loadProfile(): void;
  deleteProfile(): void;
  showStatus(key: string): void;
}

interface ProfileControllerDeps {
  readonly els: ProfileEls;
  readonly settingsStore: SettingsStore;
  readonly timer: Timer;
  readonly i18n: I18n;
  readonly events: UiEvents;
}

export class ProfileControllerImpl implements ProfileController {
  private readonly els: ProfileEls;
  private readonly settingsStore: SettingsStore;
  private readonly timer: Timer;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private onProfileLoaded?: (name: string) => void;
  private snapshotSource: (() => ProfileSettings) | undefined;
  private selectedProfile: ProfileSettings | null = null;
  private shareStatusTimeout?: TimeoutId;

  constructor(deps: ProfileControllerDeps) {
    this.els = deps.els;
    this.settingsStore = deps.settingsStore;
    this.timer = deps.timer;
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.events.onLanguageChanged(() => this.refresh(this.selectedName()));
  }

  setOnProfileLoaded(onProfileLoaded: (name: string) => void): void {
    this.onProfileLoaded = onProfileLoaded;
  }

  selectedName(): string {
    return this.els.profileSelect.value;
  }

  restoreFromStartup(startup: StartupState): boolean {
    const selected = startup.selectedProfileName;
    const profile = selected ? this.settingsStore.loadProfile(selected) : null;
    if (selected && profile) {
      this.settingsStore.selectProfile(selected);
      this.onProfileLoaded?.(selected);
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

  setSnapshotSource(source: () => ProfileSettings): void {
    this.snapshotSource = source;
  }

  markLoaded(selected?: string): void {
    this.selectedProfile = this.snapshotSource?.() ?? null;
    this.refresh(selected ?? this.selectedName());
    this.updateDirtyState();
  }

  updateDirtyState(): void {
    const selected = this.els.profileSelect.value;
    const name = this.els.profileName.value.trim();
    let saved: ProfileSettings | null = null;
    if (name && name !== selected) {
      saved = this.settingsStore.loadProfile(name);
    } else {
      saved = this.selectedProfile;
    }
    const current = this.snapshotSource?.() ?? null;
    if (!current) {
      this.els.profileSave.classList.toggle("unsaved", false);
      return;
    }
    const pending = saved ? !profilesEqual(saved, current) : name.length > 0;
    this.els.profileSave.classList.toggle("unsaved", pending);
  }

  saveProfile(): void {
    const selected = this.els.profileSelect.value;
    const name = this.els.profileName.value.trim();
    const profileName = name || selected;
    if (!profileName) return;
    const profile = this.snapshotSource?.();
    if (!profile) return;
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
    this.onProfileLoaded?.(name);
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
