import type { FittingPopupController, FittingPreviewManager, PopupGroup } from "./popup";
import type { Side, SidePanel, SidePanelHost } from "./sidePanel";

export interface CombatantSide {
  readonly side: Side;
  readonly panel: SidePanel;
}

export interface CombatantSides {
  readonly attacker: CombatantSide;
  readonly target: CombatantSide;
}

type SideImporter = Parameters<SidePanel["setImporter"]>[0];

export function combatantSidesOf(attacker: SidePanel, target: SidePanel): CombatantSides {
  return { attacker: { side: "attacker", panel: attacker }, target: { side: "target", panel: target } };
}

export function forEachSide(sides: CombatantSides, action: (combatant: CombatantSide) => void): void {
  action(sides.attacker);
  action(sides.target);
}

export function forEachSideResult<T>(sides: CombatantSides, action: (combatant: CombatantSide) => T): T[] {
  return [action(sides.attacker), action(sides.target)];
}

export interface WiredCombatantSide extends CombatantSide {
  readonly fittingPopup: FittingPopupController;
  readonly fittingPreview: FittingPreviewManager;
  readonly importer: SideImporter;
  readonly host: SidePanelHost;
}

export interface CombatantSideWiringDeps {
  readonly fittingPopup: FittingPopupController;
  readonly fittingPreview: FittingPreviewManager;
  readonly popupGroup: PopupGroup;
  readonly host: SidePanelHost;
  readonly importer: SideImporter;
}

export function wireCombatantSide(combatant: CombatantSide, deps: CombatantSideWiringDeps): void {
  combatant.panel.setHost(deps.host);
  combatant.panel.setFittingPopup(deps.fittingPopup);
  combatant.panel.setFittingPreview(deps.fittingPreview);
  combatant.panel.setImporter(deps.importer);
  deps.popupGroup.register(deps.fittingPopup.popup);
}
