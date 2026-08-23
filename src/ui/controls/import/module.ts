import { asFunction, type AwilixContainer } from "awilix";
import type { FittingImport } from "../../../fitting";
import type { ClipboardProvider, SavedFittings, UserSettings } from "../../../appstate";
import type { PopupGroup } from "../popup";
import type { PreferencesController } from "../preferencesController";
import type { ProfileController } from "../profileController";
import type { Side, SidePanel } from "../sidePanel";
import type { AttackerTurret } from "./attackerTurret";
import { ImportControllerImpl } from "./importController";
import type { ImportController, ImportEls } from "./importControllerContract";

interface ImportControllerDeps {
  readonly clipboard: ClipboardProvider;
  readonly fittingImport: FittingImport;
  readonly savedFittings: SavedFittings;
  readonly popupGroup: PopupGroup;
  readonly els: ImportEls;
  readonly attackerSide: SidePanel;
  readonly targetSide: SidePanel;
  readonly turret: AttackerTurret;
  readonly preferences: PreferencesController;
  readonly profileController: ProfileController;
  readonly getSettings: () => UserSettings;
  readonly onConfigPersisted: () => void;
  readonly onProfileTextLoaded: (settings: UserSettings) => void;
}

interface ImportCradle {
  readonly createImportController: (deps: ImportControllerDeps) => ImportController;
}

export function registerImportModule<T extends ImportCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    createImportController: asFunction(() => (deps: ImportControllerDeps): ImportController => new ImportControllerImpl(deps)),
  });
}
