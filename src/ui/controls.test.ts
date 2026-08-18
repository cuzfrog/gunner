import type { HitChance } from "../sim";
import { DomControls } from "./controls";
import type { I18n, Language } from "./i18n";
import type { ClipboardProvider, SettingsStore } from "./settings";
import { USER_SETTINGS_VERSION } from "./settings";

const DEFAULT_INPUTS: Record<string, string> = {
  tracking: "0.32",
  sigRes: "S",
  optimal: "5000",
  falloff: "5000",
  "attacker-speed": "0",
  "attacker-mass": "1200000",
  "attacker-inertia": "3",
  "attacker-mode": "keepAtRange",
  "attacker-range": "5000",
  "initial-distance": "5000",
  "target-speed": "1000",
  "target-mass": "10000000",
  "target-inertia": "0.45",
  "target-mode": "orbit",
  "target-range": "5000",
  "target-sig": "40",
  "sim-speed": "4",
};

class FakeElement {
  value = "";
  textContent = "";
  innerHTML = "";
  style: Record<string, string> = {};
  classList = { toggle: vi.fn() };
  private readonly handlers: Record<string, Array<() => void>> = {};

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

function fakeDocument(): Document {
  const elements = new Map<string, FakeElement>();
  return {
    documentElement: { lang: "en" } as unknown as HTMLElement,
    getElementById: (id: string) => {
      if (!elements.has(id)) elements.set(id, new FakeElement());
      return elements.get(id) as unknown as HTMLElement;
    },
    querySelectorAll: () => [] as unknown as NodeListOf<Element>,
    createElement: () => new FakeElement() as unknown as HTMLElement,
  } as unknown as Document;
}

function getFake(document: Document, id: string): FakeElement {
  return document.getElementById(id) as unknown as FakeElement;
}

function setInputValues(document: Document): void {
  for (const [id, value] of Object.entries(DEFAULT_INPUTS)) {
    getFake(document, id).value = value;
  }
}

function buildControls(document: Document) {
  setInputValues(document);
  const hitChance = vi.mocked<HitChance>({
    compute: vi.fn(() => ({ chance: 0, trackingTerm: 0, rangeTerm: 0 })),
    findBestDistance: vi.fn(() => 5000),
  });
  const i18n = vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  });
  const settingsStore = vi.mocked<SettingsStore>({
    load: vi.fn(() => null),
    save: vi.fn(),
    listProfiles: vi.fn(() => []),
    saveProfile: vi.fn(),
    loadProfile: vi.fn(() => null),
    deleteProfile: vi.fn(),
    encodeUrl: vi.fn(() => ""),
    decodeUrl: vi.fn(() => null),
    writeUrlToClipboard: vi.fn(async () => true),
  });
  const clipboard = vi.mocked<ClipboardProvider>({ writeText: vi.fn(async () => {}) });
  const controls = new DomControls({ hitChance, i18n, settingsStore, clipboard });
  return { hitChance, i18n, settingsStore, clipboard, controls };
}

describe("DomControls", () => {
  beforeEach(() => {
    globalThis.document = fakeDocument() as unknown as Document;
  });

  afterEach(() => {
    globalThis.document = undefined as unknown as Document;
  });

  test("getConfig maps all ship inputs including mass and inertia", () => {
    const document = globalThis.document;
    const { controls } = buildControls(document);
    const config = controls.getConfig();
    expect(config.attacker.mass).toBe(1_200_000);
    expect(config.attacker.inertiaModifier).toBe(3);
    expect(config.target.mass).toBe(10_000_000);
    expect(config.target.inertiaModifier).toBe(0.45);
  });

  test("saving clamps an empty initial distance to 1", () => {
    const document = globalThis.document;
    const { settingsStore } = buildControls(document);
    const input = getFake(document, "initial-distance");
    input.value = "";
    input.trigger("input");
    const [saved] = settingsStore.save.mock.calls[0];
    expect(saved.initialDistance).toBe(1);
  });

  test("saving clamps a zero target signature to 1", () => {
    const document = globalThis.document;
    const { settingsStore } = buildControls(document);
    const input = getFake(document, "target-sig");
    input.value = "0";
    input.trigger("input");
    const [saved] = settingsStore.save.mock.calls[0];
    expect(saved.targetSig).toBe(1);
  });

  test("share link writes the URL to the injected clipboard", async () => {
    const document = globalThis.document;
    const { settingsStore, clipboard } = buildControls(document);
    const button = getFake(document, "share-link");
    button.trigger("click");
    await Promise.resolve();
    const [settings, passedClipboard] = settingsStore.writeUrlToClipboard.mock.calls[0];
    expect(settings.version).toBe(USER_SETTINGS_VERSION);
    expect(passedClipboard).toBe(clipboard);
  });
});
