import type { I18n } from "../../i18n";
import type { TimeoutId, Timer } from "../../timer";
import { escapeHtml } from "../controlsFormat";
import type { Popup } from "../popup";
import type { Side } from "../side";
import type { SidePanel } from "./sidePanelContract";
import type { IPasteImportSection } from "./sidePanelSections";

export interface PasteImportSectionEls {
  readonly fittingName: HTMLElement;
  readonly pastePopup: HTMLElement;
  readonly pasteInput: HTMLTextAreaElement;
  readonly importFitting: HTMLButtonElement;
}

export class PasteImportSection implements IPasteImportSection {
  private readonly panel: SidePanel;
  private readonly els: PasteImportSectionEls;
  private readonly i18n: I18n;
  private readonly timer: Timer;
  private importHintTimeout?: TimeoutId;
  readonly popup: Popup;

  constructor({ panel, els, i18n, timer }: { panel: SidePanel; els: PasteImportSectionEls; i18n: I18n; timer: Timer }) {
    this.panel = panel;
    this.els = els;
    this.i18n = i18n;
    this.timer = timer;
    this.popup = this.createPastePopup();
    this.els.importFitting.addEventListener("click", () => this.onImportFittingClick());
    this.els.pastePopup.addEventListener("paste", (event: ClipboardEvent) => this.onPastePopupPaste(event));
  }

  onImportFittingClick(): void {
    void this.panel.importer.importFromClipboard();
  }

  onPastePopupPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData("text/plain");
    if (!text) return;
    event.preventDefault();
    this.closePastePopup();
    void this.panel.importer.importFromText(text);
  }

  showImportHint(key: string, isError = false): void {
    this.clearImportHintTimeout();
    const element = this.els.fittingName;
    element.classList.toggle("error", isError);
    element.innerHTML = `<span class="hull-fitting-name-value truncate">${escapeHtml(this.i18n.t(key))}</span>`;
    element.hidden = false;
    this.importHintTimeout = this.timer.setTimeout(() => {
      this.importHintTimeout = undefined;
      this.clearImportHint();
    }, 5000);
  }

  clearImportHint(): void {
    this.clearImportHintTimeout();
    const element = this.els.fittingName;
    element.classList.toggle("error", false);
    element.innerHTML = "";
    element.hidden = true;
  }

  clearImportHintTimeout(): void {
    if (this.importHintTimeout) {
      this.timer.clearTimeout(this.importHintTimeout);
      this.importHintTimeout = undefined;
    }
  }

  openPastePopup(): void {
    this.els.pastePopup.hidden = false;
    this.els.pasteInput.focus();
  }

  closePastePopup(): void {
    this.els.pastePopup.hidden = true;
    this.els.pasteInput.blur();
  }

  isPastePopupOpen(): boolean {
    return !this.els.pastePopup.hidden;
  }

  private createPastePopup(): Popup {
    return {
      isOpen: () => this.isPastePopupOpen(),
      open: () => this.openPastePopup(),
      close: () => this.closePastePopup(),
      focusTrigger: () => this.els.importFitting.focus(),
      contains: (target) =>
        target instanceof Element
        && target.closest(`#${this.panel.side}-paste-popup, #${this.panel.side}-import-fitting`) !== null,
    };
  }
}
