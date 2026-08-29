import type { Side } from "./side";

export type HtmlTag =
  | "BUTTON"
  | "CANVAS"
  | "DATALIST"
  | "DIV"
  | "IMG"
  | "INPUT"
  | "OUTPUT"
  | "P"
  | "SELECT"
  | "SPAN"
  | "TEXTAREA"
  | "UL";

export type ElementForTag<T extends HtmlTag> = T extends "BUTTON"
  ? HTMLButtonElement
  : T extends "IMG"
    ? HTMLImageElement
    : T extends "INPUT"
      ? HTMLInputElement
      : T extends "SELECT"
        ? HTMLSelectElement
        : T extends "TEXTAREA"
          ? HTMLTextAreaElement
          : HTMLElement;

export interface ControlElement {
  readonly id: string;
  readonly tag: HtmlTag;
  readonly defaultValue?: string;
}

export interface SideConfig {
  readonly key: Side;
  readonly idPrefix: string;
  readonly label: string;
  readonly i18nKey: string;
}

export const COMBATANT_SIDES: readonly SideConfig[] = [
  { key: "shipA", idPrefix: "ship-a", label: "Ship A", i18nKey: "shipA" },
  { key: "shipB", idPrefix: "ship-b", label: "Ship B", i18nKey: "shipB" },
] as const;

interface GlobalElementDefinition<T extends HtmlTag = HtmlTag> {
  readonly id: string;
  readonly tag: T;
  readonly defaultValue: string | undefined;
}

