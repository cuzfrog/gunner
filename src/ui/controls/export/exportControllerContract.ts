import type { Side } from "../side";

export interface ExportController {
  copyFitting(side: Side): Promise<void>;
}

export interface FittingExportSource {
  readonly fittingText: string | undefined;
  readonly sections: { readonly paste: { showImportHint(key: string, isError?: boolean): void } };
}
