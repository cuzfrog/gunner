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

type GlobalControlsEls = {
  readonly [K in keyof GlobalElementDefinitionMap]: ElementForTag<GlobalElementDefinitionMap[K]["tag"]>;
};

type CombatantEls = {
  readonly [K in keyof CombatantElementDefinitionMap]: ElementForTag<CombatantElementDefinitionMap[K]["tag"]>;
};

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
    newProfileName: elOf(globalElementId("newProfileName"), isHtmlInputElement),
    newProfileConfirm: elOf(globalElementId("newProfileConfirm"), isHtmlButtonElement),
    newProfileCancel: elOf(globalElementId("newProfileCancel"), isHtmlButtonElement),
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
    rangeOverlayLegend: el(globalElementId("rangeOverlayLegend")),
    slideHints: el(globalElementId("slideHints")),
    scene: el(globalElementId("scene")),
  };
}

function createCombatantEls(side: Side): CombatantEls {
  return {
    tracking: elOf(combatantElementId("tracking", side), isHtmlInputElement),
    trackingUnitRad: elOf(combatantElementId("trackingUnitRad", side), isHtmlButtonElement),
    trackingUnitScore: elOf(combatantElementId("trackingUnitScore", side), isHtmlButtonElement),
    sigRes: elOf(combatantElementId("sigRes", side), isHtmlSelectElement),
    sigResOptions: el(combatantElementId("sigResOptions", side)),
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
    overload: elOf(combatantElementId("overload", side), isHtmlInputElement),
    overloadButton: elOf(combatantElementId("overloadButton", side), isHtmlButtonElement),
    ewarField: el(combatantElementId("ewarField", side)),
    ewarTrigger: elOf(combatantElementId("ewarTrigger", side), isHtmlButtonElement),
    ewarPopup: el(combatantElementId("ewarPopup", side)),
    ewarSection: el(combatantElementId("ewarSection", side)),
    ewarSummaryRow: el(combatantElementId("ewarSummaryRow", side)),
    ewarSummary: el(combatantElementId("ewarSummary", side)),
    boosterSection: el(combatantElementId("boosterSection", side)),
    boosterSummary: el(combatantElementId("boosterSummary", side)),
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
  };
}
