import type { SavedFittings } from "../../appstate";
import type { ImportController } from "./import";
import type { PopupGroup } from "./popup";
import type { TurretController } from "./turret";
import type { Side, SidePanel } from "./sidePanel";

export interface SidePanelHostBuilderDeps {
  popupGroup: PopupGroup;
  savedFittings: SavedFittings;
  importController: () => ImportController;
  turretController: () => TurretController;
  attackerSide: () => SidePanel;
  onAttackerFittedHullCleared: () => void;
  persistConfigChange: (notify?: boolean) => void;
}

export class SidePanelHostBuilder {
  private readonly deps: SidePanelHostBuilderDeps;

  constructor(deps: SidePanelHostBuilderDeps) {
    this.deps = deps;
  }

  build(side: Side) {
    return {
      persistConfigChange: (notify = true) => this.deps.persistConfigChange(notify),
      attackerTurretHooks:
        side === "attacker"
          ? {
              onFittedHullCleared: () => this.deps.onAttackerFittedHullCleared(),
              restoreTurret: () =>
                this.deps.turretController().restore(this.deps.attackerSide().fittingText, this.deps.attackerSide().skillConditions()),
            }
          : { onFittedHullCleared: () => {}, restoreTurret: () => {} },
      importer: {
        mostRecentFittingFor: (hullName: string) => this.deps.savedFittings.mostRecentFor(hullName),
        importEftFitting: (text: string, persist: boolean) => this.deps.importController().importEftFitting(side, text, persist),
        importFromText: (text: string) => this.deps.importController().importFromText(side, text),
        importFromClipboard: () => this.deps.importController().importFromClipboard(side),
      },
    };
  }
}
