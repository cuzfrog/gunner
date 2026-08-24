import { asClass, asFunction, type AwilixContainer } from "awilix";
import { SIG_RESOLUTIONS } from "../../sim";
import type { PresetFittings } from "../../fitting";
import type { SavedFittings } from "../../appstate";
import type { ControlsCradle } from "./cradle";
import { ConfirmControllerImpl } from "./confirmController";
import { combatantSidesOf, forEachSide, wireCombatantSide } from "./combatantSide";
import { profileSettingsOf } from "./controlsFormat";
import { createControlsEls } from "./elements";
import { collectEffectiveReadoutEls, collectPreferencesEls, collectProfileEls, collectReadoutEls } from "./elementCollectors";
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
import { registerSidePanelModule, type Side } from "./sidePanel";
import { registerTurretModule } from "./turret";
import { registerEwarModule } from "./ewar";
import { registerBoosterModule } from "./booster";
import { registerRangeOverlayModule } from "./rangeOverlay";

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
    confirmController: asFunction(({ els, popupGroup, i18n }: ControlsCradle) => {
      const confirmEls = {
        confirmPopup: els.confirmPopup,
        confirmMessage: els.confirmMessage,
        confirmOk: els.confirmOk,
        confirmCancel: els.confirmCancel,
      };
      return new ConfirmControllerImpl({ popupGroup, i18n, els: confirmEls });
    }).singleton(),
    profileChangeTracker: asFunction(({ profileEquality }: ControlsCradle) =>
      new ProfileChangeTrackerImpl({ equality: profileEquality })
    ).singleton(),
    profileController: asFunction(({
      els, settingsStore, timer, i18n, uiEvents, confirmController, popupGroup, profileChangeTracker,
    }: ControlsCradle) => new ProfileControllerImpl({
      els: collectProfileEls(els),
      settingsStore,
      timer,
      i18n,
      events: uiEvents,
      confirmController,
      popupGroup,
      changeTracker: profileChangeTracker,
    })).singleton(),
    controls: asFunction((proxy: ControlsCradle) => new DomControls({
      hitChance: proxy.hitChance,
      i18n: proxy.i18n,
      settingsStore: proxy.settingsStore,
      ships: proxy.ships,
      fittingImport: proxy.fittingImport,
      gunFamilies: proxy.gunFamilies,
      presetFittings: proxy.presetFittings,
      savedFittings: proxy.savedFittings,
      clipboard: proxy.clipboard,
      timer: proxy.timer,
      chargeCatalog: proxy.chargeCatalog,
      imageCatalog: proxy.imageCatalog,
      events: proxy.uiEvents,
      els: proxy.els,
      popupGroup: proxy.popupGroup,
      hintRotator: proxy.hintRotator,
      hullDatalist: proxy.hullDatalist,
      preferencesController: proxy.preferencesController,
      profileController: proxy.profileController,
      engagementReadout: proxy.engagementReadout,
      effectiveReadout: proxy.effectiveReadout,
      sigResChoice: proxy.sigResChoice,
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
      attackerFittingPopup: proxy.attackerFittingPopup,
      targetFittingPopup: proxy.targetFittingPopup,
      eventRouter: proxy.eventRouter,
    })).singleton(),
  });
  wire(cradle);
}

function wire<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  const sides = combatantSidesOf(c.attackerSide, c.targetSide);
  const fittingPopups = { attacker: c.attackerFittingPopup, target: c.targetFittingPopup } as const;
  const host = { persistConfigChange: (notify = true) => c.controls.persistConfigChange(notify) };
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
  c.importController.setOnConfigPersisted(() => c.controls.persistConfigChange(true));
  c.importController.setOnFittingImported((side, imported) => {
    c.ewarController.setLoadout(side, imported.ewar);
    c.boosterController.setLoadout(side, imported.boosts);
  });
  c.importController.setOnProfileTextLoaded((settings) => c.controls.onProfileTextLoaded(settings));
  c.profileController.setOnProfileLoaded((name) => c.controls.onProfileLoaded(name));
  c.profileController.setOnNewProfile(() => c.controls.onNewProfile());
  c.profileController.setSnapshotSource(() => profileSettingsOf(c.sessionCodec.capture()));
  c.sessionCodec.setSessionControl(c.controls);
  c.eventRouter.setHost(c.controls);
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
