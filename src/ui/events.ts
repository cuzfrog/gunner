export interface UiEvents {
  onLanguageChanged(listener: () => void): void;
  offLanguageChanged(listener: () => void): void;
  emitLanguageChanged(): void;
  onConfigInvalidated(listener: () => void): void;
  offConfigInvalidated(listener: () => void): void;
  emitConfigInvalidated(): void;
  onDisplayInvalidated(listener: () => void): void;
  offDisplayInvalidated(listener: () => void): void;
  emitDisplayInvalidated(): void;
}

export class UiEventsImpl implements UiEvents {
  private readonly languageChanged = new Set<() => void>();
  private readonly configInvalidated = new Set<() => void>();
  private readonly displayInvalidated = new Set<() => void>();

  onLanguageChanged(listener: () => void): void { this.languageChanged.add(listener); }
  offLanguageChanged(listener: () => void): void { this.languageChanged.delete(listener); }
  emitLanguageChanged(): void { this.emit(this.languageChanged); }

  onConfigInvalidated(listener: () => void): void { this.configInvalidated.add(listener); }
  offConfigInvalidated(listener: () => void): void { this.configInvalidated.delete(listener); }
  emitConfigInvalidated(): void { this.emit(this.configInvalidated); }

  onDisplayInvalidated(listener: () => void): void { this.displayInvalidated.add(listener); }
  offDisplayInvalidated(listener: () => void): void { this.displayInvalidated.delete(listener); }
  emitDisplayInvalidated(): void { this.emit(this.displayInvalidated); }

  private emit(listeners: ReadonlySet<() => void>): void {
    for (const listener of Array.from(listeners)) listener();
  }
}
