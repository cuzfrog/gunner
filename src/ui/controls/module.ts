import { asClass, asFunction, type AwilixContainer } from "awilix";
import { SIG_RESOLUTIONS } from "../../sim";
import type { PresetFittings } from "../../fitting";
import type { SavedFittings } from "../../appstate";
import type { ControlsCradle } from "./cradle";
import { ConfirmControllerImpl } from "./confirmController";
import { combatantSidesOf, forEachSide, wireCombatantSide } from "./combatantSide";
import { profileSettingsOf } from "./controlsFormat";
import { createControlsEls } from "./elements";
import { DomControls } from "./domControls";
import { ChoiceGroupImpl } from "./choiceGroup";
import { EffectiveReadoutImpl } from "./effectiveReadout";
import { EngagementReadoutImpl } from "./engagementReadout";
import { PreferencesControllerImpl } from "./preferencesController";
import { ProfileControllerImpl } from "./profileController";
import { ProfileChangeTrackerImpl } from "./profileChangeTracker";
import { TrackingInputImpl } from "./trackingInput";
import { registerHintsModule } from "./hints";
import { registerImportModule, type ImportController } from "./import";
import { registerPopupModule } from "./popup";
import { registerSessionModule } from "./session";
import { registerShareModule } from "./share";
import type { Side } from "./side";
import { registerSidePanelModule } from "./sidePanel";
import { registerTurretModule } from "./turret";
import { registerEwarModule } from "./ewar";
import { registerBoosterModule } from "./booster";
import { registerRangeOverlayModule } from "./rangeOverlay";

type ControlsElements = ReturnType<typeof createControlsEls>;
type ConfirmEls = ConstructorParameters<typeof ConfirmControllerImpl>[0]["els"];
type DomControlsEls = ConstructorParameters<typeof DomControls>[0]["els"];
type EngagementReadoutEls = ConstructorParameters<typeof EngagementReadoutImpl>[0];
type EffectiveReadoutEls = ConstructorParameters<typeof EffectiveReadoutImpl>[0]["els"];
type PreferencesEls = ConstructorParameters<typeof PreferencesControllerImpl>[0]["els"];
type ProfileEls = ConstructorParameters<typeof ProfileControllerImpl>[0]["els"];

export function registerControlsModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  registerHintsModule(cradle);
  registerTurretModule(cradle);
  registerSidePanelModule(cradle);
  registerEwarModule(cradle);
  registerBoosterModule(cradle);
  registerRangeOverlayModule(cradle);
  registerPopupModule(cradle);
  registerImportModule(cradle);
  registerShareModule(cradle);
  registerSessionModule(cradle);
  cradle.register({
    els: asFunction(createControlsEls).singleton(),
    trackingInput: asClass(TrackingInputImpl).singleton(),
    sigResChoice: asFunction(({ els }: ControlsCradle) => new ChoiceGroupImpl(els.sigResOptions, els.sigRes, ["S", "M", "L", "XL"])).singleton(),
    engagementReadout: asFunction(({ els }: ControlsCradle) => new EngagementReadoutImpl(collectReadoutEls(els))).singleton(),
    effectiveReadout: asFunction(({ els, i18n, trackingInput, turretController }: ControlsCradle) => new EffectiveReadoutImpl({
      els: collectEffectiveReadoutEls(els),
      i18n,
      trackingInput,
      sigResolution: () => SIG_RESOLUTIONS[turretController.currentSigResClass()],
    })).singleton(),
    preferencesController: asFunction(({ els, i18n, itemNames, settingsStore, trackingInput, turretController, uiEvents, rangeOverlayController }: ControlsCradle) => new PreferencesControllerImpl({
      els: collectPreferencesEls(els),
      i18n,
      itemNames,
      settingsStore,
      trackingInput,
      sigResolution: () => SIG_RESOLUTIONS[turretController.currentSigResClass()],
      events: uiEvents,
      rangeOverlayController,
    })).singleton(),
    confirmController: asFunction(({ els, popupGroup, i18n }: ControlsCradle) => new ConfirmControllerImpl({
      popupGroup,
      i18n,
      els: collectConfirmEls(els),
    })).singleton(),
    profileChangeTracker: asFunction(({ profileEquality }: ControlsCradle) =>
      new ProfileChangeTrackerImpl({ equality: profileEquality })
    ).singleton(),
    profileController: asFunction((proxy: ControlsCradle) => new ProfileControllerImpl({
      els: collectProfileEls(proxy.els),
      settingsStore: proxy.settingsStore,
      timer: proxy.timer,
      i18n: proxy.i18n,
      events: proxy.uiEvents,
      confirmController: proxy.confirmController,
      popupGroup: proxy.popupGroup,
      changeTracker: proxy.profileChangeTracker,
      snapshotSource: () => profileSettingsOf(proxy.sessionCodec.capture()),
    })).singleton(),
    controls: asFunction((proxy: ControlsCradle) => new DomControls({
      i18n: proxy.i18n,
      settingsStore: proxy.settingsStore,
      events: proxy.uiEvents,
      els: collectDomControlsEls(proxy.els),
      popupGroup: proxy.popupGroup,
      hintRotator: proxy.hintRotator,
      hullDatalist: proxy.hullDatalist,
      preferencesController: proxy.preferencesController,
      profileController: proxy.profileController,
      engagementReadout: proxy.engagementReadout,
      effectiveReadout: proxy.effectiveReadout,
      attackerSide: proxy.attackerSide,
      targetSide: proxy.targetSide,
      turretController: proxy.turretController,
      sessionCodec: proxy.sessionCodec,
      importController: proxy.importController,
      ewarController: proxy.ewarController,
      boosterController: proxy.boosterController,
      shareController: proxy.shareController,
      rangeOverlayController: proxy.rangeOverlayController,
      previewManager: proxy.previewManager,
      simConfigSource: proxy.simConfigSource,
    })).singleton(),
  });
  wire(cradle);
}

