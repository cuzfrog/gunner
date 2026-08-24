export class FakeElement {
  value = "";
  checked = false;
  hidden = false;
  className = "";
  textContent = "";
  title = "";
  src = "";
  tagName = "";
  id = "";
  disabled = false;
  isConnected = true;
  children: FakeElement[] = [];
  classList = { add: vi.fn(), remove: vi.fn(), toggle: vi.fn(), contains: vi.fn(() => false) };
  style: Record<string, string | number> & { setProperty(this: Record<string, string | number>, name: string, value: string): void } = Object.assign(Object.create(null), { setProperty(this: Record<string, string | number>, name: string, value: string) { this[name] = value; } });
  offsetParent: FakeElement | null = null;
  offsetWidth = 0;
  offsetHeight = 0;
  private _innerHTML = "";
  private attributes: Record<string, string | null> = {};
  private handlers: Record<string, Array<(event?: unknown) => void>> = {};
  focus = vi.fn();
  blur = vi.fn();

  getBoundingClientRect(): { left: number; top: number; right: number; bottom: number; width: number; height: number; x: number; y: number } {
    return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
  }

  get innerHTML(): string { return this._innerHTML; }
  set innerHTML(value: string) {
    this._innerHTML = value;
    for (const child of this.children) child.isConnected = false;
    this.children = [];
  }

  get firstElementChild(): FakeElement | null { return this.children[0] ?? null; }
  get options(): FakeElement[] { return this.children; }
  getAttribute(name: string): string | null { return this.attributes[name] ?? null; }
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
  removeAttribute(name: string): void { delete this.attributes[name]; }
  addEventListener(event: string, handler: (event?: unknown) => void): void { (this.handlers[event] ??= []).push(handler); }
  dispatchEvent(event: { type: string }): void { this.handlers[event.type]?.forEach((h) => h(event)); }
  trigger(event: string, data?: unknown): void { this.handlers[event]?.forEach((h) => h(data)); }
  appendChild(child: unknown): void { this.children.push(child as FakeElement); }
  contains(target: unknown): boolean { return target === this || this.children.includes(target as FakeElement); }
  closest(selector?: string): FakeElement | null {
    if (!selector) return null;
    const ids = selector.split(",").map((s) => s.trim()).filter((s) => s.startsWith("#")).map((s) => s.slice(1));
    return ids.includes(this.id) ? this : null;
  }
  querySelector(selector: string): FakeElement | null {
    if (selector.startsWith('[aria-selected="true"]')) {
      return this.children.find((c) => c.getAttribute("aria-selected") === "true") ?? null;
    }
    return this.children[0] ?? null;
  }
}
