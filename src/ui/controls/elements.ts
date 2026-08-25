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

interface GlobalControlsEls {
  readonly trackingLabelText: HTMLElement;
  readonly trackingUnitRad: HTMLButtonElement;
  readonly trackingUnitScore: HTMLButtonElement;
  readonly hullOptions: HTMLElement;
  readonly play: HTMLButtonElement;
  readonly reset: HTMLButtonElement;
  readonly simSpeed: HTMLSelectElement;
  readonly initialDistance: HTMLInputElement;
  readonly gridBrightnessSlider: HTMLInputElement;
  readonly gridBrightnessValue: HTMLElement;
  readonly canvasSettingsTrigger: HTMLButtonElement;
  readonly canvasSettingsPopup: HTMLElement;
  readonly zoomSlider: HTMLInputElement;
  readonly zoomValue: HTMLElement;
  readonly autoZoomCheckbox: HTMLInputElement;
  readonly langEn: HTMLButtonElement;
  readonly langZh: HTMLButtonElement;
  readonly langJa: HTMLButtonElement;
  readonly profileSave: HTMLButtonElement;
  readonly profileDelete: HTMLButtonElement;
  readonly profileSelectTrigger: HTMLButtonElement;
  readonly profileSelectLabel: HTMLElement;
  readonly profilePopup: HTMLElement;
  readonly profileNew: HTMLButtonElement;
  readonly newProfilePopup: HTMLElement;
  readonly newProfileName: HTMLInputElement;
  readonly newProfileConfirm: HTMLButtonElement;
  readonly newProfileCancel: HTMLButtonElement;
  readonly shareLink: HTMLButtonElement;
  readonly sharePopup: HTMLElement;
  readonly shareCopyUrl: HTMLButtonElement;
  readonly shareCopyText: HTMLButtonElement;
  readonly shareStatus: HTMLElement;
  readonly importProfile: HTMLButtonElement;
  readonly importSidePopup: HTMLElement;
  readonly importSideShipA: HTMLButtonElement;
  readonly importSideShipB: HTMLButtonElement;
  readonly confirmPopup: HTMLElement;
  readonly confirmMessage: HTMLElement;
  readonly confirmOk: HTMLButtonElement;
  readonly confirmCancel: HTMLButtonElement;
  readonly resDistance: HTMLElement;
  readonly resTransversal: HTMLElement;
  readonly resAngular: HTMLElement;
  readonly resRadial: HTMLElement;
  readonly resTrackPen: HTMLElement;
  readonly resRangePen: HTMLElement;
  readonly resHit: HTMLElement;
  readonly rangeOverlayLegend: HTMLElement;
  readonly slideHints: HTMLElement;
}

