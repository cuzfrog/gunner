import type { createControlsEls } from "../elements";
import type { Side } from "../side";

type ControlsElements = ReturnType<typeof createControlsEls>;

export interface SidePanelElements {
  readonly hull: HTMLInputElement;
  readonly shipImage: HTMLImageElement;
  readonly fittingName: HTMLElement;
  readonly hullHint: HTMLElement;
  readonly speed: HTMLInputElement;
  readonly mass: HTMLInputElement;
  readonly inertia: HTMLInputElement;
  readonly alignTime: HTMLElement;
  readonly mode: HTMLSelectElement;
  readonly range: HTMLInputElement;
  readonly targetSig?: HTMLInputElement;
  readonly skills: HTMLSelectElement;
  readonly skillOptions: HTMLElement;
  readonly skillSummary: HTMLElement;
  readonly skillTrigger: HTMLButtonElement;
  readonly skillPopup: HTMLElement;
  readonly overload: HTMLInputElement;
  readonly overloadButton: HTMLButtonElement;
  readonly pastePopup: HTMLElement;
  readonly pasteInput: HTMLTextAreaElement;
  readonly importFitting: HTMLButtonElement;
  readonly propulsion: HTMLSelectElement;
  readonly propulsionOptions: HTMLElement;
  readonly propulsionGear: HTMLButtonElement;
  readonly propulsionVariants: HTMLElement;
}

export function collectSideEls(els: ControlsElements, side: Side): SidePanelElements {
  if (side === "attacker") {
    return {
      hull: els.attackerHull,
      shipImage: els.attackerShipImage,
      fittingName: els.attackerFittingName,
      hullHint: els.attackerHullHint,
      speed: els.attackerSpeed,
      mass: els.attackerMass,
      inertia: els.attackerInertia,
      alignTime: els.attackerAlignTime,
      mode: els.attackerMode,
      range: els.attackerRange,
      skills: els.attackerSkills,
      skillOptions: els.attackerSkillOptions,
      skillSummary: els.attackerSkillSummary,
      skillTrigger: els.attackerSkillTrigger,
      skillPopup: els.attackerSkillPopup,
      overload: els.attackerOverload,
      overloadButton: els.attackerOverloadButton,
      pastePopup: els.attackerPastePopup,
      pasteInput: els.attackerPasteInput,
      importFitting: els.attackerImportFitting,
      propulsion: els.attackerPropulsion,
      propulsionOptions: els.attackerPropulsionOptions,
      propulsionGear: els.attackerPropulsionGear,
      propulsionVariants: els.attackerPropulsionVariants,
    };
  }
  return {
    hull: els.targetHull,
    shipImage: els.targetShipImage,
    fittingName: els.targetFittingName,
    hullHint: els.targetHullHint,
    speed: els.targetSpeed,
    mass: els.targetMass,
    inertia: els.targetInertia,
    alignTime: els.targetAlignTime,
    mode: els.targetMode,
    range: els.targetRange,
    targetSig: els.targetSig,
    skills: els.targetSkills,
    skillOptions: els.targetSkillOptions,
    skillSummary: els.targetSkillSummary,
    skillTrigger: els.targetSkillTrigger,
    skillPopup: els.targetSkillPopup,
    overload: els.targetOverload,
    overloadButton: els.targetOverloadButton,
    pastePopup: els.targetPastePopup,
    pasteInput: els.targetPasteInput,
    importFitting: els.targetImportFitting,
    propulsion: els.targetPropulsion,
    propulsionOptions: els.targetPropulsionOptions,
    propulsionGear: els.targetPropulsionGear,
    propulsionVariants: els.targetPropulsionVariants,
  };
}
