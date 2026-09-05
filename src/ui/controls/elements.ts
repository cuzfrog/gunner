import type { Side } from "./side";
import {
  el,
  elOf,
  isHtmlButtonElement,
  isHtmlImageElement,
  isHtmlInputElement,
  isHtmlSelectElement,
  isHtmlTextAreaElement,
} from "./controlsDom";
import {
  combatantElementId,
  globalElementId,
  type ElementForTag,
  type GlobalElementDefinitionMap,
  type CombatantElementDefinitionMap,
} from "./elementContract";
import type { PopupFieldEls } from "./shared";
import type { DefenseFieldEls } from "./defense";
import type { EwarFieldEls } from "./ewar";
import type { TargetingFieldEls } from "./targeting";

type GlobalControlsEls = {
  readonly [K in keyof GlobalElementDefinitionMap]: ElementForTag<GlobalElementDefinitionMap[K]["tag"]>;
};

interface CombatantEls {
  readonly tracking: HTMLInputElement;
  readonly trackingUnitRad: HTMLButtonElement;
  readonly trackingUnitScore: HTMLButtonElement;
  readonly sigRes: HTMLSelectElement;
  readonly sigResOptions: HTMLElement;
  readonly turretVariantGear: HTMLButtonElement;
  readonly turretVariants: HTMLElement;
  readonly turretWeaponOverloadButton: HTMLButtonElement;
  readonly optimal: HTMLInputElement;
  readonly falloff: HTMLInputElement;
  readonly effectiveTracking: HTMLElement;
  readonly effectiveOptimal: HTMLElement;
  readonly effectiveFalloff: HTMLElement;
  readonly effectiveSpeed: HTMLElement;
  readonly ammoField: HTMLElement;
  readonly ammoTrigger: HTMLButtonElement;
  readonly ammoSummary: HTMLElement;
  readonly ammoSummaryIcon: HTMLImageElement;
  readonly ammoPopup: HTMLElement;
  readonly ammoCargoLabel: HTMLElement;
  readonly ammoCargoList: HTMLElement;
  readonly ammoExpand: HTMLButtonElement;
  readonly ammoAllSection: HTMLElement;
  readonly ammoAllList: HTMLElement;
  readonly hull: HTMLInputElement;
  readonly fittingName: HTMLElement;
  readonly hullHint: HTMLElement;
  readonly shipSelectTrigger: HTMLButtonElement;
  readonly fittingEye: HTMLButtonElement;
  readonly shipSelectPopup: HTMLElement;
  readonly fittingPreview: HTMLElement;
  readonly fittingSavedLabel: HTMLElement;
  readonly fittingSavedList: HTMLElement;
  readonly fittingPresetLabel: HTMLElement;
  readonly fittingPresetList: HTMLElement;
  readonly fittingEmpty: HTMLElement;
  readonly importFitting: HTMLButtonElement;
  readonly pastePopup: HTMLElement;
  readonly pasteInput: HTMLTextAreaElement;
  readonly propulsion: HTMLSelectElement;
  readonly propulsionOptions: HTMLElement;
  readonly propulsionGear: HTMLButtonElement;
  readonly propulsionVariants: HTMLElement;
  readonly skills: HTMLSelectElement;
  readonly skillOptions: HTMLElement;
  readonly skillSummary: HTMLElement;
  readonly skillTrigger: HTMLButtonElement;
  readonly skillPopup: HTMLElement;
  readonly skillField: HTMLElement;
  readonly defenseSkills: HTMLElement;
  readonly targetingSkills: HTMLElement;
  readonly overload: HTMLInputElement;
  readonly overloadButton: HTMLButtonElement;
  readonly defense: DefenseFieldEls;
  readonly ewar: EwarFieldEls;
  readonly targeting: TargetingFieldEls;
  readonly boosterSection: HTMLElement;
  readonly boosterSummary: HTMLElement;
  readonly missileBoosterSection: HTMLElement;
  readonly missileBoosterSummary: HTMLElement;
  readonly sensorBoosterSection: HTMLElement;
  readonly sensorBoosterSummary: HTMLElement;
  readonly speed: HTMLInputElement;
  readonly mass: HTMLInputElement;
  readonly inertia: HTMLInputElement;
  readonly alignTime: HTMLElement;
  readonly mode: HTMLSelectElement;
  readonly range: HTMLInputElement;
  readonly aggressivity: HTMLInputElement;
  readonly aggressivitySlider: HTMLInputElement;
  readonly aggressivityValue: HTMLElement;
  readonly aggressivityField: HTMLElement;
  readonly shipSig: HTMLInputElement;
  readonly portrait: HTMLElement;
  readonly turretPanel: HTMLElement;
  readonly launcherPanel: HTMLElement;
  readonly weaponSystem: HTMLElement;
  readonly weaponSystemTurret: HTMLButtonElement;
  readonly weaponSystemMissile: HTMLButtonElement;
  readonly weaponSystemDrone: HTMLButtonElement;
  readonly launcherAmmoTrigger: HTMLButtonElement;
  readonly launcherAmmoSummary: HTMLElement;
  readonly launcherAmmoSummaryIcon: HTMLImageElement;
  readonly launcherAmmoPopup: HTMLElement;
  readonly launcherAmmoList: HTMLElement;
  readonly launcherAmmoField: HTMLElement;
  readonly launcherClassOptions: HTMLElement;
  readonly launcherVariantGear: HTMLButtonElement;
  readonly launcherVariants: HTMLElement;
  readonly launcherWeaponOverloadButton: HTMLButtonElement;
  readonly launcherAttributesTrigger: HTMLButtonElement;
  readonly launcherAttributesPopup: HTMLElement;
  readonly launcherAttributesField: HTMLElement;
  readonly launcherVolleyDamage: HTMLElement;
  readonly launcherRateOfFire: HTMLElement;
  readonly launcherExplosionRadius: HTMLElement;
  readonly launcherExplosionVelocity: HTMLElement;
  readonly launcherMissileVelocity: HTMLElement;
  readonly launcherFlightTime: HTMLElement;
  readonly launcherFlightRange: HTMLElement;
  readonly launcherDamageReductionFactor: HTMLElement;
  readonly dronePanel: HTMLElement;
  readonly droneTrigger: HTMLButtonElement;
  readonly droneSummary: HTMLElement;
  readonly droneSummaryIcon: HTMLImageElement;
  readonly dronePopup: HTMLElement;
  readonly droneField: HTMLElement;
  readonly droneTracking: HTMLElement;
  readonly droneOptimal: HTMLElement;
  readonly droneFalloff: HTMLElement;
  readonly droneDamage: HTMLElement;
  readonly droneCycleTime: HTMLElement;
  readonly droneOrbitSpeed: HTMLElement;
  readonly droneMaxVelocity: HTMLElement;
  readonly droneCount: HTMLElement;
  readonly droneLoadoutSection: HTMLElement;
  readonly droneLoadoutList: HTMLElement;
  readonly droneSummaryBar: HTMLElement;
  readonly droneSummaryCount: HTMLElement;
  readonly droneSummaryBandwidth: HTMLElement;
  readonly droneSummaryBay: HTMLElement;
  readonly droneCatalogSection: HTMLElement;
  readonly droneCatalogLight: HTMLElement;
  readonly droneCatalogMedium: HTMLElement;
  readonly droneCatalogHeavy: HTMLElement;
  readonly droneCatalogSentry: HTMLElement;
}

