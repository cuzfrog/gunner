import { container } from "./container";
import { ClipboardUnavailableError } from "./appstate";
import { DEFAULT_VALUES, TAG_BY_ID } from "./ui/controls";

const DEFAULT_SETTINGS = {
  version: 5 as const,
  tracking: 0.32,
  trackingUnit: "rad" as const,
  sigRes: "S" as const,
  optimal: 5000,
  falloff: 5000,
  shipASpeed: 0,
  shipAMode: "keepAtRange" as const,
  shipARange: 5000,
  gridBrightness: 0.2,
  shipAMass: 1_200_000,
  shipAInertia: 3,
  shipASkillLevel: 5,
  shipAOverload: true,
  initialDistance: 20000,
  shipBSpeed: 1000,
  shipBMode: "orbit" as const,
  shipBRange: 5000,
  shipBMass: 10_000_000,
  shipBInertia: 0.45,
  shipBSkillLevel: 5,
  shipBOverload: true,
  shipBSig: 40,
  shipAAmmo: "12608",
  shipBAmmo: "12608",
  simSpeed: 4,
  language: "en" as const,
};

class FakeElement {
  value = "";
  checked = false;
  hidden = false;
  disabled = false;
  textContent = "";
  innerHTML = "";
  placeholder = "";
  src = "";
  tagName = "";
  className = "";
  nodeType = 1;
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  classList = { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() };
  children: FakeElement[] = [];
  get options(): FakeElement[] { return this.children; }
  private readonly handlers: Record<string, Array<() => void>> = {};
  private readonly attributes: Record<string, string | null> = {};

  getAttribute(qualifiedName: string): string | null {
    return this.attributes[qualifiedName] ?? null;
  }

  setAttribute(qualifiedName: string, value: string): void {
    this.attributes[qualifiedName] = value;
  }

  addEventListener(event: string, handler: () => void): void {
    this.handlers[event] ??= [];
    this.handlers[event].push(handler);
  }

  trigger(event: string): void {
    this.handlers[event]?.forEach((handler) => handler());
  }

  dispatchEvent(event: { type: string }): void {
    this.trigger(event.type);
  }

  appendChild(child: unknown): void {
    this.children.push(child as FakeElement);
  }

  focus = vi.fn();

  closest(): FakeElement | null {
    return null;
  }

