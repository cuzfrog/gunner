import type { ClipboardProvider, SavedFittings, SettingsStore, UserSettings } from "../../appstate";
import type { ChargeCatalog, FittingImport, GunFamilies, ImportedFitting, PresetFittings } from "../../fitting";
import type { HitChance } from "../../sim";
import type { Ships } from "../../ships";
import type { I18n } from "../i18n";
import type { ImageCatalog, Timer, Controls } from "..";
import type { UiEvents } from "../events";
import type { ChoiceGroup } from "./choiceGroup";
import type { Els } from "./elementsContract";
import type { EngagementReadout, ReadoutEls } from "./engagementReadout";
import type { HintRotator } from "./hints";
import type { TrackingInput } from "./trackingInput";
import type { Popup, PopupGroup, FittingPreview, FittingPreviewManager, FittingPopupController, FittingPopupEls } from "./popup";
import type { Side, SidePanel, SidePanelDeps, SidePanelElements } from "./sidePanel";
import type { TurretController, TurretControllerDeps, TurretOverrides } from "./turret";
import type { ImportController, ImportEls } from "./import";
import type { EventRouter, EventRouterHost, HullDatalist, SessionCodec, SessionControl } from "./session";
import type { PreferencesController, PreferencesEls } from "./preferencesController";
import type { ProfileController, ProfileEls } from "./profileController";
import type { DomControlsDeps } from "./domControlsContract";
import type { DomControlsFactory } from "./domControlsFactory";

interface HintRotatorDeps {
  readonly element: HTMLElement;
  readonly i18n: I18n;
  readonly timer: Timer;
  readonly intervalMs?: number;
  readonly events: UiEvents;
}

interface FittingPreviewDeps {
  readonly container: HTMLElement;
  readonly i18n: I18n;
  readonly imageCatalog: ImageCatalog;
  readonly viewport: () => { readonly innerWidth: number; readonly innerHeight: number };
}

interface FittingPreviewManagerDeps {
  readonly fittingImport: FittingImport;
  readonly imageCatalog: ImageCatalog;
  readonly i18n: I18n;
  readonly attackerSide: SidePanel;
  readonly targetSide: SidePanel;
  readonly previewsBySide: Readonly<Record<Side, FittingPreview>>;
  readonly shipImageBySide: Readonly<Record<Side, HTMLImageElement>>;
  readonly eyeBySide: Readonly<Record<Side, HTMLButtonElement>>;
  readonly events: UiEvents;
}

interface FittingPopupControllerDeps {
  readonly side: Side;
  readonly popupGroup: PopupGroup;
  readonly savedFittings: SavedFittings;
  readonly presetFittings: PresetFittings;
  readonly fittingImport: FittingImport;
  readonly imageCatalog: ImageCatalog;
  readonly i18n: I18n;
  readonly els: FittingPopupEls;
  readonly panel: SidePanel;
  readonly applyFitting: (text: string) => ImportedFitting | undefined;
  readonly previews: FittingPreviewManager;
  readonly events: UiEvents;
}

interface SessionCodecDeps {
  readonly els: Els;
  readonly attackerSide: SidePanel;
  readonly targetSide: SidePanel;
  readonly turret: TurretController;
  readonly turretOverrides: TurretOverrides;
  readonly preferences: PreferencesController;
  readonly profileController: ProfileController;
  readonly i18n: I18n;
  readonly chargeCatalog: ChargeCatalog;
  readonly sigResChoice: ChoiceGroup;
  readonly hintRotator: HintRotator;
  readonly settingsStore: SettingsStore;
  readonly hitChance: HitChance;
  readonly sessionControl: SessionControl;
  readonly trackingInput: TrackingInput;
}

interface EventRouterDeps {
  readonly els: Els;
  readonly preferences: PreferencesController;
  readonly profile: ProfileController;
  readonly attackerSide: SidePanel;
  readonly targetSide: SidePanel;
  readonly turret: TurretController;
  readonly trackingInput: TrackingInput;
  readonly popupGroup: PopupGroup;
  readonly previewManager: FittingPreviewManager;
  readonly attackerFittingPopup: FittingPopupController;
  readonly targetFittingPopup: FittingPopupController;
  readonly host: EventRouterHost;
  readonly import: ImportController;
}

