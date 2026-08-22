import { isEventTargetWithClosest, num } from "./controlsDom";
import type { Els } from "./elementsContract";
import type { FittingPopupController } from "./fittingPopupController";
import type { FittingPreviewManager } from "./fittingPreviewManager";
import type { ImportController } from "./importController";
import type { Popup } from "./popupGroup";
import type { PopupGroup } from "./popupGroup";
import type { PreferencesController } from "./preferencesController";
import type { ProfileController } from "./profileController";
import type { Side, SidePanel } from "./sidePanel";
import type { TurretController } from "./turretController";

export interface EventRouterHost {
  onPlayPause(): void;
  onReset(): void;
  onSpeedChange(speed: number): void;
  onConfigChange(): void;
  onDisplayChange(): void;
}

export class EventRouter {
  private readonly els: Els;
  private readonly preferences: PreferencesController;
  private readonly profile: ProfileController;
  private readonly importController: ImportController;
  private readonly attackerSide: SidePanel;
  private readonly targetSide: SidePanel;
  private readonly turret: TurretController;
  private readonly popupGroup: PopupGroup;
  private readonly previewManager: FittingPreviewManager;
  private readonly attackerAmmoPopup: Popup;
  private readonly attackerFittingPopup: FittingPopupController;
  private readonly targetFittingPopup: FittingPopupController;
  private readonly host: EventRouterHost;

  constructor(deps: {
    els: Els;
    preferences: PreferencesController;
    profile: ProfileController;
    import: ImportController;
    attackerSide: SidePanel;
    targetSide: SidePanel;
    turret: TurretController;
    popupGroup: PopupGroup;
    previewManager: FittingPreviewManager;
    attackerAmmoPopup: Popup;
    attackerFittingPopup: FittingPopupController;
    targetFittingPopup: FittingPopupController;
    host: EventRouterHost;
  }) {
    this.els = deps.els;
    this.preferences = deps.preferences;
    this.profile = deps.profile;
    this.importController = deps.import;
    this.attackerSide = deps.attackerSide;
    this.targetSide = deps.targetSide;
    this.turret = deps.turret;
    this.popupGroup = deps.popupGroup;
    this.previewManager = deps.previewManager;
    this.attackerAmmoPopup = deps.attackerAmmoPopup;
    this.attackerFittingPopup = deps.attackerFittingPopup;
    this.targetFittingPopup = deps.targetFittingPopup;
    this.host = deps.host;
    this.bind();
  }

  private bind(): void {
    this.els.play.addEventListener("click", () => this.host.onPlayPause());
    this.els.reset.addEventListener("click", () => this.host.onReset());
    this.els.simSpeed.addEventListener("change", () => this.host.onSpeedChange(this.preferences.getSpeed()));
    this.els.trackingUnitRad.addEventListener("click", () => this.onTrackingUnitClick("rad"));
    this.els.trackingUnitScore.addEventListener("click", () => this.onTrackingUnitClick("score"));
    this.els.langEn.addEventListener("click", () => this.preferences.setLanguage("en"));
    this.els.langZh.addEventListener("click", () => this.preferences.setLanguage("zh"));
    this.els.langJa.addEventListener("click", () => this.preferences.setLanguage("ja"));
    this.els.profileSave.addEventListener("click", () => this.profile.saveProfile());
    this.els.profileSelect.addEventListener("change", () => this.profile.loadProfile());
    this.els.profileDelete.addEventListener("click", () => this.profile.deleteProfile());
    this.els.shareLink.addEventListener("click", () => void this.importController.copyProfile());
    this.els.importProfile.addEventListener("click", () => void this.importController.importProfileClicked());
    this.els.importSideAttacker.addEventListener("click", () => void this.importController.onImportSideClick("attacker"));
    this.els.importSideTarget.addEventListener("click", () => void this.importController.onImportSideClick("target"));
    this.els.profileName.addEventListener("input", () => this.profile.updateDirtyState());

    this.els.attackerImportFitting.addEventListener("click", () => void this.importController.importFromClipboard("attacker"));
    this.els.targetImportFitting.addEventListener("click", () => void this.importController.importFromClipboard("target"));

    this.els.attackerPastePopup.addEventListener("paste", (event: ClipboardEvent) => this.attackerSide.onPastePopupPaste(event));
    this.els.targetPastePopup.addEventListener("paste", (event: ClipboardEvent) => this.targetSide.onPastePopupPaste(event));

    this.els.attackerHull.addEventListener("input", () => this.attackerSide.onHullInput());
    this.els.attackerHull.addEventListener("change", () => this.attackerSide.onHullChange());
    this.els.attackerFittingTrigger.addEventListener("click", () => this.popupGroup.toggle(this.attackerFittingPopup.popup));
    this.els.attackerFittingEye.addEventListener("click", () => this.previewManager.toggle("attacker"));
    this.els.attackerAmmoTrigger.addEventListener("click", () => this.popupGroup.toggle(this.attackerAmmoPopup));
    this.els.attackerPropulsion.addEventListener("change", () => this.attackerSide.onPropulsionChange());
    this.els.attackerPropulsionGear.addEventListener("click", () => this.popupGroup.toggle(this.attackerSide.getPropulsionVariantPopup()));
    this.els.attackerSkills.addEventListener("change", () => this.attackerSide.onSkillOrOverloadChange(true));
    this.els.attackerOverload.addEventListener("change", () => this.attackerSide.onSkillOrOverloadChange(false));
    this.els.attackerOverloadButton.addEventListener("click", () => this.attackerSide.onOverloadButtonClick());

    this.els.targetHull.addEventListener("input", () => this.targetSide.onHullInput());
    this.els.targetHull.addEventListener("change", () => this.targetSide.onHullChange());
    this.els.targetFittingTrigger.addEventListener("click", () => this.popupGroup.toggle(this.targetFittingPopup.popup));
    this.els.targetFittingEye.addEventListener("click", () => this.previewManager.toggle("target"));
    this.els.targetPropulsion.addEventListener("change", () => this.targetSide.onPropulsionChange());
    this.els.targetPropulsionGear.addEventListener("click", () => this.popupGroup.toggle(this.targetSide.getPropulsionVariantPopup()));
    this.els.targetSkills.addEventListener("change", () => this.targetSide.onSkillOrOverloadChange(true));
    this.els.targetOverload.addEventListener("change", () => this.targetSide.onSkillOrOverloadChange(false));
    this.els.targetOverloadButton.addEventListener("click", () => this.targetSide.onOverloadButtonClick());

    this.els.attackerSkillTrigger.addEventListener("click", () => this.popupGroup.toggle(this.attackerSide.getSkillPopup()));
    this.els.targetSkillTrigger.addEventListener("click", () => this.popupGroup.toggle(this.targetSide.getSkillPopup()));

    const displayInputs: (keyof Els)[] = ["tracking", "sigRes", "optimal", "falloff", "targetSig"];
    for (const id of displayInputs) {
      this.els[id].addEventListener("input", () => { this.applyDisplayInput(id); this.host.onDisplayChange(); });
    }

    const shipInputs: (keyof Els)[] = [
      "attackerSpeed",
      "attackerMass",
      "attackerInertia",
      "attackerMode",
      "attackerRange",
      "initialDistance",
      "targetSpeed",
      "targetMass",
      "targetInertia",
      "targetMode",
      "targetRange",
    ];
    for (const id of shipInputs) {
      this.els[id].addEventListener("input", () => {
        if (id === "attackerMode") this.preferences.updateManeuverAggressivityEnabled(this.els.attackerMode.value === "midships");
        this.applyShipInput(id);
        this.host.onConfigChange();
      });
    }

    this.els.maneuverAggressivitySlider.addEventListener("input", () => {
      this.preferences.onManeuverAggressivityChange();
      this.host.onConfigChange();
    });
    this.els.gridBrightnessSlider.addEventListener("input", () => {
      this.preferences.onGridBrightnessChange();
      this.host.onDisplayChange();
    });

    document.addEventListener("pointerdown", (event: PointerEvent) => this.onDocumentPointerDown(event));
    document.addEventListener("keydown", (event: KeyboardEvent) => this.onDocumentKeyDown(event));
  }

