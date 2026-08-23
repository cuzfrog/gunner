import { asClass, asFunction, type AwilixContainer } from "awilix";
import { SIG_RESOLUTIONS } from "../../sim";
import type { SavedFittings } from "../../appstate";
import type { ControlsCradle } from "./cradle";
import { profileSettingsOf } from "./controlsFormat";
import { createControlsEls } from "./elements";
import { collectPreferencesEls, collectProfileEls, collectReadoutEls } from "./elementCollectors";
import { DomControls } from "./domControls";
import { ChoiceGroupImpl } from "./choiceGroup";
import { EngagementReadoutImpl } from "./engagementReadout";
import { PreferencesControllerImpl } from "./preferencesController";
import { ProfileControllerImpl } from "./profileController";
import { TrackingInputImpl } from "./trackingInput";
import { registerHintsModule } from "./hints";
import { registerImportModule, type ImportController } from "./import";
import { registerPopupModule } from "./popup";
import { registerSessionModule } from "./session";
import { registerShareModule } from "./share";
import { registerSidePanelModule, type Side } from "./sidePanel";
import { registerTurretModule } from "./turret";
import { registerEwarModule } from "./ewar";

export function registerControlsModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  registerHintsModule(cradle);
  registerTurretModule(cradle);
  registerSidePanelModule(cradle);
  registerEwarModule(cradle);
  registerPopupModule(cradle);
  registerImportModule(cradle);
  registerShareModule(cradle);
  registerSessionModule(cradle);
  cradle.register({
    els: asFunction(createControlsEls).singleton(),
    trackingInput: asClass(TrackingInputImpl).singleton(),
    sigResChoice: asFunction(({ els }: ControlsCradle) => new ChoiceGroupImpl(els.sigResOptions, els.sigRes, ["S", "M", "L", "XL"])).singleton(),
    engagementReadout: asFunction(({ els }: ControlsCradle) => new EngagementReadoutImpl(collectReadoutEls(els))).singleton(),
    preferencesController: asFunction(({ els, i18n, settingsStore, trackingInput, turretController, uiEvents }: ControlsCradle) => new PreferencesControllerImpl({
      els: collectPreferencesEls(els),
      i18n,
      settingsStore,
      trackingInput,
      sigResolution: () => SIG_RESOLUTIONS[turretController.currentSigResClass()],
      events: uiEvents,
    })).singleton(),
    profileController: asFunction(({ els, settingsStore, timer, i18n, uiEvents }: ControlsCradle) => new ProfileControllerImpl({
      els: collectProfileEls(els),
      settingsStore,
      timer,
      i18n,
      events: uiEvents,
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
      sigResChoice: proxy.sigResChoice,
      attackerSide: proxy.attackerSide,
      targetSide: proxy.targetSide,
      turretController: proxy.turretController,
      sessionCodec: proxy.sessionCodec,
      importController: proxy.importController,
      ewarController: proxy.ewarController,
      shareController: proxy.shareController,
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
  c.attackerSide.setHost({ persistConfigChange: (notify = true) => c.controls.persistConfigChange(notify) });
  c.targetSide.setHost({ persistConfigChange: (notify = true) => c.controls.persistConfigChange(notify) });
  c.attackerSide.setFittingPopup(c.attackerFittingPopup);
  c.targetSide.setFittingPopup(c.targetFittingPopup);
  c.ewarController.setHost(c.controls);
  c.attackerSide.setFittingPreview(c.previewManager);
  c.targetSide.setFittingPreview(c.previewManager);
  c.attackerSide.setImporter(sideImporterFor("attacker", c.importController, c.savedFittings));
  c.targetSide.setImporter(sideImporterFor("target", c.importController, c.savedFittings));
  c.importController.setOnConfigPersisted(() => c.controls.persistConfigChange(true));
  c.importController.setOnFittingImported((side, imported) => {
    c.ewarController.setLoadout(side, imported.ewar);
    c.attackerSide.sections.skill.setOverloadDisabled(c.ewarController.fittedCount("attacker"));
    c.targetSide.sections.skill.setOverloadDisabled(c.ewarController.fittedCount("target"));
  });
  c.importController.setOnProfileTextLoaded((settings) => c.controls.onProfileTextLoaded(settings));
  c.profileController.setOnProfileLoaded((name) => c.controls.onProfileLoaded(name));
  c.profileController.setSnapshotSource(() => profileSettingsOf(c.sessionCodec.capture()));
  c.sessionCodec.setSessionControl(c.controls);
  c.eventRouter.setHost(c.controls);
  c.controls.wireControls();
  c.sessionCodec.restoreStartup(c.settingsStore.loadStartupState());
  c.attackerSide.sections.stats.updateAlignTime();
  c.targetSide.sections.stats.updateAlignTime();
}

function sideImporterFor(side: Side, importer: ImportController, savedFittings: SavedFittings) {
  return {
    mostRecentFittingFor: (hullName: string) => savedFittings.mostRecentFor(hullName),
    importEftFitting: (text: string, persist: boolean) => importer.importEftFitting(side, text, persist),
    importFromText: (text: string) => importer.importFromText(side, text),
    importFromClipboard: () => importer.importFromClipboard(side),
  };
}
