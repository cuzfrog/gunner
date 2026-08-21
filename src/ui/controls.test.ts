import type { ChargeCatalog, ChargeOption, FittingImport, ImportedFitting, ImportedTurret, PresetFitting, PresetFittings } from "../fitting";
import { alignTime, Vec2, type EngagementFrame, type HitChance, type HitChanceBreakdown, type ShipState } from "../sim";
import type { FittedHull, PropulsionId, PropulsionModule, PropulsionStats, ShipProfile, Ships, ShipStats, SkillLevel } from "../ships";
import { DomControls } from "./controls";
import type { I18n, Language } from "./i18n";
import { serializeProfile } from "./profileText";
import { ClipboardUnavailableError, type ClipboardProvider, type LocationProvider, type ProfileSettings, type SettingsStore, type UserSettings } from "./settings";
import { USER_SETTINGS_VERSION } from "./settings";
import type { SavedFittings } from "./savedFittings";
import type { Timer } from "./timer";

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

const RIFTER: ShipProfile = {
  name: "Rifter",
  faction: "Minmatar Republic",
  hullType: "Standard Frigates",
  mass: 1_000_000,
  inertiaModifier: 3,
  baseSpeed: 365,
  sigRadius: 36,
};

const THRASHER: ShipProfile = {
  name: "Thrasher",
  faction: "Minmatar Republic",
  hullType: "Standard Destroyers",
  mass: 1_500_000,
  inertiaModifier: 2.5,
  baseSpeed: 300,
  sigRadius: 70,
};

const MERLIN: ShipProfile = {
  name: "Merlin",
  faction: "Caldari State",
  hullType: "Standard Frigates",
  mass: 1_100_000,
  inertiaModifier: 3,
  baseSpeed: 350,
  sigRadius: 33,
};

const AB1MN: PropulsionModule = {
  id: "ab-1mn",
  kind: "afterburner",
  sizeTier: "small",
  label: "1MN Afterburner I",
  thrust: 1.5e6,
  massAddition: 500_000,
  speedBonus: 1.15,
  sigBloom: 0,
};

const MWD5MN: PropulsionModule = {
  id: "mwd-5mn",
  kind: "microwarpdrive",
  sizeTier: "small",
  label: "5MN Microwarpdrive I",
  thrust: 1.5e6,
  massAddition: 500_000,
  speedBonus: 5,
  sigBloom: 5,
};

const AB10MN: PropulsionModule = {
  id: "ab-10mn",
  kind: "afterburner",
  sizeTier: "medium",
  label: "10MN Afterburner I",
  thrust: 15e6,
  massAddition: 5_000_000,
  speedBonus: 1.15,
  sigBloom: 0,
};

const RIFTER_FITTING_OPTIONS: readonly PropulsionModule[] = [AB1MN, MWD5MN, AB10MN];
const VALID_PROPULSION_IDS: readonly PropulsionId[] = ["ab-1mn", "mwd-5mn", "ab-10mn"];

const RIFTER_BASE_SKILL0: ShipStats = { mass: 1_000_000, inertiaModifier: 3, maxSpeed: 365, sigRadius: 36 };
const RIFTER_BASE_SKILL5: ShipStats = { mass: 1_000_000, inertiaModifier: 2, maxSpeed: 456.25, sigRadius: 36 };
const RIFTER_AB1_SKILL0: ShipStats = { mass: 1_500_000, inertiaModifier: 3, maxSpeed: 982.28, sigRadius: 36 };
const RIFTER_AB1_SKILL5: ShipStats = { mass: 1_500_000, inertiaModifier: 2, maxSpeed: 1420.75, sigRadius: 36 };
const RIFTER_MWD_SKILL0: ShipStats = { mass: 1_500_000, inertiaModifier: 3, maxSpeed: 3048.82, sigRadius: 210 };
const RIFTER_MWD_SKILL5: ShipStats = { mass: 1_500_000, inertiaModifier: 2, maxSpeed: 3251.90, sigRadius: 210 };
const RIFTER_MWD_SKILL5_OVERLOADED: ShipStats = { mass: 1_500_000, inertiaModifier: 2, maxSpeed: 4649.72, sigRadius: 210 };
const THRASHER_BASE: ShipStats = { mass: 1_500_000, inertiaModifier: 2.5, maxSpeed: 300, sigRadius: 70 };

const IMPORTED_RIFTER: ImportedFitting = {
  profile: RIFTER,
  fittingName: "Brawler",
  fitted: { mass: 1_000_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 },
  propulsion: { ...MWD5MN, propulsionId: "mwd-5mn" },
  turret: { tracking: 0.315, sigResolutionClass: "S", optimal: 600, falloff: 3000, chargeSize: 1, charge: "Hail S", base: { tracking: 0.42, optimal: 1200, falloff: 3000 } },
  cargoCharges: [],
};

const IMPORTED_THRASHER: ImportedFitting = {
  profile: THRASHER,
  fittingName: "Sniper",
  fitted: { mass: 1_000_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 },
  propulsion: undefined,
  turret: { tracking: 0.12, sigResolutionClass: "S", optimal: 9843.75, falloff: 10937.5, chargeSize: 1, charge: "Republic Fleet EMP S", base: { tracking: 0.12, optimal: 19687.5, falloff: 10937.5 } },
  cargoCharges: [],
};

const SAVED_FITTED_SETTINGS: UserSettings = {
  version: USER_SETTINGS_VERSION,
  tracking: 0.32,
  trackingUnit: "rad",
  sigRes: "S",
  optimal: 5000,
  falloff: 5000,
  attackerSpeed: 4_649.72,
  attackerMode: "keepAtRange",
  attackerRange: 5000,
  maneuverAggressivity: 1,
  gridBrightness: 0.2,
  attackerMass: 1_500_000,
  attackerInertia: 2,
  attackerSkillLevel: 5,
  attackerOverload: true,
  attackerHull: "Rifter",
  attackerPropulsion: "mwd-5mn",
  attackerFittedHull: {
    fittingName: "Brawler",
    propulsionId: "mwd-5mn",
    fitted: IMPORTED_RIFTER.fitted,
    propulsion: IMPORTED_RIFTER.propulsion,
  },
  initialDistance: 5000,
  targetSpeed: 1000,
  targetMode: "orbit",
  targetRange: 5000,
  targetMass: 10_000_000,
  targetInertia: 0.45,
  targetSkillLevel: 5,
  targetOverload: true,
  targetSig: 40,
  attackerAmmo: "Hail S",
  simSpeed: 4,
  language: "en",
};

interface MockedPropulsion extends PropulsionStats {
  readonly id?: PropulsionId;
}

function mockStatsFor(profile: ShipProfile, module?: MockedPropulsion, conditions?: { skillLevel: SkillLevel; overloaded: boolean }): ShipStats {
  if (profile.name === "Rifter") {
    if (!module) return conditions?.skillLevel === 0 ? RIFTER_BASE_SKILL0 : RIFTER_BASE_SKILL5;
    if (module.id === "ab-1mn") return conditions?.skillLevel === 0 ? RIFTER_AB1_SKILL0 : RIFTER_AB1_SKILL5;
    if (module.id === "mwd-5mn") {
      if (conditions?.skillLevel === 0) return RIFTER_MWD_SKILL0;
      return conditions?.overloaded ? RIFTER_MWD_SKILL5_OVERLOADED : RIFTER_MWD_SKILL5;
    }
    if (module.id === "ab-10mn") return RIFTER_AB1_SKILL5;
  }
  return THRASHER_BASE;
}

interface HullView {
  readonly name: string;
  readonly hullType: string;
  readonly faction: string;
}

const HULL_VIEW_RIFTER: Record<Language, HullView> = {
  en: { name: "Rifter", hullType: "Standard Frigates", faction: "Minmatar Republic" },
  zh: { name: "裂谷级", hullType: "护卫舰", faction: "米玛塔尔" },
  ja: { name: "リフター", hullType: "フリゲート", faction: "ミンマター共和国" },
};

const HULL_VIEW_MERLIN: Record<Language, HullView> = {
  en: { name: "Merlin", hullType: "Standard Frigates", faction: "Caldari State" },
  zh: { name: "小鹰级", hullType: "护卫舰", faction: "加达里" },
  ja: { name: "マーリン", hullType: "フリゲート", faction: "カルダリ連合" },
};

const HULLS_BY_LANGUAGE: Record<Language, HullView[]> = {
  en: [HULL_VIEW_RIFTER.en, HULL_VIEW_MERLIN.en],
  zh: [HULL_VIEW_RIFTER.zh, HULL_VIEW_MERLIN.zh],
  ja: [HULL_VIEW_RIFTER.ja, HULL_VIEW_MERLIN.ja],
};

function createMockShips() {
  const findHullInputMap = new Map<string, ShipProfile>([
    ["rifter", RIFTER],
    ["裂谷级", RIFTER],
    ["リフター", RIFTER],
    ["thrasher", THRASHER],
    ["merlin", MERLIN],
    ["小鹰级", MERLIN],
    ["マーリン", MERLIN],
  ]);

  const mockShips = vi.mocked<Ships>({
    hulls: vi.fn((language: Language) => HULLS_BY_LANGUAGE[language]),
    hullView: vi.fn((profile: ShipProfile, language: Language) => {
      if (profile.name === "Rifter") return HULL_VIEW_RIFTER[language];
      if (profile.name === "Merlin") return HULL_VIEW_MERLIN[language];
      return { name: profile.name, hullType: profile.hullType, faction: profile.faction };
    }),
    findHull: vi.fn((name: string) => findHullInputMap.get(name.trim().toLowerCase())),
    parsePropulsionId: vi.fn((value: unknown) => {
      if (typeof value !== "string") return undefined;
      return VALID_PROPULSION_IDS.includes(value as PropulsionId) ? (value as PropulsionId) : undefined;
    }),
    fittingOptions: vi.fn((profile: ShipProfile) => (profile.name === "Rifter" ? RIFTER_FITTING_OPTIONS : [AB1MN, MWD5MN])),
    fittingOption: vi.fn((profile: ShipProfile, id: PropulsionId) => createMockShips_fittingOption(profile, id)),
    fittedStats: vi.fn((profile: ShipProfile, fitted: FittedHull | undefined, module?: MockedPropulsion, conditions?: { skillLevel: SkillLevel; overloaded: boolean }) => mockStatsFor(profile, module, conditions)),
    maxSpeedForFittedMass: vi.fn((profile: ShipProfile, fitted: FittedHull | undefined, mass: number, module?: MockedPropulsion, conditions?: { skillLevel: SkillLevel; overloaded: boolean }) => mockStatsFor(profile, module, conditions).maxSpeed),
  });

  mockShips.fittingOption.mockImplementation((profile: ShipProfile, id: PropulsionId) => {
    const options = mockShips.fittingOptions(profile);
    return options.find((m: PropulsionModule) => m.id === id);
  });

  return mockShips;
}

