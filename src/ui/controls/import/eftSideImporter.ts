import type { FittingImport, ImportedFitting } from "../../../fitting";
import type { FittedHullSummary } from "../../../appstate";
import type { Side, SidePanel } from "../sidePanel";
import type { AttackerTurret } from "./attackerTurret";

interface EftSideImporterDeps {
  readonly attackerSide: SidePanel;
  readonly targetSide: SidePanel;
  readonly turret: AttackerTurret;
  readonly fittingImport: FittingImport;
  readonly onConfigPersisted: () => void;
}

export class EftSideImporter {
  private readonly attackerSide: SidePanel;
  private readonly targetSide: SidePanel;
  private readonly turret: AttackerTurret;
  private readonly fittingImport: FittingImport;
  private readonly onConfigPersisted: () => void;

  constructor(deps: EftSideImporterDeps) {
    this.attackerSide = deps.attackerSide;
    this.targetSide = deps.targetSide;
    this.turret = deps.turret;
    this.fittingImport = deps.fittingImport;
    this.onConfigPersisted = deps.onConfigPersisted;
  }

  private panel(side: Side): SidePanel {
    return side === "attacker" ? this.attackerSide : this.targetSide;
  }

  importEftFitting(side: Side, text: string, persist = true): ImportedFitting | undefined {
    const panel = this.panel(side);
    const conditions = panel.skillConditions();
    const imported = this.fittingImport.importFitting(text, conditions);
    if (!imported) {
      panel.sections.paste.showImportHint("status.fittingInvalid", true);
      return undefined;
    }
    panel.sections.hull.clearFittedHull();
    panel.fittingText = text;
    panel.clearOverrides();
    panel.sections.hull.loadHull(imported.profile.name, imported.propulsion?.propulsionId);
    panel.sections.hull.applyImportedFitting(this.fittedHullSummary(imported));
    if (side === "attacker") this.turret.applyImported(imported);
    if (persist) {
      panel.lastCommittedHull = imported.profile.name;
      this.onConfigPersisted();
    }
    panel.sections.paste.showImportHint("status.fittingImported");
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
