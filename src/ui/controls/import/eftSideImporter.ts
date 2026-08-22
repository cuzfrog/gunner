import type { FittingImport, ImportedFitting } from "../../../fitting";
import type { FittedHullSummary } from "../../settings";
import type { Side, SidePanel } from "../sidePanel";
import type { AttackerTurret } from "./attackerTurret";

interface EftSideImporterDeps {
  readonly sidePanel: (side: Side) => SidePanel;
  readonly turret: AttackerTurret;
  readonly fittingImport: FittingImport;
  readonly onConfigPersisted: () => void;
}

export class EftSideImporter {
  private readonly sidePanel: (side: Side) => SidePanel;
  private readonly turret: AttackerTurret;
  private readonly fittingImport: FittingImport;
  private readonly onConfigPersisted: () => void;

  constructor(deps: EftSideImporterDeps) {
    this.sidePanel = deps.sidePanel;
    this.turret = deps.turret;
    this.fittingImport = deps.fittingImport;
    this.onConfigPersisted = deps.onConfigPersisted;
  }

  importEftFitting(side: Side, text: string, persist = true): ImportedFitting | undefined {
    const panel = this.sidePanel(side);
    const conditions = panel.skillConditions();
    const imported = this.fittingImport.importFitting(text, conditions);
    if (!imported) {
      panel.showImportHint("status.fittingInvalid", true);
      return undefined;
    }
    panel.clearFittedHull();
    panel.fittingText = text;
    panel.overrides = {};
    panel.loadHull(imported.profile.name, imported.propulsion?.propulsionId);
    panel.applyImportedFitting(this.fittedHullSummary(imported));
    if (side === "attacker") this.turret.applyImported(imported);
    if (persist) {
      panel.lastCommittedHull = imported.profile.name;
      this.onConfigPersisted();
    }
    panel.showImportHint("status.fittingImported");
    return imported;
  }

  private fittedHullSummary(imported: ImportedFitting): FittedHullSummary {
    return {
      fittingName: imported.fittingName,
      propulsionId: imported.propulsion?.propulsionId,
      propulsionName: imported.propulsion?.propulsionName,
      fitted: imported.fitted,
      propulsion: imported.propulsion,
    };
  }
}
