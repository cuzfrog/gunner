import type { AutopilotMode, SigResolutionClass } from "../sim";
import type { SkillLevel } from "../ships";
import {
  USER_SETTINGS_VERSION,
  type DisplayPreferences,
  type FittedHullSummary,
  type ProfileParamOverrides,
  type PropulsionSelection,
  type StoredBoosterActivation,
  type StoredEwarActivation,
  type TrackingUnit,
  type UserSettings as UserSettingsWire,
} from "./userSettings";
import type { Language } from "./language";

export interface CombatantSettings {
  readonly speed: number;
  readonly mode: AutopilotMode;
  readonly range: number;
  readonly mass: number;
  readonly inertia: number;
  readonly aggressivity: number;
  readonly skillLevel?: SkillLevel;
  readonly overload?: boolean;
  readonly hull?: string;
  readonly propulsion?: PropulsionSelection;
  readonly fitting?: string;
  readonly overrides?: Partial<ProfileParamOverrides>;
  readonly fittedHull?: FittedHullSummary;
  readonly ewarActivation?: StoredEwarActivation;
  readonly boosterActivation?: readonly StoredBoosterActivation[];
  readonly sig?: number;
}

export interface InternalUserSettings {
  readonly version: typeof USER_SETTINGS_VERSION;
  readonly language: Language;
  readonly simSpeed: number;
  readonly trackingUnit: TrackingUnit;
  readonly gridBrightness: number;
  readonly autoZoom: boolean;
  readonly zoomFactor: number;
  readonly display: DisplayPreferences;
  readonly shipA: CombatantSettings;
  readonly shipB: CombatantSettings;
  readonly tracking: number;
  readonly sigRes: SigResolutionClass;
  readonly optimal: number;
  readonly falloff: number;
  readonly initialDistance: number;
  readonly shipAAmmo: string;
}

export function toCombatantSettings(settings: UserSettingsWire, side: "shipA" | "shipB"): CombatantSettings {
  const overrides = sideValue(side, settings.shipAOverrides, settings.shipBOverrides);
  const sigKey: keyof ProfileParamOverrides = side === "shipA" ? "shipASig" : "shipBSig";
  const sig = sideValue(side, settings.shipASig, settings.shipBSig) ?? overrides?.[sigKey];
  return {
    speed: sideValue(side, settings.shipASpeed, settings.shipBSpeed),
    mode: sideValue(side, settings.shipAMode, settings.shipBMode),
    range: sideValue(side, settings.shipARange, settings.shipBRange),
    mass: sideValue(side, settings.shipAMass, settings.shipBMass),
    inertia: sideValue(side, settings.shipAInertia, settings.shipBInertia),
    aggressivity: sideValue(side, settings.shipAAggressivity, settings.shipBAggressivity) ?? 1,
    skillLevel: sideValue(side, settings.shipASkillLevel, settings.shipBSkillLevel),
    overload: sideValue(side, settings.shipAOverload, settings.shipBOverload),
    hull: sideValue(side, settings.shipAHull, settings.shipBHull),
    propulsion: sideValue(side, settings.shipAPropulsion, settings.shipBPropulsion),
    fitting: sideValue(side, settings.shipAFitting, settings.shipBFitting),
    overrides,
    fittedHull: sideValue(side, settings.shipAFittedHull, settings.shipBFittedHull),
    ewarActivation: sideValue(side, settings.shipAEwarActivation, settings.shipBEwarActivation),
    boosterActivation: sideValue(side, settings.shipABoosterActivation, settings.shipBBoosterActivation),
    sig,
  };
}

function sideValue<T>(side: "shipA" | "shipB", shipAValue: T, shipBValue: T): T {
  return side === "shipA" ? shipAValue : shipBValue;
}
