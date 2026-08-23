import { asFunction, type AwilixContainer } from "awilix";
import { collectSideEls } from "./elements";
import type { Els } from "../elementsContract";
import type { SidePanelElements } from "./elements";
import type { Side } from "./side";
import { SidePanelImpl } from "./sidePanel";
import type { SidePanel, SidePanelDeps, SidePanelHost } from "./sidePanelContract";

interface SidePanelCradle {
  readonly createSidePanelEls: (els: Els, side: Side) => SidePanelElements;
  readonly createSidePanel: (deps: SidePanelDeps) => SidePanel;
}

export function registerSidePanelModule<T extends SidePanelCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    createSidePanelEls: asFunction(() => (els: Els, side: Side): SidePanelElements => collectSideEls(els, side)),
    createSidePanel: asFunction(() => (deps: SidePanelDeps): SidePanel => new SidePanelImpl(deps)),
  });
}
