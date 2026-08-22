import { type ChargeCatalog, type FittingImport, type GunFamilies, type GunFamily, type ImportedFitting, type ImportedTurret } from "../../fitting";
import type { FittedHull, ShipProfile, StatConditions } from "../../ships";
import type { SigResolutionClass } from "../../sim";
import { TrackingInput } from "../trackingInput";
import type { I18n, Language } from "../i18n";
import type { ImageCatalog } from "../imageCatalog";
import type { ProfileParamOverrides } from "../settings";
import { TurretController, type TurretEls } from "./turretController";

export const RIFTER: ShipProfile = {
  name: "Rifter",
  faction: "Minmatar Republic",
  hullType: "Standard Frigates",
  mass: 1_000_000,
  inertiaModifier: 3,
  baseSpeed: 365,
  sigRadius: 36,
};

export const FITTED: FittedHull = { mass: 1_000_000, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 };

export const TURRET: ImportedTurret = {
  tracking: 0.315,
  sigResolutionClass: "S",
  optimal: 600,
  falloff: 3000,
  chargeSize: 1,
  charge: "Hail S",
  base: { tracking: 0.42, optimal: 1200, falloff: 3000 },
  moduleName: "200mm AutoCannon I",
};

const MOCK_REPRESENTATIVES: Record<GunFamily, Record<SigResolutionClass, string>> = {
  autocannon: { S: "200mm AutoCannon I", M: "425mm AutoCannon I", L: "800mm Repeating Cannon I", XL: "Quad 800mm Repeating Cannon I" },
  artillery: { S: "280mm Howitzer Artillery I", M: "720mm Howitzer Artillery I", L: "1400mm Howitzer Artillery I", XL: "Quad 3500mm Siege Artillery I" },
  pulseLaser: { S: "Gatling Pulse Laser I", M: "Heavy Pulse Laser I", L: "Mega Pulse Laser I", XL: "Dual Giga Pulse Laser I" },
  beamLaser: { S: "Small Focused Beam Laser I", M: "Heavy Beam Laser I", L: "Tachyon Beam Laser I", XL: "Dual Giga Beam Laser I" },
  blaster: { S: "Light Neutron Blaster I", M: "Heavy Neutron Blaster I", L: "Neutron Blaster Cannon I", XL: "Ion Siege Blaster I" },
  railgun: { S: "150mm Railgun I", M: "250mm Railgun I", L: "425mm Railgun I", XL: "Dual 1000mm Railgun I" },
};

export const IMPORTED_RIFTER: ImportedFitting = { profile: RIFTER, fittingName: "Brawler", fitted: FITTED, propulsion: undefined, turret: TURRET, cargoCharges: [] };
export const IMPORTED_RIFTER_WITH_CARGO: ImportedFitting = { ...IMPORTED_RIFTER, cargoCharges: [{ name: "Republic Fleet EMP S", quantity: 2000 }] };

export const CHARGE_OPTIONS = [
  { name: "Hail S", trackingMultiplier: 0.75, rangeMultiplier: 0.5, falloffMultiplier: 0.75 },
  { name: "Republic Fleet EMP S", trackingMultiplier: 1, rangeMultiplier: 0.5, falloffMultiplier: 1 },
] as const;

export class FakeElement {
  value = "";
  checked = false;
  hidden = false;
  className = "";
  textContent = "";
  title = "";
  src = "";
  tagName = "";
  disabled = false;
  isConnected = true;
  children: FakeElement[] = [];
  classList = { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() };
  private _innerHTML = "";
  private attributes: Record<string, string | null> = {};
  private handlers: Record<string, Array<(event?: unknown) => void>> = {};
  focus = vi.fn();

  get innerHTML(): string { return this._innerHTML; }
  set innerHTML(value: string) {
    this._innerHTML = value;
    for (const child of this.children) child.isConnected = false;
    this.children = [];
  }

  get firstElementChild(): FakeElement | null { return this.children[0] ?? null; }
  getAttribute(name: string): string | null { return this.attributes[name] ?? null; }
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
  addEventListener(event: string, handler: (event?: unknown) => void): void { (this.handlers[event] ??= []).push(handler); }
  trigger(event: string, data?: unknown): void { this.handlers[event]?.forEach((h) => h(data)); }
  appendChild(child: unknown): void { this.children.push(child as FakeElement); }
  closest(): FakeElement | null { return null; }
  querySelector(selector: string): FakeElement | null {
    if (selector.startsWith('[aria-selected="true"]')) {
      return this.children.find((c) => c.getAttribute("aria-selected") === "true") ?? null;
    }
    return this.children[0] ?? null;
  }
}

const TAG_BY_ID: Record<string, string> = {
  tracking: "INPUT",
  sigRes: "SELECT",
  "sig-res-options": "DIV",
  optimal: "INPUT",
  falloff: "INPUT",
  "attacker-ammo-trigger": "BUTTON",
  "attacker-ammo-summary": "SPAN",
  "attacker-ammo-summary-icon": "IMG",
  "attacker-ammo-popup": "DIV",
  "attacker-ammo-cargo-label": "SPAN",
  "attacker-ammo-cargo-list": "UL",
  "attacker-ammo-expand": "BUTTON",
  "attacker-ammo-all-section": "DIV",
  "attacker-ammo-all-list": "UL",
};

