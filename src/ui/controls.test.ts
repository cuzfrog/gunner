import type { EngagementFrame, HitChance, HitChanceBreakdown, ShipState } from "../sim";
import { SHIP_PROFILES, effectiveStats, fittedMassFactor, fittingOptions } from "../ships";
import type { ShipProfile } from "../ships";
import { DomControls } from "./controls";
import type { I18n, Language } from "./i18n";
import type { ClipboardProvider, LocationProvider, ProfileSettings, SettingsStore, UserSettings } from "./settings";
import { USER_SETTINGS_VERSION } from "./settings";

const DEFAULT_INPUTS: Record<string, string> = {
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

class FakeElement {
  value = "";
  checked = false;
  hidden = false;
  textContent = "";
  private _innerHTML = "";
  placeholder = "";
  disabled = false;
  label = "";

  get innerHTML(): string {
    return this._innerHTML;
  }

  set innerHTML(value: string) {
    this._innerHTML = value;
    this.children = [];
  }

  style: Record<string, string> & { setProperty(name: string, value: string): void } = Object.assign(Object.create(null), {
    setProperty(this: Record<string, string>, name: string, value: string) {
      this[name] = value;
    },
  }) as Record<string, string> & { setProperty(name: string, value: string): void };
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

function fakeDocument(): Document {
  const elements = new Map<string, FakeElement>();
  const documentHandlers: Record<string, Array<(event: { type: string; target?: FakeElement }) => void>> = {};
  return {
    documentElement: { lang: "en" } as unknown as HTMLElement,
    getElementById: (id: string) => {
      if (!elements.has(id)) elements.set(id, new FakeElement());
      return elements.get(id) as unknown as HTMLElement;
    },
    querySelectorAll: () => [] as unknown as NodeListOf<Element>,
    createElement: () => new FakeElement() as unknown as HTMLElement,
    addEventListener: (event: string, handler: (event: { type: string; target?: FakeElement }) => void) => {
      documentHandlers[event] ??= [];
      documentHandlers[event].push(handler);
    },
    removeEventListener: () => {},
    dispatchEvent: (event: { type: string; target?: FakeElement }) => {
      documentHandlers[event.type]?.forEach((handler) => handler(event));
    },
  } as unknown as Document;
}

function getFake(document: Document, id: string): FakeElement {
  return document.getElementById(id) as unknown as FakeElement;
}

function setInputValues(document: Document): void {
  for (const [id, value] of Object.entries(DEFAULT_INPUTS)) {
    getFake(document, id).value = value;
  }
  getFake(document, "attacker-overload").checked = true;
  getFake(document, "target-overload").checked = true;

  addChoiceButtons(document, "sig-res-options", ["S", "M", "L", "XL"], "S");

  getFake(document, "attacker-skill-popup").hidden = true;
  getFake(document, "target-skill-popup").hidden = true;
  getFake(document, "attacker-skill-trigger").setAttribute("aria-expanded", "false");
  getFake(document, "target-skill-trigger").setAttribute("aria-expanded", "false");
}

function addChoiceButtons(document: Document, groupId: string, values: string[], selected: string): void {
  const group = getFake(document, groupId);
  for (const value of values) {
    const button = new FakeElement();
    button.setAttribute("data-value", value);
    button.setAttribute("aria-pressed", String(value === selected));
    if (value === selected) button.classList.toggle("active", true);
    group.appendChild(button);
  }
}

function fakeLocation(href = "http://localhost/"): LocationProvider {
  let currentHref = href;
  return {
    get href() {
      return currentHref;
    },
    replace: (url) => {
      currentHref = url;
    },
  };
}

interface SelectedProfile {
  name: string;
  baseline: ProfileSettings;
}

function asProfile(settings: UserSettings): ProfileSettings {
  const { language: _, ...rest } = settings;
  return rest;
}

function buildControls(
  document: Document,
  savedSettings: UserSettings | null = null,
  options: { selectedProfile?: SelectedProfile | null; hasForeignUrlSettings?: boolean; listProfiles?: string[]; language?: Language } = {},
) {
  setInputValues(document);
  const hitChance = vi.mocked<HitChance>({
    compute: vi.fn(() => ({ chance: 0, trackingTerm: 0, rangeTerm: 0 })),
    findBestDistance: vi.fn(() => 5000),
  });
  let currentLanguage: Language = options.language ?? "en";
  const i18n = vi.mocked<I18n>({
    current: vi.fn((): Language => currentLanguage),
    setLanguage: vi.fn((language: Language) => {
      currentLanguage = language;
    }),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
  });
  const settingsStore = vi.mocked<SettingsStore>({
    load: vi.fn(() => savedSettings),
    save: vi.fn(),
    listProfiles: vi.fn(() => options.listProfiles ?? []),
    saveProfile: vi.fn(),
    loadProfile: vi.fn(() => null),
    deleteProfile: vi.fn(),
    hasForeignUrlSettings: vi.fn(() => options.hasForeignUrlSettings ?? false),
    encodeUrl: vi.fn(() => "http://localhost/"),
    decodeUrl: vi.fn(() => null),
    writeUrlToClipboard: vi.fn(async () => true),
    loadSelectedProfile: vi.fn(() => options.selectedProfile ?? null),
    saveSelectedProfile: vi.fn(),
    clearSelectedProfile: vi.fn(),
  });
  const clipboard = vi.mocked<ClipboardProvider>({ writeText: vi.fn(async () => {}) });
  const location = fakeLocation();
  const controls = new DomControls({ hitChance, i18n, settingsStore, clipboard, location });
  return { hitChance, i18n, settingsStore, clipboard, location, controls };
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

  test("selecting a saved profile updates the URL to the encoded shareable link", () => {
    const { settingsStore, location } = buildControls(globalThis.document);
    const profile: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      attackerHull: "Rifter",
      attackerPropulsion: "mwd-5mn",
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    const encodedUrl = "http://localhost/?c=ENCODED_PROFILE";
    settingsStore.loadProfile.mockReturnValue(asProfile(profile));
    settingsStore.encodeUrl.mockReturnValue(encodedUrl);

    const select = getFake(globalThis.document, "profile-select");
    select.value = "brawler";
    select.trigger("change");

    expect(settingsStore.loadProfile).toHaveBeenCalledWith("brawler");
    expect(settingsStore.encodeUrl).toHaveBeenCalledWith(expect.objectContaining({ attackerHull: "Rifter", attackerPropulsion: "mwd-5mn" }));
    expect(location.href).toBe(encodedUrl);
  });

  test("selecting a saved profile persists its settings for the next session", () => {
    const { settingsStore } = buildControls(globalThis.document);
    const profile: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.5,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 8000,
      falloff: 6000,
      attackerSpeed: 1500,
      attackerMode: "orbit",
      attackerRange: 7000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      attackerHull: "Rifter",
      attackerPropulsion: "mwd-5mn",
      initialDistance: 7000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 7000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    settingsStore.loadProfile.mockReturnValue(asProfile(profile));

    const select = getFake(globalThis.document, "profile-select");
    select.value = "brawler";
    select.trigger("change");

    expect(settingsStore.save).toHaveBeenCalledWith(expect.objectContaining({ attackerHull: "Rifter", attackerPropulsion: "mwd-5mn" }));
  });

  test("selecting the empty profile option does not update the URL", () => {
    const { settingsStore, location } = buildControls(globalThis.document);
    const select = getFake(globalThis.document, "profile-select");
    select.value = "";
    select.trigger("change");

    expect(settingsStore.loadProfile).not.toHaveBeenCalled();
    expect(settingsStore.encodeUrl).not.toHaveBeenCalled();
    expect(location.href).toBe("http://localhost/");
  });

  test("selecting a hull populates base stats and enables tier-correct propulsion options", () => {
    buildControls(globalThis.document);
    const rifter = rifterProfile();
    const first = fittingOptions(rifter)[0];
    const expected = effectiveStats(rifter, first, { skillLevel: 5, overloaded: true });

    const input = getFake(globalThis.document, "attacker-hull");
    input.value = "rifter";
    input.trigger("input");

    expect(getFake(globalThis.document, "attacker-hull").value).toBe("Rifter");
    expect(getFake(globalThis.document, "attacker-speed").value).toBe(formatNumber(expected.maxSpeed));
    expect(getFake(globalThis.document, "attacker-mass").value).toBe(String(expected.mass));
    expect(getFake(globalThis.document, "attacker-inertia").value).toBe(String(expected.inertiaModifier));
    expect(getFake(globalThis.document, "attacker-hull-hint").textContent).toContain("Standard Frigates");

    const propulsion = getFake(globalThis.document, "attacker-propulsion");
    expect(propulsion.disabled).toBe(false);
    const ids = propulsion.children.map((c) => c.value);
    expect(ids).toEqual(["ab-1mn", "mwd-5mn", "ab-10mn"]);
  });

  test("choosing an MWD updates target speed, mass and signature radius", () => {
    buildControls(globalThis.document);
    const rifter = rifterProfile();

    getFake(globalThis.document, "target-hull").value = "Rifter";
    getFake(globalThis.document, "target-hull").trigger("input");

    const propulsion = getFake(globalThis.document, "target-propulsion");
    propulsion.value = "mwd-5mn";
    propulsion.trigger("change");

    const expected = effectiveStats(rifter, mwd5mnForRifter(), { skillLevel: 5, overloaded: true });
    expect(getFake(globalThis.document, "target-speed").value).toBe(formatNumber(expected.maxSpeed));
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

  test("changing propulsion does not overwrite a manual inertia edit", () => {
    buildControls(globalThis.document);

    const hullInput = getFake(globalThis.document, "target-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const propulsion = getFake(globalThis.document, "target-propulsion");
    propulsion.value = "mwd-5mn";
    propulsion.trigger("change");

    getFake(globalThis.document, "target-inertia").value = "99";
    getFake(globalThis.document, "target-inertia").trigger("input");

    propulsion.value = "ab-1mn";
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

  test("changing the skill level recomputes speed and inertia without a module", () => {
    buildControls(globalThis.document);
    const rifter = rifterProfile();
    const hullInput = getFake(globalThis.document, "attacker-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const propulsion = getFake(globalThis.document, "attacker-propulsion");
    propulsion.value = "";
    propulsion.trigger("change");

    const skills = getFake(globalThis.document, "attacker-skills");
    skills.value = "0";
    skills.trigger("change");

    const expected = effectiveStats(rifter, undefined, { skillLevel: 0, overloaded: true });
    expect(getFake(globalThis.document, "attacker-speed").value).toBe(formatNumber(expected.maxSpeed));
    expect(getFake(globalThis.document, "attacker-inertia").value).toBe(String(expected.inertiaModifier));
  });

  test("changing the skill level recomputes speed and inertia with a fitted module", () => {
    buildControls(globalThis.document);
    const rifter = rifterProfile();
    const hullInput = getFake(globalThis.document, "target-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");
    const propulsion = getFake(globalThis.document, "target-propulsion");
    propulsion.value = "mwd-5mn";
    propulsion.trigger("change");

    const skills = getFake(globalThis.document, "target-skills");
    skills.value = "0";
    skills.trigger("change");

    const expected = effectiveStats(rifter, mwd5mnForRifter(), { skillLevel: 0, overloaded: true });
    expect(getFake(globalThis.document, "target-speed").value).toBe(formatNumber(expected.maxSpeed));
    expect(getFake(globalThis.document, "target-inertia").value).toBe(String(expected.inertiaModifier));
  });

  test("toggling overload recomputes speed while leaving mass and signature unchanged", () => {
    buildControls(globalThis.document);
    const rifter = rifterProfile();
    const hullInput = getFake(globalThis.document, "target-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");
    const propulsion = getFake(globalThis.document, "target-propulsion");
    propulsion.value = "mwd-5mn";
    propulsion.trigger("change");

    const overload = getFake(globalThis.document, "target-overload");
    overload.checked = false;
    overload.trigger("change");

    const expected = effectiveStats(rifter, mwd5mnForRifter(), { skillLevel: 5, overloaded: false });
    expect(getFake(globalThis.document, "target-speed").value).toBe(formatNumber(expected.maxSpeed));
    expect(getFake(globalThis.document, "target-mass").value).toBe(String(expected.mass));
    expect(getFake(globalThis.document, "target-sig").value).toBe(String(expected.sigRadius));
  });

  test("overload checkbox is disabled without a propulsion module and enabled when one is selected", () => {
    buildControls(globalThis.document);
    const overload = getFake(globalThis.document, "attacker-overload");
    const propulsion = getFake(globalThis.document, "attacker-propulsion");
    expect(overload.disabled).toBe(true);

    const hullInput = getFake(globalThis.document, "attacker-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    expect(overload.disabled).toBe(false);
    expect(propulsion.value).toBe("ab-1mn");

    propulsion.value = "";
    propulsion.trigger("change");

    expect(overload.disabled).toBe(true);
  });

  test("reselecting the same hull keeps the skill level and overload state", () => {
    buildControls(globalThis.document);
    const hullInput = getFake(globalThis.document, "attacker-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const skills = getFake(globalThis.document, "attacker-skills");
    skills.value = "0";
    skills.trigger("change");
    const overload = getFake(globalThis.document, "attacker-overload");
    overload.checked = false;
    overload.trigger("change");

    hullInput.value = "Rifter";
    hullInput.trigger("change");

    expect(getFake(globalThis.document, "attacker-skills").value).toBe("0");
    expect(getFake(globalThis.document, "attacker-overload").checked).toBe(false);
  });

  test("loadSettings restores skill level and overload state", () => {
    const settings: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 2,
      attackerOverload: false,
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 4,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };

    buildControls(globalThis.document, settings);

    expect(getFake(globalThis.document, "attacker-skills").value).toBe("2");
    expect(getFake(globalThis.document, "attacker-overload").checked).toBe(false);
    expect(getFake(globalThis.document, "target-skills").value).toBe("4");
    expect(getFake(globalThis.document, "target-overload").checked).toBe(true);
  });

  test("loading saved settings on startup persists them for the next session", () => {
    const settings: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.5,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 8000,
      falloff: 6000,
      attackerSpeed: 1500,
      attackerMode: "orbit",
      attackerRange: 7000,
      maneuverAggressivity: 2,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      attackerHull: "Rifter",
      attackerPropulsion: "mwd-5mn",
      initialDistance: 7000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 7000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    const { settingsStore } = buildControls(globalThis.document, settings);

    expect(settingsStore.save).toHaveBeenCalledWith(expect.objectContaining({ attackerHull: "Rifter", attackerPropulsion: "mwd-5mn" }));
  });

  test("fresh start with no saved settings disables both overload checkboxes", () => {
    buildControls(globalThis.document);
    expect(getFake(globalThis.document, "attacker-overload").disabled).toBe(true);
    expect(getFake(globalThis.document, "target-overload").disabled).toBe(true);
  });

  test("changing the skill level persists without a hull selected", () => {
    const { settingsStore } = buildControls(globalThis.document);
    const skills = getFake(globalThis.document, "attacker-skills");
    skills.value = "2";
    skills.trigger("change");
    const [saved] = settingsStore.save.mock.calls[0];
    expect(saved.attackerSkillLevel).toBe(2);
  });

  test("changing the skill level with a hull selected persists the recomputed stats", () => {
    const { settingsStore } = buildControls(globalThis.document);
    const hullInput = getFake(globalThis.document, "attacker-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const skills = getFake(globalThis.document, "attacker-skills");
    skills.value = "0";
    skills.trigger("change");

    const rifter = rifterProfile();
    const expected = effectiveStats(rifter, fittingOptions(rifter)[0], { skillLevel: 0, overloaded: true });
    const calls = settingsStore.save.mock.calls;
    const [saved] = calls[calls.length - 1];
    expect(saved.attackerSpeed).toBe(Number(formatNumber(expected.maxSpeed)));
    expect(saved.attackerInertia).toBe(expected.inertiaModifier);
    expect(saved.attackerSkillLevel).toBe(0);
  });

  test("clicking a visible propulsion button updates the hidden select and recomputes stats", () => {
    buildControls(globalThis.document);
    const rifter = rifterProfile();

    const hullInput = getFake(globalThis.document, "target-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const button = findVisibleButton(globalThis.document, "target-propulsion-options", "mwd-5mn");
    button.trigger("click");

    expect(getFake(globalThis.document, "target-propulsion").value).toBe("mwd-5mn");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.classList.toggle).toHaveBeenCalledWith("active", true);
    expect(button.getAttribute("title")).toBe("5MN");
    const expected = effectiveStats(rifter, mwd5mnForRifter(), { skillLevel: 5, overloaded: true });
    expect(getFake(globalThis.document, "target-speed").value).toBe(formatNumber(expected.maxSpeed));
  });

  test("clicking a visible skill tuner button updates the hidden select and recomputes speed", () => {
    buildControls(globalThis.document);
    const rifter = rifterProfile();

    const hullInput = getFake(globalThis.document, "attacker-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const button = findVisibleButton(globalThis.document, "attacker-skill-options", "0");
    button.trigger("click");

    expect(getFake(globalThis.document, "attacker-skills").value).toBe("0");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.classList.toggle).toHaveBeenCalledWith("active", true);
    const expected = effectiveStats(rifter, fittingOptions(rifter)[0], { skillLevel: 0, overloaded: true });
    expect(getFake(globalThis.document, "attacker-speed").value).toBe(formatNumber(expected.maxSpeed));
  });

  test("clicking the overload icon button toggles the hidden checkbox and recomputes speed", () => {
    buildControls(globalThis.document);
    const rifter = rifterProfile();

    const hullInput = getFake(globalThis.document, "target-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const propulsion = getFake(globalThis.document, "target-propulsion");
    propulsion.value = "mwd-5mn";
    propulsion.trigger("change");

    const button = getFake(globalThis.document, "target-overload-button");
    button.trigger("click");

    expect(getFake(globalThis.document, "target-overload").checked).toBe(false);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.classList.toggle).toHaveBeenCalledWith("active", false);
    const expected = effectiveStats(rifter, mwd5mnForRifter(), { skillLevel: 5, overloaded: false });
    expect(getFake(globalThis.document, "target-speed").value).toBe(formatNumber(expected.maxSpeed));
  });

  test("shows the current skill level in the trigger summary on a fresh start", () => {
    buildControls(globalThis.document);
    expect(getFake(globalThis.document, "attacker-skill-summary").textContent).toBe("skill.level 5");
  });

  test("clicking a visible skill tuner button updates the trigger summary", () => {
    buildControls(globalThis.document);
    const rifter = rifterProfile();

    const hullInput = getFake(globalThis.document, "attacker-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const button = findVisibleButton(globalThis.document, "attacker-skill-options", "0");
    button.trigger("click");

    expect(getFake(globalThis.document, "attacker-skill-summary").textContent).toBe("skill.level 0");
  });

  test("loadSettings restores the skill level into the trigger summary", () => {
    const settings: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 2,
      attackerOverload: true,
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 4,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };

    buildControls(globalThis.document, settings);

    expect(getFake(globalThis.document, "attacker-skill-summary").textContent).toBe("skill.level 2");
    expect(getFake(globalThis.document, "target-skill-summary").textContent).toBe("skill.level 4");
  });

  test("language change refreshes the skill summary", () => {
    const { i18n } = buildControls(globalThis.document);
    i18n.t.mockImplementation((key: string) => (key === "skill.level" ? "Skill" : key));

    const langZh = getFake(globalThis.document, "lang-zh");
    langZh.trigger("click");

    expect(getFake(globalThis.document, "attacker-skill-summary").textContent).toBe("Skill 5");
  });

  test("update colors the hit chance value based on chance", () => {
    const { controls } = buildControls(globalThis.document);
    const ship: ShipState = { id: "attacker", maxSpeed: 0, mass: 0, inertiaModifier: 0, mode: "orbit", desiredRange: 0, aggressivity: 1, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
    const frame: EngagementFrame = { time: 0, attacker: ship, target: ship, relPosition: { x: 0, y: 0 }, distance: 1000, relVelocity: { x: 0, y: 0 }, radialVelocity: 0, transversalVelocity: { x: 0, y: 0 }, transversalSpeed: 0, angularVelocity: 0 };

    controls.update(frame, { chance: 0.95, trackingTerm: 0.5, rangeTerm: 0.5 });
    expect(getFake(globalThis.document, "res-hit").textContent).toBe("95.0%");
    expect(getFake(globalThis.document, "res-hit").style.color).toBe("#9cc954");

    controls.update(frame, { chance: 0.3, trackingTerm: 1.5, rangeTerm: 1.5 });
    expect(getFake(globalThis.document, "res-hit").style.color).toBe("#fce447");
  });

  test("disabled overload button is not visually active on a fresh start", () => {
    buildControls(globalThis.document);
    const button = getFake(globalThis.document, "attacker-overload-button");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.classList.toggle).toHaveBeenLastCalledWith("active", false);
  });

  test("manually changing target mass updates speed for the fitted propulsion module", () => {
    buildControls(globalThis.document);
    const rifter = rifterProfile();
    const module = mwd5mnForRifter();

    getFake(globalThis.document, "target-hull").value = "Rifter";
    getFake(globalThis.document, "target-hull").trigger("change");
    getFake(globalThis.document, "target-propulsion").value = "mwd-5mn";
    getFake(globalThis.document, "target-propulsion").trigger("change");

    const activeMass = 5_000_000;
    getFake(globalThis.document, "target-mass").value = String(activeMass);
    getFake(globalThis.document, "target-mass").trigger("input");

    const factor = fittedMassFactor(rifter.hullType);
    const shipMass = Math.max(0, (activeMass - module.massAddition * module.activeMassMultiplier) / factor);
    const adjusted: ShipProfile = { ...rifter, mass: shipMass };
    const expected = effectiveStats(adjusted, module, { skillLevel: 5, overloaded: true });
    expect(getFake(globalThis.document, "target-speed").value).toBe(formatNumber(expected.maxSpeed));
  });

  test("manually editing mass after hull selection round-trips speed without squaring the factor", () => {
    buildControls(globalThis.document);
    const rifter = rifterProfile();
    const module = mwd5mnForRifter();

    getFake(globalThis.document, "target-hull").value = "Rifter";
    getFake(globalThis.document, "target-hull").trigger("change");
    getFake(globalThis.document, "target-propulsion").value = "mwd-5mn";
    getFake(globalThis.document, "target-propulsion").trigger("change");

    const displayedMass = Number(getFake(globalThis.document, "target-mass").value) + 1_000_000;
    getFake(globalThis.document, "target-mass").value = String(displayedMass);
    getFake(globalThis.document, "target-mass").trigger("input");

    const factor = fittedMassFactor(rifter.hullType);
    const shipMass = (displayedMass - module.massAddition * module.activeMassMultiplier) / factor;
    const adjusted: ShipProfile = { ...rifter, mass: shipMass };
    const expected = effectiveStats(adjusted, module, { skillLevel: 5, overloaded: true });
    expect(getFake(globalThis.document, "target-speed").value).toBe(formatNumber(expected.maxSpeed));
  });

  test("save button highlights when the current settings differ from the selected profile", () => {
    const { settingsStore } = buildControls(globalThis.document);
    const profile: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    settingsStore.loadProfile.mockReturnValue(asProfile(profile));

    const select = getFake(globalThis.document, "profile-select");
    select.value = "brawler";
    select.trigger("change");

    const saveButton = getFake(globalThis.document, "profile-save");
    expect(saveButton.classList.toggle).toHaveBeenLastCalledWith("unsaved", false);

    getFake(globalThis.document, "optimal").value = "9999";
    getFake(globalThis.document, "optimal").trigger("input");

    expect(saveButton.classList.toggle).toHaveBeenLastCalledWith("unsaved", true);
  });

  test("save button returns to normal color after the profile is saved", () => {
    const { settingsStore } = buildControls(globalThis.document);
    const nameInput = getFake(globalThis.document, "profile-name");
    nameInput.value = "brawler";
    nameInput.trigger("input");

    const saveButton = getFake(globalThis.document, "profile-save");
    expect(saveButton.classList.toggle).toHaveBeenLastCalledWith("unsaved", true);

    saveButton.trigger("click");

    expect(settingsStore.saveProfile).toHaveBeenCalledWith("brawler", expect.any(Object));
    expect(saveButton.classList.toggle).toHaveBeenLastCalledWith("unsaved", false);
  });

  test("save button returns to normal after saving changes to a loaded profile", () => {
    const { settingsStore } = buildControls(globalThis.document);
    const profile: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    settingsStore.loadProfile.mockReturnValue(asProfile(profile));

    const select = getFake(globalThis.document, "profile-select");
    select.value = "brawler";
    select.trigger("change");

    const tracking = getFake(globalThis.document, "tracking");
    tracking.value = "0.5";
    tracking.trigger("input");

    const saveButton = getFake(globalThis.document, "profile-save");
    expect(saveButton.classList.toggle).toHaveBeenLastCalledWith("unsaved", true);

    saveButton.trigger("click");

    expect(settingsStore.saveProfile).toHaveBeenCalledWith("brawler", expect.any(Object));
    expect(saveButton.classList.toggle).toHaveBeenLastCalledWith("unsaved", false);
  });

  test("save button does not highlight immediately after loading a profile with unrounded speed", () => {
    const { settingsStore } = buildControls(globalThis.document);
    const profile: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 1320.1375,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      initialDistance: 5000,
      targetSpeed: 1000.5678,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    settingsStore.loadProfile.mockReturnValue(asProfile(profile));

    const select = getFake(globalThis.document, "profile-select");
    select.value = "brawler";
    select.trigger("change");

    const saveButton = getFake(globalThis.document, "profile-save");
    expect(saveButton.classList.toggle).toHaveBeenLastCalledWith("unsaved", false);
  });

  test("save button highlights when typing a different existing profile name while a profile is selected", () => {
    const { settingsStore } = buildControls(globalThis.document);
    const selected: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    const other: UserSettings = { ...selected, optimal: 9999 };
    settingsStore.loadProfile.mockImplementation((name: string) => (name === "kiter" ? asProfile(selected) : name === "brawler" ? asProfile(other) : null));

    const select = getFake(globalThis.document, "profile-select");
    select.value = "kiter";
    select.trigger("change");

    const saveButton = getFake(globalThis.document, "profile-save");
    saveButton.classList.toggle.mockClear();

    const nameInput = getFake(globalThis.document, "profile-name");
    nameInput.value = "brawler";
    nameInput.trigger("input");

    expect(saveButton.classList.toggle).toHaveBeenCalledWith("unsaved", true);
  });

  test("save button highlights when tracking unit changes after loading a profile", () => {
    const rifter = rifterProfile();
    const module = mwd5mnForRifter();
    const stats = effectiveStats(rifter, module, { skillLevel: 5, overloaded: true });
    const speed = Number(formatNumber(stats.maxSpeed));
    const profile: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: speed,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      attackerMass: stats.mass,
      attackerInertia: stats.inertiaModifier,
      attackerSkillLevel: 5,
      attackerOverload: true,
      attackerHull: "Rifter",
      attackerPropulsion: "mwd-5mn",
      initialDistance: 5000,
      targetSpeed: speed,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: stats.mass,
      targetInertia: stats.inertiaModifier,
      targetSig: stats.sigRadius,
      targetSkillLevel: 5,
      targetOverload: true,
      targetHull: "Rifter",
      targetPropulsion: "mwd-5mn",
      simSpeed: 4,
      language: "en",
    };

    const { settingsStore } = buildControls(globalThis.document);
    settingsStore.loadProfile.mockReturnValue(asProfile(profile));

    const select = getFake(globalThis.document, "profile-select");
    select.value = "brawler";
    select.trigger("change");

    const saveButton = getFake(globalThis.document, "profile-save");
    saveButton.classList.toggle.mockClear();

    getFake(globalThis.document, "tracking-unit-score").trigger("click");
    expect(saveButton.classList.toggle).toHaveBeenCalledWith("unsaved", true);
  });

  test("save button does not highlight when language changes after loading a profile", () => {
    const { settingsStore } = buildControls(globalThis.document);
    const profile: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    settingsStore.loadProfile.mockReturnValue(asProfile(profile));

    const select = getFake(globalThis.document, "profile-select");
    select.value = "brawler";
    select.trigger("change");

    const saveButton = getFake(globalThis.document, "profile-save");
    saveButton.classList.toggle.mockClear();

    getFake(globalThis.document, "lang-zh").trigger("click");
    expect(saveButton.classList.toggle).not.toHaveBeenCalledWith("unsaved", true);
  });

  test("save button highlights when hull changes after loading a profile", () => {
    const rifter = rifterProfile();
    const module = mwd5mnForRifter();
    const stats = effectiveStats(rifter, module, { skillLevel: 5, overloaded: true });
    const speed = Number(formatNumber(stats.maxSpeed));
    const profile: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: speed,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      attackerMass: stats.mass,
      attackerInertia: stats.inertiaModifier,
      attackerSkillLevel: 5,
      attackerOverload: true,
      attackerHull: "Rifter",
      attackerPropulsion: "mwd-5mn",
      initialDistance: 5000,
      targetSpeed: speed,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: stats.mass,
      targetInertia: stats.inertiaModifier,
      targetSig: stats.sigRadius,
      targetSkillLevel: 5,
      targetOverload: true,
      targetHull: "Rifter",
      targetPropulsion: "mwd-5mn",
      simSpeed: 4,
      language: "en",
    };

    const { settingsStore } = buildControls(globalThis.document);
    settingsStore.loadProfile.mockReturnValue(asProfile(profile));

    const select = getFake(globalThis.document, "profile-select");
    select.value = "brawler";
    select.trigger("change");

    const saveButton = getFake(globalThis.document, "profile-save");
    saveButton.classList.toggle.mockClear();

    getFake(globalThis.document, "attacker-hull").value = "Thrasher";
    getFake(globalThis.document, "attacker-hull").trigger("input");
    expect(saveButton.classList.toggle).toHaveBeenCalledWith("unsaved", true);
  });

  test("loading a profile does not call setLanguage with the profile's stored language", () => {
    const { i18n, settingsStore } = buildControls(globalThis.document, null, { listProfiles: ["brawler"] });
    const profile: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "ja",
    };
    settingsStore.loadProfile.mockReturnValue(asProfile(profile));

    const select = getFake(globalThis.document, "profile-select");
    select.value = "brawler";
    select.trigger("change");

    expect(i18n.setLanguage).toHaveBeenCalledWith("en");
    expect(i18n.setLanguage).not.toHaveBeenCalledWith("ja");
  });

  test("getConfig passes maneuver aggressivity through to the attacker", () => {
    const { controls } = buildControls(globalThis.document);
    getFake(globalThis.document, "maneuver-aggressivity").value = "2";
    expect(controls.getConfig().attacker.aggressivity).toBeCloseTo(2, 6);

    getFake(globalThis.document, "maneuver-aggressivity").value = "0.5";
    expect(controls.getConfig().attacker.aggressivity).toBeCloseTo(0.5, 6);

    getFake(globalThis.document, "maneuver-aggressivity").value = "1";
    expect(controls.getConfig().attacker.aggressivity).toBeCloseTo(1, 6);
  });

  test("getConfig clamps maneuver aggressivity to [0.01, 100]", () => {
    const { controls } = buildControls(globalThis.document);
    getFake(globalThis.document, "maneuver-aggressivity").value = "0.001";
    expect(controls.getConfig().attacker.aggressivity).toBeCloseTo(0.01, 6);

    getFake(globalThis.document, "maneuver-aggressivity").value = "0";
    expect(controls.getConfig().attacker.aggressivity).toBeCloseTo(0.01, 6);

    getFake(globalThis.document, "maneuver-aggressivity").value = "-5";
    expect(controls.getConfig().attacker.aggressivity).toBeCloseTo(0.01, 6);

    getFake(globalThis.document, "maneuver-aggressivity").value = "500";
    expect(controls.getConfig().attacker.aggressivity).toBeCloseTo(100, 6);
  });

  test("dragging the maneuver aggressivity slider updates the hidden value and display", () => {
    buildControls(globalThis.document);
    const slider = getFake(globalThis.document, "maneuver-aggressivity-slider");
    slider.value = "0.25";
    slider.trigger("input");

    expect(getFake(globalThis.document, "maneuver-aggressivity").value).toBe("0.1");
    expect(getFake(globalThis.document, "maneuver-aggressivity-value").textContent).toBe("0.10");
    expect(slider.value).toBe("0.25");
  });

  test("loadSettings defaults missing maneuverAggressivity to 1", () => {
    const settings: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    buildControls(globalThis.document, settings);
    expect(getFake(globalThis.document, "maneuver-aggressivity").value).toBe("1");
    const { controls } = buildControls(globalThis.document, settings);
    expect(controls.getConfig().attacker.aggressivity).toBeCloseTo(1, 6);
  });

  test("update formats long numbers with commas", () => {
    const { controls } = buildControls(globalThis.document);
    const ship: ShipState = { id: "attacker", maxSpeed: 0, mass: 0, inertiaModifier: 0, mode: "orbit", desiredRange: 0, aggressivity: 1, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
    const frame: EngagementFrame = { time: 0, attacker: ship, target: ship, relPosition: { x: 0, y: 0 }, distance: 12345, relVelocity: { x: 0, y: 0 }, radialVelocity: 1234.5, transversalVelocity: { x: 0, y: 0 }, transversalSpeed: 1234.5, angularVelocity: 0.1234 };

    controls.update(frame, { chance: 0.95, trackingTerm: 0.5, rangeTerm: 0.5 });

    expect(getFake(globalThis.document, "res-distance").textContent).toBe("12.3 unit.kilometer");
    expect(getFake(globalThis.document, "res-transversal").textContent).toBe("1,234.5 m/s");
    expect(getFake(globalThis.document, "res-angular").textContent).toBe("0.1234 rad/s");
    expect(getFake(globalThis.document, "res-radial").textContent).toBe("1,234.5 m/s");
    expect(getFake(globalThis.document, "res-hit").textContent).toBe("95.0%");
  });

  test("selecting a saved profile persists the selection and baseline", () => {
    const { settingsStore } = buildControls(globalThis.document, null, { listProfiles: ["brawler"] });
    const profile: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      attackerHull: "Rifter",
      attackerPropulsion: "mwd-5mn",
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    settingsStore.loadProfile.mockReturnValue(asProfile(profile));

    const select = getFake(globalThis.document, "profile-select");
    select.value = "brawler";
    select.trigger("change");

    expect(settingsStore.saveSelectedProfile).toHaveBeenCalledWith("brawler", expect.objectContaining({ attackerHull: "Rifter", attackerPropulsion: "mwd-5mn" }));
  });

  test("loading saved settings restores the last selected profile and baseline", () => {
    const profile: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      attackerHull: "Rifter",
      attackerPropulsion: "mwd-5mn",
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    const { settingsStore } = buildControls(globalThis.document, profile, {
      selectedProfile: { name: "brawler", baseline: asProfile(profile) },
      listProfiles: ["brawler"],
    });

    const select = getFake(globalThis.document, "profile-select");
    expect(select.value).toBe("brawler");
    expect(settingsStore.save).toHaveBeenCalledWith(expect.objectContaining({ attackerHull: "Rifter", attackerPropulsion: "mwd-5mn" }));
    expect(settingsStore.saveSelectedProfile).not.toHaveBeenCalled();
  });

  test("loading settings from a foreign URL clears the stored selection and leaves the dropdown empty", () => {
    const profile: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      attackerHull: "Rifter",
      attackerPropulsion: "mwd-5mn",
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    const { settingsStore } = buildControls(globalThis.document, profile, {
      hasForeignUrlSettings: true,
      selectedProfile: { name: "brawler", baseline: asProfile(profile) },
      listProfiles: ["brawler"],
    });

    const select = getFake(globalThis.document, "profile-select");
    expect(select.value).toBe("");
    expect(settingsStore.clearSelectedProfile).toHaveBeenCalled();
    expect(settingsStore.saveSelectedProfile).not.toHaveBeenCalled();
  });

  test("loading settings from a URL matching local storage restores the last selected profile", () => {
    const profile: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      attackerHull: "Rifter",
      attackerPropulsion: "mwd-5mn",
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    const { settingsStore } = buildControls(globalThis.document, profile, {
      hasForeignUrlSettings: false,
      selectedProfile: { name: "brawler", baseline: asProfile(profile) },
      listProfiles: ["brawler"],
    });

    const select = getFake(globalThis.document, "profile-select");
    expect(select.value).toBe("brawler");
    expect(settingsStore.clearSelectedProfile).not.toHaveBeenCalled();
    expect(settingsStore.saveSelectedProfile).not.toHaveBeenCalled();
  });

  test("changing an input keeps the URL in the address bar", () => {
    const { settingsStore, location } = buildControls(globalThis.document);
    const encodedUrl = "http://localhost/?c=ENCODED";
    settingsStore.encodeUrl.mockReturnValue(encodedUrl);

    getFake(globalThis.document, "optimal").value = "6000";
    getFake(globalThis.document, "optimal").trigger("input");

    expect(settingsStore.encodeUrl).toHaveBeenCalledWith(expect.objectContaining({ optimal: 6000 }));
    expect(location.href).toBe(encodedUrl);
  });

  test("saving a profile persists it as the selected profile without language", () => {
    const { settingsStore } = buildControls(globalThis.document);
    const nameInput = getFake(globalThis.document, "profile-name");
    nameInput.value = "brawler";
    nameInput.trigger("input");

    getFake(globalThis.document, "profile-save").trigger("click");

    const [, savedProfile] = settingsStore.saveProfile.mock.calls[0];
    const [, selectedBaseline] = settingsStore.saveSelectedProfile.mock.calls[0];
    expect(settingsStore.saveProfile).toHaveBeenCalledWith("brawler", savedProfile);
    expect(settingsStore.saveSelectedProfile).toHaveBeenCalledWith("brawler", selectedBaseline);
    expect(savedProfile).not.toHaveProperty("language");
    expect(selectedBaseline).not.toHaveProperty("language");
    expect(getFake(globalThis.document, "profile-select").value).toBe("brawler");
  });

  test("deleting a profile delegates to the store and clears the dropdown", () => {
    const { settingsStore } = buildControls(globalThis.document, null, { listProfiles: ["brawler"] });
    const profile: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      attackerHull: "Rifter",
      attackerPropulsion: "mwd-5mn",
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    settingsStore.loadProfile.mockReturnValue(asProfile(profile));

    const select = getFake(globalThis.document, "profile-select");
    select.value = "brawler";
    select.trigger("change");
    settingsStore.saveSelectedProfile.mockClear();
    settingsStore.clearSelectedProfile.mockClear();

    getFake(globalThis.document, "profile-delete").trigger("click");

    expect(settingsStore.deleteProfile).toHaveBeenCalledWith("brawler");
    expect(settingsStore.clearSelectedProfile).not.toHaveBeenCalled();
    expect(settingsStore.saveSelectedProfile).not.toHaveBeenCalled();
    expect(select.value).toBe("");
  });

  test("getGridBrightness returns the slider value clamped to [0, 1]", () => {
    const { controls } = buildControls(globalThis.document);
    getFake(globalThis.document, "grid-brightness-slider").value = "0.63";
    expect(controls.getGridBrightness()).toBeCloseTo(0.63, 6);

    getFake(globalThis.document, "grid-brightness-slider").value = "-0.5";
    expect(controls.getGridBrightness()).toBe(0);

    getFake(globalThis.document, "grid-brightness-slider").value = "1.5";
    expect(controls.getGridBrightness()).toBe(1);
  });

  test("dragging the grid brightness slider updates the output, fill, and persisted settings", () => {
    const { settingsStore } = buildControls(globalThis.document);
    const slider = getFake(globalThis.document, "grid-brightness-slider");
    slider.value = "0.63";
    slider.trigger("input");

    expect(getFake(globalThis.document, "grid-brightness-value").textContent).toBe("63%");
    expect(slider.style["--fill"]).toBe("63%");
    const calls = settingsStore.save.mock.calls;
    const [saved] = calls[calls.length - 1];
    expect(saved.gridBrightness).toBe(0.63);
  });

  test("changing the grid brightness slider calls the display change callback", () => {
    const { controls } = buildControls(globalThis.document);
    const onDisplayChange = vi.fn();
    controls.setCallbacks({
      onReset: () => {},
      onConfigChange: () => {},
      onDisplayChange,
      onPlayPause: () => {},
      onSpeedChange: () => {},
    });

    const slider = getFake(globalThis.document, "grid-brightness-slider");
    slider.value = "0.5";
    slider.trigger("input");

    expect(onDisplayChange).toHaveBeenCalled();
  });

  test("loadSettings restores the grid brightness slider and output", () => {
    const settings: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      gridBrightness: 0.75,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    buildControls(globalThis.document, settings);

    expect(getFake(globalThis.document, "grid-brightness-slider").value).toBe("0.75");
    expect(getFake(globalThis.document, "grid-brightness-value").textContent).toBe("75%");
  });

  test("loadSettings defaults missing gridBrightness to 0.2", () => {
    const settings: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    buildControls(globalThis.document, settings);

    expect(getFake(globalThis.document, "grid-brightness-value").textContent).toBe("20%");
  });

  test("clicking a sigRes button updates the hidden select and tracking display", () => {
    const { controls } = buildControls(globalThis.document);
    const button = findVisibleButton(globalThis.document, "sig-res-options", "M");
    button.trigger("click");

    expect(getFake(globalThis.document, "sigRes").value).toBe("M");
    expect(button.classList.toggle).toHaveBeenLastCalledWith("active", true);
    expect(controls.getTurret().sigResolution).toBe(125);
  });

  test("selecting attacker mode from the dropdown updates getConfig", () => {
    const { controls } = buildControls(globalThis.document);
    const select = getFake(globalThis.document, "attacker-mode");
    select.value = "orbit";
    select.trigger("input");
    expect(controls.getConfig().attacker.mode).toBe("orbit");
  });

  test("selecting target mode from the dropdown updates getConfig", () => {
    const { controls } = buildControls(globalThis.document);
    const select = getFake(globalThis.document, "target-mode");
    select.value = "keepAtRange";
    select.trigger("input");
    expect(controls.getConfig().target.mode).toBe("keepAtRange");
  });

  test("loadSettings restores the sigRes active button and aria-pressed state", () => {
    const settings: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "XL",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 0,
      attackerMode: "orbit",
      attackerRange: 5000,
      maneuverAggressivity: 1,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "keepAtRange",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };
    buildControls(globalThis.document, settings);

    const sigResButton = findVisibleButton(globalThis.document, "sig-res-options", "XL");
    expect(sigResButton.getAttribute("aria-pressed")).toBe("true");
    expect(sigResButton.classList.toggle).toHaveBeenLastCalledWith("active", true);
    const sigResSButton = findVisibleButton(globalThis.document, "sig-res-options", "S");
    expect(sigResSButton.getAttribute("aria-pressed")).toBe("false");
    expect(sigResSButton.classList.toggle).toHaveBeenLastCalledWith("active", false);
  });

  test("clicking the skill trigger opens and closes the popup", () => {
    const { controls } = buildControls(globalThis.document);
    const trigger = getFake(globalThis.document, "attacker-skill-trigger");
    const popup = getFake(globalThis.document, "attacker-skill-popup");

    trigger.trigger("click");
    expect(popup.hidden).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    trigger.trigger("click");
    expect(popup.hidden).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  test("selecting a skill level inside the popup closes it, updates the hidden select, and returns focus", () => {
    buildControls(globalThis.document);
    getFake(globalThis.document, "attacker-skill-trigger").trigger("click");
    const levelTwo = getFake(globalThis.document, "attacker-skill-options").children.find(
      (child) => child.getAttribute("data-value") === "2",
    );
    if (!levelTwo) throw new Error("Missing skill level 2 button");
    levelTwo.trigger("click");

    expect(getFake(globalThis.document, "attacker-skill-popup").hidden).toBe(true);
    expect(getFake(globalThis.document, "attacker-skills").value).toBe("2");
    expect(getFake(globalThis.document, "attacker-skill-trigger").getAttribute("aria-expanded")).toBe("false");
    expect(getFake(globalThis.document, "attacker-skill-trigger").focus).toHaveBeenCalled();
  });

  test("opening one skill popup closes the other", () => {
    buildControls(globalThis.document);
    getFake(globalThis.document, "attacker-skill-trigger").trigger("click");
    expect(getFake(globalThis.document, "attacker-skill-popup").hidden).toBe(false);

    getFake(globalThis.document, "target-skill-trigger").trigger("click");
    expect(getFake(globalThis.document, "attacker-skill-popup").hidden).toBe(true);
    expect(getFake(globalThis.document, "target-skill-popup").hidden).toBe(false);
  });

  test("pointerdown outside the skill popup closes it", () => {
    buildControls(globalThis.document);
    getFake(globalThis.document, "attacker-skill-trigger").trigger("click");
    const outside = new FakeElement();
    globalThis.document.dispatchEvent({ type: "pointerdown", target: outside } as unknown as Event);

    expect(getFake(globalThis.document, "attacker-skill-popup").hidden).toBe(true);
    expect(getFake(globalThis.document, "attacker-skill-trigger").getAttribute("aria-expanded")).toBe("false");
  });

  test("pointerdown inside the skill popup does not close it", () => {
    buildControls(globalThis.document);
    getFake(globalThis.document, "attacker-skill-trigger").trigger("click");
    const inside = new FakeElement();
    const field = getFake(globalThis.document, "attacker-skill-field");
    inside.closest = () => field;
    globalThis.document.dispatchEvent({ type: "pointerdown", target: inside } as unknown as Event);

    expect(getFake(globalThis.document, "attacker-skill-popup").hidden).toBe(false);
    expect(getFake(globalThis.document, "attacker-skill-trigger").getAttribute("aria-expanded")).toBe("true");
  });

  test("Escape closes the skill popup and focuses the trigger", () => {
    buildControls(globalThis.document);
    getFake(globalThis.document, "attacker-skill-trigger").trigger("click");
    globalThis.document.dispatchEvent({ type: "keydown", key: "Escape" } as unknown as Event);

    expect(getFake(globalThis.document, "attacker-skill-popup").hidden).toBe(true);
    expect(getFake(globalThis.document, "attacker-skill-trigger").getAttribute("aria-expanded")).toBe("false");
    expect(getFake(globalThis.document, "attacker-skill-trigger").focus).toHaveBeenCalled();
  });

  describe("callback routing", () => {
    const brawler: UserSettings = {
      version: USER_SETTINGS_VERSION,
      tracking: 0.32,
      trackingUnit: "rad",
      sigRes: "S",
      optimal: 5000,
      falloff: 5000,
      attackerSpeed: 1000,
      attackerMode: "keepAtRange",
      attackerRange: 5000,
      attackerMass: 1_200_000,
      attackerInertia: 3,
      attackerSkillLevel: 5,
      attackerOverload: true,
      initialDistance: 5000,
      targetSpeed: 1000,
      targetMode: "orbit",
      targetRange: 5000,
      targetMass: 10_000_000,
      targetInertia: 0.45,
      targetSkillLevel: 5,
      targetOverload: true,
      targetSig: 40,
      simSpeed: 4,
      language: "en",
    };

    function callbackMocks() {
      return {
        onReset: vi.fn(),
        onConfigChange: vi.fn(),
        onDisplayChange: vi.fn(),
        onPlayPause: vi.fn(),
        onSpeedChange: vi.fn(),
      };
    }

    test("turret inputs fire onDisplayChange and not onConfigChange", () => {
      const { controls } = buildControls(globalThis.document);
      const callbacks = callbackMocks();
      controls.setCallbacks(callbacks);

      getFake(globalThis.document, "tracking").value = "0.5";
      getFake(globalThis.document, "tracking").trigger("input");
      findVisibleButton(globalThis.document, "sig-res-options", "M").trigger("click");
      getFake(globalThis.document, "optimal").value = "6000";
      getFake(globalThis.document, "optimal").trigger("input");
      getFake(globalThis.document, "falloff").value = "6000";
      getFake(globalThis.document, "falloff").trigger("input");

      expect(callbacks.onDisplayChange).toHaveBeenCalledTimes(4);
      expect(callbacks.onConfigChange).not.toHaveBeenCalled();
      expect(callbacks.onReset).not.toHaveBeenCalled();
    });

    test("target signature input fires onDisplayChange and not onConfigChange", () => {
      const { controls } = buildControls(globalThis.document);
      const callbacks = callbackMocks();
      controls.setCallbacks(callbacks);

      getFake(globalThis.document, "target-sig").value = "50";
      getFake(globalThis.document, "target-sig").trigger("input");

      expect(callbacks.onDisplayChange).toHaveBeenCalledTimes(1);
      expect(callbacks.onConfigChange).not.toHaveBeenCalled();
      expect(callbacks.onReset).not.toHaveBeenCalled();
    });

    test("ship and scenario inputs fire onConfigChange and not onDisplayChange", () => {
      const { controls } = buildControls(globalThis.document);
      const callbacks = callbackMocks();
      controls.setCallbacks(callbacks);

      getFake(globalThis.document, "attacker-speed").value = "1500";
      getFake(globalThis.document, "attacker-speed").trigger("input");
      getFake(globalThis.document, "attacker-mass").value = "2000000";
      getFake(globalThis.document, "attacker-mass").trigger("input");
      getFake(globalThis.document, "attacker-mode").value = "orbit";
      getFake(globalThis.document, "attacker-mode").trigger("input");
      getFake(globalThis.document, "initial-distance").value = "8000";
      getFake(globalThis.document, "initial-distance").trigger("input");

      expect(callbacks.onConfigChange).toHaveBeenCalledTimes(4);
      expect(callbacks.onDisplayChange).not.toHaveBeenCalled();
      expect(callbacks.onReset).not.toHaveBeenCalled();
    });

    test("language toggle fires onDisplayChange and not onConfigChange", () => {
      const { controls } = buildControls(globalThis.document);
      const callbacks = callbackMocks();
      controls.setCallbacks(callbacks);

      getFake(globalThis.document, "lang-zh").trigger("click");

      expect(callbacks.onDisplayChange).toHaveBeenCalledTimes(1);
      expect(callbacks.onConfigChange).not.toHaveBeenCalled();
      expect(callbacks.onReset).not.toHaveBeenCalled();
    });

    test("profile load fires onReset and not onConfigChange", () => {
      const { controls, settingsStore } = buildControls(globalThis.document, null, { listProfiles: ["brawler"] });
      settingsStore.loadProfile.mockReturnValue(asProfile(brawler));
      const callbacks = callbackMocks();
      controls.setCallbacks(callbacks);

      const select = getFake(globalThis.document, "profile-select");
      select.value = "brawler";
      select.trigger("change");

      expect(callbacks.onReset).toHaveBeenCalledTimes(1);
      expect(callbacks.onConfigChange).not.toHaveBeenCalled();
      expect(callbacks.onDisplayChange).not.toHaveBeenCalled();
    });
  });

  describe("ship name i18n", () => {
    test("datalist option values localize per language and revert in English", () => {
      buildControls(globalThis.document, null, { language: "zh" });

      const options = getFake(globalThis.document, "hull-options").children;
      const rifter = options.find((o) => o.value === "裂谷级");
      const merlin = options.find((o) => o.value === "小鹰级");
      expect(rifter).toBeTruthy();
      expect(merlin).toBeTruthy();

      getFake(globalThis.document, "lang-en").trigger("click");

      const enOptions = getFake(globalThis.document, "hull-options").children;
      expect(enOptions.some((o) => o.value === "Rifter")).toBe(true);
      expect(enOptions.some((o) => o.value === "Merlin")).toBe(true);
      expect(enOptions.some((o) => o.value === "裂谷级")).toBe(false);
    });

    test("hull input displays the localized name after loading a profile with a canonical hull", () => {
      const { settingsStore } = buildControls(globalThis.document, null, { language: "zh", listProfiles: ["brawler"] });
      const profile: UserSettings = {
        version: USER_SETTINGS_VERSION,
        tracking: 0.32,
        trackingUnit: "rad",
        sigRes: "S",
        optimal: 5000,
        falloff: 5000,
        attackerSpeed: 1000,
        attackerMode: "keepAtRange",
        attackerRange: 5000,
        maneuverAggressivity: 1,
        attackerMass: 1_200_000,
        attackerInertia: 3,
        attackerSkillLevel: 5,
        attackerOverload: true,
        attackerHull: "Rifter",
        attackerPropulsion: "mwd-5mn",
        initialDistance: 5000,
        targetSpeed: 1000,
        targetMode: "orbit",
        targetRange: 5000,
        targetMass: 10_000_000,
        targetInertia: 0.45,
        targetSkillLevel: 5,
        targetOverload: true,
        targetSig: 40,
        simSpeed: 4,
        language: "en",
      };
      settingsStore.loadProfile.mockReturnValue(asProfile(profile));

      const select = getFake(globalThis.document, "profile-select");
      select.value = "brawler";
      select.trigger("change");

      expect(getFake(globalThis.document, "attacker-hull").value).toBe("裂谷级");
    });

    test("language switch refreshes hull inputs and datalist without lighting the SAVE button", () => {
      const { settingsStore } = buildControls(globalThis.document, null, { language: "en", listProfiles: ["brawler"] });
      const profile: UserSettings = {
        version: USER_SETTINGS_VERSION,
        tracking: 0.32,
        trackingUnit: "rad",
        sigRes: "S",
        optimal: 5000,
        falloff: 5000,
        attackerSpeed: 1000,
        attackerMode: "keepAtRange",
        attackerRange: 5000,
        maneuverAggressivity: 1,
        attackerMass: 1_200_000,
        attackerInertia: 3,
        attackerSkillLevel: 5,
        attackerOverload: true,
        attackerHull: "Rifter",
        attackerPropulsion: "mwd-5mn",
        initialDistance: 5000,
        targetSpeed: 1000,
        targetMode: "orbit",
        targetRange: 5000,
        targetMass: 10_000_000,
        targetInertia: 0.45,
        targetSkillLevel: 5,
        targetOverload: true,
        targetSig: 40,
        simSpeed: 4,
        language: "en",
      };
      settingsStore.loadProfile.mockReturnValue(asProfile(profile));

      const select = getFake(globalThis.document, "profile-select");
      select.value = "brawler";
      select.trigger("change");

      const saveButton = getFake(globalThis.document, "profile-save");
      saveButton.classList.toggle.mockClear();

      getFake(globalThis.document, "attacker-hull").value = "Rifter";
      getFake(globalThis.document, "attacker-hull").trigger("change");
      expect(getFake(globalThis.document, "attacker-hull").value).toBe("Rifter");

      getFake(globalThis.document, "lang-zh").trigger("click");

      expect(getFake(globalThis.document, "attacker-hull").value).toBe("裂谷级");
      const options = getFake(globalThis.document, "hull-options").children;
      expect(options.some((o) => o.value === "裂谷级")).toBe(true);
      expect(saveButton.classList.toggle).not.toHaveBeenCalledWith("unsaved", true);
    });

    test("typing a localized hull name resolves the hull and saveProfile still receives the canonical English attackerHull", () => {
      const { settingsStore } = buildControls(globalThis.document, null, { language: "zh" });
      const hullInput = getFake(globalThis.document, "attacker-hull");
      hullInput.value = "裂谷级";
      hullInput.trigger("change");

      expect(hullInput.value).toBe("裂谷级");

      const nameInput = getFake(globalThis.document, "profile-name");
      nameInput.value = "brawler";
      nameInput.trigger("input");

      getFake(globalThis.document, "profile-save").trigger("click");

      const [, savedProfile] = settingsStore.saveProfile.mock.calls[0];
      expect(savedProfile).toMatchObject({ attackerHull: "Rifter" });
    });

    test("typing a canonical English name in a non-English UI resolves and persists the canonical attackerHull", () => {
      const { settingsStore } = buildControls(globalThis.document, null, { language: "zh" });
      settingsStore.save.mockClear();

      const hullInput = getFake(globalThis.document, "attacker-hull");
      hullInput.value = "Rifter";
      hullInput.trigger("change");

      expect(hullInput.value).toBe("裂谷级");
      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerHull).toBe("Rifter");
    });

    test("hull hint shows localized hull type and faction and refreshes on language switch", () => {
      buildControls(globalThis.document, null, { language: "zh" });

      const hullInput = getFake(globalThis.document, "attacker-hull");
      hullInput.value = "裂谷级";
      hullInput.trigger("change");

      const hint = getFake(globalThis.document, "attacker-hull-hint");
      expect(hint.textContent).toContain("护卫舰");
      expect(hint.textContent).toContain("米玛塔尔");

      getFake(globalThis.document, "lang-ja").trigger("click");

      expect(hint.textContent).toContain("フリゲート");
      expect(hint.textContent).toContain("ミンマター共和国");
    });
  });
});

function findVisibleButton(document: Document, groupId: string, value: string): FakeElement {
  const group = getFake(document, groupId);
  const button = group.children.find((child) => child.getAttribute("data-value") === value);
  if (!button) throw new Error(`Missing visible button ${value} in ${groupId}`);
  return button;
}

function formatNumber(value: number, decimals = 2): string {
  return String(Number(value.toFixed(decimals)));
}
