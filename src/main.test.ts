import { container } from "./container";
import { ClipboardUnavailableError } from "./ui";

const DEFAULT_SETTINGS = {
  version: 5 as const,
  tracking: 0.32,
  trackingUnit: "rad" as const,
  sigRes: "S" as const,
  optimal: 5000,
  falloff: 5000,
  attackerSpeed: 0,
  attackerMode: "keepAtRange" as const,
  attackerRange: 5000,
  gridBrightness: 0.2,
  attackerMass: 1_200_000,
  attackerInertia: 3,
  attackerSkillLevel: 5,
  attackerOverload: true,
  initialDistance: 5000,
  targetSpeed: 1000,
  targetMode: "orbit" as const,
  targetRange: 5000,
  targetMass: 10_000_000,
  targetInertia: 0.45,
  targetSkillLevel: 5,
  targetOverload: true,
  targetSig: 40,
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
  style: Record<string, string> = {};
  classList = { toggle: vi.fn() };
  children: FakeElement[] = [];
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
  "attacker-hull": "",
  "attacker-speed": "0",
  "attacker-propulsion": "",
  "attacker-skills": "5",
  "attacker-mass": "1200000",
  "attacker-inertia": "3",
  "attacker-mode": "keepAtRange",
  "attacker-range": "5000",
  "maneuver-aggressivity": "1",
  "grid-brightness-slider": "0.2",
  "initial-distance": "5000",
  "target-hull": "",
  "target-speed": "1000",
  "target-propulsion": "",
  "target-skills": "5",
  "target-mass": "10000000",
  "target-inertia": "0.45",
  "target-mode": "orbit",
  "target-range": "5000",
  "target-sig": "40",
  "sim-speed": "4",
};

const TAG_BY_ID: Record<string, string> = {
  "app-version": "SPAN",
  "attacker-align-time": "SPAN",
  "attacker-ammo-all-list": "UL",
  "attacker-ammo-all-section": "DIV",
  "attacker-ammo-cargo-label": "SPAN",
  "attacker-ammo-cargo-list": "UL",
  "attacker-ammo-expand": "BUTTON",
  "attacker-ammo-field": "DIV",
  "attacker-ammo-popup": "DIV",
  "attacker-ammo-summary": "SPAN",
  "attacker-ammo-summary-icon": "IMG",
  "attacker-ammo-trigger": "BUTTON",
  "attacker-fitting-empty": "P",
  "attacker-fitting-name": "SPAN",
  "attacker-fitting-popup": "DIV",
  "attacker-fitting-preset-label": "SPAN",
  "attacker-fitting-preset-list": "UL",
  "attacker-fitting-preview": "DIV",
  "attacker-fitting-saved-label": "SPAN",
  "attacker-fitting-saved-list": "UL",
  "attacker-fitting-trigger": "BUTTON",
  "attacker-hull": "INPUT",
  "attacker-hull-hint": "SPAN",
  "attacker-import-fitting": "BUTTON",
  "attacker-import-status": "SPAN",
  "attacker-inertia": "INPUT",
  "attacker-mass": "INPUT",
  "attacker-mode": "SELECT",
  "attacker-overload": "INPUT",
  "attacker-overload-button": "BUTTON",
  "attacker-paste-input": "TEXTAREA",
  "attacker-paste-popup": "DIV",
  "attacker-propulsion": "SELECT",
  "attacker-propulsion-gear": "BUTTON",
  "attacker-propulsion-options": "DIV",
  "attacker-propulsion-variants": "DIV",
  "attacker-range": "INPUT",
  "attacker-ship-image": "IMG",
  "attacker-skill-field": "DIV",
  "attacker-skill-options": "DIV",
  "attacker-skill-popup": "DIV",
  "attacker-skill-summary": "SPAN",
  "attacker-skill-trigger": "BUTTON",
  "attacker-skills": "SELECT",
  "attacker-speed": "INPUT",
  "falloff": "INPUT",
  "grid-brightness-slider": "INPUT",
  "grid-brightness-value": "OUTPUT",
  "hull-options": "DATALIST",
  "import-profile": "BUTTON",
  "import-side-attacker": "BUTTON",
  "import-side-popup": "DIV",
  "import-side-target": "BUTTON",
  "initial-distance": "INPUT",
  "lang-en": "BUTTON",
  "lang-ja": "BUTTON",
  "lang-zh": "BUTTON",
  "maneuver-aggressivity": "INPUT",
  "maneuver-aggressivity-slider": "INPUT",
  "maneuver-aggressivity-value": "OUTPUT",
  "optimal": "INPUT",
  "play": "BUTTON",
  "profile-delete": "BUTTON",
  "profile-name": "INPUT",
  "profile-save": "BUTTON",
  "profile-select": "SELECT",
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
  "share-status": "SPAN",
  "sig-res-options": "DIV",
  "sigRes": "SELECT",
  "sim-speed": "SELECT",
  "slide-hints": "SPAN",
  "target-align-time": "SPAN",
  "target-fitting-empty": "P",
  "target-fitting-name": "SPAN",
  "target-fitting-popup": "DIV",
  "target-fitting-preset-label": "SPAN",
  "target-fitting-preset-list": "UL",
  "target-fitting-preview": "DIV",
  "target-fitting-saved-label": "SPAN",
  "target-fitting-saved-list": "UL",
  "target-fitting-trigger": "BUTTON",
  "target-hull": "INPUT",
  "target-hull-hint": "SPAN",
  "target-import-fitting": "BUTTON",
  "target-import-status": "SPAN",
  "target-inertia": "INPUT",
  "target-mass": "INPUT",
  "target-mode": "SELECT",
  "target-overload": "INPUT",
  "target-overload-button": "BUTTON",
  "target-paste-input": "TEXTAREA",
  "target-paste-popup": "DIV",
  "target-propulsion": "SELECT",
  "target-propulsion-gear": "BUTTON",
  "target-propulsion-options": "DIV",
  "target-propulsion-variants": "DIV",
  "target-range": "INPUT",
  "target-ship-image": "IMG",
  "target-sig": "INPUT",
  "target-skill-field": "DIV",
  "target-skill-options": "DIV",
  "target-skill-popup": "DIV",
  "target-skill-summary": "SPAN",
  "target-skill-trigger": "BUTTON",
  "target-skills": "SELECT",
  "target-speed": "INPUT",
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
    location: { href: "http://localhost/" },
    history: { replaceState: vi.fn() },
    navigator: { clipboard: { readText: vi.fn(), writeText: vi.fn(async () => {}) } },
  } as unknown as Window;
}

const GLOBAL_KEYS = ["document", "localStorage", "window", "HTMLCanvasElement", "performance", "requestAnimationFrame"];

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
