import type { ImportedFitting } from "../fitting";
import type { ProfileSettings } from "../appstate";

export interface UiEvents {
  onLanguageChanged(listener: () => void): void;
  offLanguageChanged(listener: () => void): void;
  emitLanguageChanged(): void;
  onConfigInvalidated(listener: (persist: boolean) => void): void;
  offConfigInvalidated(listener: (persist: boolean) => void): void;
  emitConfigInvalidated(persist: boolean): void;
  onDisplayInvalidated(listener: () => void): void;
  offDisplayInvalidated(listener: () => void): void;
  emitDisplayInvalidated(): void;
  onFittingImported(listener: (side: "attacker" | "target", imported: ImportedFitting) => void): void;
  offFittingImported(listener: (side: "attacker" | "target", imported: ImportedFitting) => void): void;
  emitFittingImported(side: "attacker" | "target", imported: ImportedFitting): void;
  onProfileLoaded(listener: (name: string) => void): void;
  offProfileLoaded(listener: (name: string) => void): void;
  emitProfileLoaded(name: string): void;
  onNewProfile(listener: () => void): void;
  offNewProfile(listener: () => void): void;
  emitNewProfile(): void;
  onProfileDeleted(listener: () => void): void;
  offProfileDeleted(listener: () => void): void;
  emitProfileDeleted(): void;
  onProfileTextLoaded(listener: (settings: ProfileSettings) => void): void;
  offProfileTextLoaded(listener: (settings: ProfileSettings) => void): void;
  emitProfileTextLoaded(settings: ProfileSettings): void;
  onSessionRestored(listener: () => void): void;
  offSessionRestored(listener: () => void): void;
  emitSessionRestored(): void;
  onSessionReset(listener: () => void): void;
  offSessionReset(listener: () => void): void;
  emitSessionReset(): void;
  onStartupDefaultsApplied(listener: () => void): void;
  offStartupDefaultsApplied(listener: () => void): void;
  emitStartupDefaultsApplied(): void;
  onDistanceChanged(listener: (distance: number) => void): void;
  offDistanceChanged(listener: (distance: number) => void): void;
  emitDistanceChanged(distance: number): void;
}

export class UiEventsImpl implements UiEvents {
  private readonly languageChanged = new Set<() => void>();
  private readonly configInvalidated = new Set<(persist: boolean) => void>();
  private readonly displayInvalidated = new Set<() => void>();
  private readonly fittingImported = new Set<(side: "attacker" | "target", imported: ImportedFitting) => void>();
  private readonly profileLoaded = new Set<(name: string) => void>();
  private readonly newProfile = new Set<() => void>();
  private readonly profileDeleted = new Set<() => void>();
  private readonly profileTextLoaded = new Set<(settings: ProfileSettings) => void>();
  private readonly sessionRestored = new Set<() => void>();
  private readonly sessionReset = new Set<() => void>();
  private readonly startupDefaultsApplied = new Set<() => void>();
  private readonly distanceChanged = new Set<(distance: number) => void>();

  onLanguageChanged(listener: () => void): void { this.languageChanged.add(listener); }
  offLanguageChanged(listener: () => void): void { this.languageChanged.delete(listener); }
  emitLanguageChanged(): void { this.emit(this.languageChanged); }

  onConfigInvalidated(listener: (persist: boolean) => void): void { this.configInvalidated.add(listener); }
  offConfigInvalidated(listener: (persist: boolean) => void): void { this.configInvalidated.delete(listener); }
  emitConfigInvalidated(persist: boolean): void { this.emitWithArg(this.configInvalidated, persist); }

  onDisplayInvalidated(listener: () => void): void { this.displayInvalidated.add(listener); }
  offDisplayInvalidated(listener: () => void): void { this.displayInvalidated.delete(listener); }
  emitDisplayInvalidated(): void { this.emit(this.displayInvalidated); }

  onFittingImported(listener: (side: "attacker" | "target", imported: ImportedFitting) => void): void {
    this.fittingImported.add(listener);
  }
  offFittingImported(listener: (side: "attacker" | "target", imported: ImportedFitting) => void): void {
    this.fittingImported.delete(listener);
  }
  emitFittingImported(side: "attacker" | "target", imported: ImportedFitting): void {
    for (const listener of Array.from(this.fittingImported)) listener(side, imported);
  }

  onProfileLoaded(listener: (name: string) => void): void { this.profileLoaded.add(listener); }
  offProfileLoaded(listener: (name: string) => void): void { this.profileLoaded.delete(listener); }
  emitProfileLoaded(name: string): void { this.emitWithStringArg(this.profileLoaded, name); }

  onNewProfile(listener: () => void): void { this.newProfile.add(listener); }
  offNewProfile(listener: () => void): void { this.newProfile.delete(listener); }
  emitNewProfile(): void { this.emit(this.newProfile); }

  onProfileDeleted(listener: () => void): void { this.profileDeleted.add(listener); }
  offProfileDeleted(listener: () => void): void { this.profileDeleted.delete(listener); }
  emitProfileDeleted(): void { this.emit(this.profileDeleted); }

  onProfileTextLoaded(listener: (settings: ProfileSettings) => void): void { this.profileTextLoaded.add(listener); }
  offProfileTextLoaded(listener: (settings: ProfileSettings) => void): void { this.profileTextLoaded.delete(listener); }
  emitProfileTextLoaded(settings: ProfileSettings): void {
    for (const listener of Array.from(this.profileTextLoaded)) listener(settings);
  }

  onSessionRestored(listener: () => void): void { this.sessionRestored.add(listener); }
  offSessionRestored(listener: () => void): void { this.sessionRestored.delete(listener); }
  emitSessionRestored(): void { this.emit(this.sessionRestored); }

  onSessionReset(listener: () => void): void { this.sessionReset.add(listener); }
  offSessionReset(listener: () => void): void { this.sessionReset.delete(listener); }
  emitSessionReset(): void { this.emit(this.sessionReset); }

  onStartupDefaultsApplied(listener: () => void): void { this.startupDefaultsApplied.add(listener); }
  offStartupDefaultsApplied(listener: () => void): void { this.startupDefaultsApplied.delete(listener); }
  emitStartupDefaultsApplied(): void { this.emit(this.startupDefaultsApplied); }

  onDistanceChanged(listener: (distance: number) => void): void { this.distanceChanged.add(listener); }
  offDistanceChanged(listener: (distance: number) => void): void { this.distanceChanged.delete(listener); }
  emitDistanceChanged(distance: number): void {
    for (const listener of Array.from(this.distanceChanged)) listener(distance);
  }

  private emit(listeners: ReadonlySet<() => void>): void {
    for (const listener of Array.from(listeners)) listener();
  }

  private emitWithArg(listeners: ReadonlySet<(persist: boolean) => void>, persist: boolean): void {
    for (const listener of Array.from(listeners)) listener(persist);
  }

  private emitWithStringArg(listeners: ReadonlySet<(name: string) => void>, name: string): void {
    for (const listener of Array.from(listeners)) listener(name);
  }
}
