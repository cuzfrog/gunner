import type { HitChance } from "../sim";
import { SHIP_PROFILES, effectiveStats, fittingOptions } from "../ships";
import { DomControls } from "./controls";
import type { I18n, Language } from "./i18n";
import type { ClipboardProvider, SettingsStore, UserSettings } from "./settings";
import { USER_SETTINGS_VERSION } from "./settings";

const DEFAULT_INPUTS: Record<string, string> = {
  tracking: "0.32",
  sigRes: "S",
  optimal: "5000",
  falloff: "5000",
  "attacker-hull": "",
  "attacker-speed": "0",
  "attacker-propulsion": "",
  "attacker-mass": "1200000",
  "attacker-inertia": "3",
  "attacker-mode": "keepAtRange",
  "attacker-range": "5000",
  "initial-distance": "5000",
  "target-hull": "",
  "target-speed": "1000",
  "target-propulsion": "",
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
  placeholder = "";
  disabled = false;
  label = "";
  style: Record<string, string> = {};
  classList = { toggle: vi.fn() };
  children: FakeElement[] = [];
  private readonly handlers: Record<string, Array<() => void>> = {};
  private readonly attributes: Record<string, string | null> = {};

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  addEventListener(event: string, handler: () => void): void {
    this.handlers[event] ??= [];
    this.handlers[event].push(handler);
  }

  trigger(event: string): void {
    this.handlers[event]?.forEach((handler) => handler());
  }

  appendChild(child: unknown): void {
    this.children.push(child as FakeElement);
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

function buildControls(document: Document, savedSettings: UserSettings | null = null) {
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
    load: vi.fn(() => savedSettings),
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

function rifterProfile() {
  const found = SHIP_PROFILES.find((p) => p.name === "Rifter");
  if (!found) throw new Error("Rifter profile missing");
  return found;
}

function mwd5mnForRifter() {
  return fittingOptions(rifterProfile()).find((m) => m.id === "mwd-5mn")!;
}

describe("DomControls", () => {
  beforeEach(() => {
    globalThis.document = fakeDocument() as unknown as Document;
  });

  afterEach(() => {
    globalThis.document = undefined as unknown as Document;
  });

  test("getConfig maps all ship inputs including mass and inertia", () => {
    const { controls } = buildControls(globalThis.document);
    const config = controls.getConfig();
    expect(config.attacker.mass).toBe(1_200_000);
    expect(config.attacker.inertiaModifier).toBe(3);
    expect(config.target.mass).toBe(10_000_000);
    expect(config.target.inertiaModifier).toBe(0.45);
  });

  test("saving clamps an empty initial distance to 1", () => {
    const { settingsStore } = buildControls(globalThis.document);
    const input = getFake(globalThis.document, "initial-distance");
    input.value = "";
    input.trigger("input");
    const [saved] = settingsStore.save.mock.calls[0];
    expect(saved.initialDistance).toBe(1);
  });

  test("saving clamps a zero target signature to 1", () => {
    const { settingsStore } = buildControls(globalThis.document);
    const input = getFake(globalThis.document, "target-sig");
    input.value = "0";
    input.trigger("input");
    const [saved] = settingsStore.save.mock.calls[0];
    expect(saved.targetSig).toBe(1);
  });

  test("share link writes the URL to the injected clipboard", async () => {
    const { settingsStore, clipboard } = buildControls(globalThis.document);
    const button = getFake(globalThis.document, "share-link");
    button.trigger("click");
    await Promise.resolve();
    const [settings, passedClipboard] = settingsStore.writeUrlToClipboard.mock.calls[0];
    expect(settings.version).toBe(USER_SETTINGS_VERSION);
    expect(passedClipboard).toBe(clipboard);
  });

  test("selecting a hull populates base stats and enables tier-correct propulsion options", () => {
    buildControls(globalThis.document);
    const rifter = rifterProfile();
    const base = effectiveStats(rifter);

    const input = getFake(globalThis.document, "attacker-hull");
    input.value = "rifter";
    input.trigger("input");

    expect(getFake(globalThis.document, "attacker-hull").value).toBe("Rifter");
    expect(getFake(globalThis.document, "attacker-speed").value).toBe(String(base.maxSpeed));
    expect(getFake(globalThis.document, "attacker-mass").value).toBe(String(base.mass));
    expect(getFake(globalThis.document, "attacker-inertia").value).toBe(String(base.inertiaModifier));
    expect(getFake(globalThis.document, "attacker-hull-hint").textContent).toContain("Standard Frigates");

    const propulsion = getFake(globalThis.document, "attacker-propulsion");
    expect(propulsion.disabled).toBe(false);
    const ids = propulsion.children.map((c) => c.value);
    expect(ids).toEqual(["", "ab-1mn", "mwd-5mn", "ab-10mn"]);
  });

  test("choosing an MWD updates target speed, mass and signature radius", () => {
    buildControls(globalThis.document);
    const rifter = rifterProfile();

    getFake(globalThis.document, "target-hull").value = "Rifter";
    getFake(globalThis.document, "target-hull").trigger("input");

    const propulsion = getFake(globalThis.document, "target-propulsion");
    propulsion.value = "mwd-5mn";
    propulsion.trigger("change");

    const expected = effectiveStats(rifter, mwd5mnForRifter());
    expect(getFake(globalThis.document, "target-speed").value).toBe(String(expected.maxSpeed));
    expect(getFake(globalThis.document, "target-mass").value).toBe(String(expected.mass));
    expect(getFake(globalThis.document, "target-sig").value).toBe(String(expected.sigRadius));
    expect(getFake(globalThis.document, "target-hull-hint").textContent).toContain("sig ×6");
  });

  test("unknown hull name marks the field invalid and leaves numeric inputs untouched", () => {
    buildControls(globalThis.document);
    const input = getFake(globalThis.document, "attacker-hull");
    input.value = "Not A Ship";
    input.trigger("change");

    expect(input.classList.toggle).toHaveBeenCalledWith("hull-invalid", true);
    expect(getFake(globalThis.document, "attacker-propulsion").disabled).toBe(true);
    expect(getFake(globalThis.document, "attacker-speed").value).toBe(DEFAULT_INPUTS["attacker-speed"]);
    expect(getFake(globalThis.document, "attacker-mass").value).toBe(DEFAULT_INPUTS["attacker-mass"]);
  });

  test("load with a known hull restores selection without overwriting saved numeric inputs", () => {
    const settings: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 1234,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      attackerMass: 2_000_000,
      attackerInertia: 2.5,
      attackerHull: "Rifter",
      attackerPropulsion: "mwd-5mn",
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };

    buildControls(globalThis.document, settings);

    expect(getFake(globalThis.document, "attacker-hull").value).toBe("Rifter");
    expect(getFake(globalThis.document, "attacker-propulsion").value).toBe("mwd-5mn");
    expect(getFake(globalThis.document, "attacker-speed").value).toBe("1234");
    expect(getFake(globalThis.document, "attacker-mass").value).toBe("2000000");
  });

  test("changing propulsion to none does not overwrite a manual inertia edit", () => {
    buildControls(globalThis.document);

    const hullInput = getFake(globalThis.document, "target-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const propulsion = getFake(globalThis.document, "target-propulsion");
    propulsion.value = "mwd-5mn";
    propulsion.trigger("change");

    getFake(globalThis.document, "target-inertia").value = "99";
    getFake(globalThis.document, "target-inertia").trigger("input");

    propulsion.value = "";
    propulsion.trigger("change");

    expect(getFake(globalThis.document, "target-inertia").value).toBe("99");
  });

  test("reselecting the same hull keeps the fitted propulsion and stats", () => {
    buildControls(globalThis.document);

    const hullInput = getFake(globalThis.document, "attacker-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const propulsion = getFake(globalThis.document, "attacker-propulsion");
    propulsion.value = "mwd-5mn";
    propulsion.trigger("change");

    const speedWithMwd = getFake(globalThis.document, "attacker-speed").value;
    const massWithMwd = getFake(globalThis.document, "attacker-mass").value;

    hullInput.value = "Rifter";
    hullInput.trigger("change");

    expect(getFake(globalThis.document, "attacker-propulsion").value).toBe("mwd-5mn");
    expect(getFake(globalThis.document, "attacker-speed").value).toBe(speedWithMwd);
    expect(getFake(globalThis.document, "attacker-mass").value).toBe(massWithMwd);
  });

  test("reselecting the same hull preserves manually edited stats", () => {
    buildControls(globalThis.document);

    const hullInput = getFake(globalThis.document, "attacker-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const propulsion = getFake(globalThis.document, "attacker-propulsion");
    propulsion.value = "mwd-5mn";
    propulsion.trigger("change");

    getFake(globalThis.document, "attacker-inertia").value = "99";
    getFake(globalThis.document, "attacker-inertia").trigger("input");
    getFake(globalThis.document, "attacker-speed").value = "1234";
    getFake(globalThis.document, "attacker-speed").trigger("input");

    hullInput.value = "Rifter";
    hullInput.trigger("change");

    expect(getFake(globalThis.document, "attacker-propulsion").value).toBe("mwd-5mn");
    expect(getFake(globalThis.document, "attacker-inertia").value).toBe("99");
    expect(getFake(globalThis.document, "attacker-speed").value).toBe("1234");
  });

  test("load with an unknown hull leaves inputs saved and the hull selection empty", () => {
    const settings: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 1234,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      attackerMass: 2_000_000,
      attackerInertia: 2.5,
      attackerHull: "Unknown Ship",
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };

    buildControls(globalThis.document, settings);

    expect(getFake(globalThis.document, "attacker-hull").value).toBe("");
    expect(getFake(globalThis.document, "attacker-speed").value).toBe("1234");
    expect(getFake(globalThis.document, "attacker-mass").value).toBe("2000000");
  });
});
