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
  nodeType = 1;
  dataset: Record<string, string> = {};
  children: FakeElement[] = [];
  parent: FakeElement | null = null;
  classList = { add: vi.fn(), remove: vi.fn(), toggle: vi.fn(), contains: vi.fn(() => false) };
  style: Record<string, string | number> & { setProperty(this: Record<string, string | number>, name: string, value: string): void; removeProperty(this: Record<string, string | number>, name: string): string } = Object.assign(Object.create(null), {
    setProperty(this: Record<string, string | number>, name: string, value: string) { this[name] = value; },
    removeProperty(this: Record<string, string | number>, name: string) { const v = this[name]; delete this[name]; return String(v ?? ""); },
  });
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
    for (const child of this.children) {
      child.parent = null;
      child.isConnected = false;
    }
    this.children = [];
  }

  get firstElementChild(): FakeElement | null { return this.children.find((c) => c.tagName !== "#text") ?? null; }
  get childElementCount(): number { return this.children.filter((c) => c.tagName !== "#text").length; }
  get options(): FakeElement[] { return this.children; }
  getAttribute(name: string): string | null { return this.attributes[name] ?? null; }
  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
    if (name === "class") this.className = value;
    else if (name === "id") this.id = value;
    else if (name === "hidden") this.hidden = true;
    else if (name === "disabled") this.disabled = true;
    else if (name === "checked") this.checked = true;
    else if (name === "title") this.title = value;
    else if (name === "src") this.src = value;
    else if (name === "value") this.value = value;
    else if (name.startsWith("data-")) this.dataset[name.slice(5)] = value;
  }
  removeAttribute(name: string): void {
    delete this.attributes[name];
    if (name === "class") this.className = "";
    else if (name === "id") this.id = "";
    else if (name === "hidden") this.hidden = false;
    else if (name === "disabled") this.disabled = false;
    else if (name === "checked") this.checked = false;
    else if (name === "title") this.title = "";
    else if (name === "src") this.src = "";
    else if (name.startsWith("data-")) delete this.dataset[name.slice(5)];
  }
  addEventListener(event: string, handler: (event?: unknown) => void, options?: { readonly signal?: AbortSignal }): void {
    if (options?.signal?.aborted) return;
    (this.handlers[event] ??= []).push(handler);
  }
  dispatchEvent(event: { type: string }): void { this.handlers[event.type]?.forEach((h) => h(event)); }
  trigger(event: string, data?: unknown): void { this.handlers[event]?.forEach((h) => h(data)); }
  appendChild(child: unknown): void {
    if (!(child instanceof FakeElement)) return;
    if (child.tagName === "DOCUMENT_FRAGMENT") {
      for (const fragmentChild of child.children) {
        fragmentChild.parent = this;
        this.children.push(fragmentChild);
      }
      child.children = [];
      return;
    }
    child.parent = this;
    this.children.push(child);
  }
  remove(): void {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((c) => c !== this);
    this.parent = null;
    this.isConnected = false;
  }
  contains(shipB: unknown): boolean {
    if (!(shipB instanceof FakeElement)) return false;
    return shipB === this || this.children.includes(shipB);
  }
  closest(selector?: string): FakeElement | null {
    if (!selector) return null;
    const ids = selector.split(",").map((s) => s.trim()).filter((s) => s.startsWith("#")).map((s) => s.slice(1));
    const attrs = selector.split(",").map((s) => s.trim()).filter((s) => s.startsWith("[")).map((s) => parseAttrSelector(s));
    let current: FakeElement | null = this;
    while (current) {
      const node = current;
      if (ids.includes(node.id)) return node;
      if (attrs.some((a) => a !== undefined && node.matchesAttr(a.name, a.value))) return node;
      current = current.parent;
    }
    return null;
  }

  private matchesAttr(name: string, value: string | undefined): boolean {
    const actual = this.getAttribute(name);
    if (actual === null) return false;
    return value === undefined || actual === value;
  }
  querySelector(selector: string): FakeElement | null {
    if (selector.startsWith('[aria-selected="true"]')) {
      return this.children.find((c) => c.getAttribute("aria-selected") === "true") ?? null;
    }
    if (selector.startsWith(".")) {
      const className = selector.slice(1).split(/[.:\s>+~\[]/)[0];
      const attrMatch = selector.match(/\[([^\]=]+)(?:="([^"]*)")?\]/);
      if (attrMatch) {
        const attrName = attrMatch[1];
        const attrValue = attrMatch[2];
        return findWithClassAndAttr(this, className, attrName, attrValue) ?? null;
      }
      return this.children.find((c) => c.className.split(" ").includes(className)) ?? null;
    }
    return this.children[0] ?? null;
  }
  querySelectorAll(selector: string): FakeElement[] {
    if (selector.startsWith(".")) {
      const className = selector.slice(1).split(/[.:\s>+~\[]/)[0];
      return collectByClassName(this, className);
    }
    return [];
  }
}

function collectByClassName(root: FakeElement, className: string): FakeElement[] {
  const results: FakeElement[] = [];
  for (const child of root.children) {
    if (child.className.split(" ").includes(className)) results.push(child);
    results.push(...collectByClassName(child, className));
  }
  return results;
}

function findWithClassAndAttr(root: FakeElement, className: string, attrName: string, attrValue: string | undefined): FakeElement | undefined {
  for (const child of root.children) {
    if (child.className.split(" ").includes(className)) {
      const actual = child.getAttribute(attrName);
      if (actual !== null && (attrValue === undefined || actual === attrValue)) return child;
    }
    const found = findWithClassAndAttr(child, className, attrName, attrValue);
    if (found) return found;
  }
  return undefined;
}

function parseAttrSelector(token: string): { name: string; value: string | undefined } | undefined {
  const match = /^\[([^\]=]+)(?:="([^"]*)")?\]$/.exec(token);
  if (match === null) return undefined;
  return { name: match[1], value: match[2] };
}
