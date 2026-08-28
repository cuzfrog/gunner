import type { FittingPopupController, FittingPreviewManager, PopupGroup } from "./popup";
import type { Side } from "./side";
import type { SidePanel, SidePanelHost } from "./sidePanel";

type SideImporter = Parameters<SidePanel["setImporter"]>[0];

interface CombatantSide {
  readonly side: Side;
  readonly panel: SidePanel;
}

interface CombatantSides {
  readonly shipA: CombatantSide;
  readonly shipB: CombatantSide;
}

interface CombatantSideWiringDeps {
  readonly fittingPopup: FittingPopupController;
  readonly fittingPreview: FittingPreviewManager;
  readonly popupGroup: PopupGroup;
  readonly host: SidePanelHost;
  readonly importer: SideImporter;
}

export function combatantSidesOf(shipA: SidePanel, shipB: SidePanel): CombatantSides {
  return { shipA: { side: "shipA", panel: shipA }, shipB: { side: "shipB", panel: shipB } };
}

export function forEachSide(sides: CombatantSides, action: (combatant: CombatantSide) => void): void {
  action(sides.shipA);
  action(sides.shipB);
}

export function wireCombatantSide(combatant: CombatantSide, deps: CombatantSideWiringDeps): void {
  combatant.panel.setHost(deps.host);
  combatant.panel.setFittingPopup(deps.fittingPopup);
  combatant.panel.setFittingPreview(deps.fittingPreview);
  combatant.panel.setImporter(deps.importer);
  deps.popupGroup.register(deps.fittingPopup.popup);
}