  private onTrackingUnitClick(unit: "rad" | "score"): void {
    this.preferences.setTrackingUnit(unit);
    this.profile.updateDirtyState();
    this.host.onDisplayChange();
  }

  private onDocumentPointerDown(event: PointerEvent): void {
    if (!this.popupGroup.hasOpen() && !this.previewManager.openSide()) return;
    const target = event.target;
    if (!isEventTargetWithClosest(target)) return;
    this.popupGroup.onPointerDown(target);
    this.previewManager.handlePointerDown(target);
  }

  private onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    if (this.previewManager.openSide()) this.previewManager.handleEscape();
    this.popupGroup.onKeyDown(event);
  }

  private applyDisplayInput(id: keyof Els): void {
    if (id === "tracking") this.preferences.updateTrackingFromInput();
    if (id === "sigRes") this.preferences.updateTrackingForSigResolution();
    if (id === "tracking") this.attackerSide.recordOverride("tracking", this.preferences.trackingInput.rad);
    if (id === "sigRes") this.attackerSide.recordOverride("sigRes", this.turret.currentSigResClass());
    if (id === "optimal") this.attackerSide.recordOverride("optimal", num(this.els.optimal));
    if (id === "falloff") this.attackerSide.recordOverride("falloff", num(this.els.falloff));
    if (id === "targetSig") this.targetSide.recordOverride("targetSig", Math.max(num(this.els.targetSig), 1));
  }
  private applyShipInput(id: keyof Els): void {
    if (id === "attackerMass") this.attackerSide.updateSpeedFromMass();
    if (id === "targetMass") this.targetSide.updateSpeedFromMass();
    if (id === "attackerMass" || id === "attackerInertia") this.attackerSide.updateAlignTime();
    if (id === "targetMass" || id === "targetInertia") this.targetSide.updateAlignTime();
    if (id === "attackerSpeed") this.attackerSide.recordOverride("attackerSpeed", num(this.els.attackerSpeed));
    if (id === "attackerMass") this.attackerSide.recordOverride("attackerMass", num(this.els.attackerMass));
    if (id === "attackerInertia") this.attackerSide.recordOverride("attackerInertia", num(this.els.attackerInertia));
    if (id === "targetSpeed") this.targetSide.recordOverride("targetSpeed", num(this.els.targetSpeed));
    if (id === "targetMass") this.targetSide.recordOverride("targetMass", num(this.els.targetMass));
    if (id === "targetInertia") this.targetSide.recordOverride("targetInertia", num(this.els.targetInertia));
  }
}
