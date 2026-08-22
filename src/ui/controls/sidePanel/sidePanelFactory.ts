import { SidePanelImpl } from "./sidePanel";
import type { SidePanel, SidePanelDeps } from "./sidePanelContract";

export function createSidePanel(deps: SidePanelDeps): SidePanel {
  return new SidePanelImpl(deps);
}
