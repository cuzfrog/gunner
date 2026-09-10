import type { ClipboardProvider } from "../../../appstate";
import type { Side } from "../side";
import type { ExportController, FittingExportSource } from "./exportControllerContract";

export type { ExportController } from "./exportControllerContract";

export class ExportControllerImpl implements ExportController {
  private readonly clipboard: ClipboardProvider;
  private readonly shipASide: FittingExportSource;
  private readonly shipBSide: FittingExportSource;

  constructor(deps: { clipboard: ClipboardProvider; shipASide: FittingExportSource; shipBSide: FittingExportSource }) {
    this.clipboard = deps.clipboard;
    this.shipASide = deps.shipASide;
    this.shipBSide = deps.shipBSide;
  }

  async copyFitting(side: Side): Promise<void> {
    const source = this.source(side);
    const text = source.fittingText;
    if (text === undefined) return;
    try {
      await this.clipboard.writeText(text);
      source.sections.paste.showImportHint("status.copied");
    } catch {
      source.sections.paste.showImportHint("status.failed", true);
    }
  }

  private source(side: Side): FittingExportSource {
    return side === "shipA" ? this.shipASide : this.shipBSide;
  }
}
