import { container } from "./container";
import { ClipboardUnavailableError } from "./appstate";

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
  initialDistance: 5000,
  shipBSpeed: 1000,
  shipBMode: "orbit" as const,
  shipBRange: 5000,
  shipBMass: 10_000_000,
  shipBInertia: 0.45,
  shipBSkillLevel: 5,
  shipBOverload: true,
  shipBSig: 40,
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
      return this.children.find((c) => c.className.split(" ").includes(className)) ?? null;
    }
    return this.children[0] ?? null;
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

const DEFAULT_VALUES: Record<string, string> = {
  tracking: "0.32",
  sigRes: "S",
  optimal: "5000",
  falloff: "5000",
  "ship-a-hull": "",
  "ship-a-speed": "0",
  "ship-a-propulsion": "",
  "ship-a-skills": "5",
  "ship-a-mass": "1200000",
  "ship-a-inertia": "3",
  "ship-a-mode": "keepAtRange",
  "ship-a-range": "5000",
  "ship-a-aggressivity": "1",
  "ship-a-aggressivity-slider": "0.5",
  "grid-brightness-slider": "0.2",
  "zoom-slider": "1",
  "initial-distance": "5000",
  "ship-b-hull": "",
  "ship-b-speed": "1000",
  "ship-b-propulsion": "",
  "ship-b-skills": "5",
  "ship-b-mass": "10000000",
  "ship-b-inertia": "0.45",
  "ship-b-mode": "orbit",
  "ship-b-range": "5000",
  "ship-b-aggressivity": "1",
  "ship-b-aggressivity-slider": "0.5",
  "ship-b-sig": "40",
  "sim-speed": "4",
};