  querySelector(selector: string): FakeElement | null {
    if (selector.startsWith(".")) {
      const className = selector.slice(1).split(/[.:\s>+~\[]/)[0];
      const attrMatch = selector.match(/\[([^\]=]+)(?:="([^"]*)")?\]/);
      if (attrMatch) {
        return findWithClassAndAttr(this, className, attrMatch[1], attrMatch[2]) ?? null;
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

  contains(shipB: FakeElement): boolean {
    if (shipB === this) return true;
    return this.children.some((child) => child.contains(shipB));
  }
}

type Mocked = ReturnType<typeof vi.fn>;

interface FakeContext {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  fillRect: Mocked;
  strokeRect: Mocked;
  clearRect: Mocked;
  beginPath: Mocked;
  closePath: Mocked;
  moveTo: Mocked;
  lineTo: Mocked;
  arc: Mocked;
  stroke: Mocked;
  fill: Mocked;
  save: Mocked;
  restore: Mocked;
  translate: Mocked;
  rotate: Mocked;
  setLineDash: Mocked;
  fillText: Mocked;
  measureText: Mocked;
}

class FakeCanvas extends FakeElement {
  width = 800;
  height = 600;
  clientWidth = 0;
  clientHeight = 0;
  ctx: FakeContext = fakeRenderingContext();
  getContext = vi.fn((_: string) => this.ctx as unknown as CanvasRenderingContext2D);
}

function fakeRenderingContext(): FakeContext {
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    setLineDash: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
  };
}

function fakeDocument(): Document {
  const elements = new Map<string, FakeElement | FakeCanvas>();
  return {
    documentElement: { lang: "en" } as unknown as HTMLElement,
    getElementById: (id: string) => {
      if (!elements.has(id)) {
        const el = id === "scene" ? new FakeCanvas() : new FakeElement();
        if (id in DEFAULT_VALUES) el.value = DEFAULT_VALUES[id];
        if (id === "ship-a-portrait" || id === "ship-b-portrait") {
          const img = new FakeElement();
          img.tagName = "IMG";
          img.className = "portrait-image";
          el.appendChild(img);
          const lockBadge = new FakeElement();
          lockBadge.tagName = "DIV";
          lockBadge.className = "portrait-lock-badge";
          lockBadge.hidden = true;
          el.appendChild(lockBadge);
          const hpBars = new FakeElement();
          hpBars.tagName = "DIV";
          hpBars.className = "portrait-hp-bars";
          for (const layer of ["shield", "armor", "hull"]) {
            const row = new FakeElement();
            row.tagName = "DIV";
            row.className = "portrait-hp-row";
            const bar = new FakeElement();
            bar.tagName = "DIV";
            bar.className = `portrait-hp-bar portrait-hp-bar-${layer}`;
            const fill = new FakeElement();
            fill.tagName = "SPAN";
            fill.className = "portrait-hp-fill";
            bar.appendChild(fill);
            row.appendChild(bar);
            const value = new FakeElement();
            value.tagName = "SPAN";
            value.className = "portrait-hp-value mono";
            value.setAttribute("data-defense-layer", layer);
            value.hidden = true;
            row.appendChild(value);
            hpBars.appendChild(row);
          }
          el.appendChild(hpBars);
          const effects = new FakeElement();
          effects.tagName = "DIV";
          effects.className = "portrait-effects";
          el.appendChild(effects);
        }
        elements.set(id, el);
      }
      elements.get(id)!.tagName = TAG_BY_ID[id] ?? "DIV";
      return elements.get(id) as unknown as HTMLElement;
    },
    querySelectorAll: () => [] as unknown as NodeListOf<Element>,
    createElement: (tagName: string) => {
      const el = new FakeElement();
      el.tagName = tagName.toUpperCase();
      return el as unknown as HTMLElement;
    },
    createDocumentFragment: () => new FakeElement() as unknown as DocumentFragment,
    createTextNode: (text: string) => {
      const node = new FakeElement();
      node.textContent = text;
      node.nodeType = 3;
      return node as unknown as Text;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Document;
}

function fakeLocalStorage(): Storage {
  return {
    getItem: vi.fn((key: string) => {
      if (key === "gunner-settings-v5") return JSON.stringify(DEFAULT_SETTINGS);
      return null;
    }),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  } as unknown as Storage;
}

function fakeWindow(): Window {
  return {
    innerWidth: 1024,
    innerHeight: 768,
    location: { href: "http://localhost/" },
    history: { replaceState: vi.fn() },
    navigator: { clipboard: { readText: vi.fn(), writeText: vi.fn(async () => {}) } },
  } as unknown as Window;
}

const GLOBAL_KEYS = ["document", "localStorage", "window", "HTMLCanvasElement", "Element", "performance", "requestAnimationFrame"];

let originals: Record<string, unknown> = {};

function installGlobals(): void {
  originals = {};
  for (const key of GLOBAL_KEYS) {
    originals[key] = (globalThis as Record<string, unknown>)[key];
  }

  globalThis.document = fakeDocument() as unknown as Document;
  globalThis.localStorage = fakeLocalStorage() as unknown as Storage;
  (globalThis as Record<string, unknown>).window = fakeWindow();
  globalThis.HTMLCanvasElement = FakeCanvas as unknown as typeof HTMLCanvasElement;
  globalThis.Element = FakeElement as unknown as typeof Element;
  globalThis.performance = { now: vi.fn(() => 0) } as unknown as Performance;
  globalThis.requestAnimationFrame = vi.fn(() => 0);
}

function restoreGlobals(): void {
  for (const key of GLOBAL_KEYS) {
    if (originals[key] === undefined) {
      delete (globalThis as Record<string, unknown>)[key];
    } else {
      (globalThis as Record<string, unknown>)[key] = originals[key];
    }
  }
}

describe("main", () => {
  beforeEach(() => {
    installGlobals();
  });

  afterEach(() => {
    restoreGlobals();
  });

  test("wires the container and re-renders the canvas in the selected language", async () => {
    await expect(import("./main")).resolves.toBeDefined();
    expect(container.cradle.app).toBeDefined();

    const scene = globalThis.document.getElementById("scene") as unknown as FakeCanvas;
    const ctx = scene.ctx;
    ctx.fillText.mockClear();

    const langZh = globalThis.document.getElementById("lang-zh") as unknown as FakeElement;
    langZh.trigger("click");

    expect(ctx.fillText.mock.calls.some((call) => String(call[0]).includes("距离"))).toBe(true);
  });

  test("clipboard readText returns the text when the Clipboard API succeeds", async () => {
    await import("./main");
    const win = (globalThis as Record<string, unknown>).window as { navigator: { clipboard: { readText: Mocked } } };
    win.navigator.clipboard.readText.mockResolvedValue("[Rifter, Pasted]");
    const text = await container.cradle.clipboard.readText();
    expect(text).toBe("[Rifter, Pasted]");
  });

  test("clipboard readText throws ClipboardUnavailableError when the Clipboard API is missing", async () => {
    await import("./main");
    const win = (globalThis as Record<string, unknown>).window as { navigator: { clipboard: { readText?: Mocked } } };
    win.navigator.clipboard.readText = undefined;
    await expect(container.cradle.clipboard.readText()).rejects.toThrow(ClipboardUnavailableError);
  });

  test("clipboard readText throws ClipboardUnavailableError when the Clipboard API rejects", async () => {
    await import("./main");
    const win = (globalThis as Record<string, unknown>).window as { navigator: { clipboard: { readText: Mocked } } };
    win.navigator.clipboard.readText.mockRejectedValue(new Error("denied"));
    await expect(container.cradle.clipboard.readText()).rejects.toThrow(ClipboardUnavailableError);
  });
});

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
