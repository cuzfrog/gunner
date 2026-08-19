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
  "attacker-skills": "5",
  "attacker-mass": "1200000",
  "attacker-inertia": "3",
  "attacker-mode": "keepAtRange",
  "attacker-range": "5000",
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
