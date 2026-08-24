import type { FittingPopupController, FittingPreviewManager, PopupGroup } from "./popup";
import type { Side, SidePanel, SidePanelHost } from "./sidePanel";

type SideImporter = Parameters<SidePanel["setImporter"]>[0];

interface CombatantSide {
  readonly side: Side;
  readonly panel: SidePanel;
}

interface CombatantSides {
  readonly attacker: CombatantSide;
  readonly target: CombatantSide;
}

interface CombatantSideWiringDeps {
  readonly fittingPopup: FittingPopupController;
  readonly fittingPreview: FittingPreviewManager;
  readonly popupGroup: PopupGroup;
  readonly host: SidePanelHost;
  readonly importer: SideImporter;
}

export function combatantSidesOf(attacker: SidePanel, target: SidePanel): CombatantSides {
  return { attacker: { side: "attacker", panel: attacker }, target: { side: "target", panel: target } };
}

export function forEachSide(sides: CombatantSides, action: (combatant: CombatantSide) => void): void {
  action(sides.attacker);
  action(sides.target);
}

export function wireCombatantSide(combatant: CombatantSide, deps: CombatantSideWiringDeps): void {
  combatant.panel.setHost(deps.host);
  combatant.panel.setFittingPopup(deps.fittingPopup);
  combatant.panel.setFittingPreview(deps.fittingPreview);
  combatant.panel.setImporter(deps.importer);
  deps.popupGroup.register(deps.fittingPopup.popup);
}
