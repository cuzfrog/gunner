import type { Els } from "./elementsContract";
import {
  createControlsEls,
  collectFittingPopupEls,
  collectImportEls,
  collectPreferencesEls,
  collectProfileEls,
  collectTurretEls,
} from "./elements";
import { el } from "./controlsDom";
import { profileSettingsOf } from "./controlsFormat";
import { createSidePanel, collectSideEls, type Side, type SidePanel } from "./sidePanel";
import { PopupGroupImpl } from "./popup/popupGroup";
import type { FittingPopupController, FittingPreviewManager, Popup, PopupGroup } from "./popup";
import { ChoiceGroupImpl, type ChoiceGroup } from "./choiceGroup";
import { EngagementReadoutImpl, type EngagementReadout } from "./engagementReadout";
import { SessionCodecImpl } from "./session/sessionCodec";
import type { HullDatalist, LanguageRefresh, SessionCodec } from "./session";
import { TurretControllerImpl } from "./turret/turretController";
import type { TurretController } from "./turret";
import { TurretStateResolver } from "./turret/turretStateResolver";
import { DomFittingPreview } from "./popup/fittingPreview";
import { FittingPreviewManagerImpl } from "./popup/fittingPreviewManager";
import { FittingPopupControllerImpl } from "./popup/fittingPopupController";
import { ImportControllerImpl } from "./import/importController";
import type { ImportController } from "./import";
import { PreferencesControllerImpl, type PreferencesController } from "./preferencesController";
import { ProfileControllerImpl, type ProfileController } from "./profileController";
import { HintRotatorImpl } from "./hints/hintRotator";
import { HINT_CANDIDATES, LORES, TIP_TEXT, type HintRotator } from "./hints";
import { LanguageRefreshImpl } from "./session/languageRefresh";
import { HullDatalistImpl } from "./session/hullDatalist";
import { EventRouter } from "./session/eventRouter";
import { SidePanelHostBuilder } from "./sidePanelHostBuilder";
import { SIG_RESOLUTIONS } from "../../sim";
import type { DomControlsDeps, DomControlsHost, DomControlsParts } from "./domControlsContract";
export class DomControlsFactory {
  buildParts(deps: DomControlsDeps): { parts: DomControlsParts; host: DomControlsHost } {
    const host: DomControlsHost = {
      isPlaying: () => false,
      setPlaying: () => {},
      onPlayPause: () => {},
      onReset: () => {},
      onSpeedChange: () => {},
      onConfigChange: () => {},
      onDisplayChange: () => {},
      fireConfigChange: () => {},
      fireDisplayChange: () => {},
      onProfileLoaded: () => {},
      onProfileTextLoaded: () => {},
      captureSettings: notWired,
      persistConfigChange: () => {},
    };
    const els = createControlsEls();
    const popupGroup: PopupGroup = new PopupGroupImpl();
    const hintRotator: HintRotator = new HintRotatorImpl({
      element: el("slide-hints"), i18n: deps.i18n, candidates: HINT_CANDIDATES, tipText: TIP_TEXT, lores: LORES,
      timer: deps.timer, intervalMs: 20_000,
    });
    const hullDatalist: HullDatalist = new HullDatalistImpl(els, deps.presetFittings);
    const engagementReadout: EngagementReadout = new EngagementReadoutImpl({
      resDistance: el("res-distance"), resTransversal: el("res-transversal"), resAngular: el("res-angular"),
      resRadial: el("res-radial"), resTrackPen: el("res-track-pen"), resRangePen: el("res-range-pen"), resHit: el("res-hit"),
    });
    const sigResChoice: ChoiceGroup = new ChoiceGroupImpl(els.sigResOptions, els.sigRes, ["S", "M", "L", "XL"]);
    let turretController!: TurretController;
    let importController!: ImportController;
    let attackerSide!: SidePanel;
    let targetSide!: SidePanel;
    let sessionCodec!: SessionCodec;
    let languageRefresh!: LanguageRefresh;
    const attackerAmmoPopup: Popup = {
      isOpen: () => turretController.isAmmoPopupOpen(),
      open: () => turretController.openAmmoPopup(),
      close: () => turretController.closeAmmoPopup(),
      focusTrigger: () => els.attackerAmmoTrigger.focus(),
      contains: (target) => target instanceof Element && target.closest("#attacker-ammo-field") !== null,
    };
    const attackerPreview = new DomFittingPreview({
      container: els.attackerFittingPreview, i18n: deps.i18n, imageCatalog: deps.imageCatalog, viewport: () => window,
    });
    const targetPreview = new DomFittingPreview({
      container: els.targetFittingPreview, i18n: deps.i18n, imageCatalog: deps.imageCatalog, viewport: () => window,
    });
    const sidePanelHostBuilder = new SidePanelHostBuilder({
      popupGroup,
      savedFittings: deps.savedFittings,
      importController: () => importController,
      turretController: () => turretController,
      attackerSide: () => attackerSide,
      onAttackerFittedHullCleared: () => { popupGroup.close(attackerAmmoPopup); turretController.clear(); },
      persistConfigChange: (notify = true) => host.persistConfigChange(notify),
    });
    attackerSide = createSidePanel({
      side: "attacker", host: sidePanelHostBuilder.build("attacker"), popupGroup,
      els: collectSideEls(els, "attacker"), i18n: deps.i18n, ships: deps.ships,
      fittingImport: deps.fittingImport, imageCatalog: deps.imageCatalog, timer: deps.timer,
    });
    targetSide = createSidePanel({
      side: "target", host: sidePanelHostBuilder.build("target"), popupGroup,
      els: collectSideEls(els, "target"), i18n: deps.i18n, ships: deps.ships,
      fittingImport: deps.fittingImport, imageCatalog: deps.imageCatalog, timer: deps.timer,
    });
    const preferencesController = new PreferencesControllerImpl({
      els: collectPreferencesEls(els), i18n: deps.i18n, settingsStore: deps.settingsStore,
      sigResolution: () => SIG_RESOLUTIONS[turretController.currentSigResClass()],
      onLanguageChanged: () => languageRefresh.refresh(host.isPlaying()),
    });
    const profileController = new ProfileControllerImpl({
      els: collectProfileEls(els), settingsStore: deps.settingsStore, timer: deps.timer, i18n: deps.i18n,
      captureCurrent: () => profileSettingsOf(sessionCodec.capture()), onLoaded: (name) => host.onProfileLoaded(name),
    });
    turretController = new TurretControllerImpl({
      els: collectTurretEls(els), popup: attackerAmmoPopup, chargeCatalog: deps.chargeCatalog,
      gunFamilies: deps.gunFamilies, imageCatalog: deps.imageCatalog, trackingInput: preferencesController.trackingInput,
      i18n: deps.i18n, fittingImport: deps.fittingImport,
      resolver: new TurretStateResolver({ chargeCatalog: deps.chargeCatalog, fittingImport: deps.fittingImport }),
      overrides: () => attackerSide.overrides,
      clearTurretOverrides: () => {
        delete attackerSide.overrides.tracking; delete attackerSide.overrides.sigRes;
        delete attackerSide.overrides.optimal; delete attackerSide.overrides.falloff;
      },
      onConfigChange: (persist) => {
        preferencesController.savePreferences();
        if (persist) profileController.updateDirtyState();
        host.fireConfigChange();
      },
    });
    sessionCodec = new SessionCodecImpl({
      els, attackerSide, targetSide, turret: turretController, preferences: preferencesController,
      profileController, i18n: deps.i18n, chargeCatalog: deps.chargeCatalog, sigResChoice, hintRotator,
      settingsStore: deps.settingsStore, hitChance: deps.hitChance,
      isPlaying: () => host.isPlaying(), setPlaying: (playing) => host.setPlaying(playing),
    });
    importController = new ImportControllerImpl({
      clipboard: deps.clipboard, fittingImport: deps.fittingImport,
      savedFittings: deps.savedFittings, popupGroup,
      els: collectImportEls(els),
      sidePanel: (side) => (side === "attacker" ? attackerSide : targetSide),
      turret: turretController,
      preferences: preferencesController, profileController,
      getSettings: () => host.captureSettings(), onConfigPersisted: () => host.persistConfigChange(true),
      onProfileTextLoaded: (settings) => host.onProfileTextLoaded(settings),
    });
    const previewManager: FittingPreviewManager = new FittingPreviewManagerImpl({
      fittingImport: deps.fittingImport, imageCatalog: deps.imageCatalog, i18n: deps.i18n,
      previewsBySide: { attacker: attackerPreview, target: targetPreview } as const,
      shipImageBySide: { attacker: els.attackerShipImage, target: els.targetShipImage } as const,
      eyeBySide: { attacker: els.attackerFittingEye, target: els.targetFittingEye } as const,
      profileOf: (side) => (side === "attacker" ? attackerSide : targetSide).profile,
      fittingTextOf: (side) => (side === "attacker" ? attackerSide : targetSide).fittingText,
    });
    const fittingPopupDeps = {
      popupGroup, savedFittings: deps.savedFittings, presetFittings: deps.presetFittings,
      fittingImport: deps.fittingImport, imageCatalog: deps.imageCatalog, i18n: deps.i18n,
      panelFor: (side: Side) => (side === "attacker" ? attackerSide : targetSide), previews: previewManager,
    };
    const attackerFittingPopup: FittingPopupController = new FittingPopupControllerImpl({
      side: "attacker", ...fittingPopupDeps,
      els: collectFittingPopupEls(els, "attacker"),
      applyFitting: (text) => importController.importEftFitting("attacker", text, true),
    });
    const targetFittingPopup: FittingPopupController = new FittingPopupControllerImpl({
      side: "target", ...fittingPopupDeps,
      els: collectFittingPopupEls(els, "target"),
      applyFitting: (text) => importController.importEftFitting("target", text, true),
    });
    languageRefresh = new LanguageRefreshImpl({
      i18n: deps.i18n, hullDatalist, profileController,
      attackerSide, targetSide, turretController,
      attackerFittingPopup, targetFittingPopup,
      previewManager, hintRotator,
      setPlaying: (playing) => host.setPlaying(playing), onDisplayChange: () => host.fireDisplayChange(),
    });
    new EventRouter({
      els, preferences: preferencesController, profile: profileController, import: importController,
      attackerSide, targetSide, turret: turretController, popupGroup,
      previewManager, attackerAmmoPopup,
      attackerFittingPopup, targetFittingPopup, host,
    });
    const parts: DomControlsParts = {
      deps, els, popupGroup, hintRotator, hullDatalist, preferencesController, profileController,
      engagementReadout, sigResChoice, attackerSide, targetSide, attackerAmmoPopup, turretController,
      sessionCodec, importController, previewManager, attackerFittingPopup, targetFittingPopup, languageRefresh,
    };
    return { parts, host };
  }
}

function notWired(): never { throw new Error("Host not wired"); }
