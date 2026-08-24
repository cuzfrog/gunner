import { isEventTargetWithClosest } from "../controlsDom";
import type { Els } from "../elementsContract";
import type { FittingPopupController, FittingPreviewManager, PopupGroup } from "../popup";
import type { ImportController } from "../import";
import type { PreferencesController } from "../preferencesController";
import type { ProfileController } from "../profileController";
import type { ShareController } from "../share";
import type { SidePanel } from "../sidePanel";
import type { TurretController } from "../turret";
import type { TrackingInput } from "../trackingInput";
import type { EwarController } from "../ewar";
import { applyDisplayInput, applyShipInput } from "./inputHandlers";

export interface EventRouterHost {
  onPlayPause(): void;
  onReset(): void;
  onNewProfile(): void;
  onSpeedChange(speed: number): void;
  onConfigChange(): void;
  onDisplayChange(): void;
}

export class EventRouter {
  private readonly els: Els;
  private readonly preferences: PreferencesController;
  private readonly profile: ProfileController;
  private readonly importController: ImportController;
  private readonly shareController: ShareController;
  private readonly attackerSide: SidePanel;
  private readonly targetSide: SidePanel;
  private readonly turret: TurretController;
  private readonly popupGroup: PopupGroup;
  private readonly previewManager: FittingPreviewManager;
  private readonly attackerFittingPopup: FittingPopupController;
  private readonly targetFittingPopup: FittingPopupController;
  private readonly trackingInput: TrackingInput;
  private readonly ewarController: EwarController;
  private host?: EventRouterHost;

  constructor(deps: {
    els: Els;
    preferences: PreferencesController;
    profile: ProfileController;
    import: ImportController;
    share: ShareController;
    attackerSide: SidePanel;
    targetSide: SidePanel;
    turret: TurretController;
    trackingInput: TrackingInput;
    popupGroup: PopupGroup;
    previewManager: FittingPreviewManager;
    attackerFittingPopup: FittingPopupController;
    targetFittingPopup: FittingPopupController;
    ewarController: EwarController;
  }) {
    this.els = deps.els;
    this.preferences = deps.preferences;
    this.profile = deps.profile;
    this.importController = deps.import;
    this.shareController = deps.share;
    this.attackerSide = deps.attackerSide;
    this.targetSide = deps.targetSide;
    this.turret = deps.turret;
    this.popupGroup = deps.popupGroup;
    this.previewManager = deps.previewManager;
    this.attackerFittingPopup = deps.attackerFittingPopup;
    this.targetFittingPopup = deps.targetFittingPopup;
    this.trackingInput = deps.trackingInput;
    this.ewarController = deps.ewarController;
  }

  setHost(host: EventRouterHost): void {
    this.host = host;
    this.bind();
  }

  private bind(): void {
    const host = this.host;
    if (!host) return;




    const displayContext = {
      attackerSide: this.attackerSide,
      targetSide: this.targetSide,
      preferences: this.preferences,
      turret: this.turret,
      trackingInput: this.trackingInput,
    };
    const displayInputs: (keyof Els)[] = ["tracking", "sigRes", "optimal", "falloff", "targetSig"];
    for (const id of displayInputs) {
      this.els[id].addEventListener("input", () => {
        applyDisplayInput(id, displayContext);
        host.onDisplayChange();
      });
    }

    const shipContext = { attackerSide: this.attackerSide, targetSide: this.targetSide };
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
        applyShipInput(id, shipContext);
        host.onConfigChange();
      });
    }



    document.addEventListener("pointerdown", (event: PointerEvent) => this.onDocumentPointerDown(event));
    document.addEventListener("keydown", (event: KeyboardEvent) => this.onDocumentKeyDown(event));
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

}
