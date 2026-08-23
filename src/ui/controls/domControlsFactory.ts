import type { AwilixContainer } from "awilix";
import { SIG_RESOLUTIONS, type HitChance } from "../../sim";
import type { ChargeCatalog, FittingImport, GunFamilies, ImportedFitting, PresetFittings } from "../../fitting";
import type { ClipboardProvider, ProfileSettings, SavedFittings, SettingsStore, UserSettings } from "../../appstate";
import type { I18n } from "../i18n";
import type { ImageCatalog } from "../icons";
import type { ShipProfile, Ships } from "../../ships";
import type { Timer } from "../timer";
import type { UiEvents } from "../events";
import {
  collectFittingPopupEls,
  collectImportEls,
  collectPreferencesEls,
  collectProfileEls,
  collectTurretEls,
} from "./elements";
import type { Els } from "./elementsContract";
import { el } from "./controlsDom";
import { profileSettingsOf } from "./controlsFormat";
import type { ChoiceGroup } from "./choiceGroup";
import type { EngagementReadout, ReadoutEls } from "./engagementReadout";
import type { HintRotator } from "./hints";
import type { ImportController, ImportEls } from "./import";
import type { FittingPopupController, FittingPopupEls, FittingPreview, FittingPreviewManager, Popup, PopupGroup } from "./popup";
import type { PreferencesController, PreferencesEls } from "./preferencesController";
import type { ProfileController, ProfileEls } from "./profileController";
import type { EventRouter, EventRouterHost, HullDatalist, SessionCodec } from "./session";
import type { Side, SidePanel, SidePanelDeps, SidePanelElements, SidePanelHost } from "./sidePanel";
import { SidePanelHostBuilder } from "./sidePanelHostBuilder";
import type { TrackingInput } from "./trackingInput";
import type { TurretController, TurretControllerDeps, TurretEls } from "./turret";
import type { DomControlsDeps, DomControlsHost, DomControlsParts } from "./domControlsContract";

type CreateChoiceGroup = (group: HTMLElement, select: HTMLSelectElement, values: readonly string[]) => ChoiceGroup;
type CreateEngagementReadout = (readoutEls: ReadoutEls) => EngagementReadout;
type CreateHintRotator = (deps: {
  element: HTMLElement; i18n: I18n; timer: Timer; events: UiEvents; intervalMs?: number;
}) => HintRotator;
type CreateHullDatalist = (els: Els, presetFittings: PresetFittings, events: UiEvents) => HullDatalist;
type CreatePreferencesController = (deps: {
  els: PreferencesEls; i18n: I18n; settingsStore: SettingsStore;
  trackingInput: TrackingInput; sigResolution: () => number; events: UiEvents;
}) => PreferencesController;
type CreateProfileController = (deps: {
  els: ProfileEls; settingsStore: SettingsStore; timer: Timer; i18n: I18n;
  captureCurrent: () => ProfileSettings; onLoaded: (name: string) => void; events: UiEvents;
}) => ProfileController;
type CreateFittingPreview = (deps: {
  container: HTMLElement; i18n: I18n; imageCatalog: ImageCatalog;
  viewport: () => { readonly innerWidth: number; readonly innerHeight: number };
}) => FittingPreview;
type CreateFittingPreviewManager = (deps: {
  fittingImport: FittingImport; imageCatalog: ImageCatalog; i18n: I18n;
  previewsBySide: Readonly<Record<Side, FittingPreview>>;
  shipImageBySide: Readonly<Record<Side, HTMLImageElement>>;
  eyeBySide: Readonly<Record<Side, HTMLButtonElement>>;
  profileOf: (side: Side) => ShipProfile | undefined;
  fittingTextOf: (side: Side) => string | undefined;
  events: UiEvents;
}) => FittingPreviewManager;
type CreateFittingPopupController = (deps: {
  side: Side; popupGroup: PopupGroup; savedFittings: SavedFittings; presetFittings: PresetFittings;
  fittingImport: FittingImport; imageCatalog: ImageCatalog; i18n: I18n; els: FittingPopupEls;
  panelFor: (side: Side) => SidePanel; applyFitting: (text: string) => ImportedFitting | undefined;
  previews: FittingPreviewManager; events: UiEvents;
}) => FittingPopupController;
type CreateImportController = (deps: {
  clipboard: ClipboardProvider; fittingImport: FittingImport; savedFittings: SavedFittings; popupGroup: PopupGroup;
  els: ImportEls; sidePanel: (side: Side) => SidePanel; turret: TurretController;
  preferences: PreferencesController; profileController: ProfileController; getSettings: () => UserSettings;
  onConfigPersisted: () => void; onProfileTextLoaded: (settings: UserSettings) => void;
}) => ImportController;
type CreateSessionCodec = (deps: {
  els: Els; attackerSide: SidePanel; targetSide: SidePanel; turret: TurretController;
  preferences: PreferencesController; profileController: ProfileController; i18n: I18n;
  chargeCatalog: ChargeCatalog; sigResChoice: ChoiceGroup; hintRotator: HintRotator;
  settingsStore: SettingsStore; hitChance: HitChance; sessionControl: DomControlsHost; trackingInput: TrackingInput;
}) => SessionCodec;
type CreateEventRouter = (deps: {
  els: Els; preferences: PreferencesController; profile: ProfileController; import: ImportController;
  attackerSide: SidePanel; targetSide: SidePanel; turret: TurretController; trackingInput: TrackingInput; popupGroup: PopupGroup;
  previewManager: FittingPreviewManager; attackerAmmoPopup: Popup;
  attackerFittingPopup: FittingPopupController; targetFittingPopup: FittingPopupController; host: EventRouterHost;
}) => EventRouter;
type CreateTurretController = (deps: Omit<TurretControllerDeps, "resolver">) => TurretController;
type CreateSidePanel = (deps: SidePanelDeps) => SidePanel;
type CreateSidePanelEls = (els: Els, side: Side) => SidePanelElements;

