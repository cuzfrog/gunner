import { asClass, asFunction, asValue, type AwilixContainer } from "awilix";
import type { PresetFittings } from "../../fitting";
import type { SavedFittings } from "../../appstate";
import type { ControlsCradle } from "./cradle";
import { combatantSidesOf, forEachSide, wireCombatantSide } from "./combatantSide";
import { createControlsEls } from "./elements";
import { ChoiceGroupImpl } from "./choiceGroup";
import { TrackingInputImpl } from "./trackingInput";
import { registerConfirmModule } from "./confirm";
import { registerDomControlsModule } from "./domControls";
import { registerEffectiveReadoutModule } from "./effectiveReadout";
import { registerEngagementReadoutModule } from "./engagementReadout";
import { registerHintsModule } from "./hints";
import { registerImportModule, type ImportController } from "./import";
import { registerPopupModule } from "./popup";
import { registerPreferencesModule } from "./preferences";
import { registerProfileModule } from "./profile";
import { registerSessionModule } from "./session";
import { registerShareModule } from "./share";
import type { Side } from "./side";
import { registerSidePanelModule } from "./sidePanel";
import { registerTurretModule } from "./turret";
import { registerEwarModule } from "./ewar";
import { registerBoosterModule } from "./booster";
import { registerRangeOverlayModule } from "./rangeOverlay";
import { registerPortraitsModule } from "./portraits";

export function registerControlsModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  if (!cradle.hasRegistration("now")) {
    cradle.register({ now: asValue(() => Date.now()) });
  }
  cradle.register({
    els: asFunction(createControlsEls).singleton(),
    trackingInput: asClass(TrackingInputImpl).singleton(),
    sigResChoice: asFunction(({ els }: ControlsCradle) => new ChoiceGroupImpl(els.sigResOptions, els.sigRes, ["S", "M", "L", "XL"])).singleton(),
  });
  registerHintsModule(cradle);
  registerTurretModule(cradle);
  registerSidePanelModule(cradle);
  registerEwarModule(cradle);
  registerBoosterModule(cradle);
  registerRangeOverlayModule(cradle);
  registerPortraitsModule(cradle);
  registerPopupModule(cradle);
  registerImportModule(cradle);
  registerShareModule(cradle);
  registerConfirmModule(cradle);
  registerEngagementReadoutModule(cradle);
  registerEffectiveReadoutModule(cradle);
  registerPreferencesModule(cradle);
  registerProfileModule(cradle);
  registerSessionModule(cradle);
  registerDomControlsModule(cradle);
  wire(cradle);
}

function wire<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  const sides = combatantSidesOf(c.shipASide, c.shipBSide);
  const fittingPopups = { shipA: c.shipAFittingPopup, shipB: c.shipBFittingPopup } as const;
  const host = {
    persistConfigChange: (notify = true) => c.controls.persistConfigChange(notify),
    onConfigChange: () => c.controls.onConfigChange(),
    onDisplayChange: () => c.controls.onDisplayChange(),
    setManeuverAggressivityEnabled: (enabled: boolean) => c.preferencesController.setManeuverAggressivityEnabled(enabled),
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
  c.controls.wireControls();
  c.sessionCodec.restoreStartup(c.settingsStore.loadStartupState());
  forEachSide(sides, (combatant) => combatant.panel.sections.stats.updateAlignTime());
}

function sideImporterFor(side: Side, importer: ImportController, savedFittings: SavedFittings, presetFittings: PresetFittings) {
  return {
    autoLoadFittingTextFor: (hullName: string) => savedFittings.mostRecentFor(hullName)?.text ?? firstPresetText(presetFittings, hullName),
    importEftFitting: (text: string, options?: { readonly persist?: boolean; readonly showImportedHint?: boolean }) => importer.importEftFitting(side, text, options),
    importFromText: (text: string) => importer.importFromText(side, text),
    importFromClipboard: () => importer.importFromClipboard(side),
  };
}

function firstPresetText(presetFittings: PresetFittings, hull: string): string | undefined {
  const fit = presetFittings.fittingsFor(hull)[0];
  return fit ? presetFittings.eftText(hull, fit) : undefined;
}
