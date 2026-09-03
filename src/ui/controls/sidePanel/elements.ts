import type { createControlsEls } from "../elements";
import type { Side } from "../side";

type ControlsElements = ReturnType<typeof createControlsEls>;

export interface SidePanelElements {
  readonly hull: HTMLInputElement;
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
  readonly defenseSkills: HTMLElement;
  readonly targetingSkills: HTMLElement;
  readonly overload: HTMLInputElement;
  readonly overloadButton: HTMLButtonElement;
  readonly turretWeaponOverloadButton: HTMLButtonElement;
  readonly launcherWeaponOverloadButton: HTMLButtonElement;
  readonly pastePopup: HTMLElement;
  readonly pasteInput: HTMLTextAreaElement;
  readonly importFitting: HTMLButtonElement;
  readonly propulsion: HTMLSelectElement;
  readonly propulsionOptions: HTMLElement;
  readonly propulsionGear: HTMLButtonElement;
  readonly propulsionVariants: HTMLElement;
}

export function collectSideEls(els: ControlsElements, side: Side): SidePanelElements {
  const combatant = els[side];
  return {
    hull: combatant.hull,
    fittingName: combatant.fittingName,
    hullHint: combatant.hullHint,
    speed: combatant.speed,
    mass: combatant.mass,
    inertia: combatant.inertia,
    alignTime: combatant.alignTime,
    mode: combatant.mode,
    range: combatant.range,
    aggressivity: combatant.aggressivity,
    aggressivitySlider: combatant.aggressivitySlider,
    aggressivityValue: combatant.aggressivityValue,
    shipSig: combatant.shipSig,
    skills: combatant.skills,
    skillOptions: combatant.skillOptions,
    skillSummary: combatant.skillSummary,
    skillTrigger: combatant.skillTrigger,
    skillPopup: combatant.skillPopup,
    defenseSkills: combatant.defenseSkills,
    targetingSkills: combatant.targetingSkills,
    overload: combatant.overload,
    overloadButton: combatant.overloadButton,
    turretWeaponOverloadButton: combatant.turretWeaponOverloadButton,
    launcherWeaponOverloadButton: combatant.launcherWeaponOverloadButton,
    pastePopup: combatant.pastePopup,
    pasteInput: combatant.pasteInput,
    importFitting: combatant.importFitting,
    propulsion: combatant.propulsion,
    propulsionOptions: combatant.propulsionOptions,
    propulsionGear: combatant.propulsionGear,
    propulsionVariants: combatant.propulsionVariants,
  };
}