const TAG_BY_ID: Record<string, string> = {
  "app-version": "SPAN",
  "ship-a-align-time": "SPAN",
  "ship-a-ammo-all-list": "UL",
  "ship-a-ammo-all-section": "DIV",
  "ship-a-ammo-cargo-label": "SPAN",
  "ship-a-ammo-cargo-list": "UL",
  "ship-a-ammo-expand": "BUTTON",
  "ship-a-ammo-field": "DIV",
  "ship-a-ammo-popup": "DIV",
  "ship-a-ammo-summary": "SPAN",
  "ship-a-ammo-summary-icon": "IMG",
  "ship-a-ammo-trigger": "BUTTON",
  "ship-a-ewar-trigger": "BUTTON",
  "ship-a-ewar-popup": "DIV",
  "ship-a-ewar-summary-row": "SPAN",
  "ship-a-ewar-summary": "SPAN",
  "ship-a-ewar-section": "DIV",
  "ship-a-booster-section": "DIV",
  "ship-a-booster-summary": "SPAN",
  "ship-a-fitting-empty": "P",
  "ship-a-fitting-name": "SPAN",
  "ship-a-fitting-popup": "DIV",
  "ship-a-fitting-preset-label": "SPAN",
  "ship-a-fitting-preset-list": "UL",
  "ship-a-fitting-preview": "DIV",
  "ship-a-fitting-saved-label": "SPAN",
  "ship-a-fitting-saved-list": "UL",
  "ship-a-fitting-trigger": "BUTTON",
  "ship-a-fitting-eye": "BUTTON",
  "ship-a-hull": "INPUT",
  "ship-a-hull-hint": "SPAN",
  "ship-a-import-fitting": "BUTTON",
  "ship-a-inertia": "INPUT",
  "ship-a-mass": "INPUT",
  "ship-a-mode": "SELECT",
  "ship-a-overload": "INPUT",
  "ship-a-overload-button": "BUTTON",
  "ship-a-paste-input": "TEXTAREA",
  "ship-a-paste-popup": "DIV",
  "ship-a-propulsion": "SELECT",
  "ship-a-propulsion-gear": "BUTTON",
  "ship-a-propulsion-options": "DIV",
  "ship-a-propulsion-variants": "DIV",
  "ship-a-range": "INPUT",
  "ship-a-ship-image": "IMG",
  "ship-a-skill-field": "DIV",
  "ship-a-skill-options": "DIV",
  "ship-a-skill-popup": "DIV",
  "ship-a-skill-summary": "SPAN",
  "ship-a-skill-trigger": "BUTTON",
  "ship-a-skills": "SELECT",
  "ship-a-speed": "INPUT",
  "auto-zoom": "INPUT",
  "falloff": "INPUT",
  "canvas-settings-popup": "DIV",
  "canvas-settings-trigger": "BUTTON",
  "grid-brightness-slider": "INPUT",
  "grid-brightness-value": "OUTPUT",
  "hull-options": "DATALIST",
  "zoom-slider": "INPUT",
  "zoom-value": "OUTPUT",
  "import-profile": "BUTTON",
  "import-side-ship-a": "BUTTON",
  "import-side-popup": "DIV",
  "import-side-ship-b": "BUTTON",
  "initial-distance": "INPUT",
  "lang-en": "BUTTON",
  "lang-ja": "BUTTON",
  "lang-zh": "BUTTON",
  "ship-a-aggressivity": "INPUT",
  "ship-a-aggressivity-slider": "INPUT",
  "ship-a-aggressivity-value": "OUTPUT",
  "ship-b-aggressivity": "INPUT",
  "ship-b-aggressivity-slider": "INPUT",
  "ship-b-aggressivity-value": "OUTPUT",
  "optimal": "INPUT",
  "play": "BUTTON",
  "confirm-cancel": "BUTTON",
  "confirm-message": "SPAN",
  "confirm-ok": "BUTTON",
  "confirm-popup": "DIV",
  "profile-delete": "BUTTON",
  "profile-new": "BUTTON",
  "new-profile-cancel": "BUTTON",
  "new-profile-confirm": "BUTTON",
  "new-profile-name": "INPUT",
  "new-profile-popup": "DIV",
  "profile-save": "BUTTON",
  "profile-select-trigger": "BUTTON",
  "profile-select-label": "SPAN",
  "profile-popup": "DIV",
  "res-angular": "SPAN",
  "res-distance": "SPAN",
  "res-hit": "SPAN",
  "res-radial": "SPAN",
  "res-range-pen": "SPAN",
  "res-track-pen": "SPAN",
  "res-transversal": "SPAN",
  "reset": "BUTTON",
  "scene": "CANVAS",
  "share-link": "BUTTON",
  "share-popup": "DIV",
  "share-copy-url": "BUTTON",
  "share-copy-text": "BUTTON",
  "share-status": "SPAN",
  "sig-res-options": "DIV",
  "sigRes": "SELECT",
  "sim-speed": "SELECT",
  "slide-hints": "SPAN",
  "ship-b-align-time": "SPAN",
  "ship-b-fitting-empty": "P",
  "ship-b-fitting-name": "SPAN",
  "ship-b-fitting-popup": "DIV",
  "ship-b-fitting-preset-label": "SPAN",
  "ship-b-fitting-preset-list": "UL",
  "ship-b-fitting-preview": "DIV",
  "ship-b-fitting-saved-label": "SPAN",
  "ship-b-fitting-saved-list": "UL",
  "ship-b-fitting-trigger": "BUTTON",
  "ship-b-fitting-eye": "BUTTON",
  "ship-b-hull": "INPUT",
  "ship-b-hull-hint": "SPAN",
  "ship-b-import-fitting": "BUTTON",
  "ship-b-inertia": "INPUT",
  "ship-b-mass": "INPUT",
  "ship-b-mode": "SELECT",
  "ship-b-overload": "INPUT",
  "ship-b-overload-button": "BUTTON",
  "ship-b-ewar-trigger": "BUTTON",
  "ship-b-ewar-popup": "DIV",
  "ship-b-ewar-summary-row": "SPAN",
  "ship-b-ewar-summary": "SPAN",
  "ship-b-ewar-section": "DIV",
  "ship-b-booster-section": "DIV",
  "ship-b-booster-summary": "SPAN",
  "ship-b-paste-input": "TEXTAREA",
  "ship-b-paste-popup": "DIV",
  "ship-b-propulsion": "SELECT",
  "ship-b-propulsion-gear": "BUTTON",
  "ship-b-propulsion-options": "DIV",
  "ship-b-propulsion-variants": "DIV",
  "ship-b-range": "INPUT",
  "ship-b-ship-image": "IMG",
  "ship-b-sig": "INPUT",
  "ship-b-skill-field": "DIV",
  "ship-b-skill-options": "DIV",
  "ship-b-skill-popup": "DIV",
  "ship-b-skill-summary": "SPAN",
  "ship-b-skill-trigger": "BUTTON",
  "ship-b-skills": "SELECT",
  "ship-b-speed": "INPUT",
  "tracking": "INPUT",
  "tracking-label-text": "SPAN",
  "tracking-unit-rad": "BUTTON",
  "tracking-unit-score": "BUTTON"
};

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
    await container.cradle.itemNameCatalog.ensureLanguage("zh");

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
