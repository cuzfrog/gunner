import type { AutopilotMode, SigResolutionClass } from "../sim";
import type { SkillLevel } from "../ships";
import type { ShipId, TypeId } from "../gamedata/ids";
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
  readonly hull?: ShipId;
  readonly propulsion?: PropulsionSelection;
  readonly fitting?: string;
  readonly overrides?: Partial<ProfileParamOverrides>;
  readonly fittedHull?: FittedHullSummary;
  readonly ewarActivation?: StoredEwarActivation;
  readonly boosterActivation?: readonly StoredBoosterActivation[];
  readonly sig?: number;
  readonly tracking: number;
  readonly sigRes: SigResolutionClass;
  readonly optimal: number;
  readonly falloff: number;
  readonly ammo: TypeId;
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
  readonly initialDistance: number;
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
    hull: sideValue(side, settings.shipAHullId, settings.shipBHullId),
    propulsion: sideValue(side, settings.shipAPropulsion, settings.shipBPropulsion),
    fitting: sideValue(side, settings.shipAFitting, settings.shipBFitting),
    overrides,
    fittedHull: sideValue(side, settings.shipAFittedHull, settings.shipBFittedHull),
    ewarActivation: sideValue(side, settings.shipAEwarActivation, settings.shipBEwarActivation),
    boosterActivation: sideValue(side, settings.shipABoosterActivation, settings.shipBBoosterActivation),
    sig,
    tracking: sideValue(side, settings.shipATracking, settings.shipBTracking) ?? settings.tracking ?? 0,
    sigRes: sideValue(side, settings.shipASigRes, settings.shipBSigRes) ?? settings.sigRes ?? "S",
    optimal: sideValue(side, settings.shipAOptimal, settings.shipBOptimal) ?? settings.optimal ?? 0,
    falloff: sideValue(side, settings.shipAFalloff, settings.shipBFalloff) ?? settings.falloff ?? 0,
    ammo: sideValue(side, settings.shipAAmmo, settings.shipBAmmo),
  };
}

function sideValue<T>(side: "shipA" | "shipB", shipAValue: T, shipBValue: T): T {
  return side === "shipA" ? shipAValue : shipBValue;
}