interface CombatantEls {
  readonly tracking: HTMLInputElement;
  readonly sigRes: HTMLSelectElement;
  readonly sigResOptions: HTMLElement;
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
  readonly shipImage: HTMLImageElement;
  readonly fittingName: HTMLElement;
  readonly hullHint: HTMLElement;
  readonly fittingTrigger: HTMLButtonElement;
  readonly fittingEye: HTMLButtonElement;
  readonly fittingPopup: HTMLElement;
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
  readonly overload: HTMLInputElement;
  readonly overloadButton: HTMLButtonElement;
  readonly ewarField: HTMLElement;
  readonly ewarTrigger: HTMLButtonElement;
  readonly ewarPopup: HTMLElement;
  readonly ewarSection: HTMLElement;
  readonly ewarSummaryRow: HTMLElement;
  readonly ewarSummary: HTMLElement;
  readonly boosterSection: HTMLElement;
  readonly boosterSummary: HTMLElement;
  readonly speed: HTMLInputElement;
  readonly mass: HTMLInputElement;
  readonly inertia: HTMLInputElement;
  readonly alignTime: HTMLElement;
  readonly mode: HTMLSelectElement;
  readonly range: HTMLInputElement;
  readonly aggressivity: HTMLInputElement;
  readonly aggressivitySlider: HTMLInputElement;
  readonly aggressivityValue: HTMLElement;
  readonly shipSig: HTMLInputElement;
  readonly portrait: HTMLElement;
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
    trackingLabelText: el("tracking-label-text"),
    trackingUnitRad: elOf("tracking-unit-rad", isHtmlButtonElement),
    trackingUnitScore: elOf("tracking-unit-score", isHtmlButtonElement),
    hullOptions: el("hull-options"),
    play: elOf("play", isHtmlButtonElement),
    reset: elOf("reset", isHtmlButtonElement),
    simSpeed: elOf("sim-speed", isHtmlSelectElement),
    initialDistance: elOf("initial-distance", isHtmlInputElement),
    gridBrightnessSlider: elOf("grid-brightness-slider", isHtmlInputElement),
    gridBrightnessValue: el("grid-brightness-value"),
    canvasSettingsTrigger: elOf("canvas-settings-trigger", isHtmlButtonElement),
    canvasSettingsPopup: el("canvas-settings-popup"),
    zoomSlider: elOf("zoom-slider", isHtmlInputElement),
    zoomValue: el("zoom-value"),
    autoZoomCheckbox: elOf("auto-zoom", isHtmlInputElement),
    langEn: elOf("lang-en", isHtmlButtonElement),
    langZh: elOf("lang-zh", isHtmlButtonElement),
    langJa: elOf("lang-ja", isHtmlButtonElement),
    profileSave: elOf("profile-save", isHtmlButtonElement),
    profileDelete: elOf("profile-delete", isHtmlButtonElement),
    profileSelectTrigger: elOf("profile-select-trigger", isHtmlButtonElement),
    profileSelectLabel: el("profile-select-label"),
    profilePopup: el("profile-popup"),
    profileNew: elOf("profile-new", isHtmlButtonElement),
    newProfilePopup: el("new-profile-popup"),
    newProfileName: elOf("new-profile-name", isHtmlInputElement),
    newProfileConfirm: elOf("new-profile-confirm", isHtmlButtonElement),
    newProfileCancel: elOf("new-profile-cancel", isHtmlButtonElement),
    shareLink: elOf("share-link", isHtmlButtonElement),
    sharePopup: el("share-popup"),
    shareCopyUrl: elOf("share-copy-url", isHtmlButtonElement),
    shareCopyText: elOf("share-copy-text", isHtmlButtonElement),
    shareStatus: el("share-status"),
    importProfile: elOf("import-profile", isHtmlButtonElement),
    importSidePopup: el("import-side-popup"),
    importSideShipA: elOf("import-side-ship-a", isHtmlButtonElement),
    importSideShipB: elOf("import-side-ship-b", isHtmlButtonElement),
    confirmPopup: el("confirm-popup"),
    confirmMessage: el("confirm-message"),
    confirmOk: elOf("confirm-ok", isHtmlButtonElement),
    confirmCancel: elOf("confirm-cancel", isHtmlButtonElement),
    resDistance: el("res-distance"),
    resTransversal: el("res-transversal"),
    resAngular: el("res-angular"),
    resRadial: el("res-radial"),
    resTrackPen: el("res-track-pen"),
    resRangePen: el("res-range-pen"),
    resHit: el("res-hit"),
    rangeOverlayLegend: el("range-overlay-legend"),
    slideHints: el("slide-hints"),
  };
}

