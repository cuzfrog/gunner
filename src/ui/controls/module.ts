import { asClass, asFunction, asValue, type AwilixContainer } from "awilix";
import type { HitChance, SigResolutionClass } from "../../sim";
import type { ChargeCatalog, FittingImport, GunFamilies, PresetFittings } from "../../fitting";
import type { Ships } from "../../ships";
import type { ClipboardProvider, SavedFittings, SettingsStore, ProfileSettings } from "../../appstate";
import type { I18n } from "../i18n";
import type { ImageCatalog } from "../icons";
import type { Timer } from "../timer";
import type { UiEvents } from "../events";
import { ChoiceGroupImpl } from "./choiceGroup";
import type { ChoiceGroup } from "./choiceGroup";
import { createControlsEls } from "./elements";
import type { Els } from "./elementsContract";
import { el } from "./controlsDom";
import { DomControls } from "./domControls";
import type { DomControlsDeps } from "./domControlsContract";
import { DomControlsFactory } from "./domControlsFactory";
import { EngagementReadoutImpl } from "./engagementReadout";
import type { EngagementReadout, ReadoutEls } from "./engagementReadout";
import { PreferencesControllerImpl } from "./preferencesController";
import type { PreferencesController, PreferencesEls } from "./preferencesController";
import { ProfileControllerImpl } from "./profileController";
import type { ProfileController, ProfileEls } from "./profileController";
import { TrackingInputImpl, type TrackingInput } from "./trackingInput";
import { registerHintsModule } from "./hints";
import { registerImportModule } from "./import";
import { registerPopupModule } from "./popup";
import { registerSessionModule } from "./session";
import { registerSidePanelModule } from "./sidePanel";
import { registerTurretModule } from "./turret";

interface PreferencesControllerDeps {
  els: PreferencesEls; i18n: I18n; settingsStore: SettingsStore;
  trackingInput: TrackingInput; sigResolution: () => number; events: UiEvents;
}

interface ProfileControllerDeps {
  els: ProfileEls; settingsStore: SettingsStore; timer: Timer; i18n: I18n;
  captureCurrent: () => ProfileSettings; onLoaded: (name: string) => void; events: UiEvents;
}

export function registerControlsModule(cradle: AwilixContainer<object>): void {
  registerHintsModule(cradle);
  registerImportModule(cradle);
  registerPopupModule(cradle);
  registerSessionModule(cradle);
  registerSidePanelModule(cradle);
  registerTurretModule(cradle);
  cradle.register({
    els: asFunction(createControlsEls).singleton(),
    hintElement: asFunction(() => el("slide-hints")).singleton(),
    trackingInput: asClass(TrackingInputImpl).singleton(),
    domControlsDeps: asFunction(({
      hitChance, i18n, settingsStore, ships, fittingImport, gunFamilies,
      presetFittings, savedFittings, clipboard, timer, chargeCatalog, imageCatalog, uiEvents,
    }): DomControlsDeps => ({
      hitChance, i18n, settingsStore, ships, fittingImport, gunFamilies,
      presetFittings, savedFittings, clipboard, timer, chargeCatalog, imageCatalog, events: uiEvents,
    })).singleton(),
    createChoiceGroup: asFunction(() => (group: HTMLElement, select: HTMLSelectElement, values: readonly string[]): ChoiceGroup => new ChoiceGroupImpl(group, select, values)),
    createEngagementReadout: asFunction(() => (readoutEls: ReadoutEls): EngagementReadout => new EngagementReadoutImpl(readoutEls)),
    createPreferencesController: asFunction(() => (deps: PreferencesControllerDeps): PreferencesController => new PreferencesControllerImpl(deps)),
    createProfileController: asFunction(() => (deps: ProfileControllerDeps): ProfileController => new ProfileControllerImpl(deps)),
    domControlsFactory: asValue(new DomControlsFactory(cradle)),
    controls: asClass(DomControls).singleton(),
  });
}