function createMockShips_fittingOption(profile: ShipProfile, id: PropulsionId): PropulsionModule | undefined {
  return RIFTER_FITTING_OPTIONS.find((m) => m.id === id) ?? [AB1MN, MWD5MN].find((m) => m.id === id);
}

class FakeElement {
  value = "";
  checked = false;
  hidden = false;
  textContent = "";
  title = "";
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
  private readonly handlers: Record<string, Array<(event?: unknown) => void>> = {};
  private readonly attributes: Record<string, string | null> = {};

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  addEventListener(event: string, handler: (event?: unknown) => void): void {
    this.handlers[event] ??= [];
    this.handlers[event].push(handler);
  }

  trigger(event: string, data?: unknown): void {
    this.handlers[event]?.forEach((handler) => handler(data));
  }

  dispatchEvent(event: { type: string; [key: string]: unknown } | Event): void {
    this.trigger(event.type, event as { type: string; [key: string]: unknown });
  }

  appendChild(child: unknown): void {
    this.children.push(child as FakeElement);
  }

  focus = vi.fn();

  blur = vi.fn();

  get firstElementChild(): FakeElement | null {
    return this.children[0] ?? null;
  }

  closest(): FakeElement | null {
    return null;
  }

  querySelector(selector: string): FakeElement | null {
    if (selector.startsWith('[aria-selected="true"]')) {
      return this.children.find((child) => child.getAttribute("aria-selected") === "true") ?? null;
    }
    return this.children[0] ?? null;
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
  getFake(document, "attacker-paste-popup").hidden = true;
  getFake(document, "target-paste-popup").hidden = true;
  getFake(document, "attacker-fitting-popup").hidden = true;
  getFake(document, "target-fitting-popup").hidden = true;
  getFake(document, "attacker-fitting-name").hidden = true;
  getFake(document, "target-fitting-name").hidden = true;
  getFake(document, "attacker-ammo-field").hidden = true;
  getFake(document, "attacker-ammo-popup").hidden = true;
  getFake(document, "attacker-ammo-all-section").hidden = true;
  getFake(document, "attacker-ammo-trigger").setAttribute("aria-expanded", "false");
  getFake(document, "attacker-ammo-trigger").disabled = true;
  getFake(document, "attacker-skill-trigger").setAttribute("aria-expanded", "false");
  getFake(document, "target-skill-trigger").setAttribute("aria-expanded", "false");
  getFake(document, "attacker-fitting-trigger").disabled = true;
  getFake(document, "target-fitting-trigger").disabled = true;
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

function gunnerProfileText(overrides: { attackerFitting?: string; targetFitting?: string } = {}): string {
  return serializeProfile({
    version: USER_SETTINGS_VERSION,
    tracking: 0.32,
    sigRes: "S",
    optimal: 5000,
    falloff: 5000,
    attackerSpeed: 0,
    attackerMode: "keepAtRange",
    attackerRange: 5000,
    attackerMass: 1_200_000,
    attackerInertia: 3,
    attackerHull: "Rifter",
    targetHull: "Thrasher",
    initialDistance: 5000,
    targetSpeed: 1000,
    targetMode: "orbit",
    targetRange: 5000,
    targetMass: 10_000_000,
    targetInertia: 0.45,
    targetSig: 40,
    attackerAmmo: "Hail S",
  simSpeed: 4,
    ...overrides,
  });
}

function asProfile(settings: UserSettings): ProfileSettings {
  const { language: _, trackingUnit: __, ...rest } = settings;
  return rest;
}

function createMockPresetFittings() {
  const fits: Record<string, PresetFitting[]> = {
    Rifter: [
      { name: "Brawler", body: "1MN Afterburner II\nStasis Webifier II\n150mm Light AutoCannon II, Hail S" },
      { name: "Tackle", body: "1MN Afterburner II\nWarp Scrambler II\n150mm Light AutoCannon II, EMP S" },
    ],
    Thrasher: [
      { name: "Sniper", body: "280mm Howitzer Artillery I, Republic Fleet EMP S\n5MN Y-T8 Compact Microwarpdrive" },
      { name: "Sniper", body: "650mm Artillery Cannon I, Republic Fleet EMP M\n5MN Y-T8 Compact Microwarpdrive" },
    ],
  };
  return vi.mocked<PresetFittings>({
    listHulls: vi.fn(() => ["Merlin", "Rifter", "Thrasher"]),
    fittingsFor: vi.fn((hull) => fits[hull] ?? []),
    eftText: vi.fn((hull, fit) => `[${hull}, ${fit.name}]\n${fit.body}`),
  });
}

function createMockSavedFittings() {
  return vi.mocked<SavedFittings>({
    listForHull: vi.fn(() => []),
    mostRecentFor: vi.fn(() => undefined),
    record: vi.fn((fitting) => ({ id: `${fitting.hull}::${fitting.name}`, ...fitting, savedAt: 0 })),
    remove: vi.fn(),
  });
}

function createNoOpTimer(): Timer {
  return {
    setTimeout: (_callback, _ms) => 1,
    clearTimeout: () => {},
    setInterval: (_callback, _ms) => 0,
    clearInterval: () => {},
  };
}

function buildControls(
  document: Document,
  savedSettings: UserSettings | null = null,
  options: { selectedProfile?: SelectedProfile | null; hasForeignUrlSettings?: boolean; listProfiles?: string[]; language?: Language; setup?(deps: { fittingImport: FittingImport; chargeCatalog: ChargeCatalog }): void } = {},
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
  const ships = createMockShips();
  const fittingImport = vi.mocked<FittingImport>({ importFitting: vi.fn(() => undefined) });
  const chargeCatalog = vi.mocked<ChargeCatalog>({
    usualForChargeSize: vi.fn(() => "Hail S"),
    chargesForSize: vi.fn(() => []),
    withCharge: vi.fn((turret) => turret),
  });
  const presetFittings = createMockPresetFittings();
  const savedFittings = createMockSavedFittings();
  const clipboard = vi.mocked<ClipboardProvider>({ readText: vi.fn(async () => ""), writeText: vi.fn(async () => {}) });
  const location = fakeLocation();
  const timer = createNoOpTimer();
  options.setup?.({ fittingImport, chargeCatalog });
  const controls = new DomControls({ hitChance, i18n, settingsStore, ships, fittingImport, presetFittings, savedFittings, clipboard, location, timer, chargeCatalog });
  return { hitChance, i18n, settingsStore, ships, fittingImport, chargeCatalog, presetFittings, savedFittings, clipboard, location, timer, controls };
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

  test("initial load displays align time as an input suffix", () => {
    buildControls(globalThis.document);
    expect(getFake(globalThis.document, "attacker-align-time").textContent).toBe(`${alignTime(1_200_000, 3).toFixed(1)}unit.second`);
    expect(getFake(globalThis.document, "target-align-time").textContent).toBe(`${alignTime(10_000_000, 0.45).toFixed(1)}unit.second`);
  });

  test("editing mass or inertia updates the align time suffix and title", () => {
    buildControls(globalThis.document);
    const mass = getFake(globalThis.document, "attacker-mass");
    const inertia = getFake(globalThis.document, "attacker-inertia");

    mass.value = "2400000";
    mass.trigger("input");
    expect(getFake(globalThis.document, "attacker-align-time").textContent).toBe(`${alignTime(2_400_000, 3).toFixed(1)}unit.second`);
    expect(inertia.title).toContain(`${alignTime(2_400_000, 3).toFixed(1)}unit.second`);

    inertia.value = "1.5";
    inertia.trigger("input");
    expect(getFake(globalThis.document, "attacker-align-time").textContent).toBe(`${alignTime(2_400_000, 1.5).toFixed(1)}unit.second`);
    expect(inertia.title).toContain(`${alignTime(2_400_000, 1.5).toFixed(1)}unit.second`);
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

  test("copy profile writes the serialized profile to the injected clipboard", async () => {
    const { clipboard } = buildControls(globalThis.document);
    const button = getFake(globalThis.document, "share-link");
    button.trigger("click");
    await Promise.resolve();
    const [text] = clipboard.writeText.mock.calls[0];
    expect(text.startsWith("# gunner v1")).toBe(true);
    expect(getFake(globalThis.document, "share-status").textContent).toBe("status.copied");
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
      attackerAmmo: "Hail S",
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
      attackerAmmo: "Hail S",
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
    const rifter = RIFTER;
    const first = RIFTER_FITTING_OPTIONS[0];
    const expected = mockStatsFor(rifter, first, { skillLevel: 5, overloaded: true });

    const input = getFake(globalThis.document, "attacker-hull");
    input.value = "rifter";
    input.trigger("input");

    expect(getFake(globalThis.document, "attacker-hull").value).toBe("Rifter");
    expect(getFake(globalThis.document, "attacker-speed").value).toBe(formatNumber(expected.maxSpeed));
    expect(getFake(globalThis.document, "attacker-mass").value).toBe(String(expected.mass));
    expect(getFake(globalThis.document, "attacker-inertia").value).toBe(formatNumber(expected.inertiaModifier, 6));
    expect(getFake(globalThis.document, "attacker-hull-hint").textContent).toContain("Standard Frigates");

    const propulsion = getFake(globalThis.document, "attacker-propulsion");
    expect(propulsion.disabled).toBe(false);
    const ids = propulsion.children.map((c) => c.value);
    expect(ids).toEqual(["ab-1mn", "mwd-5mn", "ab-10mn"]);
  });

  test("selecting a different hull after the first refreshes mass, inertia and speed", () => {
    buildControls(globalThis.document);

    const hullInput = getFake(globalThis.document, "attacker-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("input");

    expect(getFake(globalThis.document, "attacker-mass").value).toBe(String(RIFTER_AB1_SKILL5.mass));
    expect(getFake(globalThis.document, "attacker-inertia").value).toBe(formatNumber(RIFTER_AB1_SKILL5.inertiaModifier, 6));

    hullInput.value = "Thrasher";
    hullInput.trigger("input");

    expect(getFake(globalThis.document, "attacker-mass").value).toBe(String(THRASHER_BASE.mass));
    expect(getFake(globalThis.document, "attacker-inertia").value).toBe(formatNumber(THRASHER_BASE.inertiaModifier, 6));
    expect(getFake(globalThis.document, "attacker-speed").value).toBe(formatNumber(THRASHER_BASE.maxSpeed));
  });

  test("choosing an MWD updates target speed, mass and signature radius", () => {
    buildControls(globalThis.document);
    const rifter = RIFTER;

    getFake(globalThis.document, "target-hull").value = "Rifter";
    getFake(globalThis.document, "target-hull").trigger("input");

    const propulsion = getFake(globalThis.document, "target-propulsion");
    propulsion.value = "mwd-5mn";
    propulsion.trigger("change");

    const expected = mockStatsFor(rifter, MWD5MN, { skillLevel: 5, overloaded: true });
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
      attackerAmmo: "Hail S",
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
      attackerAmmo: "Hail S",
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
    const rifter = RIFTER;
    const hullInput = getFake(globalThis.document, "attacker-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const propulsion = getFake(globalThis.document, "attacker-propulsion");
    propulsion.value = "";
    propulsion.trigger("change");

    const skills = getFake(globalThis.document, "attacker-skills");
    skills.value = "0";
    skills.trigger("change");

    const expected = mockStatsFor(rifter, undefined, { skillLevel: 0, overloaded: true });
    expect(getFake(globalThis.document, "attacker-speed").value).toBe(formatNumber(expected.maxSpeed));
    expect(getFake(globalThis.document, "attacker-inertia").value).toBe(formatNumber(expected.inertiaModifier, 6));
  });

  test("changing the skill level recomputes speed and inertia with a fitted module", () => {
    buildControls(globalThis.document);
    const rifter = RIFTER;
    const hullInput = getFake(globalThis.document, "target-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");
    const propulsion = getFake(globalThis.document, "target-propulsion");
    propulsion.value = "mwd-5mn";
    propulsion.trigger("change");

    const skills = getFake(globalThis.document, "target-skills");
    skills.value = "0";
    skills.trigger("change");

    const expected = mockStatsFor(rifter, MWD5MN, { skillLevel: 0, overloaded: true });
    expect(getFake(globalThis.document, "target-speed").value).toBe(formatNumber(expected.maxSpeed));
    expect(getFake(globalThis.document, "target-inertia").value).toBe(formatNumber(expected.inertiaModifier, 6));
  });

  test("toggling overload recomputes speed while leaving mass and signature unchanged", () => {
    buildControls(globalThis.document);
    const rifter = RIFTER;
    const hullInput = getFake(globalThis.document, "target-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");
    const propulsion = getFake(globalThis.document, "target-propulsion");
    propulsion.value = "mwd-5mn";
    propulsion.trigger("change");

    const overload = getFake(globalThis.document, "target-overload");
    overload.checked = false;
    overload.trigger("change");

    const expected = mockStatsFor(rifter, MWD5MN, { skillLevel: 5, overloaded: false });
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
      attackerAmmo: "Hail S",
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
      attackerAmmo: "Hail S",
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

  test("fresh start without a c= URL does not auto-load local settings or the selected profile", () => {
    const { settingsStore } = buildControls(globalThis.document);
    expect(settingsStore.load).toHaveReturnedWith(null);
    expect(settingsStore.loadSelectedProfile).not.toHaveBeenCalled();
    expect(getFake(globalThis.document, "attacker-hull").value).toBe("");
    expect(getFake(globalThis.document, "profile-select").value).toBe("");
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

    const rifter = RIFTER;
    const expected = mockStatsFor(rifter, RIFTER_FITTING_OPTIONS[0], { skillLevel: 0, overloaded: true });
    const calls = settingsStore.save.mock.calls;
    const [saved] = calls[calls.length - 1];
    expect(saved.attackerSpeed).toBe(Number(formatNumber(expected.maxSpeed)));
    expect(saved.attackerInertia).toBe(Number(formatNumber(expected.inertiaModifier, 6)));
    expect(saved.attackerSkillLevel).toBe(0);
  });

  test("clicking a visible propulsion button updates the hidden select and recomputes stats", () => {
    buildControls(globalThis.document);
    const rifter = RIFTER;

    const hullInput = getFake(globalThis.document, "target-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const button = findVisibleButton(globalThis.document, "target-propulsion-options", "mwd-5mn");
    button.trigger("click");

    expect(getFake(globalThis.document, "target-propulsion").value).toBe("mwd-5mn");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.classList.toggle).toHaveBeenCalledWith("active", true);
    expect(button.getAttribute("title")).toBe("5MN");
    const expected = mockStatsFor(rifter, MWD5MN, { skillLevel: 5, overloaded: true });
    expect(getFake(globalThis.document, "target-speed").value).toBe(formatNumber(expected.maxSpeed));
  });

  test("clicking a visible skill tuner button updates the hidden select and recomputes speed", () => {
    buildControls(globalThis.document);
    const rifter = RIFTER;

    const hullInput = getFake(globalThis.document, "attacker-hull");
    hullInput.value = "Rifter";
    hullInput.trigger("change");

    const button = findVisibleButton(globalThis.document, "attacker-skill-options", "0");
    button.trigger("click");

    expect(getFake(globalThis.document, "attacker-skills").value).toBe("0");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.classList.toggle).toHaveBeenCalledWith("active", true);
    const expected = mockStatsFor(rifter, RIFTER_FITTING_OPTIONS[0], { skillLevel: 0, overloaded: true });
    expect(getFake(globalThis.document, "attacker-speed").value).toBe(formatNumber(expected.maxSpeed));
  });

  test("clicking the overload icon button toggles the hidden checkbox and recomputes speed", () => {
    buildControls(globalThis.document);
    const rifter = RIFTER;

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
    const expected = mockStatsFor(rifter, MWD5MN, { skillLevel: 5, overloaded: false });
    expect(getFake(globalThis.document, "target-speed").value).toBe(formatNumber(expected.maxSpeed));
  });

  test("shows the current skill level in the trigger summary on a fresh start", () => {
    buildControls(globalThis.document);
    expect(getFake(globalThis.document, "attacker-skill-summary").textContent).toBe("skill.level 5");
  });

  test("clicking a visible skill tuner button updates the trigger summary", () => {
    buildControls(globalThis.document);
    const rifter = RIFTER;

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
      attackerAmmo: "Hail S",
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

  test("profile tip displays the first active hint on load", () => {
    buildControls(globalThis.document);
    expect(getFake(globalThis.document, "profile-tip").textContent).toBe("hint.prefix You can import a ship fitting from clipboard.");
  });

  test("language change refreshes the profile hint", () => {
    buildControls(globalThis.document);
    const langZh = getFake(globalThis.document, "lang-zh");
    langZh.trigger("click");
    expect(getFake(globalThis.document, "profile-tip").textContent).toBe("hint.prefix 你可以从剪贴板导入舰船装配。");
  });

  test("update colors the hit chance value based on chance", () => {
    const { controls } = buildControls(globalThis.document);
    const ship: ShipState = { id: "attacker", maxSpeed: 0, mass: 0, inertiaModifier: 0, mode: "orbit", desiredRange: 0, aggressivity: 1, position: new Vec2(0, 0), velocity: new Vec2(0, 0) };
    const frame: EngagementFrame = { time: 0, attacker: ship, target: ship, relPosition: new Vec2(0, 0), distance: 1000, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0 };

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
    const { ships } = buildControls(globalThis.document);

    getFake(globalThis.document, "target-hull").value = "Rifter";
    getFake(globalThis.document, "target-hull").trigger("change");
    getFake(globalThis.document, "target-propulsion").value = "mwd-5mn";
    getFake(globalThis.document, "target-propulsion").trigger("change");

    ships.maxSpeedForFittedMass.mockReturnValue(1234.56);

    const activeMass = 5_000_000;
    getFake(globalThis.document, "target-mass").value = String(activeMass);
    getFake(globalThis.document, "target-mass").trigger("input");

    expect(getFake(globalThis.document, "target-speed").value).toBe(formatNumber(1234.56));
    expect(ships.maxSpeedForFittedMass).toHaveBeenCalledWith(RIFTER, undefined, activeMass, MWD5MN, { skillLevel: 5, overloaded: true });
  });

  test("manually editing mass after hull selection round-trips speed without squaring the factor", () => {
    const { ships } = buildControls(globalThis.document);

    getFake(globalThis.document, "target-hull").value = "Rifter";
    getFake(globalThis.document, "target-hull").trigger("change");
    getFake(globalThis.document, "target-propulsion").value = "mwd-5mn";
    getFake(globalThis.document, "target-propulsion").trigger("change");

    ships.maxSpeedForFittedMass.mockReturnValueOnce(1500.5);

    const displayedMass = Number(getFake(globalThis.document, "target-mass").value) + 1_000_000;
    getFake(globalThis.document, "target-mass").value = String(displayedMass);
    getFake(globalThis.document, "target-mass").trigger("input");

    expect(getFake(globalThis.document, "target-speed").value).toBe(formatNumber(1500.5));
    expect(ships.maxSpeedForFittedMass).toHaveBeenCalledWith(RIFTER, undefined, displayedMass, MWD5MN, { skillLevel: 5, overloaded: true });
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
      attackerAmmo: "Hail S",
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
      attackerAmmo: "Hail S",
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
      attackerAmmo: "Hail S",
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
      attackerAmmo: "Hail S",
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

  test("save button does not highlight when tracking unit changes after loading a profile", () => {
    const rifter = RIFTER;
    const module = MWD5MN;
    const stats = mockStatsFor(rifter, module, { skillLevel: 5, overloaded: true });
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
      attackerAmmo: "Hail S",
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
    expect(saveButton.classList.toggle).toHaveBeenCalledWith("unsaved", false);
  });

  test("loading a profile preserves the current tracking unit", () => {
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
      attackerAmmo: "Hail S",
  simSpeed: 4,
      language: "en",
    };
    settingsStore.loadProfile.mockReturnValue(asProfile(profile));

    getFake(globalThis.document, "tracking-unit-score").trigger("click");
    expect(getFake(globalThis.document, "tracking").value).toBe("320");

    const select = getFake(globalThis.document, "profile-select");
    select.value = "brawler";
    select.trigger("change");

    expect(getFake(globalThis.document, "tracking").value).toBe("320");
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
      attackerAmmo: "Hail S",
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
    const rifter = RIFTER;
    const module = MWD5MN;
    const stats = mockStatsFor(rifter, module, { skillLevel: 5, overloaded: true });
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
      attackerAmmo: "Hail S",
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
      attackerAmmo: "Hail S",
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
      attackerAmmo: "Hail S",
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
    const ship: ShipState = { id: "attacker", maxSpeed: 0, mass: 0, inertiaModifier: 0, mode: "orbit", desiredRange: 0, aggressivity: 1, position: new Vec2(0, 0), velocity: new Vec2(0, 0) };
    const frame: EngagementFrame = { time: 0, attacker: ship, target: ship, relPosition: new Vec2(0, 0), distance: 12345, relVelocity: new Vec2(0, 0), radialVelocity: 1234.5, transversalVelocity: new Vec2(0, 0), transversalSpeed: 1234.5, angularVelocity: 0.1234 };

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
      attackerAmmo: "Hail S",
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
      attackerAmmo: "Hail S",
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
      attackerAmmo: "Hail S",
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
      attackerAmmo: "Hail S",
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

  test("saving a profile persists it as the selected profile without display preferences", () => {
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
    expect(savedProfile).not.toHaveProperty("trackingUnit");
    expect(selectedBaseline).not.toHaveProperty("language");
    expect(selectedBaseline).not.toHaveProperty("trackingUnit");
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
      attackerAmmo: "Hail S",
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
      attackerAmmo: "Hail S",
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
      attackerAmmo: "Hail S",
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

  test("selecting attacker mode to midships disables the maneuver aggressivity slider", () => {
    buildControls(globalThis.document);
    const select = getFake(globalThis.document, "attacker-mode");
    const slider = getFake(globalThis.document, "maneuver-aggressivity-slider");
    expect(slider.disabled).toBe(false);

    select.value = "midships";
    select.trigger("input");
    expect(slider.disabled).toBe(true);

    select.value = "orbit";
    select.trigger("input");
    expect(slider.disabled).toBe(false);
  });

  test("selecting target mode to midships does not disable the shared maneuver aggressivity slider", () => {
    buildControls(globalThis.document);
    const select = getFake(globalThis.document, "target-mode");
    const slider = getFake(globalThis.document, "maneuver-aggressivity-slider");

    select.value = "midships";
    select.trigger("input");
    expect(slider.disabled).toBe(false);
  });

  test("loadSettings disables the maneuver aggressivity slider when attacker mode is midships", () => {
    const { controls } = buildControls(globalThis.document, {
      ...SAVED_FITTED_SETTINGS,
      attackerMode: "midships",
    });
    expect(getFake(globalThis.document, "maneuver-aggressivity-slider").disabled).toBe(true);
    expect(controls.getConfig().attacker.mode).toBe("midships");
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
      attackerAmmo: "Hail S",
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
      attackerAmmo: "Hail S",
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
    test("datalist option values are canonical preset hulls in every language", () => {
      buildControls(globalThis.document, null, { language: "zh" });

      const options = getFake(globalThis.document, "hull-options").children;
      expect(options.some((o) => o.value === "Rifter")).toBe(true);
      expect(options.some((o) => o.value === "Merlin")).toBe(true);
      expect(options.some((o) => o.value === "裂谷级")).toBe(false);
      expect(options.some((o) => o.value === "小鹰级")).toBe(false);

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
        attackerAmmo: "Hail S",
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
        attackerAmmo: "Hail S",
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
      expect(options.some((o) => o.value === "Rifter")).toBe(true);
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

  describe("import fitting", () => {
    async function flush(): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    test("attacker import button populates hull, turret and stats from a fitting", async () => {
      const { fittingImport, settingsStore } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();
      expect(getFake(globalThis.document, "attacker-hull").value).toBe("Rifter");
      expect(getFake(globalThis.document, "attacker-mass").value).toBe("1500000");
      expect(getFake(globalThis.document, "attacker-speed").value).toBe("4649.72");
      expect(getFake(globalThis.document, "attacker-inertia").value).toBe("2");
      expect(getFake(globalThis.document, "tracking").value).toBe("0.315");
      expect(getFake(globalThis.document, "sigRes").value).toBe("S");
      expect(getFake(globalThis.document, "optimal").value).toBe("600");
      expect(getFake(globalThis.document, "falloff").value).toBe("3000");
      expect(getFake(globalThis.document, "attacker-fitting-name").innerHTML).toContain("status.fittingImported");
      expect(getFake(globalThis.document, "attacker-fitting-name").hidden).toBe(false);
      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerFittedHull?.fittingName).toBe("Brawler");
    });

    test("target import button shows invalid status when the fit cannot be parsed", async () => {
      const { fittingImport } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(undefined);
      getFake(globalThis.document, "target-import-fitting").trigger("click");
      await flush();
      const fittingName = getFake(globalThis.document, "target-fitting-name");
      expect(fittingName.innerHTML).toContain("status.fittingInvalid");
      expect(fittingName.hidden).toBe(false);
      expect(fittingName.classList.toggle).toHaveBeenCalledWith("error", true);
    });

    test("clipboard unavailability opens the paste popup", async () => {
      const { clipboard } = buildControls(globalThis.document);
      clipboard.readText.mockRejectedValueOnce(new ClipboardUnavailableError());
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();
      expect(getFake(globalThis.document, "attacker-paste-popup").hidden).toBe(false);
      expect(getFake(globalThis.document, "attacker-fitting-name").hidden).toBe(true);
    });

    test("pasting a valid fitting in the popup imports it", async () => {
      const { fittingImport } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();
      const popup = getFake(globalThis.document, "attacker-paste-popup");
      popup.dispatchEvent({
        type: "paste",
        clipboardData: { getData: () => "[Rifter, Test Fit]" },
        preventDefault: vi.fn(),
      } as unknown as Event);
      await flush();
      expect(popup.hidden).toBe(true);
      expect(getFake(globalThis.document, "attacker-hull").value).toBe("Rifter");
    });

    test("pasting an invalid fitting in the popup shows invalid status", async () => {
      const { fittingImport } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(undefined);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();
      const popup = getFake(globalThis.document, "attacker-paste-popup");
      popup.dispatchEvent({
        type: "paste",
        clipboardData: { getData: () => "garbage" },
        preventDefault: vi.fn(),
      } as unknown as Event);
      await flush();
      expect(popup.hidden).toBe(true);
      const fittingName = getFake(globalThis.document, "attacker-fitting-name");
      expect(fittingName.innerHTML).toContain("status.fittingInvalid");
      expect(fittingName.hidden).toBe(false);
      expect(fittingName.classList.toggle).toHaveBeenCalledWith("error", true);
    });

    test("pasting a gunner profile in the popup imports only that side's fitting", async () => {
      const { fittingImport, settingsStore } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();
      const popup = getFake(globalThis.document, "attacker-paste-popup");
      popup.dispatchEvent({
        type: "paste",
        clipboardData: { getData: () => gunnerProfileText({ attackerFitting: "[Rifter, Brawler]\n1MN Afterburner II" }) },
        preventDefault: vi.fn(),
      } as unknown as Event);
      await flush();
      expect(popup.hidden).toBe(true);
      expect(getFake(globalThis.document, "attacker-hull").value).toBe("Rifter");
      expect(getFake(globalThis.document, "target-hull").value).toBe("");
      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerFitting).toBe("[Rifter, Brawler]\n1MN Afterburner II");
      expect(saved.targetFitting).toBeUndefined();
    });

    test("pasting a gunner profile without that side's fitting shows invalid status", async () => {
      const { clipboard, fittingImport } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      clipboard.readText = vi.fn(async () => {
        throw new ClipboardUnavailableError();
      });
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();
      const popup = getFake(globalThis.document, "attacker-paste-popup");
      popup.dispatchEvent({
        type: "paste",
        clipboardData: { getData: () => gunnerProfileText({ targetFitting: "[Thrasher, Sniper]\n5MN Y-T8 Compact Microwarpdrive" }) },
        preventDefault: vi.fn(),
      } as unknown as Event);
      await flush();
      expect(getFake(globalThis.document, "attacker-hull").value).toBe("");
      expect(getFake(globalThis.document, "attacker-fitting-name").innerHTML).toContain("status.fittingInvalid");
    });

    test("side import button imports only the corresponding side from gunner text", async () => {
      const { fittingImport, settingsStore, clipboard } = buildControls(globalThis.document);
      const attackerEft = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
      fittingImport.importFitting.mockImplementation((text: string) => (text.startsWith("[Rifter") ? IMPORTED_RIFTER : IMPORTED_THRASHER));
      clipboard.readText = vi.fn(async () => attackerEft);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();

      clipboard.readText = vi.fn(async () => gunnerProfileText({ attackerFitting: attackerEft, targetFitting: "[Thrasher, Sniper]\n5MN Y-T8 Compact Microwarpdrive" }));
      getFake(globalThis.document, "target-import-fitting").trigger("click");
      await flush();

      expect(getFake(globalThis.document, "attacker-hull").value).toBe("Rifter");
      expect(getFake(globalThis.document, "target-hull").value).toBe("Thrasher");
      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerFitting).toBe(attackerEft);
      expect(saved.targetFitting).toBe("[Thrasher, Sniper]\n5MN Y-T8 Compact Microwarpdrive");
    });

    test("top import button restores the full profile from gunner text", async () => {
      const { settingsStore, clipboard } = buildControls(globalThis.document);
      clipboard.readText = vi.fn(async () => gunnerProfileText({}));
      getFake(globalThis.document, "import-profile").trigger("click");
      await flush();
      expect(getFake(globalThis.document, "attacker-hull").value).toBe("Rifter");
      expect(getFake(globalThis.document, "target-hull").value).toBe("Thrasher");
      expect(getFake(globalThis.document, "share-status").textContent).toBe("status.profileImported");
      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerHull).toBe("Rifter");
      expect(saved.targetHull).toBe("Thrasher");
    });

    test("top import button shows invalid status for non-gunner text", async () => {
      const { clipboard } = buildControls(globalThis.document);
      clipboard.readText = vi.fn(async () => "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive");
      getFake(globalThis.document, "import-profile").trigger("click");
      await flush();
      expect(getFake(globalThis.document, "attacker-hull").value).toBe("");
      expect(getFake(globalThis.document, "share-status").textContent).toBe("status.fittingInvalid");
    });

    test("top import button shows clipboard denied status when reading fails", async () => {
      const { clipboard } = buildControls(globalThis.document);
      clipboard.readText = vi.fn(async () => {
        throw new ClipboardUnavailableError();
      });
      getFake(globalThis.document, "import-profile").trigger("click");
      await flush();
      expect(getFake(globalThis.document, "share-status").textContent).toBe("status.clipboardDenied");
    });

    test("copying the profile includes both sides' fitting bases", async () => {
      const { fittingImport, clipboard } = buildControls(globalThis.document);
      fittingImport.importFitting.mockImplementation((text: string) => (text.startsWith("[Rifter") ? IMPORTED_RIFTER : IMPORTED_THRASHER));

      const attackerHull = getFake(globalThis.document, "attacker-hull");
      attackerHull.value = "Rifter";
      attackerHull.trigger("change");
      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");
      getFake(globalThis.document, "attacker-fitting-preset-list").children[0].children[0].trigger("click");
      await flush();

      const targetHull = getFake(globalThis.document, "target-hull");
      targetHull.value = "Thrasher";
      targetHull.trigger("change");
      getFake(globalThis.document, "target-fitting-trigger").trigger("click");
      getFake(globalThis.document, "target-fitting-preset-list").children[1].children[0].trigger("click");
      await flush();

      getFake(globalThis.document, "share-link").trigger("click");
      await flush();
      const [text] = clipboard.writeText.mock.calls[0];
      expect(text).toContain("attacker.fitting:\n[Rifter, Brawler]");
      expect(text).toContain("target.fitting:\n[Thrasher, Sniper]");
    });

    test("preset picker distinguishes duplicate fit names by index", async () => {
      const { fittingImport, presetFittings } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(IMPORTED_THRASHER);
      const hullInput = getFake(globalThis.document, "target-hull");
      hullInput.value = "Thrasher";
      hullInput.trigger("change");
      getFake(globalThis.document, "target-fitting-trigger").trigger("click");

      const presetList = getFake(globalThis.document, "target-fitting-preset-list").children;
      const labels = presetList.map((child) => child.children[0].children[0].textContent);
      expect(labels).toEqual(["Sniper", "Sniper"]);

      presetList[1].children[0].trigger("click");
      await flush();

      expect(presetFittings.eftText).toHaveBeenCalledWith("Thrasher", expect.objectContaining({ body: "650mm Artillery Cannon I, Republic Fleet EMP M\n5MN Y-T8 Compact Microwarpdrive" }));
    });

    test("clicking the import button again when the paste popup is open closes it", async () => {
      const { clipboard } = buildControls(globalThis.document);
      clipboard.readText.mockRejectedValue(new ClipboardUnavailableError());
      const button = getFake(globalThis.document, "attacker-import-fitting");
      button.trigger("click");
      await flush();
      expect(getFake(globalThis.document, "attacker-paste-popup").hidden).toBe(false);
      button.trigger("click");
      expect(getFake(globalThis.document, "attacker-paste-popup").hidden).toBe(true);
    });

    test("Escape closes the paste popup and focuses the import button", async () => {
      const { clipboard } = buildControls(globalThis.document);
      clipboard.readText.mockRejectedValue(new ClipboardUnavailableError());
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();
      globalThis.document.dispatchEvent({ type: "keydown", key: "Escape" } as unknown as Event);
      expect(getFake(globalThis.document, "attacker-paste-popup").hidden).toBe(true);
      expect(getFake(globalThis.document, "attacker-import-fitting").focus).toHaveBeenCalled();
    });

    test("pointerdown outside the paste popup closes it", async () => {
      const { clipboard } = buildControls(globalThis.document);
      clipboard.readText.mockRejectedValue(new ClipboardUnavailableError());
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();
      const outside = new FakeElement();
      globalThis.document.dispatchEvent({ type: "pointerdown", target: outside } as unknown as Event);
      expect(getFake(globalThis.document, "attacker-paste-popup").hidden).toBe(true);
    });

    test("pointerdown inside the paste popup does not close it", async () => {
      const { clipboard } = buildControls(globalThis.document);
      clipboard.readText.mockRejectedValue(new ClipboardUnavailableError());
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();
      const inside = new FakeElement();
      const popup = getFake(globalThis.document, "attacker-paste-popup");
      inside.closest = () => popup;
      globalThis.document.dispatchEvent({ type: "pointerdown", target: inside } as unknown as Event);
      expect(popup.hidden).toBe(false);
    });

    test("manual hull selection clears the fitted state", async () => {
      const { fittingImport, settingsStore } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();
      const hullInput = getFake(globalThis.document, "attacker-hull");
      hullInput.value = "Thrasher";
      hullInput.trigger("change");
      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerFittedHull).toBeUndefined();
      expect(getFake(globalThis.document, "attacker-fitting-name").hidden).toBe(true);
      expect(getFake(globalThis.document, "attacker-hull-hint").textContent).not.toContain("Brawler");
    });

    test("reselecting the same hull after an import keeps the fitted state active", async () => {
      const { fittingImport, settingsStore } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();
      const hullInput = getFake(globalThis.document, "attacker-hull");
      hullInput.value = "Rifter";
      hullInput.trigger("change");

      expect(getFake(globalThis.document, "attacker-fitting-name").hidden).toBe(false);
      const [savedAfterReselect] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(savedAfterReselect.attackerFittedHull?.fittingName).toBe("Brawler");

      const skills = getFake(globalThis.document, "attacker-skills");
      skills.value = "0";
      skills.trigger("change");
      expect(getFake(globalThis.document, "attacker-speed").value).toBe(formatNumber(RIFTER_MWD_SKILL0.maxSpeed));
      const [savedAfterSkillChange] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(savedAfterSkillChange.attackerFittedHull?.fittingName).toBe("Brawler");
    });

    test("reselecting the same target hull after an import keeps the fitted state active", async () => {
      const { fittingImport, settingsStore } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      getFake(globalThis.document, "target-import-fitting").trigger("click");
      await flush();
      const hullInput = getFake(globalThis.document, "target-hull");
      hullInput.value = "Rifter";
      hullInput.trigger("change");

      expect(getFake(globalThis.document, "target-fitting-name").hidden).toBe(false);
      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.targetFittedHull?.fittingName).toBe("Brawler");
    });

    test("changing hull after an import leaves the weapon parameters untouched", async () => {
      const { fittingImport } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();
      const hullInput = getFake(globalThis.document, "attacker-hull");
      hullInput.value = "Thrasher";
      hullInput.trigger("change");

      expect(getFake(globalThis.document, "tracking").value).toBe("0.315");
      expect(getFake(globalThis.document, "sigRes").value).toBe("S");
      expect(getFake(globalThis.document, "optimal").value).toBe("600");
      expect(getFake(globalThis.document, "falloff").value).toBe("3000");
      expect(getFake(globalThis.document, "attacker-fitting-name").hidden).toBe(true);
    });

    test("loadSettings restores a fitted hull and its precomputed stats", () => {
      buildControls(globalThis.document, SAVED_FITTED_SETTINGS);
      expect(getFake(globalThis.document, "attacker-hull").value).toBe("Rifter");
      expect(getFake(globalThis.document, "attacker-mass").value).toBe("1500000");
      expect(getFake(globalThis.document, "attacker-speed").value).toBe("4649.72");
      expect(getFake(globalThis.document, "attacker-fitting-name").hidden).toBe(true);
    });

    test("changing propulsion updates the fitted summary and recomputes stats", async () => {
      const { fittingImport, settingsStore } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();
      const propulsion = getFake(globalThis.document, "attacker-propulsion");
      propulsion.value = "ab-1mn";
      propulsion.trigger("change");
      expect(getFake(globalThis.document, "attacker-mass").value).toBe("1500000");
      expect(getFake(globalThis.document, "attacker-speed").value).toBe("1420.75");
      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerFittedHull?.propulsionId).toBe("ab-1mn");
    });

    test("selecting a target preset fitting imports the EFT text for that hull and fit", async () => {
      const { fittingImport, presetFittings } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(IMPORTED_THRASHER);
      const hullInput = getFake(globalThis.document, "target-hull");
      hullInput.value = "Thrasher";
      hullInput.trigger("change");
      getFake(globalThis.document, "target-fitting-trigger").trigger("click");

      getFake(globalThis.document, "target-fitting-preset-list").children[0].children[0].trigger("click");
      await flush();

      expect(presetFittings.eftText).toHaveBeenCalledWith("Thrasher", expect.objectContaining({ name: "Sniper" }));
      const [importedText] = fittingImport.importFitting.mock.calls[fittingImport.importFitting.mock.calls.length - 1];
      expect(importedText).toContain("[Thrasher, Sniper]");
    });

    test("selecting a preset fitting imports the EFT text for that hull and fit", async () => {
      const { fittingImport, presetFittings } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      const hullInput = getFake(globalThis.document, "attacker-hull");
      hullInput.value = "Rifter";
      hullInput.trigger("change");
      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");

      getFake(globalThis.document, "attacker-fitting-preset-list").children[0].children[0].trigger("click");
      await flush();

      expect(presetFittings.eftText).toHaveBeenCalledWith("Rifter", expect.objectContaining({ name: "Brawler" }));
      const [importedText] = fittingImport.importFitting.mock.calls[fittingImport.importFitting.mock.calls.length - 1];
      expect(importedText).toContain("[Rifter, Brawler]");
      expect(getFake(globalThis.document, "attacker-hull").value).toBe("Rifter");
      expect(getFake(globalThis.document, "attacker-mass").value).toBe("1500000");
      expect(getFake(globalThis.document, "attacker-speed").value).toBe("4649.72");
      expect(getFake(globalThis.document, "tracking").value).toBe("0.315");
    });

    test("changing the hull repopulates the preset fitting options", () => {
      const { presetFittings } = buildControls(globalThis.document);
      const hullInput = getFake(globalThis.document, "attacker-hull");
      hullInput.value = "Rifter";
      hullInput.trigger("change");

      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");
      const presetList = getFake(globalThis.document, "attacker-fitting-preset-list").children;
      const labels = presetList.map((child) => child.children[0].children[0].textContent);
      expect(labels).toContain("Brawler");
      expect(labels).toContain("Tackle");
      expect(getFake(globalThis.document, "attacker-fitting-trigger").disabled).toBe(false);
      expect(presetFittings.fittingsFor).toHaveBeenCalledWith("Rifter");
    });

    test("selecting a hull with no preset fits still accepts typed input", () => {
      buildControls(globalThis.document);
      const hullInput = getFake(globalThis.document, "attacker-hull");
      hullInput.value = "merlin";
      hullInput.trigger("change");

      expect(getFake(globalThis.document, "attacker-hull").value).toBe("Merlin");
      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");
      expect(getFake(globalThis.document, "attacker-fitting-empty").hidden).toBe(false);
      expect(getFake(globalThis.document, "attacker-fitting-trigger").disabled).toBe(false);
    });

    test("importing a fitting records the fitting basis and clears attacker overrides", async () => {
      const { fittingImport, settingsStore, clipboard } = buildControls(globalThis.document);
      const eft = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
      clipboard.readText = vi.fn(async () => eft);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();

      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerFitting).toBe(eft);
      expect(saved.attackerOverrides).toEqual({});
      expect(saved.attackerFittedHull).not.toBeUndefined();
      expect(saved.attackerFittedHull?.fittingName).toBe("Brawler");
    });

    test("editing a fitted field records a side-specific override", async () => {
      const { fittingImport, settingsStore, clipboard } = buildControls(globalThis.document);
      const eft = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
      clipboard.readText = vi.fn(async () => eft);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();

      const massInput = getFake(globalThis.document, "attacker-mass");
      massInput.value = "2000000";
      massInput.trigger("input");

      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerOverrides).toEqual({ attackerMass: 2_000_000 });
      expect(saved.attackerFitting).toBe(eft);
    });

    test("editing mass does not overwrite a speed override", async () => {
      const { fittingImport, settingsStore, clipboard } = buildControls(globalThis.document);
      const eft = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
      clipboard.readText = vi.fn(async () => eft);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();

      const speedInput = getFake(globalThis.document, "attacker-speed");
      speedInput.value = "3500";
      speedInput.trigger("input");

      const massInput = getFake(globalThis.document, "attacker-mass");
      massInput.value = "2000000";
      massInput.trigger("input");

      expect(speedInput.value).toBe("3500");
      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerOverrides).toEqual({ attackerSpeed: 3500, attackerMass: 2_000_000 });
    });

    test("importing a different fitting clears the side overrides", async () => {
      const { fittingImport, settingsStore, clipboard } = buildControls(globalThis.document);
      const rifterEft = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
      const thrasherEft = "[Thrasher, Sniper]\n280mm Howitzer Artillery I, Republic Fleet EMP S\n5MN Y-T8 Compact Microwarpdrive";
      clipboard.readText = vi.fn(async () => rifterEft);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();

      const massInput = getFake(globalThis.document, "attacker-mass");
      massInput.value = "2000000";
      massInput.trigger("input");

      clipboard.readText = vi.fn(async () => thrasherEft);
      fittingImport.importFitting.mockReturnValue(IMPORTED_THRASHER);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();

      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerOverrides).toEqual({});
      expect(saved.attackerFitting).toBe(thrasherEft);
      expect(saved.attackerFittedHull?.fittingName).toBe("Sniper");
    });

    test("saveProfile includes fitting basis and overrides but not display preferences", async () => {
      const { fittingImport, settingsStore, clipboard } = buildControls(globalThis.document);
      const eft = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";
      clipboard.readText = vi.fn(async () => eft);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();

      const profileInput = getFake(globalThis.document, "profile-name");
      profileInput.value = "brawler";
      getFake(globalThis.document, "profile-save").trigger("click");

      const [name, profile] = settingsStore.saveProfile.mock.calls[settingsStore.saveProfile.mock.calls.length - 1];
      expect(name).toBe("brawler");
      expect(profile.attackerFitting).toBe(eft);
      expect(profile).not.toHaveProperty("language");
      expect(profile).not.toHaveProperty("trackingUnit");
    });
  });

  describe("fitting popup", () => {
    async function flush(): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const SAVED_RIFTER: { id: string; hull: string; name: string; text: string; savedAt: number } = {
      id: "Rifter::Brawler",
      hull: "Rifter",
      name: "Brawler",
      text: "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive",
      savedAt: 0,
    };

    function setRifterHull(): void {
      const hullInput = getFake(globalThis.document, "attacker-hull");
      hullInput.value = "Rifter";
      hullInput.trigger("change");
    }

    test("clicking the fitting trigger opens and closes the popup", () => {
      buildControls(globalThis.document);
      setRifterHull();
      const trigger = getFake(globalThis.document, "attacker-fitting-trigger");
      const popup = getFake(globalThis.document, "attacker-fitting-popup");
      trigger.trigger("click");
      expect(popup.hidden).toBe(false);
      expect(trigger.getAttribute("aria-expanded")).toBe("true");

      trigger.trigger("click");
      expect(popup.hidden).toBe(true);
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    });

    test("opening a fitting popup closes other popups", () => {
      buildControls(globalThis.document);
      setRifterHull();
      getFake(globalThis.document, "attacker-skill-trigger").trigger("click");
      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");
      expect(getFake(globalThis.document, "attacker-skill-popup").hidden).toBe(true);
      expect(getFake(globalThis.document, "attacker-fitting-popup").hidden).toBe(false);
    });

    test("pointerdown outside the fitting popup closes it", () => {
      buildControls(globalThis.document);
      setRifterHull();
      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");
      const outside = new FakeElement();
      globalThis.document.dispatchEvent({ type: "pointerdown", target: outside } as unknown as Event);
      expect(getFake(globalThis.document, "attacker-fitting-popup").hidden).toBe(true);
    });

    test("pointerdown inside the fitting popup does not close it", () => {
      buildControls(globalThis.document);
      setRifterHull();
      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");
      const popup = getFake(globalThis.document, "attacker-fitting-popup");
      const inside = new FakeElement();
      inside.closest = () => popup;
      globalThis.document.dispatchEvent({ type: "pointerdown", target: inside } as unknown as Event);
      expect(popup.hidden).toBe(false);
    });

    test("Escape closes the fitting popup and focuses the trigger", () => {
      buildControls(globalThis.document);
      setRifterHull();
      const trigger = getFake(globalThis.document, "attacker-fitting-trigger");
      trigger.trigger("click");
      globalThis.document.dispatchEvent({ type: "keydown", key: "Escape" } as unknown as Event);
      expect(getFake(globalThis.document, "attacker-fitting-popup").hidden).toBe(true);
      expect(trigger.focus).toHaveBeenCalled();
    });

    test("selecting a new hull with a recent saved fitting auto-imports it", async () => {
      const { savedFittings, fittingImport, settingsStore } = buildControls(globalThis.document);
      savedFittings.mostRecentFor.mockReturnValue(SAVED_RIFTER);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      setRifterHull();
      await flush();

      expect(fittingImport.importFitting).toHaveBeenCalledWith(SAVED_RIFTER.text, expect.any(Object));
      expect(savedFittings.record).not.toHaveBeenCalled();
      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerFitting).toBe(SAVED_RIFTER.text);
    });

    test("no recent saved fitting results in no auto-import", async () => {
      const { savedFittings, fittingImport } = buildControls(globalThis.document);
      savedFittings.mostRecentFor.mockReturnValue(undefined);
      setRifterHull();
      await flush();

      expect(fittingImport.importFitting).not.toHaveBeenCalled();
    });

    test("typing an intermediate hull then retyping the original updates stats and does not auto-select", async () => {
      const { savedFittings, fittingImport, settingsStore } = buildControls(globalThis.document);
      savedFittings.mostRecentFor.mockReturnValue(undefined);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);

      const hullInput = getFake(globalThis.document, "attacker-hull");
      hullInput.value = "Rifter";
      hullInput.trigger("change");
      await flush();
      fittingImport.importFitting.mockClear();
      settingsStore.save.mockClear();

      hullInput.value = "Thrasher";
      hullInput.trigger("input");
      hullInput.value = "Rifter";
      hullInput.trigger("input");
      await flush();

      expect(fittingImport.importFitting).not.toHaveBeenCalled();
      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerHull).toBe("Rifter");
    });

    test("input then change on a new hull auto-imports the recent fitting", async () => {
      const { savedFittings, fittingImport, settingsStore } = buildControls(globalThis.document);
      savedFittings.mostRecentFor.mockImplementation((hull: string) => (hull === "Rifter" ? SAVED_RIFTER : undefined));
      savedFittings.listForHull.mockImplementation((hull: string) => (hull === "Rifter" ? [SAVED_RIFTER] : []));
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);

      const hullInput = getFake(globalThis.document, "attacker-hull");
      hullInput.value = "Thrasher";
      hullInput.trigger("change");
      await flush();

      fittingImport.importFitting.mockClear();
      settingsStore.save.mockClear();

      hullInput.value = "Rifter";
      hullInput.trigger("input");
      hullInput.trigger("change");
      await flush();

      expect(fittingImport.importFitting).toHaveBeenCalledWith(SAVED_RIFTER.text, expect.any(Object));
      expect(savedFittings.record).not.toHaveBeenCalled();
      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerFitting).toBe(SAVED_RIFTER.text);
    });

    test("auto-select failure still persists the chosen hull", async () => {
      const { savedFittings, fittingImport, settingsStore } = buildControls(globalThis.document);
      savedFittings.mostRecentFor.mockReturnValue(SAVED_RIFTER);
      fittingImport.importFitting.mockReturnValue(undefined);
      setRifterHull();
      await flush();

      const [saved] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerHull).toBe("Rifter");
      expect(saved.attackerFittedHull).toBeUndefined();
    });

    test("selecting the same hull does not auto-select", async () => {
      const { savedFittings, fittingImport } = buildControls(globalThis.document);
      savedFittings.mostRecentFor.mockReturnValue(SAVED_RIFTER);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      const hullInput = getFake(globalThis.document, "attacker-hull");
      hullInput.value = "Rifter";
      hullInput.trigger("change");
      await flush();
      fittingImport.importFitting.mockClear();

      hullInput.trigger("change");
      await flush();

      expect(fittingImport.importFitting).not.toHaveBeenCalled();
    });

    test("successful clipboard fitting import calls record", async () => {
      const { savedFittings, fittingImport, clipboard } = buildControls(globalThis.document);
      const eft = SAVED_RIFTER.text;
      clipboard.readText = vi.fn(async () => eft);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();

      expect(savedFittings.record).toHaveBeenCalledWith({ hull: "Rifter", name: "Brawler", text: eft });
    });

    test("failed fitting import does not call record", async () => {
      const { savedFittings, fittingImport, clipboard } = buildControls(globalThis.document);
      clipboard.readText = vi.fn(async () => SAVED_RIFTER.text);
      fittingImport.importFitting.mockReturnValue(undefined);
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();

      expect(savedFittings.record).not.toHaveBeenCalled();
    });

    test("selecting a saved fitting imports its stored EFT text without recording", async () => {
      const { savedFittings, fittingImport } = buildControls(globalThis.document);
      savedFittings.listForHull.mockReturnValue([SAVED_RIFTER]);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      setRifterHull();
      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");
      const savedList = getFake(globalThis.document, "attacker-fitting-saved-list").children;
      savedList[0].children[0].trigger("click");
      await flush();

      expect(fittingImport.importFitting).toHaveBeenCalledWith(SAVED_RIFTER.text, expect.any(Object));
      expect(savedFittings.record).not.toHaveBeenCalled();
    });

    test("selecting a preset fitting does not record", async () => {
      const { savedFittings, fittingImport, presetFittings } = buildControls(globalThis.document);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      setRifterHull();
      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");
      getFake(globalThis.document, "attacker-fitting-preset-list").children[0].children[0].trigger("click");
      await flush();

      expect(presetFittings.eftText).toHaveBeenCalledWith("Rifter", expect.objectContaining({ name: "Brawler" }));
      expect(savedFittings.record).not.toHaveBeenCalled();
    });

    test("popup separates saved and preset entries", () => {
      const { savedFittings } = buildControls(globalThis.document);
      savedFittings.listForHull.mockReturnValue([SAVED_RIFTER]);
      setRifterHull();
      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");
      expect(getFake(globalThis.document, "attacker-fitting-saved-list").children.length).toBe(1);
      expect(getFake(globalThis.document, "attacker-fitting-preset-list").children.length).toBe(2);
    });

    test("current fitting is marked with aria-current", async () => {
      const { savedFittings, fittingImport } = buildControls(globalThis.document);
      savedFittings.listForHull.mockReturnValue([SAVED_RIFTER]);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      setRifterHull();
      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");
      getFake(globalThis.document, "attacker-fitting-saved-list").children[0].children[0].trigger("click");
      await flush();

      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");
      const button = getFake(globalThis.document, "attacker-fitting-saved-list").children[0].children[0];
      expect(button.getAttribute("aria-current")).toBe("true");
    });

    test("deleting a saved fitting calls remove and does not unapply the current fitting", async () => {
      const { savedFittings, fittingImport, settingsStore } = buildControls(globalThis.document);
      savedFittings.mostRecentFor.mockReturnValue(SAVED_RIFTER);
      savedFittings.listForHull.mockReturnValue([SAVED_RIFTER]);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      setRifterHull();
      await flush();

      const [savedAfterImport] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(savedAfterImport.attackerFitting).toBe(SAVED_RIFTER.text);

      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");
      const savedList = getFake(globalThis.document, "attacker-fitting-saved-list").children;
      savedList[0].children[1].trigger("click");

      expect(savedFittings.remove).toHaveBeenCalledWith(SAVED_RIFTER.id);
      expect(getFake(globalThis.document, "attacker-fitting-popup").hidden).toBe(false);
      const [savedAfterDelete] = settingsStore.save.mock.calls[settingsStore.save.mock.calls.length - 1];
      expect(savedAfterDelete.attackerFitting).toBe(SAVED_RIFTER.text);
    });

    test("invalid saved fittings are disabled and deletable", () => {
      const { savedFittings, fittingImport } = buildControls(globalThis.document);
      savedFittings.listForHull.mockReturnValue([SAVED_RIFTER]);
      fittingImport.importFitting.mockReturnValue(undefined);
      setRifterHull();
      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");

      const item = getFake(globalThis.document, "attacker-fitting-saved-list").children[0].children[0];
      expect(item.disabled).toBe(true);
      expect(item.title).toBe("fitting.invalid");

      getFake(globalThis.document, "attacker-fitting-saved-list").children[0].children[1].trigger("click");
      expect(savedFittings.remove).toHaveBeenCalledWith(SAVED_RIFTER.id);
    });

    test("deleting a saved fitting re-renders the popup", () => {
      const { savedFittings, fittingImport } = buildControls(globalThis.document);
      savedFittings.listForHull.mockReturnValueOnce([SAVED_RIFTER]).mockReturnValueOnce([]);
      savedFittings.mostRecentFor.mockReturnValue(undefined);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      setRifterHull();
      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");

      const savedList = getFake(globalThis.document, "attacker-fitting-saved-list");
      expect(savedList.children.length).toBe(1);
      savedList.children[0].children[1].trigger("click");

      expect(savedList.children.length).toBe(0);
    });

    test("opening the fitting popup focuses the first item", () => {
      const { savedFittings, fittingImport } = buildControls(globalThis.document);
      savedFittings.listForHull.mockReturnValue([SAVED_RIFTER]);
      savedFittings.mostRecentFor.mockReturnValue(undefined);
      fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      setRifterHull();
      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");

      const item = getFake(globalThis.document, "attacker-fitting-saved-list").children[0].children[0];
      expect(item.focus).toHaveBeenCalled();
    });
  });

  describe("ammunition switching", () => {
    const EFT_RIFTER = "[Rifter, Brawler]\n5MN Y-T8 Compact Microwarpdrive";

    const IMPORTED_RIFTER_WITH_CARGO: ImportedFitting = {
      ...IMPORTED_RIFTER,
      cargoCharges: [{ name: "Republic Fleet EMP S", quantity: 2000 }],
    };

    async function flush(): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    async function importRifter(ctx: ReturnType<typeof buildControls>, imported = IMPORTED_RIFTER): Promise<void> {
      ctx.fittingImport.importFitting.mockReturnValue(imported);
      ctx.clipboard.readText = vi.fn(async () => {
        throw new ClipboardUnavailableError();
      });
      getFake(globalThis.document, "attacker-import-fitting").trigger("click");
      await flush();
      const popup = getFake(globalThis.document, "attacker-paste-popup");
      popup.dispatchEvent({
        type: "paste",
        clipboardData: { getData: () => EFT_RIFTER },
        preventDefault: vi.fn(),
      } as unknown as Event);
      await flush();
    }

    test("ammo field is hidden and trigger is disabled before a turret is loaded", () => {
      buildControls(globalThis.document);
      expect(getFake(globalThis.document, "attacker-ammo-field").hidden).toBe(true);
      expect(getFake(globalThis.document, "attacker-ammo-trigger").disabled).toBe(true);
      expect(getFake(globalThis.document, "attacker-ammo-summary").textContent).toBe("—");
    });

    test("importing a fitting shows the ammo field and the loaded charge", async () => {
      const ctx = buildControls(globalThis.document);
      await importRifter(ctx);
      expect(getFake(globalThis.document, "attacker-ammo-field").hidden).toBe(false);
      expect(getFake(globalThis.document, "attacker-ammo-trigger").disabled).toBe(false);
      expect(getFake(globalThis.document, "attacker-ammo-summary").textContent).toBe("Hail S");
    });

    test("clicking the ammo trigger opens a popup with cargo and all sections and marks the current charge", async () => {
      const ctx = buildControls(globalThis.document);
      ctx.chargeCatalog.chargesForSize.mockReturnValue([
        { name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 },
        { name: "Republic Fleet EMP S", trackingMultiplier: 1, rangeMultiplier: 0.5, falloffMultiplier: 1 },
      ]);
      await importRifter(ctx, IMPORTED_RIFTER_WITH_CARGO);
      getFake(globalThis.document, "attacker-ammo-trigger").trigger("click");
      expect(getFake(globalThis.document, "attacker-ammo-popup").hidden).toBe(false);

      const cargoList = getFake(globalThis.document, "attacker-ammo-cargo-list");
      expect(cargoList.children.length).toBe(2);
      expect(cargoList.children[0].getAttribute("aria-selected")).toBe("true");
      expect(cargoList.children[0].children[0].textContent).toBe("Hail S");
      expect(cargoList.children[1].children[0].textContent).toBe("Republic Fleet EMP S");
      expect(cargoList.children[1].children[1].textContent).toBe("x2000");

      const allList = getFake(globalThis.document, "attacker-ammo-all-list");
      expect(allList.children.length).toBe(2);
      expect(allList.children[0].getAttribute("aria-selected")).toBe("true");
      expect(allList.children[0].title).toContain("range x0.5");
      expect(allList.children[0].title).toContain("falloff x0.75");
      expect(allList.children[0].title).toContain("track x0.75");
      expect(allList.children[1].title).toContain("range x0.5");
      expect(allList.children[1].title).toContain("track x1");
    });

    test("cargo list prepends the loaded charge when it is not in cargo", async () => {
      const ctx = buildControls(globalThis.document);
      ctx.chargeCatalog.chargesForSize.mockReturnValue([
        { name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 },
        { name: "Republic Fleet EMP S", trackingMultiplier: 1, rangeMultiplier: 0.5, falloffMultiplier: 1 },
      ]);
      await importRifter(ctx, { ...IMPORTED_RIFTER, cargoCharges: [{ name: "Republic Fleet EMP S", quantity: 2000 }] });
      getFake(globalThis.document, "attacker-ammo-trigger").trigger("click");
      const cargoList = getFake(globalThis.document, "attacker-ammo-cargo-list");
      expect(cargoList.children.length).toBe(2);
      expect(cargoList.children[0].children[0].textContent).toBe("Hail S");
      expect(cargoList.children[1].children[0].textContent).toBe("Republic Fleet EMP S");
      expect(cargoList.children[1].children[1].textContent).toBe("x2000");
    });

    test("selecting a different charge clears turret overrides and updates inputs", async () => {
      const ctx = buildControls(globalThis.document);
      const switchedTurret: ImportedTurret = {
        tracking: 0.42,
        sigResolutionClass: "S",
        optimal: 1200,
        falloff: 3000,
        chargeSize: 1,
        charge: "Republic Fleet EMP S",
        base: { tracking: 0.42, optimal: 1200, falloff: 3000 },
      };
      ctx.chargeCatalog.chargesForSize.mockReturnValue([
        { name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 },
        { name: "Republic Fleet EMP S", trackingMultiplier: 1, rangeMultiplier: 0.5, falloffMultiplier: 1 },
      ]);
      ctx.chargeCatalog.withCharge.mockReturnValue(switchedTurret);
      await importRifter(ctx);

      const optimalInput = getFake(globalThis.document, "optimal");
      optimalInput.value = "12345";
      optimalInput.trigger("input");

      getFake(globalThis.document, "attacker-ammo-trigger").trigger("click");
      const allList = getFake(globalThis.document, "attacker-ammo-all-list");
      allList.children[1].trigger("click");
      await flush();

      expect(getFake(globalThis.document, "attacker-ammo-summary").textContent).toBe("Republic Fleet EMP S");
      expect(getFake(globalThis.document, "tracking").value).toBe("0.42");
      expect(getFake(globalThis.document, "optimal").value).toBe("1200");
      expect(getFake(globalThis.document, "falloff").value).toBe("3000");
      const [saved] = ctx.settingsStore.save.mock.calls[ctx.settingsStore.save.mock.calls.length - 1];
      expect(saved.attackerAmmo).toBe("Republic Fleet EMP S");
      expect(saved.attackerOverrides).not.toHaveProperty("optimal");
      expect(saved.attackerOverrides).not.toHaveProperty("tracking");
      expect(saved.attackerOverrides).not.toHaveProperty("falloff");
    });

    test("pressing escape closes the ammo popup", async () => {
      const ctx = buildControls(globalThis.document);
      ctx.chargeCatalog.chargesForSize.mockReturnValue([{ name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 }]);
      await importRifter(ctx);
      getFake(globalThis.document, "attacker-ammo-trigger").trigger("click");
      globalThis.document.dispatchEvent({ type: "keydown", key: "Escape" } as unknown as Event);
      expect(getFake(globalThis.document, "attacker-ammo-popup").hidden).toBe(true);
      expect(getFake(globalThis.document, "attacker-ammo-trigger").getAttribute("aria-expanded")).toBe("false");
    });

    test("clicking the fitting trigger closes an open ammo popup", async () => {
      const ctx = buildControls(globalThis.document);
      ctx.savedFittings.listForHull.mockReturnValue([]);
      ctx.chargeCatalog.chargesForSize.mockReturnValue([{ name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 }]);
      await importRifter(ctx);
      getFake(globalThis.document, "attacker-ammo-trigger").trigger("click");
      getFake(globalThis.document, "attacker-fitting-trigger").trigger("click");
      expect(getFake(globalThis.document, "attacker-ammo-popup").hidden).toBe(true);
      expect(getFake(globalThis.document, "attacker-fitting-popup").hidden).toBe(false);
    });

    test("expand toggle reveals and hides the all charges section", async () => {
      const ctx = buildControls(globalThis.document);
      ctx.chargeCatalog.chargesForSize.mockReturnValue([{ name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 }]);
      await importRifter(ctx);
      getFake(globalThis.document, "attacker-ammo-trigger").trigger("click");
      const expand = getFake(globalThis.document, "attacker-ammo-expand");
      const allSection = getFake(globalThis.document, "attacker-ammo-all-section");
      expect(allSection.hidden).toBe(true);
      expect(expand.textContent).toBe("ammo.showAll");
      expand.trigger("click");
      expect(allSection.hidden).toBe(false);
      expect(expand.textContent).toBe("ammo.hideAll");
      expand.trigger("click");
      expect(allSection.hidden).toBe(true);
      expect(expand.textContent).toBe("ammo.showAll");
    });

    test("copy profile includes the ammo line", async () => {
      const ctx = buildControls(globalThis.document);
      await importRifter(ctx);
      getFake(globalThis.document, "share-link").trigger("click");
      await Promise.resolve();
      const [text] = ctx.clipboard.writeText.mock.calls[0];
      expect(text.startsWith("# gunner v1")).toBe(true);
      expect(text).toContain("ammo=Hail S");
      expect(text).not.toContain("attacker.ammo=");
    });

    test("top Import restores stored ammo", async () => {
      const ctx = buildControls(globalThis.document);
      ctx.fittingImport.importFitting.mockReturnValue(IMPORTED_RIFTER);
      ctx.chargeCatalog.chargesForSize.mockReturnValue([
        { name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 },
        { name: "Republic Fleet EMP S", trackingMultiplier: 1, rangeMultiplier: 0.5, falloffMultiplier: 1 },
      ]);
      ctx.chargeCatalog.withCharge.mockImplementation((turret, charge) => ({ ...turret, charge, tracking: turret.base.tracking, optimal: turret.base.optimal, falloff: turret.base.falloff }));
      const profile = serializeProfile({
        ...SAVED_FITTED_SETTINGS,
        attackerFitting: EFT_RIFTER,
        attackerAmmo: "Republic Fleet EMP S",
      });
      ctx.clipboard.readText = vi.fn(async () => profile);
      getFake(globalThis.document, "import-profile").trigger("click");
      await flush();
      expect(getFake(globalThis.document, "attacker-ammo-summary").textContent).toBe("Republic Fleet EMP S");
    });

    test("loadSettings with a stored ammo differing from the fitting uses the stored charge", () => {
      const settings: UserSettings = {
        ...SAVED_FITTED_SETTINGS,
        attackerFitting: EFT_RIFTER,
        attackerAmmo: "Republic Fleet EMP S",
      };
      buildControls(globalThis.document, settings, {
        setup: ({ fittingImport, chargeCatalog }) => {
          fittingImport.importFitting = vi.fn(() => IMPORTED_RIFTER);
          chargeCatalog.chargesForSize = vi.fn(() => [
            { name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 },
            { name: "Republic Fleet EMP S", trackingMultiplier: 1, rangeMultiplier: 0.5, falloffMultiplier: 1 },
          ]);
          chargeCatalog.withCharge = vi.fn((turret, charge) => ({
            ...turret,
            charge,
            tracking: turret.base.tracking,
            optimal: turret.base.optimal,
            falloff: turret.base.falloff,
          }));
        },
      });
      expect(getFake(globalThis.document, "attacker-ammo-summary").textContent).toBe("Republic Fleet EMP S");
    });

    test("clearing the attacker hull hides the ammo field", async () => {
      const ctx = buildControls(globalThis.document);
      await importRifter(ctx);
      const hullInput = getFake(globalThis.document, "attacker-hull");
      hullInput.value = "";
      hullInput.trigger("change");
      expect(getFake(globalThis.document, "attacker-ammo-field").hidden).toBe(true);
      expect(getFake(globalThis.document, "attacker-ammo-trigger").disabled).toBe(true);
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