const GLOBAL_ELEMENT_DEFINITIONS = {
  appVersion: { id: "app-version", tag: "SPAN" as const, defaultValue: undefined },
  hullOptions: { id: "hull-options", tag: "DATALIST" as const, defaultValue: undefined },
  play: { id: "play", tag: "BUTTON" as const, defaultValue: undefined },
  reset: { id: "reset", tag: "BUTTON" as const, defaultValue: undefined },
  simSpeed: { id: "sim-speed", tag: "SELECT" as const, defaultValue: "4" },
  initialDistance: { id: "initial-distance", tag: "INPUT" as const, defaultValue: "20000" },
  gridBrightnessSlider: { id: "grid-brightness-slider", tag: "INPUT" as const, defaultValue: "0.5" },
  gridBrightnessValue: { id: "grid-brightness-value", tag: "OUTPUT" as const, defaultValue: undefined },
  canvasSettingsTrigger: { id: "canvas-settings-trigger", tag: "BUTTON" as const, defaultValue: undefined },
  canvasSettingsPopup: { id: "canvas-settings-popup", tag: "DIV" as const, defaultValue: undefined },
  zoomSlider: { id: "zoom-slider", tag: "INPUT" as const, defaultValue: "1" },
  zoomValue: { id: "zoom-value", tag: "OUTPUT" as const, defaultValue: undefined },
  autoZoomCheckbox: { id: "auto-zoom", tag: "INPUT" as const, defaultValue: undefined },
  weaponRangeButton: { id: "weapon-range-button", tag: "BUTTON" as const, defaultValue: undefined },
  langEn: { id: "lang-en", tag: "BUTTON" as const, defaultValue: undefined },
  langZh: { id: "lang-zh", tag: "BUTTON" as const, defaultValue: undefined },
  langJa: { id: "lang-ja", tag: "BUTTON" as const, defaultValue: undefined },
  profileSave: { id: "profile-save", tag: "BUTTON" as const, defaultValue: undefined },
  profileDelete: { id: "profile-delete", tag: "BUTTON" as const, defaultValue: undefined },
  profileSelectTrigger: { id: "profile-select-trigger", tag: "BUTTON" as const, defaultValue: undefined },
  profileSelectLabel: { id: "profile-select-label", tag: "SPAN" as const, defaultValue: undefined },
  profilePopup: { id: "profile-popup", tag: "DIV" as const, defaultValue: undefined },
  profileNew: { id: "profile-new", tag: "BUTTON" as const, defaultValue: undefined },
  newProfilePopup: { id: "new-profile-popup", tag: "DIV" as const, defaultValue: undefined },
  newProfileDirtyNote: { id: "new-profile-dirty-note", tag: "SPAN" as const, defaultValue: undefined },
  newProfileCurrentSection: { id: "new-profile-current-section", tag: "DIV" as const, defaultValue: undefined },
  newProfileSaveCurrent: { id: "new-profile-save-current", tag: "BUTTON" as const, defaultValue: undefined },
  newProfileCurrentName: { id: "new-profile-current-name", tag: "SPAN" as const, defaultValue: undefined },
  newProfileName: { id: "new-profile-name", tag: "INPUT" as const, defaultValue: undefined },
  newProfileConfirm: { id: "new-profile-confirm", tag: "BUTTON" as const, defaultValue: undefined },
  newProfileClearSession: { id: "new-profile-clear-session", tag: "BUTTON" as const, defaultValue: undefined },
  shareLink: { id: "share-link", tag: "BUTTON" as const, defaultValue: undefined },
  sharePopup: { id: "share-popup", tag: "DIV" as const, defaultValue: undefined },
  shareCopyUrl: { id: "share-copy-url", tag: "BUTTON" as const, defaultValue: undefined },
  shareCopyText: { id: "share-copy-text", tag: "BUTTON" as const, defaultValue: undefined },
  shareStatus: { id: "share-status", tag: "SPAN" as const, defaultValue: undefined },
  importProfile: { id: "import-profile", tag: "BUTTON" as const, defaultValue: undefined },
  importSidePopup: { id: "import-side-popup", tag: "DIV" as const, defaultValue: undefined },
  importSideShipA: { id: "import-side-ship-a", tag: "BUTTON" as const, defaultValue: undefined },
  importSideShipB: { id: "import-side-ship-b", tag: "BUTTON" as const, defaultValue: undefined },
  confirmPopup: { id: "confirm-popup", tag: "DIV" as const, defaultValue: undefined },
  confirmMessage: { id: "confirm-message", tag: "SPAN" as const, defaultValue: undefined },
  confirmOk: { id: "confirm-ok", tag: "BUTTON" as const, defaultValue: undefined },
  confirmCancel: { id: "confirm-cancel", tag: "BUTTON" as const, defaultValue: undefined },
  resDistance: { id: "res-distance", tag: "SPAN" as const, defaultValue: undefined },
  resTrackPenA: { id: "res-track-pen-a", tag: "SPAN" as const, defaultValue: undefined },
  resRangePenA: { id: "res-range-pen-a", tag: "SPAN" as const, defaultValue: undefined },
  resHitA: { id: "res-hit-a", tag: "SPAN" as const, defaultValue: undefined },
  resTrackPenB: { id: "res-track-pen-b", tag: "SPAN" as const, defaultValue: undefined },
  resRangePenB: { id: "res-range-pen-b", tag: "SPAN" as const, defaultValue: undefined },
  resHitB: { id: "res-hit-b", tag: "SPAN" as const, defaultValue: undefined },
  resHitLabelA: { id: "res-hit-label-a", tag: "SPAN" as const, defaultValue: undefined },
  resTrackPenLabelA: { id: "res-track-pen-label-a", tag: "SPAN" as const, defaultValue: undefined },
  resRangePenLabelA: { id: "res-range-pen-label-a", tag: "SPAN" as const, defaultValue: undefined },
  resHitLabelB: { id: "res-hit-label-b", tag: "SPAN" as const, defaultValue: undefined },
  resTrackPenLabelB: { id: "res-track-pen-label-b", tag: "SPAN" as const, defaultValue: undefined },
  resRangePenLabelB: { id: "res-range-pen-label-b", tag: "SPAN" as const, defaultValue: undefined },
  resNominalDpsA: { id: "res-nominal-dps-a", tag: "SPAN" as const, defaultValue: undefined },
  resAppliedDpsA: { id: "res-applied-dps-a", tag: "SPAN" as const, defaultValue: undefined },
  resAppliedDpsApplicationA: { id: "res-applied-dps-application-a", tag: "SPAN" as const, defaultValue: undefined },
  resTimeToImpactA: { id: "res-time-to-impact-a", tag: "SPAN" as const, defaultValue: undefined },
  resNominalDpsB: { id: "res-nominal-dps-b", tag: "SPAN" as const, defaultValue: undefined },
  resAppliedDpsB: { id: "res-applied-dps-b", tag: "SPAN" as const, defaultValue: undefined },
  resAppliedDpsApplicationB: { id: "res-applied-dps-application-b", tag: "SPAN" as const, defaultValue: undefined },
  resTimeToImpactB: { id: "res-time-to-impact-b", tag: "SPAN" as const, defaultValue: undefined },
  resNominalDpsLabelA: { id: "res-nominal-dps-label-a", tag: "SPAN" as const, defaultValue: undefined },
  resAppliedDpsLabelA: { id: "res-applied-dps-label-a", tag: "SPAN" as const, defaultValue: undefined },
  resTimeToImpactLabelA: { id: "res-time-to-impact-label-a", tag: "SPAN" as const, defaultValue: undefined },
  resNominalDpsLabelB: { id: "res-nominal-dps-label-b", tag: "SPAN" as const, defaultValue: undefined },
  resAppliedDpsLabelB: { id: "res-applied-dps-label-b", tag: "SPAN" as const, defaultValue: undefined },
  resTimeToImpactLabelB: { id: "res-time-to-impact-label-b", tag: "SPAN" as const, defaultValue: undefined },
  resTurretCardsA: { id: "res-turret-cards-a", tag: "DIV" as const, defaultValue: undefined },
  resTurretCardsB: { id: "res-turret-cards-b", tag: "DIV" as const, defaultValue: undefined },
  resMissileCardsA: { id: "res-missile-cards-a", tag: "DIV" as const, defaultValue: undefined },
  resMissileCardsB: { id: "res-missile-cards-b", tag: "DIV" as const, defaultValue: undefined },
  resSigFactorA: { id: "res-sig-factor-a", tag: "SPAN" as const, defaultValue: undefined },
  resSigFactorB: { id: "res-sig-factor-b", tag: "SPAN" as const, defaultValue: undefined },
  resVelocityFactorA: { id: "res-velocity-factor-a", tag: "SPAN" as const, defaultValue: undefined },
  resVelocityFactorB: { id: "res-velocity-factor-b", tag: "SPAN" as const, defaultValue: undefined },
  resSigFactorLabelA: { id: "res-sig-factor-label-a", tag: "SPAN" as const, defaultValue: undefined },
  resSigFactorLabelB: { id: "res-sig-factor-label-b", tag: "SPAN" as const, defaultValue: undefined },
  resVelocityFactorLabelA: { id: "res-velocity-factor-label-a", tag: "SPAN" as const, defaultValue: undefined },
  resVelocityFactorLabelB: { id: "res-velocity-factor-label-b", tag: "SPAN" as const, defaultValue: undefined },
  rangeOverlayLegend: { id: "range-overlay-legend", tag: "DIV" as const, defaultValue: undefined },
  slideHints: { id: "slide-hints", tag: "SPAN" as const, defaultValue: undefined },
  scene: { id: "scene", tag: "CANVAS" as const, defaultValue: undefined },
} as const satisfies { readonly [K: string]: GlobalElementDefinition };

