import type { FittingImport, ImportedFitting } from "../../../fitting";
import type { FittedHullSummary } from "../../../appstate";
import type { Side } from "../side";
import type { SidePanel } from "../sidePanel";
import type { ShipATurret } from "./shipATurret";

interface EftSideImporterDeps {
  readonly shipASide: SidePanel;
  readonly shipBSide: SidePanel;
  readonly turrets: Record<Side, ShipATurret>;
  readonly fittingImport: FittingImport;
}

export class EftSideImporter {
  private readonly shipASide: SidePanel;
  private readonly shipBSide: SidePanel;
  private readonly turrets: Record<Side, ShipATurret>;
  private readonly fittingImport: FittingImport;

  constructor(deps: EftSideImporterDeps) {
    this.shipASide = deps.shipASide;
    this.shipBSide = deps.shipBSide;
    this.turrets = deps.turrets;
    this.fittingImport = deps.fittingImport;
  }

  private panel(side: Side): SidePanel {
    return side === "shipA" ? this.shipASide : this.shipBSide;
  }

  importEftFitting(side: Side, text: string, options: { readonly persist?: boolean; readonly showImportedHint?: boolean } = {}): ImportedFitting | undefined {
    const { persist = true, showImportedHint = true } = options;
    const panel = this.panel(side);
    const conditions = panel.skillConditions();
    const imported = this.fittingImport.importFitting(text, conditions);
    if (!imported) {
      panel.sections.paste.showImportHint("status.fittingInvalid", true);
      return undefined;
    }
    panel.sections.hull.clearFittedHull();
    panel.fittingText = this.fittingImport.canonicalEftText(text) ?? text;
    panel.clearOverrides();
    panel.sections.hull.loadHull(imported.profile.id, imported.propulsion?.propulsionId);
    panel.sections.hull.applyImportedFitting(this.fittedHullSummary(side, imported));
    this.turrets[side].applyImported(imported);
    if (persist) {
      panel.lastCommittedHull = imported.profile.id;
    }
    if (showImportedHint) panel.sections.paste.showImportHint("status.fittingImported");
    return imported;
  }

  private fittedHullSummary(side: Side, imported: ImportedFitting): FittedHullSummary {
    const propulsionId = imported.propulsion?.propulsionId;
    return {
      fittingName: imported.fittingName,
      propulsionId,
      propulsionName: imported.propulsion?.propulsionName,
      propulsionKind: propulsionId !== undefined ? this.panel(side).ships.fittingOption(imported.profile, propulsionId)?.kind : undefined,
      fitted: imported.fitted,
      propulsion: imported.propulsion,
    };
  }
}
