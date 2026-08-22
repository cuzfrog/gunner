export interface Popup {
  isOpen(): boolean;
  open(): void;
  close(): void;
  focusTrigger(): void;
  contains(target: EventTarget): boolean;
}

export class PopupGroup {
  private readonly popups: Popup[] = [];

  register(popup: Popup): void {
    this.popups.push(popup);
  }

  open(popup: Popup): void {
    for (const p of this.popups) {
      if (p !== popup && p.isOpen()) p.close();
    }
    if (!popup.isOpen()) popup.open();
  }

  toggle(popup: Popup): void {
    if (popup.isOpen()) this.close(popup);
    else this.open(popup);
  }

  close(popup: Popup): void {
    if (popup.isOpen()) popup.close();
  }

  closeAll(): void {
    for (const p of this.popups) if (p.isOpen()) p.close();
  }

  onPointerDown(target: EventTarget | null): void {
    if (!target) return;
    for (const p of this.popups) if (p.isOpen() && !p.contains(target)) p.close();
  }

  onKeyDown(event: { readonly key: string }): void {
    if (event.key !== "Escape") return;
    for (const p of this.popups) if (p.isOpen()) { p.close(); p.focusTrigger(); }
  }
}
