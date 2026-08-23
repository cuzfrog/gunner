export interface Popup {
  isOpen(): boolean;
  open(): void;
  close(): void;
  focusTrigger(): void;
  contains(target: EventTarget): boolean;
}

export interface PopupGroup {
  register(popup: Popup): void;
  open(popup: Popup): void;
  toggle(popup: Popup): void;
  close(popup: Popup): void;
  closeAll(): void;
  hasOpen(): boolean;
  onPointerDown(target: EventTarget | null): void;
  onKeyDown(event: { readonly key: string }): void;
}
