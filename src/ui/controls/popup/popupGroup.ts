export interface Popup {
  isOpen(): boolean;
  open(): void;
  close(): void;
  focusTrigger(): void;
  contains(domTarget: EventTarget): boolean;
}

export interface PopupGroup {
  register(popup: Popup, options?: { readonly parent?: Popup }): void;
  open(popup: Popup): void;
  toggle(popup: Popup): void;
  close(popup: Popup): void;
  closeAll(): void;
  hasOpen(): boolean;
  onPointerDown(domTarget: EventTarget | null): void;
  onKeyDown(event: { readonly key: string }): void;
}

export class PopupGroupImpl implements PopupGroup {
  private readonly popups: Popup[] = [];
  private readonly parents = new Map<Popup, Popup>();

  register(popup: Popup, options?: { readonly parent?: Popup }): void {
    if (this.popups.includes(popup)) return;
    this.popups.push(popup);
    if (options?.parent) {
      if (options.parent !== popup && !isAncestor(popup, options.parent, this.parents)) {
        this.parents.set(popup, options.parent);
      }
    }
  }

  open(popup: Popup): void {
    for (const p of this.popups) {
      if (p === popup || !p.isOpen()) continue;
      if (isAncestor(p, popup, this.parents)) continue;
      p.close();
    }
    if (!popup.isOpen()) popup.open();
  }

  toggle(popup: Popup): void {
    if (popup.isOpen()) this.close(popup);
    else this.open(popup);
  }

  close(popup: Popup): void {
    for (const d of descendants(popup, this.parents)) {
      if (d.isOpen()) d.close();
    }
    if (popup.isOpen()) popup.close();
  }

  closeAll(): void {
    for (const p of this.popups) if (p.isOpen()) p.close();
  }

  hasOpen(): boolean {
    return this.popups.some((p) => p.isOpen());
  }

  onPointerDown(domTarget: EventTarget | null): void {
    if (!domTarget) return;
    for (const p of this.popups) {
      if (!p.isOpen()) continue;
      if (p.contains(domTarget)) continue;
      const desc = descendants(p, this.parents);
      if (desc.some((d) => d.isOpen() && d.contains(domTarget))) continue;
      p.close();
    }
  }

  onKeyDown(event: { readonly key: string }): void {
    if (event.key !== "Escape") return;
    const open = this.popups.filter((p) => p.isOpen());
    if (open.length === 0) return;
    const maxDepth = Math.max(...open.map((p) => depth(p, this.parents)));
    for (const p of open) {
      if (depth(p, this.parents) === maxDepth) {
        p.close();
        p.focusTrigger();
      }
    }
  }
}

function isAncestor(maybeAncestor: Popup, popup: Popup, parents: Map<Popup, Popup>): boolean {
  let current = parents.get(popup);
  while (current) {
    if (current === maybeAncestor) return true;
    current = parents.get(current);
  }
  return false;
}

function descendants(popup: Popup, parents: Map<Popup, Popup>): Popup[] {
  const result: Popup[] = [];
  for (const [child, parent] of parents) {
    if (parent === popup) {
      result.push(child);
      result.push(...descendants(child, parents));
    }
  }
  return result;
}

function depth(popup: Popup, parents: Map<Popup, Popup>): number {
  let d = 0;
  let current = parents.get(popup);
  while (current) {
    d++;
    current = parents.get(current);
  }
  return d;
}