export function fakeDocument(): Document {
  const elements = new Map<string, FakeElement>();
  return {
    documentElement: { lang: "en" } as unknown as HTMLElement,
    getElementById: (id: string) => {
      if (!elements.has(id)) elements.set(id, new FakeElement());
      const tag = TAG_BY_ID[id] ?? "DIV";
      elements.get(id)!.tagName = tag;
      return elements.get(id) as unknown as HTMLElement;
    },
    querySelectorAll: () => [] as unknown as NodeListOf<Element>,
    createElement: (tag: string) => {
      const el = new FakeElement();
      el.tagName = tag.toUpperCase();
      return el as unknown as HTMLElement;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  } as unknown as Document;
}

export function getFake(document: Document, id: string): FakeElement {
  return document.getElementById(id) as unknown as FakeElement;
}

export function collectTurretEls(document: Document): TurretEls {
  return {
    tracking: getFake(document, "tracking") as unknown as HTMLInputElement,
    sigRes: getFake(document, "sigRes") as unknown as HTMLSelectElement,
    sigResOptions: getFake(document, "sig-res-options") as unknown as HTMLElement,
    optimal: getFake(document, "optimal") as unknown as HTMLInputElement,
    falloff: getFake(document, "falloff") as unknown as HTMLInputElement,
    attackerAmmoTrigger: getFake(document, "attacker-ammo-trigger") as unknown as HTMLButtonElement,
    attackerAmmoSummary: getFake(document, "attacker-ammo-summary") as unknown as HTMLElement,
    attackerAmmoSummaryIcon: getFake(document, "attacker-ammo-summary-icon") as unknown as HTMLImageElement,
    attackerAmmoPopup: getFake(document, "attacker-ammo-popup") as unknown as HTMLElement,
    attackerAmmoCargoLabel: getFake(document, "attacker-ammo-cargo-label") as unknown as HTMLElement,
    attackerAmmoCargoList: getFake(document, "attacker-ammo-cargo-list") as unknown as HTMLElement,
    attackerAmmoExpand: getFake(document, "attacker-ammo-expand") as unknown as HTMLButtonElement,
    attackerAmmoAllSection: getFake(document, "attacker-ammo-all-section") as unknown as HTMLElement,
    attackerAmmoAllList: getFake(document, "attacker-ammo-all-list") as unknown as HTMLElement,
  };
}

export function setTurretInputs(document: Document): void {
  getFake(document, "tracking").value = "0.42";
  getFake(document, "sigRes").value = "S";
  getFake(document, "optimal").value = "5000";
  getFake(document, "falloff").value = "5000";
  getFake(document, "attacker-ammo-all-section").hidden = true;
  getFake(document, "attacker-ammo-trigger").setAttribute("aria-expanded", "false");
  getFake(document, "attacker-ammo-popup").hidden = true;
}

export function addSigResButtons(document: Document): void {
  const group = getFake(document, "sig-res-options");
  for (const value of ["S", "M", "L", "XL"]) {
    const button = new FakeElement();
    button.tagName = "BUTTON";
    button.setAttribute("data-value", value);
    button.setAttribute("aria-pressed", String(value === "S"));
    button.title = `Original ${value}`;
    group.appendChild(button);
  }
}

export interface BuildTurretResult {
  document: Document;
  controller: TurretController;
  chargeCatalog: ChargeCatalog;
  imageCatalog: ImageCatalog;
  fittingImport: FittingImport;
  gunFamilies: GunFamilies;
  i18n: I18n;
  trackingInput: TrackingInput;
  clearTurretOverrides: ReturnType<typeof vi.fn>;
  onConfigChange: ReturnType<typeof vi.fn>;
  popup: { isOpen: ReturnType<typeof vi.fn>; open: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn>; focusTrigger: ReturnType<typeof vi.fn>; contains: ReturnType<typeof vi.fn> };
}

export function buildTurret(
  options: { overrides?: Partial<ProfileParamOverrides>; imageCatalog?: Partial<ImageCatalog>; chargeCatalog?: Partial<ChargeCatalog>; fittingImport?: Partial<FittingImport> } = {},
): BuildTurretResult {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  const els = collectTurretEls(document);
  setTurretInputs(document);
  addSigResButtons(document);
  const trackingInput = new TrackingInput();
  const i18n = vi.mocked<I18n>({ current: vi.fn((): Language => "en"), setLanguage: vi.fn(), t: vi.fn((key) => key), translateDocument: vi.fn() });
  const imageCatalog = vi.mocked<ImageCatalog>({ shipImageUrl: vi.fn(), itemIconUrl: vi.fn(() => undefined), droneIconUrl: vi.fn(), ...options.imageCatalog });
  const gunFamilies = vi.mocked<GunFamilies>({
    familyOf: vi.fn((moduleName: string) => (moduleName.includes("Howitzer") || moduleName.includes("Artillery") ? "artillery" : "autocannon")),
    representativeOf: vi.fn((family: GunFamily, sigRes: SigResolutionClass) => MOCK_REPRESENTATIVES[family][sigRes]),
  });
  const chargeCatalog = vi.mocked<ChargeCatalog>({ usualForChargeSize: vi.fn(() => "Hail S"), chargesForSize: vi.fn(() => []), chargesForTurret: vi.fn(() => []), withCharge: vi.fn((turret) => turret), ...options.chargeCatalog });
  const fittingImport = vi.mocked<FittingImport>({ importFitting: vi.fn(() => undefined), propulsionVariantNames: vi.fn(), propulsionStats: vi.fn(), summarize: vi.fn(), ...options.fittingImport });
  const overrides = () => options.overrides ?? {};
  const clearTurretOverrides = vi.fn();
  const onConfigChange = vi.fn();
  const popup = { isOpen: vi.fn(() => false), open: vi.fn(), close: vi.fn(), focusTrigger: vi.fn(), contains: vi.fn() };
  const controller = new TurretController({ els, popup, chargeCatalog, gunFamilies, imageCatalog, trackingInput, i18n, fittingImport, overrides, clearTurretOverrides, onConfigChange });
  return { document, controller, chargeCatalog, imageCatalog, fittingImport, gunFamilies, i18n, trackingInput, clearTurretOverrides, onConfigChange, popup };
}
