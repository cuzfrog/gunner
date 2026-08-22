import type { Els } from "./elements";
import type { FittingPopupEls } from "./fittingPopupController";
import type { ImportEls } from "./importController";
import type { PreferencesEls } from "./preferencesController";
import type { ProfileEls } from "./profileController";
import type { Side, SidePanelElements } from "./sidePanel";
import type { TurretEls } from "./turretController";

export function collectPreferencesEls(els: Els): PreferencesEls {
  return {
    tracking: els.tracking,
    trackingUnitRad: els.trackingUnitRad,
    trackingUnitScore: els.trackingUnitScore,
    langEn: els.langEn,
    langZh: els.langZh,
    langJa: els.langJa,
    gridBrightnessSlider: els.gridBrightnessSlider,
    gridBrightnessValue: els.gridBrightnessValue,
    maneuverAggressivity: els.maneuverAggressivity,
    maneuverAggressivitySlider: els.maneuverAggressivitySlider,
    maneuverAggressivityValue: els.maneuverAggressivityValue,
    simSpeed: els.simSpeed,
  };
}

export function collectProfileEls(els: Els): ProfileEls {
  return {
    profileName: els.profileName,
    profileSave: els.profileSave,
    profileSelect: els.profileSelect,
    profileDelete: els.profileDelete,
    shareStatus: els.shareStatus,
  };
}

export function collectTurretEls(els: Els): TurretEls {
  return {
    tracking: els.tracking,
    sigRes: els.sigRes,
    sigResOptions: els.sigResOptions,
    optimal: els.optimal,
    falloff: els.falloff,
    attackerAmmoTrigger: els.attackerAmmoTrigger,
    attackerAmmoSummary: els.attackerAmmoSummary,
    attackerAmmoSummaryIcon: els.attackerAmmoSummaryIcon,
    attackerAmmoPopup: els.attackerAmmoPopup,
    attackerAmmoCargoLabel: els.attackerAmmoCargoLabel,
    attackerAmmoCargoList: els.attackerAmmoCargoList,
    attackerAmmoExpand: els.attackerAmmoExpand,
    attackerAmmoAllSection: els.attackerAmmoAllSection,
    attackerAmmoAllList: els.attackerAmmoAllList,
  };
}

export function collectImportEls(els: Els): ImportEls {
  return {
    importProfile: els.importProfile,
    importSidePopup: els.importSidePopup,
    importSideAttacker: els.importSideAttacker,
    importSideTarget: els.importSideTarget,
  };
}

export function collectSideEls(els: Els, side: Side): SidePanelElements {
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

export function collectFittingPopupEls(els: Els, side: Side): FittingPopupEls {
  if (side === "attacker") {
    return {
      trigger: els.attackerFittingTrigger,
      eye: els.attackerFittingEye,
      popup: els.attackerFittingPopup,
      savedList: els.attackerFittingSavedList,
      presetList: els.attackerFittingPresetList,
      savedLabel: els.attackerFittingSavedLabel,
      presetLabel: els.attackerFittingPresetLabel,
      empty: els.attackerFittingEmpty,
      shipImage: els.attackerShipImage,
    };
  }
  return {
    trigger: els.targetFittingTrigger,
    eye: els.targetFittingEye,
    popup: els.targetFittingPopup,
    savedList: els.targetFittingSavedList,
    presetList: els.targetFittingPresetList,
    savedLabel: els.targetFittingSavedLabel,
    presetLabel: els.targetFittingPresetLabel,
    empty: els.targetFittingEmpty,
    shipImage: els.targetShipImage,
  };
}
