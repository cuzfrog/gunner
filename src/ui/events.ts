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
}

export class UiEventsImpl implements UiEvents {
  private readonly languageChanged = new Set<() => void>();
  private readonly configInvalidated = new Set<(persist: boolean) => void>();
  private readonly displayInvalidated = new Set<() => void>();

  onLanguageChanged(listener: () => void): void { this.languageChanged.add(listener); }
  offLanguageChanged(listener: () => void): void { this.languageChanged.delete(listener); }
  emitLanguageChanged(): void { this.emit(this.languageChanged); }

  onConfigInvalidated(listener: (persist: boolean) => void): void { this.configInvalidated.add(listener); }
  offConfigInvalidated(listener: (persist: boolean) => void): void { this.configInvalidated.delete(listener); }
  emitConfigInvalidated(persist: boolean): void { this.emitWithArg(this.configInvalidated, persist); }

  onDisplayInvalidated(listener: () => void): void { this.displayInvalidated.add(listener); }
  offDisplayInvalidated(listener: () => void): void { this.displayInvalidated.delete(listener); }
  emitDisplayInvalidated(): void { this.emit(this.displayInvalidated); }

  private emit(listeners: ReadonlySet<() => void>): void {
    for (const listener of Array.from(listeners)) listener();
  }

  private emitWithArg(listeners: ReadonlySet<(persist: boolean) => void>, persist: boolean): void {
    for (const listener of Array.from(listeners)) listener(persist);
  }
}