interface ControlsElements extends GlobalControlsEls {
  readonly shipA: CombatantEls;
  readonly shipB: CombatantEls;
}

export function createControlsEls(): ControlsElements {
  return {
    ...createGlobalControlsEls(),
    shipA: createCombatantEls("shipA"),
    shipB: createCombatantEls("shipB"),
  };
}

function createGlobalControlsEls(): GlobalControlsEls {
  return {
    appVersion: el(globalElementId("appVersion")),
    hullOptions: el(globalElementId("hullOptions")),
    play: elOf(globalElementId("play"), isHtmlButtonElement),
    reset: elOf(globalElementId("reset"), isHtmlButtonElement),
    simSpeed: elOf(globalElementId("simSpeed"), isHtmlSelectElement),
    initialDistance: elOf(globalElementId("initialDistance"), isHtmlInputElement),
    gridBrightnessSlider: elOf(globalElementId("gridBrightnessSlider"), isHtmlInputElement),
    gridBrightnessValue: el(globalElementId("gridBrightnessValue")),
    canvasSettingsTrigger: elOf(globalElementId("canvasSettingsTrigger"), isHtmlButtonElement),
    canvasSettingsPopup: el(globalElementId("canvasSettingsPopup")),
    zoomSlider: elOf(globalElementId("zoomSlider"), isHtmlInputElement),
    zoomValue: el(globalElementId("zoomValue")),
    autoZoomCheckbox: elOf(globalElementId("autoZoomCheckbox"), isHtmlInputElement),
    weaponRangeButton: elOf(globalElementId("weaponRangeButton"), isHtmlButtonElement),
    droneRangeButton: elOf(globalElementId("droneRangeButton"), isHtmlButtonElement),
    droneControlRangeButton: elOf(globalElementId("droneControlRangeButton"), isHtmlButtonElement),
    langEn: elOf(globalElementId("langEn"), isHtmlButtonElement),
    langZh: elOf(globalElementId("langZh"), isHtmlButtonElement),
    langJa: elOf(globalElementId("langJa"), isHtmlButtonElement),
    profileSave: elOf(globalElementId("profileSave"), isHtmlButtonElement),
    profileDelete: elOf(globalElementId("profileDelete"), isHtmlButtonElement),
    profileSelectTrigger: elOf(globalElementId("profileSelectTrigger"), isHtmlButtonElement),
    profileSelectLabel: el(globalElementId("profileSelectLabel")),
    profilePopup: el(globalElementId("profilePopup")),
    profileNew: elOf(globalElementId("profileNew"), isHtmlButtonElement),
    newProfilePopup: el(globalElementId("newProfilePopup")),
    newProfileDirtyNote: el(globalElementId("newProfileDirtyNote")),
    newProfileCurrentSection: el(globalElementId("newProfileCurrentSection")),
    newProfileSaveCurrent: elOf(globalElementId("newProfileSaveCurrent"), isHtmlButtonElement),
    newProfileCurrentName: el(globalElementId("newProfileCurrentName")),
    newProfileName: elOf(globalElementId("newProfileName"), isHtmlInputElement),
    newProfileConfirm: elOf(globalElementId("newProfileConfirm"), isHtmlButtonElement),
    newProfileClearSession: elOf(globalElementId("newProfileClearSession"), isHtmlButtonElement),
    shareLink: elOf(globalElementId("shareLink"), isHtmlButtonElement),
    sharePopup: el(globalElementId("sharePopup")),
    shareCopyUrl: elOf(globalElementId("shareCopyUrl"), isHtmlButtonElement),
    shareCopyText: elOf(globalElementId("shareCopyText"), isHtmlButtonElement),
    shareStatus: el(globalElementId("shareStatus")),
    importProfile: elOf(globalElementId("importProfile"), isHtmlButtonElement),
    importSidePopup: el(globalElementId("importSidePopup")),
    importSideShipA: elOf(globalElementId("importSideShipA"), isHtmlButtonElement),
    importSideShipB: elOf(globalElementId("importSideShipB"), isHtmlButtonElement),
    confirmPopup: el(globalElementId("confirmPopup")),
    confirmMessage: el(globalElementId("confirmMessage")),
    confirmOk: elOf(globalElementId("confirmOk"), isHtmlButtonElement),
    confirmCancel: elOf(globalElementId("confirmCancel"), isHtmlButtonElement),
    resDistance: el(globalElementId("resDistance")),
    resTrackPenA: el(globalElementId("resTrackPenA")),
    resRangePenA: el(globalElementId("resRangePenA")),
    resHitA: el(globalElementId("resHitA")),
    resTrackPenB: el(globalElementId("resTrackPenB")),
    resRangePenB: el(globalElementId("resRangePenB")),
    resHitB: el(globalElementId("resHitB")),
    resHitLabelA: el(globalElementId("resHitLabelA")),
    resTrackPenLabelA: el(globalElementId("resTrackPenLabelA")),
    resRangePenLabelA: el(globalElementId("resRangePenLabelA")),
    resHitLabelB: el(globalElementId("resHitLabelB")),
    resTrackPenLabelB: el(globalElementId("resTrackPenLabelB")),
    resRangePenLabelB: el(globalElementId("resRangePenLabelB")),
    resNominalDpsA: el(globalElementId("resNominalDpsA")),
    resAppliedDpsA: el(globalElementId("resAppliedDpsA")),
    resAppliedDpsApplicationA: el(globalElementId("resAppliedDpsApplicationA")),
    resActualDpsA: el(globalElementId("resActualDpsA")),
    resTimeToImpactA: el(globalElementId("resTimeToImpactA")),
    resNominalDpsB: el(globalElementId("resNominalDpsB")),
    resAppliedDpsB: el(globalElementId("resAppliedDpsB")),
    resAppliedDpsApplicationB: el(globalElementId("resAppliedDpsApplicationB")),
    resActualDpsB: el(globalElementId("resActualDpsB")),
    resTimeToImpactB: el(globalElementId("resTimeToImpactB")),
    resNominalDpsLabelA: el(globalElementId("resNominalDpsLabelA")),
    resAppliedDpsLabelA: el(globalElementId("resAppliedDpsLabelA")),
    resActualDpsLabelA: el(globalElementId("resActualDpsLabelA")),
    resTimeToImpactLabelA: el(globalElementId("resTimeToImpactLabelA")),
    resNominalDpsLabelB: el(globalElementId("resNominalDpsLabelB")),
    resAppliedDpsLabelB: el(globalElementId("resAppliedDpsLabelB")),
    resActualDpsLabelB: el(globalElementId("resActualDpsLabelB")),
    resTimeToImpactLabelB: el(globalElementId("resTimeToImpactLabelB")),
    resSideA: el(globalElementId("resSideA")),
    resSideB: el(globalElementId("resSideB")),
    resSigFactorA: el(globalElementId("resSigFactorA")),
    resSigFactorB: el(globalElementId("resSigFactorB")),
    resVelocityFactorA: el(globalElementId("resVelocityFactorA")),
    resVelocityFactorB: el(globalElementId("resVelocityFactorB")),
    resSigFactorLabelA: el(globalElementId("resSigFactorLabelA")),
    resSigFactorLabelB: el(globalElementId("resSigFactorLabelB")),
    resVelocityFactorLabelA: el(globalElementId("resVelocityFactorLabelA")),
    resVelocityFactorLabelB: el(globalElementId("resVelocityFactorLabelB")),
    rangeOverlayLegend: el(globalElementId("rangeOverlayLegend")),
    slideHints: el(globalElementId("slideHints")),
    scene: el(globalElementId("scene")),
    hoverHint: el(globalElementId("hoverHint")),
  };
}