interface CombatantElementDefinition<T extends HtmlTag = HtmlTag> {
  readonly tag: T;
  readonly baseId: string;
  readonly defaultValue: string | ((side: SideConfig) => string) | undefined;
}

const COMBATANT_ELEMENT_DEFINITIONS = {
  tracking: { tag: "INPUT" as const, baseId: "tracking", defaultValue: "0.32" },
  trackingUnitRad: { tag: "BUTTON" as const, baseId: "tracking-unit-rad", defaultValue: undefined },
  trackingUnitScore: { tag: "BUTTON" as const, baseId: "tracking-unit-score", defaultValue: undefined },
  sigRes: { tag: "SELECT" as const, baseId: "sigRes", defaultValue: "S" },
  sigResOptions: { tag: "DIV" as const, baseId: "sig-res-options", defaultValue: undefined },
  optimal: { tag: "INPUT" as const, baseId: "optimal", defaultValue: "5000" },
  falloff: { tag: "INPUT" as const, baseId: "falloff", defaultValue: "5000" },
  effectiveTracking: { tag: "SPAN" as const, baseId: "tracking", defaultValue: undefined },
  effectiveOptimal: { tag: "SPAN" as const, baseId: "optimal", defaultValue: undefined },
  effectiveFalloff: { tag: "SPAN" as const, baseId: "falloff", defaultValue: undefined },
  effectiveSpeed: { tag: "SPAN" as const, baseId: "speed", defaultValue: undefined },
  ammoField: { tag: "DIV" as const, baseId: "ammo-field", defaultValue: undefined },
  ammoTrigger: { tag: "BUTTON" as const, baseId: "ammo-trigger", defaultValue: undefined },
  ammoSummary: { tag: "SPAN" as const, baseId: "ammo-summary", defaultValue: undefined },
  ammoSummaryIcon: { tag: "IMG" as const, baseId: "ammo-summary-icon", defaultValue: undefined },
  ammoPopup: { tag: "DIV" as const, baseId: "ammo-popup", defaultValue: undefined },
  ammoCargoLabel: { tag: "SPAN" as const, baseId: "ammo-cargo-label", defaultValue: undefined },
  ammoCargoList: { tag: "UL" as const, baseId: "ammo-cargo-list", defaultValue: undefined },
  ammoExpand: { tag: "BUTTON" as const, baseId: "ammo-expand", defaultValue: undefined },
  ammoAllSection: { tag: "DIV" as const, baseId: "ammo-all-section", defaultValue: undefined },
  ammoAllList: { tag: "UL" as const, baseId: "ammo-all-list", defaultValue: undefined },
  hull: { tag: "INPUT" as const, baseId: "hull", defaultValue: "" },
  fittingName: { tag: "SPAN" as const, baseId: "fitting-name", defaultValue: undefined },
  hullHint: { tag: "SPAN" as const, baseId: "hull-hint", defaultValue: undefined },
  shipSelectTrigger: { tag: "BUTTON" as const, baseId: "ship-select-trigger", defaultValue: undefined },
  fittingEye: { tag: "BUTTON" as const, baseId: "fitting-eye", defaultValue: undefined },
  shipSelectPopup: { tag: "DIV" as const, baseId: "ship-select-popup", defaultValue: undefined },
  fittingPreview: { tag: "DIV" as const, baseId: "fitting-preview", defaultValue: undefined },
  fittingSavedLabel: { tag: "SPAN" as const, baseId: "fitting-saved-label", defaultValue: undefined },
  fittingSavedList: { tag: "UL" as const, baseId: "fitting-saved-list", defaultValue: undefined },
  fittingPresetLabel: { tag: "SPAN" as const, baseId: "fitting-preset-label", defaultValue: undefined },
  fittingPresetList: { tag: "UL" as const, baseId: "fitting-preset-list", defaultValue: undefined },
  fittingEmpty: { tag: "P" as const, baseId: "fitting-empty", defaultValue: undefined },
  importFitting: { tag: "BUTTON" as const, baseId: "import-fitting", defaultValue: undefined },
  pastePopup: { tag: "DIV" as const, baseId: "paste-popup", defaultValue: undefined },
  pasteInput: { tag: "TEXTAREA" as const, baseId: "paste-input", defaultValue: undefined },
  propulsion: { tag: "SELECT" as const, baseId: "propulsion", defaultValue: "" },
  propulsionOptions: { tag: "DIV" as const, baseId: "propulsion-options", defaultValue: undefined },
  propulsionGear: { tag: "BUTTON" as const, baseId: "propulsion-gear", defaultValue: undefined },
  propulsionVariants: { tag: "DIV" as const, baseId: "propulsion-variants", defaultValue: undefined },
  skills: { tag: "SELECT" as const, baseId: "skills", defaultValue: "5" },
  skillOptions: { tag: "DIV" as const, baseId: "skill-options", defaultValue: undefined },
  skillSummary: { tag: "SPAN" as const, baseId: "skill-summary", defaultValue: undefined },
  skillTrigger: { tag: "BUTTON" as const, baseId: "skill-trigger", defaultValue: undefined },
  skillPopup: { tag: "DIV" as const, baseId: "skill-popup", defaultValue: undefined },
  skillField: { tag: "DIV" as const, baseId: "skill-field", defaultValue: undefined },
  overload: { tag: "INPUT" as const, baseId: "overload", defaultValue: undefined },
  overloadButton: { tag: "BUTTON" as const, baseId: "overload-button", defaultValue: undefined },
  ewarField: { tag: "DIV" as const, baseId: "ewar-field", defaultValue: undefined },
  ewarTrigger: { tag: "BUTTON" as const, baseId: "ewar-trigger", defaultValue: undefined },
  ewarPopup: { tag: "DIV" as const, baseId: "ewar-popup", defaultValue: undefined },
  ewarSection: { tag: "DIV" as const, baseId: "ewar-section", defaultValue: undefined },
  ewarSummaryRow: { tag: "SPAN" as const, baseId: "ewar-summary-row", defaultValue: undefined },
  ewarSummary: { tag: "SPAN" as const, baseId: "ewar-summary", defaultValue: undefined },
  boosterSection: { tag: "DIV" as const, baseId: "booster-section", defaultValue: undefined },
  boosterSummary: { tag: "SPAN" as const, baseId: "booster-summary", defaultValue: undefined },
  speed: {
    tag: "INPUT" as const,
    baseId: "speed",
    defaultValue: (side: SideConfig) => (side.key === "shipA" ? "0" : "1000"),
  },
  mass: {
    tag: "INPUT" as const,
    baseId: "mass",
    defaultValue: (side: SideConfig) => (side.key === "shipA" ? "1200000" : "10000000"),
  },
  inertia: {
    tag: "INPUT" as const,
    baseId: "inertia",
    defaultValue: (side: SideConfig) => (side.key === "shipA" ? "3" : "0.45"),
  },
  alignTime: { tag: "SPAN" as const, baseId: "align-time", defaultValue: undefined },
  mode: {
    tag: "SELECT" as const,
    baseId: "mode",
    defaultValue: (side: SideConfig) => (side.key === "shipA" ? "keepAtRange" : "orbit"),
  },
  range: { tag: "INPUT" as const, baseId: "range", defaultValue: "5000" },
  aggressivity: { tag: "INPUT" as const, baseId: "aggressivity", defaultValue: "1" },
  aggressivitySlider: { tag: "INPUT" as const, baseId: "aggressivity-slider", defaultValue: "0.5" },
  aggressivityValue: { tag: "OUTPUT" as const, baseId: "aggressivity-value", defaultValue: undefined },
  aggressivityField: { tag: "DIV" as const, baseId: "aggressivity-field", defaultValue: undefined },
  shipSig: { tag: "INPUT" as const, baseId: "sig", defaultValue: "40" },
  portrait: { tag: "DIV" as const, baseId: "portrait", defaultValue: undefined },
  turretPanel: { tag: "DIV" as const, baseId: "turret-panel", defaultValue: undefined },
  launcherPanel: { tag: "DIV" as const, baseId: "launcher-panel", defaultValue: undefined },
  weaponSystem: { tag: "DIV" as const, baseId: "weapon-system", defaultValue: undefined },
  weaponSystemTurret: { tag: "BUTTON" as const, baseId: "weapon-system-turret", defaultValue: undefined },
  weaponSystemMissile: { tag: "BUTTON" as const, baseId: "weapon-system-missile", defaultValue: undefined },
  weaponSystemDrone: { tag: "BUTTON" as const, baseId: "weapon-system-drone", defaultValue: undefined },
  launcherAmmoTrigger: { tag: "BUTTON" as const, baseId: "launcher-ammo-trigger", defaultValue: undefined },
  launcherAmmoSummary: { tag: "SPAN" as const, baseId: "launcher-ammo-summary", defaultValue: undefined },
  launcherAmmoSummaryIcon: { tag: "IMG" as const, baseId: "launcher-ammo-summary-icon", defaultValue: undefined },
  launcherAmmoPopup: { tag: "DIV" as const, baseId: "launcher-ammo-popup", defaultValue: undefined },
  launcherAmmoList: { tag: "UL" as const, baseId: "launcher-ammo-list", defaultValue: undefined },
  launcherAmmoField: { tag: "DIV" as const, baseId: "launcher-ammo-field", defaultValue: undefined },
  launcherClassOptions: { tag: "DIV" as const, baseId: "launcher-class-options", defaultValue: undefined },
  launcherAttributesTrigger: { tag: "BUTTON" as const, baseId: "launcher-attributes-trigger", defaultValue: undefined },
  launcherAttributesPopup: { tag: "DIV" as const, baseId: "launcher-attributes-popup", defaultValue: undefined },
  launcherAttributesField: { tag: "DIV" as const, baseId: "launcher-attributes-field", defaultValue: undefined },
  launcherVolleyDamage: { tag: "SPAN" as const, baseId: "launcher-volley-damage", defaultValue: undefined },
  launcherRateOfFire: { tag: "SPAN" as const, baseId: "launcher-rate-of-fire", defaultValue: undefined },
  launcherExplosionRadius: { tag: "SPAN" as const, baseId: "launcher-explosion-radius", defaultValue: undefined },
  launcherExplosionVelocity: { tag: "SPAN" as const, baseId: "launcher-explosion-velocity", defaultValue: undefined },
  launcherMissileVelocity: { tag: "SPAN" as const, baseId: "launcher-missile-velocity", defaultValue: undefined },
  launcherFlightTime: { tag: "SPAN" as const, baseId: "launcher-flight-time", defaultValue: undefined },
  launcherFlightRange: { tag: "SPAN" as const, baseId: "launcher-flight-range", defaultValue: undefined },
  launcherDamageReductionFactor: { tag: "SPAN" as const, baseId: "launcher-damage-reduction-factor", defaultValue: undefined },
} as const satisfies { readonly [K: string]: CombatantElementDefinition };

