import { container } from "./container";

const DEFAULT_SETTINGS = {
  version: 2 as const,
  tracking: 0.32,
  trackingUnit: "rad" as const,
  sigRes: "S" as const,
  optimal: 5000,
  falloff: 5000,
  attackerSpeed: 0,
  attackerMode: "keepAtRange" as const,
  attackerRange: 5000,
  initialDistance: 5000,
  targetSpeed: 1000,
  targetMode: "orbit" as const,
  targetRange: 5000,
  targetSig: 40,
  simSpeed: 4,
  language: "en" as const,
};

class FakeElement {
  value = "";
  textContent = "";
  innerHTML = "";
  placeholder = "";
  style: Record<string, string> = {};
  classList = { toggle: vi.fn() };
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

  appendChild(_child: unknown): void {
    // no-op: tests do not inspect the rendered profile list.
  }
}

class FakeCanvas extends FakeElement {
  width = 800;
  height = 600;
  getContext = vi.fn((_: string) => fakeRenderingContext());
}

function fakeRenderingContext(): CanvasRenderingContext2D {
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
  } as unknown as CanvasRenderingContext2D;
}

function fakeDocument(): Document {
  const elements = new Map<string, FakeElement | FakeCanvas>();
  return {
    documentElement: { lang: "en" } as unknown as HTMLElement,
    getElementById: (id: string) => {
      if (!elements.has(id)) {
        elements.set(id, id === "scene" ? new FakeCanvas() : new FakeElement());
      }
      return elements.get(id) as unknown as HTMLElement;
    },
    querySelectorAll: () => [] as unknown as NodeListOf<Element>,
    createElement: () => new FakeElement() as unknown as HTMLElement,
  } as unknown as Document;
}

function fakeLocalStorage(): Storage {
  return {
    getItem: vi.fn((key: string) => {
      if (key === "gunner-settings-v2") return JSON.stringify(DEFAULT_SETTINGS);
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
    navigator: { clipboard: { writeText: vi.fn(async () => {}) } },
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

  test("wires the container and starts the app without DI errors", async () => {
    await expect(import("./main")).resolves.toBeDefined();
    expect(container.cradle.app).toBeDefined();
  });
});
