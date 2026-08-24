import type { Els } from "./elementsContract";
import type { ReadoutEls } from "./engagementReadout";
import type { PreferencesEls } from "./preferencesController";
import type { ProfileEls } from "./profileController";
import type { ImportEls } from "./import";
import type { FittingPopupEls } from "./popup";
import type { TurretEls } from "./turret";
import type { Side } from "./sidePanel";
import type { EwarEls } from "./ewar";

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
    profileSave: els.profileSave,
    profileSelect: els.profileSelect,
    profileDelete: els.profileDelete,
    profileNew: els.profileNew,
    newProfilePopup: els.newProfilePopup,
    newProfileName: els.newProfileName,
    newProfileConfirm: els.newProfileConfirm,
    newProfileCancel: els.newProfileCancel,
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

export function collectReadoutEls(els: Els): ReadoutEls {
  return {
    resDistance: els.resDistance,
    resTransversal: els.resTransversal,
    resAngular: els.resAngular,
    resRadial: els.resRadial,
    resTrackPen: els.resTrackPen,
    resRangePen: els.resRangePen,
    resHit: els.resHit,
  };
}

export function collectEwarEls(els: Els): EwarEls {
  return {
    attackerEwarTrigger: els.attackerEwarTrigger,
    attackerEwarPopup: els.attackerEwarPopup,
    attackerEwarSummary: els.attackerEwarSummary,
    targetEwarTrigger: els.targetEwarTrigger,
    targetEwarPopup: els.targetEwarPopup,
    targetEwarSummary: els.targetEwarSummary,
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
