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
  readonly aggressivity: HTMLInputElement;
  readonly aggressivitySlider: HTMLInputElement;
  readonly aggressivityValue: HTMLElement;
  readonly shipSig: HTMLInputElement;
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
  if (side === "shipA") {
    return {
      hull: els.shipAHull,
      shipImage: els.shipAShipImage,
      fittingName: els.shipAFittingName,
      hullHint: els.shipAHullHint,
      speed: els.shipASpeed,
      mass: els.shipAMass,
      inertia: els.shipAInertia,
      alignTime: els.shipAAlignTime,
      mode: els.shipAMode,
      range: els.shipARange,
      aggressivity: els.shipAAggressivity,
      aggressivitySlider: els.shipAAggressivitySlider,
      aggressivityValue: els.shipAAggressivityValue,
      shipSig: els.shipASig,
      skills: els.shipASkills,
      skillOptions: els.shipASkillOptions,
      skillSummary: els.shipASkillSummary,
      skillTrigger: els.shipASkillTrigger,
      skillPopup: els.shipASkillPopup,
      overload: els.shipAOverload,
      overloadButton: els.shipAOverloadButton,
      pastePopup: els.shipAPastePopup,
      pasteInput: els.shipAPasteInput,
      importFitting: els.shipAImportFitting,
      propulsion: els.shipAPropulsion,
      propulsionOptions: els.shipAPropulsionOptions,
      propulsionGear: els.shipAPropulsionGear,
      propulsionVariants: els.shipAPropulsionVariants,
    };
  }
  return {
    hull: els.shipBHull,
    shipImage: els.shipBShipImage,
    fittingName: els.shipBFittingName,
    hullHint: els.shipBHullHint,
    speed: els.shipBSpeed,
    mass: els.shipBMass,
    inertia: els.shipBInertia,
    alignTime: els.shipBAlignTime,
    mode: els.shipBMode,
    range: els.shipBRange,
    aggressivity: els.shipBAggressivity,
    aggressivitySlider: els.shipBAggressivitySlider,
    aggressivityValue: els.shipBAggressivityValue,
    shipSig: els.shipBSig,
    skills: els.shipBSkills,
    skillOptions: els.shipBSkillOptions,
    skillSummary: els.shipBSkillSummary,
    skillTrigger: els.shipBSkillTrigger,
    skillPopup: els.shipBSkillPopup,
    overload: els.shipBOverload,
    overloadButton: els.shipBOverloadButton,
    pastePopup: els.shipBPastePopup,
    pasteInput: els.shipBPasteInput,
    importFitting: els.shipBImportFitting,
    propulsion: els.shipBPropulsion,
    propulsionOptions: els.shipBPropulsionOptions,
    propulsionGear: els.shipBPropulsionGear,
    propulsionVariants: els.shipBPropulsionVariants,
  };
}
