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
  onProfileTextLoaded(listener: (settings: ProfileSettings) => void): void;
  offProfileTextLoaded(listener: (settings: ProfileSettings) => void): void;
  emitProfileTextLoaded(settings: ProfileSettings): void;
}

export class UiEventsImpl implements UiEvents {
  private readonly languageChanged = new Set<() => void>();
  private readonly configInvalidated = new Set<(persist: boolean) => void>();
  private readonly displayInvalidated = new Set<() => void>();
  private readonly fittingImported = new Set<(side: "attacker" | "target", imported: ImportedFitting) => void>();
  private readonly profileLoaded = new Set<(name: string) => void>();
  private readonly newProfile = new Set<() => void>();
  private readonly profileTextLoaded = new Set<(settings: ProfileSettings) => void>();

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

  onProfileTextLoaded(listener: (settings: ProfileSettings) => void): void { this.profileTextLoaded.add(listener); }
  offProfileTextLoaded(listener: (settings: ProfileSettings) => void): void { this.profileTextLoaded.delete(listener); }
  emitProfileTextLoaded(settings: ProfileSettings): void {
    for (const listener of Array.from(this.profileTextLoaded)) listener(settings);
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
