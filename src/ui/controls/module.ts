import { asClass, asFunction, type AwilixContainer } from "awilix";
import { SIG_RESOLUTIONS } from "../../sim";
import type { SavedFittings } from "../../appstate";
import type { ControlsCradle } from "./cradle";
import { el } from "./controlsDom";
import { profileSettingsOf } from "./controlsFormat";
import { createControlsEls, collectPreferencesEls, collectProfileEls } from "./elements";
import { DomControls } from "./domControls";
import { ChoiceGroupImpl } from "./choiceGroup";
import { EngagementReadoutImpl } from "./engagementReadout";
import type { EngagementReadout } from "./engagementReadout";
import { PreferencesControllerImpl } from "./preferencesController";
import { ProfileControllerImpl } from "./profileController";
import { TrackingInputImpl } from "./trackingInput";
import { registerHintsModule } from "./hints";
import { registerImportModule, type ImportController } from "./import";
import { registerPopupModule } from "./popup";
import { registerSessionModule } from "./session";
import { registerSidePanelModule, type Side } from "./sidePanel";
import { registerTurretModule } from "./turret";

export function registerControlsModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  registerHintsModule(cradle);
  registerTurretModule(cradle);
  registerSidePanelModule(cradle);
  registerPopupModule(cradle);
  registerImportModule(cradle);
  registerSessionModule(cradle);
  cradle.register({
    els: asFunction(createControlsEls).singleton(),
    hintElement: asFunction((): HTMLElement => el("slide-hints")).singleton(),
    trackingInput: asClass(TrackingInputImpl).singleton(),
    sigResChoice: asFunction(({ els }: ControlsCradle) => new ChoiceGroupImpl(els.sigResOptions, els.sigRes, ["S", "M", "L", "XL"])).singleton(),
    engagementReadout: asFunction((): EngagementReadout => new EngagementReadoutImpl({
      resDistance: el("res-distance"),
      resTransversal: el("res-transversal"),
      resAngular: el("res-angular"),
      resRadial: el("res-radial"),
      resTrackPen: el("res-track-pen"),
      resRangePen: el("res-range-pen"),
      resHit: el("res-hit"),
    })).singleton(),
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
  c.attackerSide.setFittingPreview(c.previewManager);
  c.targetSide.setFittingPreview(c.previewManager);
  c.attackerSide.setImporter(sideImporterFor("attacker", c.importController, c.savedFittings));
  c.targetSide.setImporter(sideImporterFor("target", c.importController, c.savedFittings));
  c.importController.setSessionCodec(c.sessionCodec);
  c.importController.setOnConfigPersisted(() => c.controls.persistConfigChange(true));
  c.importController.setOnProfileTextLoaded((settings) => c.controls.onProfileTextLoaded(settings));
  c.profileController.setOnProfileLoaded((name) => c.controls.onProfileLoaded(name));
  c.profileController.setSnapshotSource(() => profileSettingsOf(c.sessionCodec.capture()));
  c.sessionCodec.setSessionControl(c.controls);
  c.eventRouter.setHost(c.controls);
  if (c.controls instanceof DomControls) c.controls.wireControls();
  c.sessionCodec.restoreStartup(c.settingsStore.loadStartupState());
  c.attackerSide.updateAlignTime();
  c.targetSide.updateAlignTime();
}

function sideImporterFor(side: Side, importer: ImportController, savedFittings: SavedFittings) {
  return {
    mostRecentFittingFor: (hullName: string) => savedFittings.mostRecentFor(hullName),
    importEftFitting: (text: string, persist: boolean) => importer.importEftFitting(side, text, persist),
    importFromText: (text: string) => importer.importFromText(side, text),
    importFromClipboard: () => importer.importFromClipboard(side),
  };
}
