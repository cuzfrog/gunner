import { asClass, asFunction, asValue, type AwilixContainer } from "awilix";
import type { PresetFittings } from "../../fitting";
import type { SavedFittings } from "../../appstate";
import type { ShipId } from "../../gamedata/ids";
import type { ControlsCradle } from "./cradle";
import { combatantSidesOf, forEachSide, wireCombatantSide } from "./combatantSide";
import { createControlsEls } from "./elements";
import { registerConfirmModule } from "./confirm";
import { registerDomControlsModule } from "./domControls";
import { registerEffectiveReadoutModule } from "./effectiveReadout";
import { registerEngagementReadoutModule } from "./engagementReadout";
import { registerHintsModule } from "./hints";
import { registerImportModule, type ImportController } from "./import";
import { registerLauncherModule } from "./launcher";
import { registerDroneModule } from "./drone";
import { registerPopupModule } from "./popup";
import { registerPreferencesModule } from "./preferences";
import { registerProfileModule } from "./profile";
import { registerSessionModule } from "./session";
import { registerShareModule } from "./share";
import type { Side } from "./side";
import { registerSidePanelModule } from "./sidePanel";
import { registerTurretModule } from "./turret";
import { registerSelectionSessionModule } from "../selectionSession";
import { registerEwarModule } from "./ewar";
import { registerDefenseModule } from "./defense";
import { registerBoosterModule } from "./booster";
import { registerMissileBoosterModule } from "./missileBooster";
import { registerRangeOverlayModule } from "./rangeOverlay";
import { registerPortraitsModule } from "./portraits";
import { registerHoverHintModule } from "./hoverHint";
import { registerDpsHintModule, wireDpsHintProvider } from "./dpsHint";
import { registerAmmoHintModule, wireAmmoHintProvider } from "./ammoHint";
import { registerAppliedDpsHintModule, wireAppliedDpsHintProvider } from "./appliedDpsHint";
import { registerActualDpsHintModule, wireActualDpsHintProvider } from "./actualDpsHint";
import { registerLockStateHintModule, wireLockStateHintProvider } from "./lockStateHint";

export function registerControlsModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  if (!cradle.hasRegistration("now")) {
    cradle.register({ now: asValue(() => Date.now()) });
  }
  cradle.register({
    els: asFunction(createControlsEls).singleton(),
  });
  registerHintsModule(cradle);
  registerSelectionSessionModule(cradle);
  registerTurretModule(cradle);
  registerLauncherModule(cradle);
  registerDroneModule(cradle);
  registerSidePanelModule(cradle);
  registerEwarModule(cradle);
  registerDefenseModule(cradle);
  registerBoosterModule(cradle);
  registerMissileBoosterModule(cradle);
  registerRangeOverlayModule(cradle);
  registerPortraitsModule(cradle);
  registerHoverHintModule(cradle);
  registerDpsHintModule(cradle);
  registerAmmoHintModule(cradle);
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
  registerAppliedDpsHintModule(cradle);
  registerActualDpsHintModule(cradle);
  registerLockStateHintModule(cradle);
  wire(cradle);
}

function wire<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  wireDpsHintProvider(cradle);
  wireAmmoHintProvider(cradle);
  wireAppliedDpsHintProvider(cradle);
  wireActualDpsHintProvider(cradle);
  wireLockStateHintProvider(cradle);
  const sides = combatantSidesOf(c.shipASide, c.shipBSide);
  const fittingPopups = { shipA: c.shipAFittingPopup, shipB: c.shipBFittingPopup } as const;
  const host = {
    persistConfigChange: (notify = true) => c.controls.persistConfigChange(notify),
    onConfigChange: () => c.controls.onConfigChange(),
    onDisplayChange: () => c.controls.onDisplayChange(),
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
    autoLoadFittingTextFor: (hullId: ShipId) => savedFittings.mostRecentFor(hullId)?.text ?? firstPresetText(presetFittings, hullId),
    importEftFitting: (text: string, options?: { readonly persist?: boolean; readonly showImportedHint?: boolean }) => importer.importEftFitting(side, text, options),
    importFromText: (text: string) => importer.importFromText(side, text),
    importFromClipboard: () => importer.importFromClipboard(side),
  };
}

function firstPresetText(presetFittings: PresetFittings, hullId: ShipId): string | undefined {
  const fit = presetFittings.fittingsFor(hullId)[0];
  return fit ? presetFittings.eftText(hullId, fit) : undefined;
}