export class DomControlsFactory {
  private readonly cradle: AwilixContainer<object>;

  constructor(cradle: AwilixContainer<object>) {
    this.cradle = cradle;
  }

  buildParts(deps: DomControlsDeps, host: DomControlsHost): DomControlsParts {
    const els = this.cradle.resolve<Els>("els");
    const popupGroup = this.cradle.resolve<PopupGroup>("popupGroup");
    const hintRotator = this.cradle.resolve<CreateHintRotator>("createHintRotator")({
      element: this.cradle.resolve<HTMLElement>("hintElement"),
      i18n: deps.i18n,
      timer: deps.timer,
      events: deps.events,
    });
    const hullDatalist = this.cradle.resolve<CreateHullDatalist>("createHullDatalist")(els, deps.presetFittings, deps.events);
    const engagementReadout = this.cradle.resolve<CreateEngagementReadout>("createEngagementReadout")(this.readoutEls());
    const sigResChoice = this.cradle.resolve<CreateChoiceGroup>("createChoiceGroup")(els.sigResOptions, els.sigRes, ["S", "M", "L", "XL"]);
    let turretController!: TurretController;
    let importController!: ImportController;
    let attackerSide!: SidePanel;
    let targetSide!: SidePanel;
    let sessionCodec!: SessionCodec;
    const attackerAmmoPopup: Popup = {
      isOpen: () => turretController.isAmmoPopupOpen(),
      open: () => turretController.openAmmoPopup(),
      close: () => turretController.closeAmmoPopup(),
      focusTrigger: () => els.attackerAmmoTrigger.focus(),
      contains: (target) => target instanceof Element && target.closest("#attacker-ammo-field") !== null,
    };
    const attackerPreview = this.cradle.resolve<CreateFittingPreview>("createFittingPreview")({
      container: els.attackerFittingPreview, i18n: deps.i18n, imageCatalog: deps.imageCatalog, viewport: () => window,
    });
    const targetPreview = this.cradle.resolve<CreateFittingPreview>("createFittingPreview")({
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
    attackerSide = this.cradle.resolve<CreateSidePanel>("createSidePanel")(this.sidePanelDeps({
      side: "attacker", host: sidePanelHostBuilder.build("attacker"), popupGroup, els,
      i18n: deps.i18n, ships: deps.ships, fittingImport: deps.fittingImport, imageCatalog: deps.imageCatalog, timer: deps.timer, events: deps.events,
    }));
    targetSide = this.cradle.resolve<CreateSidePanel>("createSidePanel")(this.sidePanelDeps({
      side: "target", host: sidePanelHostBuilder.build("target"), popupGroup, els,
      i18n: deps.i18n, ships: deps.ships, fittingImport: deps.fittingImport, imageCatalog: deps.imageCatalog, timer: deps.timer, events: deps.events,
    }));
    const trackingInput = this.cradle.resolve<TrackingInput>("trackingInput");
    const preferencesController = this.cradle.resolve<CreatePreferencesController>("createPreferencesController")({
      els: this.preferencesEls(els),
      i18n: deps.i18n,
      settingsStore: deps.settingsStore,
      trackingInput,
      sigResolution: () => SIG_RESOLUTIONS[turretController.currentSigResClass()],
      events: deps.events,
    });
    const profileController = this.cradle.resolve<CreateProfileController>("createProfileController")({
      els: this.profileEls(els),
      settingsStore: deps.settingsStore,
      timer: deps.timer,
      i18n: deps.i18n,
      captureCurrent: () => profileSettingsOf(sessionCodec.capture()),
      onLoaded: (name) => host.onProfileLoaded(name),
      events: deps.events,
    });
    turretController = this.cradle.resolve<CreateTurretController>("createTurretController")({
      els: collectTurretEls(els),
      popup: attackerAmmoPopup,
      chargeCatalog: deps.chargeCatalog,
      gunFamilies: deps.gunFamilies,
      imageCatalog: deps.imageCatalog,
      trackingInput,
      i18n: deps.i18n,
      fittingImport: deps.fittingImport,
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
      events: deps.events,
    });
    sessionCodec = this.cradle.resolve<CreateSessionCodec>("createSessionCodec")({
      els, attackerSide, targetSide, turret: turretController, preferences: preferencesController,
      profileController, i18n: deps.i18n, chargeCatalog: deps.chargeCatalog, sigResChoice, hintRotator,
      settingsStore: deps.settingsStore, hitChance: deps.hitChance,
      sessionControl: host, trackingInput,
    });
    importController = this.cradle.resolve<CreateImportController>("createImportController")({
      clipboard: deps.clipboard,
      fittingImport: deps.fittingImport,
      savedFittings: deps.savedFittings,
      popupGroup,
      els: collectImportEls(els),
      sidePanel: (side) => (side === "attacker" ? attackerSide : targetSide),
      turret: turretController,
      preferences: preferencesController,
      profileController,
      getSettings: () => host.captureSettings(),
      onConfigPersisted: () => host.persistConfigChange(true),
      onProfileTextLoaded: (settings) => host.onProfileTextLoaded(settings),
    });
    const previewManager = this.cradle.resolve<CreateFittingPreviewManager>("createFittingPreviewManager")({
      fittingImport: deps.fittingImport,
      imageCatalog: deps.imageCatalog,
      i18n: deps.i18n,
      previewsBySide: { attacker: attackerPreview, target: targetPreview } as const,
      shipImageBySide: { attacker: els.attackerShipImage, target: els.targetShipImage } as const,
      eyeBySide: { attacker: els.attackerFittingEye, target: els.targetFittingEye } as const,
      profileOf: (side) => (side === "attacker" ? attackerSide : targetSide).profile,
      fittingTextOf: (side) => (side === "attacker" ? attackerSide : targetSide).fittingText,
      events: deps.events,
    });
    const fittingPopupBase = {
      popupGroup,
      savedFittings: deps.savedFittings,
      presetFittings: deps.presetFittings,
      fittingImport: deps.fittingImport,
      imageCatalog: deps.imageCatalog,
      i18n: deps.i18n,
      panelFor: (side: Side) => (side === "attacker" ? attackerSide : targetSide),
      previews: previewManager,
      events: deps.events,
    };
    const attackerFittingPopup = this.cradle.resolve<CreateFittingPopupController>("createFittingPopupController")({
      side: "attacker",
      ...fittingPopupBase,
      els: collectFittingPopupEls(els, "attacker"),
      applyFitting: (text) => importController.importEftFitting("attacker", text, true),
    });
    const targetFittingPopup = this.cradle.resolve<CreateFittingPopupController>("createFittingPopupController")({
      side: "target",
      ...fittingPopupBase,
      els: collectFittingPopupEls(els, "target"),
      applyFitting: (text) => importController.importEftFitting("target", text, true),
    });
    const eventRouter = this.cradle.resolve<CreateEventRouter>("createEventRouter")({
      els,
      preferences: preferencesController,
      profile: profileController,
      import: importController,
      attackerSide,
      targetSide,
      turret: turretController,
      trackingInput,
      popupGroup,
      previewManager,
      attackerAmmoPopup,
      attackerFittingPopup,
      targetFittingPopup,
      host,
    });
    return {
      deps, els, popupGroup, hintRotator, hullDatalist, preferencesController, profileController,
      engagementReadout, sigResChoice, attackerSide, targetSide, attackerAmmoPopup, turretController,
      sessionCodec, importController, previewManager, attackerFittingPopup, targetFittingPopup,
      eventRouter,
    };
  }

  private readoutEls(): ReadoutEls {
    return {
      resDistance: el("res-distance"),
      resTransversal: el("res-transversal"),
      resAngular: el("res-angular"),
      resRadial: el("res-radial"),
      resTrackPen: el("res-track-pen"),
      resRangePen: el("res-range-pen"),
      resHit: el("res-hit"),
    };
  }

  private preferencesEls(els: Els): PreferencesEls {
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

  private profileEls(els: Els): ProfileEls {
    return {
      profileName: els.profileName,
      profileSave: els.profileSave,
      profileSelect: els.profileSelect,
      profileDelete: els.profileDelete,
      shareStatus: els.shareStatus,
    };
  }

  private sidePanelDeps(base: {
    side: Side; host: SidePanelHost; popupGroup: PopupGroup; els: Els; i18n: I18n; ships: Ships;
    fittingImport: FittingImport; imageCatalog: ImageCatalog; timer: Timer; events: UiEvents;
  }): SidePanelDeps {
    return {
      ...base,
      els: this.cradle.resolve<CreateSidePanelEls>("createSidePanelEls")(base.els, base.side),
    };
  }
}