function wire<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  const sides = combatantSidesOf(c.attackerSide, c.targetSide);
  const fittingPopups = { attacker: c.attackerFittingPopup, target: c.targetFittingPopup } as const;
  const host = {
    persistConfigChange: (notify = true) => c.controls.persistConfigChange(notify),
    onConfigChange: () => c.controls.onConfigChange(),
    onDisplayChange: () => c.controls.onDisplayChange(),
    updateManeuverAggressivityEnabled: (enabled: boolean) => c.preferencesController.updateManeuverAggressivityEnabled(enabled),
  };
  forEachSide(sides, (combatant) =>
    wireCombatantSide(combatant, {
      fittingPopup: fittingPopups[combatant.side],
      fittingPreview: c.previewManager,
      popupGroup: c.popupGroup,
      host,
      importer: sideImporterFor(combatant.side, c.importController, c.savedFittings, c.presetFittings),
    })
  );
  c.ewarController.setHost(c.controls);
  c.boosterController.setHost(c.controls);
  c.rangeOverlayController.setHost(c.controls);
  c.sessionCodec.setSessionControl(c.controls);
  c.controls.wireControls();
  c.sessionCodec.restoreStartup(c.settingsStore.loadStartupState());
  forEachSide(sides, (combatant) => combatant.panel.sections.stats.updateAlignTime());
}

function sideImporterFor(side: Side, importer: ImportController, savedFittings: SavedFittings, presetFittings: PresetFittings) {
  return {
    autoLoadFittingTextFor: (hullName: string) => savedFittings.mostRecentFor(hullName)?.text ?? firstPresetText(presetFittings, hullName),
    importEftFitting: (text: string, persist: boolean) => importer.importEftFitting(side, text, persist),
    importFromText: (text: string) => importer.importFromText(side, text),
    importFromClipboard: () => importer.importFromClipboard(side),
  };
}

function firstPresetText(presetFittings: PresetFittings, hull: string): string | undefined {
  const fit = presetFittings.fittingsFor(hull)[0];
  return fit ? presetFittings.eftText(hull, fit) : undefined;
}

function collectConfirmEls(els: ControlsElements): ConfirmEls {
  return {
    confirmPopup: els.confirmPopup,
    confirmMessage: els.confirmMessage,
    confirmOk: els.confirmOk,
    confirmCancel: els.confirmCancel,
  };
}

function collectDomControlsEls(els: ControlsElements): DomControlsEls {
  return {
    play: els.play,
    reset: els.reset,
    simSpeed: els.simSpeed,
    initialDistance: els.initialDistance,
  };
}

function collectReadoutEls(els: ControlsElements): EngagementReadoutEls {
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

function collectEffectiveReadoutEls(els: ControlsElements): EffectiveReadoutEls {
  return {
    attackerSpeed: els.attackerSpeed,
    targetSpeed: els.targetSpeed,
    tracking: els.tracking,
    optimal: els.optimal,
    falloff: els.falloff,
    attackerSpeedReadout: els.attackerSpeedReadout,
    targetSpeedReadout: els.targetSpeedReadout,
    trackingReadout: els.trackingReadout,
    optimalReadout: els.optimalReadout,
    falloffReadout: els.falloffReadout,
  };
}

function collectPreferencesEls(els: ControlsElements): PreferencesEls {
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

function collectProfileEls(els: ControlsElements): ProfileEls {
  return {
    profileSave: els.profileSave,
    profileSelectTrigger: els.profileSelectTrigger,
    profileSelectLabel: els.profileSelectLabel,
    profilePopup: els.profilePopup,
    profileDelete: els.profileDelete,
    profileNew: els.profileNew,
    newProfilePopup: els.newProfilePopup,
    newProfileName: els.newProfileName,
    newProfileConfirm: els.newProfileConfirm,
    newProfileCancel: els.newProfileCancel,
    shareStatus: els.shareStatus,
  };
}