function createCombatantEls(side: Side): CombatantEls {
  return {
    tracking: elOf(combatantElementId("tracking", side), isHtmlInputElement),
    trackingUnitRad: elOf(combatantElementId("trackingUnitRad", side), isHtmlButtonElement),
    trackingUnitScore: elOf(combatantElementId("trackingUnitScore", side), isHtmlButtonElement),
    sigRes: elOf(combatantElementId("sigRes", side), isHtmlSelectElement),
    sigResOptions: el(combatantElementId("sigResOptions", side)),
    turretVariantGear: elOf(combatantElementId("turretVariantGear", side), isHtmlButtonElement),
    turretVariants: el(combatantElementId("turretVariants", side)),
    turretWeaponOverloadButton: elOf(combatantElementId("turretWeaponOverloadButton", side), isHtmlButtonElement),
    optimal: elOf(combatantElementId("optimal", side), isHtmlInputElement),
    falloff: elOf(combatantElementId("falloff", side), isHtmlInputElement),
    effectiveTracking: el(combatantElementId("effectiveTracking", side)),
    effectiveOptimal: el(combatantElementId("effectiveOptimal", side)),
    effectiveFalloff: el(combatantElementId("effectiveFalloff", side)),
    effectiveSpeed: el(combatantElementId("effectiveSpeed", side)),
    ammoField: el(combatantElementId("ammoField", side)),
    ammoTrigger: elOf(combatantElementId("ammoTrigger", side), isHtmlButtonElement),
    ammoSummary: el(combatantElementId("ammoSummary", side)),
    ammoSummaryIcon: elOf(combatantElementId("ammoSummaryIcon", side), isHtmlImageElement),
    ammoPopup: el(combatantElementId("ammoPopup", side)),
    ammoCargoLabel: el(combatantElementId("ammoCargoLabel", side)),
    ammoCargoList: el(combatantElementId("ammoCargoList", side)),
    ammoExpand: elOf(combatantElementId("ammoExpand", side), isHtmlButtonElement),
    ammoAllSection: el(combatantElementId("ammoAllSection", side)),
    ammoAllList: el(combatantElementId("ammoAllList", side)),
    hull: elOf(combatantElementId("hull", side), isHtmlInputElement),
    fittingName: el(combatantElementId("fittingName", side)),
    hullHint: el(combatantElementId("hullHint", side)),
    shipSelectTrigger: elOf(combatantElementId("shipSelectTrigger", side), isHtmlButtonElement),
    fittingEye: elOf(combatantElementId("fittingEye", side), isHtmlButtonElement),
    shipSelectPopup: el(combatantElementId("shipSelectPopup", side)),
    fittingPreview: el(combatantElementId("fittingPreview", side)),
    fittingSavedLabel: el(combatantElementId("fittingSavedLabel", side)),
    fittingSavedList: el(combatantElementId("fittingSavedList", side)),
    fittingPresetLabel: el(combatantElementId("fittingPresetLabel", side)),
    fittingPresetList: el(combatantElementId("fittingPresetList", side)),
    fittingEmpty: el(combatantElementId("fittingEmpty", side)),
    importFitting: elOf(combatantElementId("importFitting", side), isHtmlButtonElement),
    pastePopup: el(combatantElementId("pastePopup", side)),
    pasteInput: elOf(combatantElementId("pasteInput", side), isHtmlTextAreaElement),
    propulsion: elOf(combatantElementId("propulsion", side), isHtmlSelectElement),
    propulsionOptions: el(combatantElementId("propulsionOptions", side)),
    propulsionGear: elOf(combatantElementId("propulsionGear", side), isHtmlButtonElement),
    propulsionVariants: el(combatantElementId("propulsionVariants", side)),
    skills: elOf(combatantElementId("skills", side), isHtmlSelectElement),
    skillOptions: el(combatantElementId("skillOptions", side)),
    skillSummary: el(combatantElementId("skillSummary", side)),
    skillTrigger: elOf(combatantElementId("skillTrigger", side), isHtmlButtonElement),
    skillPopup: el(combatantElementId("skillPopup", side)),
    skillField: el(combatantElementId("skillField", side)),
    defenseSkills: el(combatantElementId("defenseSkills", side)),
    targetingSkills: el(combatantElementId("targetingSkills", side)),
    overload: elOf(combatantElementId("overload", side), isHtmlInputElement),
    overloadButton: elOf(combatantElementId("overloadButton", side), isHtmlButtonElement),
    defense: {
      field: el(combatantElementId("defenseField", side)),
      trigger: elOf(combatantElementId("defenseTrigger", side), isHtmlButtonElement),
      popup: el(combatantElementId("defensePopup", side)),
      section: el(combatantElementId("defenseSection", side)),
      summary: el(combatantElementId("defenseSummary", side)),
      effectiveSig: el(combatantElementId("effectiveSig", side)),
    },
    ewar: {
      field: el(combatantElementId("ewarField", side)),
      trigger: elOf(combatantElementId("ewarTrigger", side), isHtmlButtonElement),
      popup: el(combatantElementId("ewarPopup", side)),
      section: el(combatantElementId("ewarSection", side)),
      summary: el(combatantElementId("ewarSummary", side)),
    },
    targeting: {
      field: el(combatantElementId("targetingField", side)),
      trigger: elOf(combatantElementId("targetingTrigger", side), isHtmlButtonElement),
      popup: el(combatantElementId("targetingPopup", side)),
      section: el(combatantElementId("targetingSection", side)),
      summary: el(combatantElementId("targetingSummary", side)),
    },
    boosterSection: el(combatantElementId("boosterSection", side)),
    boosterSummary: el(combatantElementId("boosterSummary", side)),
    missileBoosterSection: el(combatantElementId("missileBoosterSection", side)),
    missileBoosterSummary: el(combatantElementId("missileBoosterSummary", side)),
    sensorBoosterSection: el(combatantElementId("sensorBoosterSection", side)),
    sensorBoosterSummary: el(combatantElementId("sensorBoosterSummary", side)),
    speed: elOf(combatantElementId("speed", side), isHtmlInputElement),
    mass: elOf(combatantElementId("mass", side), isHtmlInputElement),
    inertia: elOf(combatantElementId("inertia", side), isHtmlInputElement),
    alignTime: el(combatantElementId("alignTime", side)),
    mode: elOf(combatantElementId("mode", side), isHtmlSelectElement),
    range: elOf(combatantElementId("range", side), isHtmlInputElement),
    aggressivity: elOf(combatantElementId("aggressivity", side), isHtmlInputElement),
    aggressivitySlider: elOf(combatantElementId("aggressivitySlider", side), isHtmlInputElement),
    aggressivityValue: el(combatantElementId("aggressivityValue", side)),
    aggressivityField: el(combatantElementId("aggressivityField", side)),
    shipSig: elOf(combatantElementId("shipSig", side), isHtmlInputElement),
    portrait: el(combatantElementId("portrait", side)),
    turretPanel: el(combatantElementId("turretPanel", side)),
    launcherPanel: el(combatantElementId("launcherPanel", side)),
    weaponSystem: el(combatantElementId("weaponSystem", side)),
    weaponSystemTurret: elOf(combatantElementId("weaponSystemTurret", side), isHtmlButtonElement),
    weaponSystemMissile: elOf(combatantElementId("weaponSystemMissile", side), isHtmlButtonElement),
    weaponSystemDrone: elOf(combatantElementId("weaponSystemDrone", side), isHtmlButtonElement),
    launcherAmmoTrigger: elOf(combatantElementId("launcherAmmoTrigger", side), isHtmlButtonElement),
    launcherAmmoSummary: el(combatantElementId("launcherAmmoSummary", side)),
    launcherAmmoSummaryIcon: elOf(combatantElementId("launcherAmmoSummaryIcon", side), isHtmlImageElement),
    launcherAmmoPopup: el(combatantElementId("launcherAmmoPopup", side)),
    launcherAmmoList: el(combatantElementId("launcherAmmoList", side)),
    launcherAmmoField: el(combatantElementId("launcherAmmoField", side)),
    launcherClassOptions: el(combatantElementId("launcherClassOptions", side)),
    launcherVariantGear: elOf(combatantElementId("launcherVariantGear", side), isHtmlButtonElement),
    launcherVariants: el(combatantElementId("launcherVariants", side)),
    launcherWeaponOverloadButton: elOf(combatantElementId("launcherWeaponOverloadButton", side), isHtmlButtonElement),
    launcherAttributesTrigger: elOf(combatantElementId("launcherAttributesTrigger", side), isHtmlButtonElement),
    launcherAttributesPopup: el(combatantElementId("launcherAttributesPopup", side)),
    launcherAttributesField: el(combatantElementId("launcherAttributesField", side)),
    launcherVolleyDamage: el(combatantElementId("launcherVolleyDamage", side)),
    launcherRateOfFire: el(combatantElementId("launcherRateOfFire", side)),
    launcherExplosionRadius: el(combatantElementId("launcherExplosionRadius", side)),
    launcherExplosionVelocity: el(combatantElementId("launcherExplosionVelocity", side)),
    launcherMissileVelocity: el(combatantElementId("launcherMissileVelocity", side)),
    launcherFlightTime: el(combatantElementId("launcherFlightTime", side)),
    launcherFlightRange: el(combatantElementId("launcherFlightRange", side)),
    launcherDamageReductionFactor: el(combatantElementId("launcherDamageReductionFactor", side)),
    dronePanel: el(combatantElementId("dronePanel", side)),
    droneTrigger: elOf(combatantElementId("droneTrigger", side), isHtmlButtonElement),
    droneSummary: el(combatantElementId("droneSummary", side)),
    droneSummaryIcon: elOf(combatantElementId("droneSummaryIcon", side), isHtmlImageElement),
    dronePopup: el(combatantElementId("dronePopup", side)),
    droneField: el(combatantElementId("droneField", side)),
    droneTracking: el(combatantElementId("droneTracking", side)),
    droneOptimal: el(combatantElementId("droneOptimal", side)),
    droneFalloff: el(combatantElementId("droneFalloff", side)),
    droneDamage: el(combatantElementId("droneDamage", side)),
    droneCycleTime: el(combatantElementId("droneCycleTime", side)),
    droneOrbitSpeed: el(combatantElementId("droneOrbitSpeed", side)),
    droneMaxVelocity: el(combatantElementId("droneMaxVelocity", side)),
    droneCount: el(combatantElementId("droneCount", side)),
    droneLoadoutSection: el(combatantElementId("droneLoadoutSection", side)),
    droneLoadoutList: el(combatantElementId("droneLoadoutList", side)),
    droneSummaryBar: el(combatantElementId("droneSummaryBar", side)),
    droneSummaryCount: el(combatantElementId("droneSummaryCount", side)),
    droneSummaryBandwidth: el(combatantElementId("droneSummaryBandwidth", side)),
    droneSummaryBay: el(combatantElementId("droneSummaryBay", side)),
    droneCatalogSection: el(combatantElementId("droneCatalogSection", side)),
    droneCatalogLight: el(combatantElementId("droneCatalogLight", side)),
    droneCatalogMedium: el(combatantElementId("droneCatalogMedium", side)),
    droneCatalogHeavy: el(combatantElementId("droneCatalogHeavy", side)),
    droneCatalogSentry: el(combatantElementId("droneCatalogSentry", side)),
  };
}