function createCombatantEls(side: Side): CombatantEls {
  const id = side === "shipA" ? "ship-a" : "ship-b";
  const effectiveTrackingId = side === "shipA" ? "tracking" : "ship-b-tracking";
  const effectiveOptimalId = side === "shipA" ? "optimal" : "ship-b-optimal";
  const effectiveFalloffId = side === "shipA" ? "falloff" : "ship-b-falloff";
  return {
    tracking: elOf(`${id}-tracking`, isHtmlInputElement),
    sigRes: elOf(`${id}-sigRes`, isHtmlSelectElement),
    sigResOptions: el(`${id}-sig-res-options`),
    optimal: elOf(`${id}-optimal`, isHtmlInputElement),
    falloff: elOf(`${id}-falloff`, isHtmlInputElement),
    effectiveTracking: el(`effective-${effectiveTrackingId}`),
    effectiveOptimal: el(`effective-${effectiveOptimalId}`),
    effectiveFalloff: el(`effective-${effectiveFalloffId}`),
    effectiveSpeed: el(`effective-${id}-speed`),
    ammoField: el(`${id}-ammo-field`),
    ammoTrigger: elOf(`${id}-ammo-trigger`, isHtmlButtonElement),
    ammoSummary: el(`${id}-ammo-summary`),
    ammoSummaryIcon: elOf(`${id}-ammo-summary-icon`, isHtmlImageElement),
    ammoPopup: el(`${id}-ammo-popup`),
    ammoCargoLabel: el(`${id}-ammo-cargo-label`),
    ammoCargoList: el(`${id}-ammo-cargo-list`),
    ammoExpand: elOf(`${id}-ammo-expand`, isHtmlButtonElement),
    ammoAllSection: el(`${id}-ammo-all-section`),
    ammoAllList: el(`${id}-ammo-all-list`),
    hull: elOf(`${id}-hull`, isHtmlInputElement),
    shipImage: elOf(`${id}-ship-image`, isHtmlImageElement),
    fittingName: el(`${id}-fitting-name`),
    hullHint: el(`${id}-hull-hint`),
    fittingTrigger: elOf(`${id}-fitting-trigger`, isHtmlButtonElement),
    fittingEye: elOf(`${id}-fitting-eye`, isHtmlButtonElement),
    fittingPopup: el(`${id}-fitting-popup`),
    fittingPreview: el(`${id}-fitting-preview`),
    fittingSavedLabel: el(`${id}-fitting-saved-label`),
    fittingSavedList: el(`${id}-fitting-saved-list`),
    fittingPresetLabel: el(`${id}-fitting-preset-label`),
    fittingPresetList: el(`${id}-fitting-preset-list`),
    fittingEmpty: el(`${id}-fitting-empty`),
    importFitting: elOf(`${id}-import-fitting`, isHtmlButtonElement),
    pastePopup: el(`${id}-paste-popup`),
    pasteInput: elOf(`${id}-paste-input`, isHtmlTextAreaElement),
    propulsion: elOf(`${id}-propulsion`, isHtmlSelectElement),
    propulsionOptions: el(`${id}-propulsion-options`),
    propulsionGear: elOf(`${id}-propulsion-gear`, isHtmlButtonElement),
    propulsionVariants: el(`${id}-propulsion-variants`),
    skills: elOf(`${id}-skills`, isHtmlSelectElement),
    skillOptions: el(`${id}-skill-options`),
    skillSummary: el(`${id}-skill-summary`),
    skillTrigger: elOf(`${id}-skill-trigger`, isHtmlButtonElement),
    skillPopup: el(`${id}-skill-popup`),
    overload: elOf(`${id}-overload`, isHtmlInputElement),
    overloadButton: elOf(`${id}-overload-button`, isHtmlButtonElement),
    ewarField: el(`${id}-ewar-field`),
    ewarTrigger: elOf(`${id}-ewar-trigger`, isHtmlButtonElement),
    ewarPopup: el(`${id}-ewar-popup`),
    ewarSection: el(`${id}-ewar-section`),
    ewarSummaryRow: el(`${id}-ewar-summary-row`),
    ewarSummary: el(`${id}-ewar-summary`),
    boosterSection: el(`${id}-booster-section`),
    boosterSummary: el(`${id}-booster-summary`),
    speed: elOf(`${id}-speed`, isHtmlInputElement),
    mass: elOf(`${id}-mass`, isHtmlInputElement),
    inertia: elOf(`${id}-inertia`, isHtmlInputElement),
    alignTime: el(`${id}-align-time`),
    mode: elOf(`${id}-mode`, isHtmlSelectElement),
    range: elOf(`${id}-range`, isHtmlInputElement),
    aggressivity: elOf(`${id}-aggressivity`, isHtmlInputElement),
    aggressivitySlider: elOf(`${id}-aggressivity-slider`, isHtmlInputElement),
    aggressivityValue: el(`${id}-aggressivity-value`),
    shipSig: elOf(`${id}-sig`, isHtmlInputElement),
    portrait: el(`${id}-portrait`),
  };
}
