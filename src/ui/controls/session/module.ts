import { asFunction, type AwilixContainer } from "awilix";
import type { ChargeCatalog, PresetFittings } from "../../../fitting";
import type { HitChance } from "../../../sim";
import type { I18n } from "../../i18n";
import type { SettingsStore } from "../../../appstate";
import type { ChoiceGroup } from "../choiceGroup";
import type { Els } from "../elementsContract";
import type { PreferencesController } from "../preferencesController";
import type { ProfileController } from "../profileController";
import type { HintRotator } from "../hints";
import type { FittingPopupController, FittingPreviewManager, Popup, PopupGroup } from "../popup";
import type { SidePanel } from "../sidePanel";
import type { TurretController } from "../turret";
import type { TrackingInput } from "../trackingInput";
import type { ImportController } from "../import";
import type { UiEvents } from "../../events";
import { EventRouter } from "./eventRouter";
import type { EventRouterHost } from "./eventRouter";
import { HullDatalistImpl } from "./hullDatalist";
import type { HullDatalist } from "./hullDatalist";
import { SessionCodecImpl } from "./sessionCodec";
import type { SessionCodec } from "./sessionCodec";
import type { SessionControl } from "./sessionControl";

interface SessionCodecDeps {
  els: Els; attackerSide: SidePanel; targetSide: SidePanel; turret: TurretController;
  preferences: PreferencesController; profileController: ProfileController; i18n: I18n;
  chargeCatalog: ChargeCatalog; sigResChoice: ChoiceGroup; hintRotator: HintRotator;
  settingsStore: SettingsStore; hitChance: HitChance; sessionControl: SessionControl; trackingInput: TrackingInput;
}

interface EventRouterDeps {
  els: Els; preferences: PreferencesController; profile: ProfileController;
  attackerSide: SidePanel; targetSide: SidePanel; turret: TurretController; trackingInput: TrackingInput; popupGroup: PopupGroup;
  previewManager: FittingPreviewManager; attackerAmmoPopup: Popup;
  attackerFittingPopup: FittingPopupController; targetFittingPopup: FittingPopupController; host: EventRouterHost;
  import: ImportController;
}

export function registerSessionModule(cradle: AwilixContainer<object>): void {
  cradle.register({
    createHullDatalist: asFunction(() => (els: Els, presetFittings: PresetFittings, events: UiEvents): HullDatalist => new HullDatalistImpl(els, presetFittings, events)),
    createSessionCodec: asFunction(() => (deps: SessionCodecDeps): SessionCodec => new SessionCodecImpl(deps)),
    createEventRouter: asFunction(() => (deps: EventRouterDeps): EventRouter => new EventRouter(deps)),
  });
}
