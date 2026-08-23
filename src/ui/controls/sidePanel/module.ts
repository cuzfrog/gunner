import { asFunction, type AwilixContainer } from "awilix";
import type { FittingImport } from "../../../fitting";
import type { Ships } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { Timer } from "../../timer";
import type { UiEvents } from "../../events";
import type { PopupGroup } from "./popup";
import type { Side } from "./side";
import { collectSideEls } from "./elements";
import type { Els } from "../elementsContract";
import type { SidePanelElements } from "./elements";
import { SidePanelImpl } from "./sidePanel";
import type { SidePanel, SidePanelDeps, SidePanelHost } from "./sidePanelContract";

export function registerSidePanelModule(cradle: AwilixContainer<object>): void {
  cradle.register({
    createSidePanelEls: asFunction(() => (els: Els, side: Side): SidePanelElements => collectSideEls(els, side)),
    createSidePanel: asFunction(() => (deps: SidePanelDeps): SidePanel => new SidePanelImpl(deps)),
  });
}