interface ImportTurret {
  applyImported(imported: ImportedFitting): void;
  ammo(): string;
}

interface ImportControllerDeps {
  readonly clipboard: ClipboardProvider;
  readonly fittingImport: FittingImport;
  readonly savedFittings: SavedFittings;
  readonly popupGroup: PopupGroup;
  readonly els: ImportEls;
  readonly attackerSide: SidePanel;
  readonly targetSide: SidePanel;
  readonly turret: ImportTurret;
  readonly preferences: PreferencesController;
  readonly profileController: ProfileController;
  readonly getSettings: () => UserSettings;
  readonly onConfigPersisted: () => void;
  readonly onProfileTextLoaded: (settings: UserSettings) => void;
}

interface PreferencesControllerDeps {
  readonly els: PreferencesEls;
  readonly i18n: I18n;
  readonly settingsStore: SettingsStore;
  readonly trackingInput: TrackingInput;
  readonly sigResolution: () => number;
  readonly events: UiEvents;
}

interface ProfileControllerDeps {
  readonly els: ProfileEls;
  readonly settingsStore: SettingsStore;
  readonly timer: Timer;
  readonly i18n: I18n;
  readonly onLoaded: (name: string) => void;
  readonly events: UiEvents;
}

type TurretControllerFactoryDeps = Omit<TurretControllerDeps, "resolver">;

export interface ControlsCradle {
  // External dependencies resolved by controls
  readonly hitChance: HitChance;
  readonly i18n: I18n;
  readonly settingsStore: SettingsStore;
  readonly ships: Ships;
  readonly fittingImport: FittingImport;
  readonly gunFamilies: GunFamilies;
  readonly presetFittings: PresetFittings;
  readonly savedFittings: SavedFittings;
  readonly clipboard: ClipboardProvider;
  readonly timer: Timer;
  readonly chargeCatalog: ChargeCatalog;
  readonly imageCatalog: ImageCatalog;
  readonly uiEvents: UiEvents;

  // Value leaves registered by controls
  readonly els: Els;
  readonly hintElement: HTMLElement;
  readonly trackingInput: TrackingInput;
  readonly turretOverrides: TurretOverrides;
  readonly popupGroup: PopupGroup;

  // Factories registered by controls and its submodules
  readonly createChoiceGroup: (group: HTMLElement, select: HTMLSelectElement, values: readonly string[]) => ChoiceGroup;
  readonly createEngagementReadout: (readoutEls: ReadoutEls) => EngagementReadout;
  readonly createPreferencesController: (deps: PreferencesControllerDeps) => PreferencesController;
  readonly createProfileController: (deps: ProfileControllerDeps) => ProfileController;
  readonly createHintRotator: (deps: HintRotatorDeps) => HintRotator;
  readonly createTurretController: (deps: TurretControllerFactoryDeps) => TurretController;
  readonly createSidePanelEls: (els: Els, side: Side) => SidePanelElements;
  readonly createSidePanel: (deps: SidePanelDeps) => SidePanel;
  readonly createFittingPreview: (deps: FittingPreviewDeps) => FittingPreview;
  readonly createFittingPreviewManager: (deps: FittingPreviewManagerDeps) => FittingPreviewManager;
  readonly createFittingPopupController: (deps: FittingPopupControllerDeps) => FittingPopupController;
  readonly createHullDatalist: (els: Els, presetFittings: PresetFittings, events: UiEvents) => HullDatalist;
  readonly createSessionCodec: (deps: SessionCodecDeps) => SessionCodec;
  readonly createEventRouter: (deps: EventRouterDeps) => EventRouter;
  readonly createImportController: (deps: ImportControllerDeps) => ImportController;

  // Composite values registered by controls
  readonly domControlsDeps: DomControlsDeps;
  readonly domControlsFactory: DomControlsFactory;
  readonly controls: Controls;
}
