import { el, elOf, isHtmlButtonElement, isHtmlImageElement, isHtmlInputElement, isHtmlSelectElement, isHtmlTextAreaElement } from "./controlsDom";

export interface Els {
  readonly tracking: HTMLInputElement;
  readonly trackingUnitRad: HTMLButtonElement;
  readonly trackingUnitScore: HTMLButtonElement;
  readonly sigRes: HTMLSelectElement;
  readonly sigResOptions: HTMLElement;
  readonly optimal: HTMLInputElement;
  readonly falloff: HTMLInputElement;
  readonly attackerAmmoTrigger: HTMLButtonElement;
  readonly attackerAmmoSummary: HTMLElement;
  readonly attackerAmmoSummaryIcon: HTMLImageElement;
  readonly attackerAmmoPopup: HTMLElement;
  readonly attackerAmmoCargoLabel: HTMLElement;
  readonly attackerAmmoCargoList: HTMLElement;
  readonly attackerAmmoExpand: HTMLButtonElement;
  readonly attackerAmmoAllSection: HTMLElement;
  readonly attackerAmmoAllList: HTMLElement;
  readonly hullOptions: HTMLElement;
  readonly attackerHull: HTMLInputElement;
  readonly attackerShipImage: HTMLImageElement;
  readonly attackerFittingTrigger: HTMLButtonElement;
  readonly attackerFittingEye: HTMLButtonElement;
  readonly attackerFittingPopup: HTMLElement;
  readonly attackerFittingPreview: HTMLElement;
  readonly attackerFittingSavedLabel: HTMLElement;
  readonly attackerFittingSavedList: HTMLElement;
  readonly attackerFittingPresetLabel: HTMLElement;
  readonly attackerFittingPresetList: HTMLElement;
  readonly attackerFittingEmpty: HTMLElement;
  readonly attackerHullHint: HTMLElement;
  readonly attackerFittingName: HTMLElement;
  readonly attackerImportFitting: HTMLButtonElement;
  readonly attackerPastePopup: HTMLElement;
  readonly attackerPasteInput: HTMLTextAreaElement;
  readonly attackerPropulsion: HTMLSelectElement;
  readonly attackerPropulsionOptions: HTMLElement;
  readonly attackerPropulsionGear: HTMLButtonElement;
  readonly attackerPropulsionVariants: HTMLElement;
  readonly attackerSkills: HTMLSelectElement;
  readonly attackerSkillOptions: HTMLElement;
  readonly attackerSkillSummary: HTMLElement;
  readonly attackerSkillTrigger: HTMLButtonElement;
  readonly attackerSkillPopup: HTMLElement;
  readonly attackerOverload: HTMLInputElement;
  readonly attackerOverloadButton: HTMLButtonElement;
  readonly attackerSpeed: HTMLInputElement; readonly attackerMass: HTMLInputElement; readonly attackerInertia: HTMLInputElement;
  readonly attackerAlignTime: HTMLElement;
  readonly attackerMode: HTMLSelectElement;
  readonly attackerRange: HTMLInputElement;
  readonly maneuverAggressivity: HTMLInputElement;
  readonly maneuverAggressivitySlider: HTMLInputElement;
  readonly maneuverAggressivityValue: HTMLElement;
  readonly initialDistance: HTMLInputElement;
  readonly targetHull: HTMLInputElement;
  readonly targetShipImage: HTMLImageElement;
  readonly targetFittingTrigger: HTMLButtonElement;
  readonly targetFittingEye: HTMLButtonElement;
  readonly targetFittingPopup: HTMLElement;
  readonly targetFittingPreview: HTMLElement;
  readonly targetFittingSavedLabel: HTMLElement;
  readonly targetFittingSavedList: HTMLElement;
  readonly targetFittingPresetLabel: HTMLElement;
  readonly targetFittingPresetList: HTMLElement;
  readonly targetFittingEmpty: HTMLElement;
  readonly targetHullHint: HTMLElement;
  readonly targetFittingName: HTMLElement;
  readonly targetImportFitting: HTMLButtonElement;
  readonly targetPastePopup: HTMLElement;
  readonly targetPasteInput: HTMLTextAreaElement;
  readonly targetPropulsion: HTMLSelectElement;
  readonly targetPropulsionOptions: HTMLElement;
  readonly targetPropulsionGear: HTMLButtonElement;
  readonly targetPropulsionVariants: HTMLElement;
  readonly targetSkills: HTMLSelectElement;
  readonly targetSkillOptions: HTMLElement;
  readonly targetSkillSummary: HTMLElement;
  readonly targetSkillTrigger: HTMLButtonElement;
  readonly targetSkillPopup: HTMLElement;
  readonly targetOverload: HTMLInputElement;
  readonly targetOverloadButton: HTMLButtonElement;
  readonly targetSpeed: HTMLInputElement;
  readonly targetMass: HTMLInputElement;
  readonly targetInertia: HTMLInputElement;
  readonly targetAlignTime: HTMLElement;
  readonly targetMode: HTMLSelectElement;
  readonly targetRange: HTMLInputElement;
  readonly targetSig: HTMLInputElement;
  readonly simSpeed: HTMLSelectElement;
  readonly profileName: HTMLInputElement;
  readonly profileSave: HTMLButtonElement;
  readonly profileSelect: HTMLSelectElement;
  readonly profileDelete: HTMLButtonElement;
  readonly shareLink: HTMLButtonElement;
  readonly importProfile: HTMLButtonElement;
  readonly importSidePopup: HTMLElement;
  readonly importSideAttacker: HTMLButtonElement;
  readonly importSideTarget: HTMLButtonElement;
  readonly shareStatus: HTMLElement;
  readonly langEn: HTMLButtonElement;
  readonly langZh: HTMLButtonElement;
  readonly langJa: HTMLButtonElement;
  readonly play: HTMLButtonElement;
  readonly reset: HTMLButtonElement;
  readonly gridBrightnessSlider: HTMLInputElement;
  readonly gridBrightnessValue: HTMLElement;
}
export function createControlsEls(): Els {
  return {
    tracking: elOf("tracking", isHtmlInputElement),
    trackingUnitRad: elOf("tracking-unit-rad", isHtmlButtonElement),
    trackingUnitScore: elOf("tracking-unit-score", isHtmlButtonElement),
    sigRes: elOf("sigRes", isHtmlSelectElement),
    sigResOptions: el("sig-res-options"),
    optimal: elOf("optimal", isHtmlInputElement),
    falloff: elOf("falloff", isHtmlInputElement),
    attackerAmmoTrigger: elOf("attacker-ammo-trigger", isHtmlButtonElement),
    attackerAmmoSummary: el("attacker-ammo-summary"),
    attackerAmmoSummaryIcon: elOf("attacker-ammo-summary-icon", isHtmlImageElement),
    attackerAmmoPopup: el("attacker-ammo-popup"),
    attackerAmmoCargoLabel: el("attacker-ammo-cargo-label"),
    attackerAmmoCargoList: el("attacker-ammo-cargo-list"),
    attackerAmmoExpand: elOf("attacker-ammo-expand", isHtmlButtonElement),
    attackerAmmoAllSection: el("attacker-ammo-all-section"),
    attackerAmmoAllList: el("attacker-ammo-all-list"),
    hullOptions: el("hull-options"),
    attackerHull: elOf("attacker-hull", isHtmlInputElement),
    attackerShipImage: elOf("attacker-ship-image", isHtmlImageElement),
    attackerFittingTrigger: elOf("attacker-fitting-trigger", isHtmlButtonElement),
    attackerFittingEye: elOf("attacker-fitting-eye", isHtmlButtonElement),
    attackerFittingPopup: el("attacker-fitting-popup"),
    attackerFittingPreview: el("attacker-fitting-preview"),
    attackerFittingSavedLabel: el("attacker-fitting-saved-label"),
    attackerFittingSavedList: el("attacker-fitting-saved-list"),
    attackerFittingPresetLabel: el("attacker-fitting-preset-label"),
    attackerFittingPresetList: el("attacker-fitting-preset-list"),
    attackerFittingEmpty: el("attacker-fitting-empty"),
    attackerHullHint: el("attacker-hull-hint"),
    attackerFittingName: el("attacker-fitting-name"),
    attackerImportFitting: elOf("attacker-import-fitting", isHtmlButtonElement),
    attackerPastePopup: el("attacker-paste-popup"),
    attackerPasteInput: elOf("attacker-paste-input", isHtmlTextAreaElement),
    attackerPropulsion: elOf("attacker-propulsion", isHtmlSelectElement),
    attackerPropulsionOptions: el("attacker-propulsion-options"),
    attackerPropulsionGear: elOf("attacker-propulsion-gear", isHtmlButtonElement),
    attackerPropulsionVariants: el("attacker-propulsion-variants"),
    attackerSkills: elOf("attacker-skills", isHtmlSelectElement),
    attackerSkillOptions: el("attacker-skill-options"),
    attackerSkillSummary: el("attacker-skill-summary"),
    attackerSkillTrigger: elOf("attacker-skill-trigger", isHtmlButtonElement),
    attackerSkillPopup: el("attacker-skill-popup"),
    attackerOverload: elOf("attacker-overload", isHtmlInputElement),
    attackerOverloadButton: elOf("attacker-overload-button", isHtmlButtonElement),
    attackerSpeed: elOf("attacker-speed", isHtmlInputElement),
    attackerMass: elOf("attacker-mass", isHtmlInputElement),
    attackerInertia: elOf("attacker-inertia", isHtmlInputElement),
    attackerAlignTime: el("attacker-align-time"),
    attackerMode: elOf("attacker-mode", isHtmlSelectElement),
    attackerRange: elOf("attacker-range", isHtmlInputElement),
    maneuverAggressivity: elOf("maneuver-aggressivity", isHtmlInputElement),
    maneuverAggressivitySlider: elOf("maneuver-aggressivity-slider", isHtmlInputElement),
    maneuverAggressivityValue: el("maneuver-aggressivity-value"),
    initialDistance: elOf("initial-distance", isHtmlInputElement),
    targetHull: elOf("target-hull", isHtmlInputElement),
    targetShipImage: elOf("target-ship-image", isHtmlImageElement),
    targetFittingTrigger: elOf("target-fitting-trigger", isHtmlButtonElement),
    targetFittingEye: elOf("target-fitting-eye", isHtmlButtonElement),
    targetFittingPopup: el("target-fitting-popup"),
    targetFittingPreview: el("target-fitting-preview"),
    targetFittingSavedLabel: el("target-fitting-saved-label"),
    targetFittingSavedList: el("target-fitting-saved-list"),
    targetFittingPresetLabel: el("target-fitting-preset-label"),
    targetFittingPresetList: el("target-fitting-preset-list"),
    targetFittingEmpty: el("target-fitting-empty"),
    targetHullHint: el("target-hull-hint"),
    targetFittingName: el("target-fitting-name"),
    targetImportFitting: elOf("target-import-fitting", isHtmlButtonElement),
    targetPastePopup: el("target-paste-popup"),
    targetPasteInput: elOf("target-paste-input", isHtmlTextAreaElement),
    targetPropulsion: elOf("target-propulsion", isHtmlSelectElement),
    targetPropulsionOptions: el("target-propulsion-options"),
    targetPropulsionGear: elOf("target-propulsion-gear", isHtmlButtonElement),
    targetPropulsionVariants: el("target-propulsion-variants"),
    targetSkills: elOf("target-skills", isHtmlSelectElement),
    targetSkillOptions: el("target-skill-options"),
    targetSkillSummary: el("target-skill-summary"),
    targetSkillTrigger: elOf("target-skill-trigger", isHtmlButtonElement),
    targetSkillPopup: el("target-skill-popup"),
    targetOverload: elOf("target-overload", isHtmlInputElement),
    targetOverloadButton: elOf("target-overload-button", isHtmlButtonElement),
    targetSpeed: elOf("target-speed", isHtmlInputElement),
    targetMass: elOf("target-mass", isHtmlInputElement),
    targetInertia: elOf("target-inertia", isHtmlInputElement),
    targetAlignTime: el("target-align-time"),
    targetMode: elOf("target-mode", isHtmlSelectElement),
    targetRange: elOf("target-range", isHtmlInputElement),
    targetSig: elOf("target-sig", isHtmlInputElement),
    simSpeed: elOf("sim-speed", isHtmlSelectElement),
    profileName: elOf("profile-name", isHtmlInputElement),
    profileSave: elOf("profile-save", isHtmlButtonElement),
    profileSelect: elOf("profile-select", isHtmlSelectElement),
    profileDelete: elOf("profile-delete", isHtmlButtonElement),
    shareLink: elOf("share-link", isHtmlButtonElement),
    importProfile: elOf("import-profile", isHtmlButtonElement),
    importSidePopup: el("import-side-popup"),
    importSideAttacker: elOf("import-side-attacker", isHtmlButtonElement),
    importSideTarget: elOf("import-side-target", isHtmlButtonElement),
    shareStatus: el("share-status"),
    langEn: elOf("lang-en", isHtmlButtonElement),
    langZh: elOf("lang-zh", isHtmlButtonElement),
    langJa: elOf("lang-ja", isHtmlButtonElement),
    play: elOf("play", isHtmlButtonElement),
    reset: elOf("reset", isHtmlButtonElement),
    gridBrightnessSlider: elOf("grid-brightness-slider", isHtmlInputElement),
    gridBrightnessValue: el("grid-brightness-value"),
  };
}