export type GlobalElementDefinitionMap = typeof GLOBAL_ELEMENT_DEFINITIONS;
export type CombatantElementDefinitionMap = typeof COMBATANT_ELEMENT_DEFINITIONS;

function sideConfigFor(side: Side): SideConfig {
  return COMBATANT_SIDES.find((s) => s.key === side) ?? COMBATANT_SIDES[0];
}

function defaultForCombatant(def: CombatantElementDefinition, side: SideConfig): string | undefined {
  const value = def.defaultValue;
  if (typeof value === "function") return value(side);
  return value;
}

export function globalElementId<K extends keyof GlobalElementDefinitionMap>(key: K): string {
  return GLOBAL_ELEMENT_DEFINITIONS[key].id;
}

export function combatantElementId<K extends keyof CombatantElementDefinitionMap>(key: K, side: Side): string {
  const sideConfig = sideConfigFor(side);
  const def = COMBATANT_ELEMENT_DEFINITIONS[key];
  if (key === "effectiveTracking" || key === "effectiveOptimal" || key === "effectiveFalloff" || key === "effectiveSpeed") {
    return `effective-${sideConfig.idPrefix}-${def.baseId}`;
  }
  return `${sideConfig.idPrefix}-${def.baseId}`;
}

function buildInventory(): ControlElement[] {
  const elements: ControlElement[] = [];
  for (const key of objectKeys(GLOBAL_ELEMENT_DEFINITIONS)) {
    const def = GLOBAL_ELEMENT_DEFINITIONS[key];
    elements.push({ id: def.id, tag: def.tag, defaultValue: def.defaultValue });
  }
  for (const side of COMBATANT_SIDES) {
    for (const key of objectKeys(COMBATANT_ELEMENT_DEFINITIONS)) {
      const def = COMBATANT_ELEMENT_DEFINITIONS[key];
      const id = combatantElementId(key, side.key);
      const defaultValue = defaultForCombatant(def, side);
      elements.push({ id, tag: def.tag, defaultValue });
    }
  }
  return elements;
}

function buildDefaultValues(inventory: readonly ControlElement[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const element of inventory) {
    if (element.defaultValue !== undefined) values[element.id] = element.defaultValue;
  }
  return values;
}

function buildTagById(inventory: readonly ControlElement[]): Record<string, HtmlTag> {
  const tags: Record<string, HtmlTag> = {};
  for (const element of inventory) {
    tags[element.id] = element.tag;
  }
  return tags;
}

// Typed Object.keys wrapper: the inventory object keys are string literals,
// so the cast narrows the result to known property names.
function objectKeys<T extends object>(obj: T): Array<keyof T & string> {
  return Object.keys(obj) as Array<keyof T & string>;
}

export const CONTROL_ELEMENT_INVENTORY: readonly ControlElement[] = buildInventory();
export const DEFAULT_VALUES: Record<string, string> = buildDefaultValues(CONTROL_ELEMENT_INVENTORY);
export const TAG_BY_ID: Record<string, HtmlTag> = buildTagById(CONTROL_ELEMENT_INVENTORY);
