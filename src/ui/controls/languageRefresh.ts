import type { I18n } from "../i18n";
import type { FittingPopupController } from "./fittingPopupController";
import type { FittingPreviewManager } from "./fittingPreviewManager";
import type { IHintRotator } from "./hintRotator";
import type { HullDatalist } from "./hullDatalist";
import type { ProfileController } from "./profileController";
import type { SidePanel } from "./sidePanel";
import type { TurretController } from "./turretController";

export class LanguageRefresh {
  private readonly i18n: I18n;
  private readonly hullDatalist: HullDatalist;
  private readonly profileController: ProfileController;
  private readonly attackerSide: SidePanel;
  private readonly targetSide: SidePanel;
  private readonly turretController: TurretController;
  private readonly attackerFittingPopup: FittingPopupController;
  private readonly targetFittingPopup: FittingPopupController;
  private readonly previewManager: FittingPreviewManager;
  private readonly hintRotator: IHintRotator;
  private readonly setPlaying: (playing: boolean) => void;
  private readonly onDisplayChange: () => void;

  constructor(deps: {
    i18n: I18n;
    hullDatalist: HullDatalist;
    profileController: ProfileController;
    attackerSide: SidePanel;
    targetSide: SidePanel;
    turretController: TurretController;
    attackerFittingPopup: FittingPopupController;
    targetFittingPopup: FittingPopupController;
    previewManager: FittingPreviewManager;
    hintRotator: IHintRotator;
    setPlaying: (playing: boolean) => void;
    onDisplayChange: () => void;
  }) {
    this.i18n = deps.i18n;
    this.hullDatalist = deps.hullDatalist;
    this.profileController = deps.profileController;
    this.attackerSide = deps.attackerSide;
    this.targetSide = deps.targetSide;
    this.turretController = deps.turretController;
    this.attackerFittingPopup = deps.attackerFittingPopup;
    this.targetFittingPopup = deps.targetFittingPopup;
    this.previewManager = deps.previewManager;
    this.hintRotator = deps.hintRotator;
    this.setPlaying = deps.setPlaying;
    this.onDisplayChange = deps.onDisplayChange;
  }

  refresh(playing: boolean): void {
    const selected = this.profileController.selectedName();
    this.i18n.translateDocument();
    this.profileController.refresh(selected);
    this.attackerSide.renderPropulsionOptions();
    this.targetSide.renderPropulsionOptions();
    this.turretController.render();
    this.attackerSide.clearImportHint();
    this.targetSide.clearImportHint();
    this.hullDatalist.populate();
    this.attackerSide.refreshHullInputs();
    this.targetSide.refreshHullInputs();
    this.attackerFittingPopup.renderIfOpen();
    this.targetFittingPopup.renderIfOpen();
    this.previewManager.refresh();
    this.attackerSide.updateHullHint();
    this.targetSide.updateHullHint();
    this.attackerSide.renderSkillOptions();
    this.targetSide.renderSkillOptions();
    this.hintRotator.refresh();
    this.setPlaying(playing);
    this.profileController.updateDirtyState();
    this.onDisplayChange();
  }
}
