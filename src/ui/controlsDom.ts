export interface Els {
  readonly tracking: HTMLInputElement;
  readonly trackingUnitRad: HTMLButtonElement;
  readonly trackingUnitScore: HTMLButtonElement;
  readonly sigRes: HTMLSelectElement;
  readonly sigResOptions: HTMLElement;
  readonly optimal: HTMLInputElement;
  readonly falloff: HTMLInputElement;
  readonly attackerAmmoField: HTMLElement;
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
  readonly attackerImportStatus: HTMLElement;
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
  readonly attackerSpeed: HTMLInputElement;
  readonly attackerMass: HTMLInputElement;
  readonly attackerInertia: HTMLInputElement;
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
  readonly targetImportStatus: HTMLElement;
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
  readonly resDistance: HTMLElement;
  readonly resTransversal: HTMLElement;
  readonly resAngular: HTMLElement;
  readonly resRadial: HTMLElement;
  readonly resTrackPen: HTMLElement;
  readonly resRangePen: HTMLElement;
  readonly resHit: HTMLElement;
  readonly gridBrightnessSlider: HTMLInputElement;
  readonly gridBrightnessValue: HTMLElement;
}

export function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (e === null) throw new Error(`Missing DOM element #${id}`);
  return e;
}

export function elOf<T extends HTMLElement>(id: string, guard: (el: Element) => el is T): T {
  const e = el(id);
  if (!guard(e)) throw new Error(`Expected #${id} to be a ${guard.name}`);
  return e;
}

export function isHtmlButtonElement(el: Element): el is HTMLButtonElement {
  return el.tagName === "BUTTON";
}

export function isHtmlImageElement(el: Element): el is HTMLImageElement {
  return el.tagName === "IMG";
}

export function isHtmlInputElement(el: Element): el is HTMLInputElement {
  return el.tagName === "INPUT";
}

export function isHtmlSelectElement(el: Element): el is HTMLSelectElement {
  return el.tagName === "SELECT";
}

export function isHtmlTextAreaElement(el: Element): el is HTMLTextAreaElement {
  return el.tagName === "TEXTAREA";
}

export function isEventTargetWithClosest(target: EventTarget | null): target is Element {
  return target instanceof Element;
}

export function num(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): number {
  const value = input.value;
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

export function setText(el: HTMLElement, text: string): void {
  el.textContent = text;
}

export function fittingAreaSelector(side: "attacker" | "target"): string {
  return [`#${side}-hull`, `#${side}-ship-image`, `#${side}-fitting-trigger`, `#${side}-fitting-eye`, `#${side}-fitting-popup`, `#${side}-fitting-preview`].join(", ");
}
