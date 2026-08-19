import type { EngagementFrame, HitChance, HitChanceBreakdown, ShipState } from "../sim";
import { SHIP_PROFILES, effectiveStats, fittedMassFactor, fittingOptions } from "../ships";
import type { ShipProfile } from "../ships";
import { DomControls } from "./controls";
import type { I18n, Language } from "./i18n";
import type { ClipboardProvider, LocationProvider, SettingsStore, UserSettings } from "./settings";
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

  dispatchEvent(event: { type: string }): void {
    this.trigger(event.type);
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
  getFake(document, "attacker-overload").checked = true;
  getFake(document, "target-overload").checked = true;
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
  baseline: UserSettings;
}

function buildControls(
  document: Document,
  savedSettings: UserSettings | null = null,
  options: { selectedProfile?: SelectedProfile | null; isUrlLoad?: boolean; listProfiles?: string[] } = {},
) {
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
    listProfiles: vi.fn(() => options.listProfiles ?? []),
    saveProfile: vi.fn(),
    loadProfile: vi.fn(() => null),
    deleteProfile: vi.fn(),
    isUrlLoad: vi.fn(() => options.isUrlLoad ?? false),
    encodeUrl: vi.fn(() => "http://localhost/"),
    decodeUrl: vi.fn(() => null),
    writeUrlToClipboard: vi.fn(async () => true),
    loadSelectedProfile: vi.fn(() => options.selectedProfile ?? null),
    saveSelectedProfile: vi.fn(),
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
    settingsStore.loadProfile.mockReturnValue(profile);
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
    settingsStore.loadProfile.mockReturnValue(profile);

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

  test("shows the current skill level in the collapsible summary on a fresh start", () => {
    buildControls(globalThis.document);
    expect(getFake(globalThis.document, "attacker-skill-summary").textContent).toBe("skill.level 5");
  });

  test("clicking a visible skill tuner button updates the collapsible summary", () => {
    buildControls(globalThis.document);
    const rifter = rifterProfile();

    const hullInput = getFake(globalThis.document, "attacker-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const button = findVisibleButton(globalThis.document, "attacker-skill-options", "0");
    button.trigger("click");

    expect(getFake(globalThis.document, "attacker-skill-summary").textContent).toBe("skill.level 0");
  });

  test("loadSettings restores the skill level into the collapsible summary", () => {
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
    const ship: ShipState = { id: "attacker", maxSpeed: 0, mass: 0, inertiaModifier: 0, mode: "orbit", desiredRange: 0, rangeWeight: 0.003, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
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
    settingsStore.loadProfile.mockReturnValue(profile);

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
    settingsStore.loadProfile.mockReturnValue(profile);

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
    settingsStore.loadProfile.mockReturnValue(profile);

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
    settingsStore.loadProfile.mockImplementation((name: string) => (name === "kiter" ? selected : name === "brawler" ? other : null));

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

  test("save button highlights when tracking unit, language, or hull changes after loading a profile", () => {
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
    settingsStore.loadProfile.mockReturnValue(profile);

    const select = getFake(globalThis.document, "profile-select");
    select.value = "brawler";
    select.trigger("change");

    const saveButton = getFake(globalThis.document, "profile-save");
    saveButton.classList.toggle.mockClear();

    getFake(globalThis.document, "tracking-unit-score").trigger("click");
    expect(saveButton.classList.toggle).toHaveBeenCalledWith("unsaved", true);

    saveButton.classList.toggle.mockClear();
    getFake(globalThis.document, "lang-zh").trigger("click");
    expect(saveButton.classList.toggle).toHaveBeenCalledWith("unsaved", true);

    saveButton.classList.toggle.mockClear();
    getFake(globalThis.document, "attacker-hull").value = "Thrasher";
    getFake(globalThis.document, "attacker-hull").trigger("input");
    expect(saveButton.classList.toggle).toHaveBeenCalledWith("unsaved", true);
  });

  test("getConfig converts maneuver aggressivity to attacker rangeWeight", () => {
    const { controls } = buildControls(globalThis.document);
    getFake(globalThis.document, "maneuver-aggressivity").value = "2";
    expect(controls.getConfig().attacker.rangeWeight).toBeCloseTo(0.0015, 6);

    getFake(globalThis.document, "maneuver-aggressivity").value = "0.5";
    expect(controls.getConfig().attacker.rangeWeight).toBeCloseTo(0.006, 6);

    getFake(globalThis.document, "maneuver-aggressivity").value = "1";
    expect(controls.getConfig().attacker.rangeWeight).toBeCloseTo(0.003, 6);
  });

  test("getConfig clamps maneuver aggressivity to [0.01, 100]", () => {
    const { controls } = buildControls(globalThis.document);
    getFake(globalThis.document, "maneuver-aggressivity").value = "0.001";
    expect(controls.getConfig().attacker.rangeWeight).toBeCloseTo(0.3, 6);

    getFake(globalThis.document, "maneuver-aggressivity").value = "500";
    expect(controls.getConfig().attacker.rangeWeight).toBeCloseTo(0.00003, 6);
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
    expect(controls.getConfig().attacker.rangeWeight).toBeCloseTo(0.003, 6);
  });

  test("update formats long numbers with commas", () => {
    const { controls } = buildControls(globalThis.document);
    const ship: ShipState = { id: "attacker", maxSpeed: 0, mass: 0, inertiaModifier: 0, mode: "orbit", desiredRange: 0, rangeWeight: 0.003, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
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
    settingsStore.loadProfile.mockReturnValue(profile);

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
      selectedProfile: { name: "brawler", baseline: profile },
      listProfiles: ["brawler"],
    });

    const select = getFake(globalThis.document, "profile-select");
    expect(select.value).toBe("brawler");
    expect(settingsStore.save).toHaveBeenCalledWith(expect.objectContaining({ attackerHull: "Rifter", attackerPropulsion: "mwd-5mn" }));
    expect(settingsStore.saveSelectedProfile).not.toHaveBeenCalled();
  });

  test("loading settings from a URL does not restore the last selected profile", () => {
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
    buildControls(globalThis.document, profile, {
      isUrlLoad: true,
      selectedProfile: { name: "brawler", baseline: profile },
      listProfiles: ["brawler"],
    });

    const select = getFake(globalThis.document, "profile-select");
    expect(select.value).toBe("");
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

  test("saving a profile persists it as the selected profile", () => {
    const { settingsStore } = buildControls(globalThis.document);
    const nameInput = getFake(globalThis.document, "profile-name");
    nameInput.value = "brawler";
    nameInput.trigger("input");

    getFake(globalThis.document, "profile-save").trigger("click");

    expect(settingsStore.saveProfile).toHaveBeenCalledWith("brawler", expect.any(Object));
    expect(settingsStore.saveSelectedProfile).toHaveBeenCalledWith("brawler", expect.any(Object));
    expect(getFake(globalThis.document, "profile-select").value).toBe("brawler");
  });

  test("deleting a profile clears the selected profile", () => {
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
    settingsStore.loadProfile.mockReturnValue(profile);

    const select = getFake(globalThis.document, "profile-select");
    select.value = "brawler";
    select.trigger("change");
    settingsStore.saveSelectedProfile.mockClear();

    getFake(globalThis.document, "profile-delete").trigger("click");

    expect(settingsStore.deleteProfile).toHaveBeenCalledWith("brawler");
    expect(settingsStore.saveSelectedProfile).toHaveBeenCalledWith("", null);
    expect(select.value).toBe("");
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
