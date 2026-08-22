import type { FittingImport, ImportedFitting, PresetFittings } from "../../fitting";
import type { SavedFittings } from "../settings";
import type { I18n } from "../i18n";
import type { ImageCatalog } from "../icons";
import { PopupGroup, type Popup } from "./popupGroup";
import { fittingAreaSelector } from "./controlsDom";
import type { FittingPreviewManager } from "./fittingPreviewManager";
import { FittingPopupRenderer } from "./fittingPopupRenderer";
import type { FittingPopupEls } from "./fittingPopupEls";
import type { Side, SidePanel } from "./sidePanel";

export type { FittingPopupEls } from "./fittingPopupEls";

interface FittingPopupControllerDeps {
  side: Side;
  popupGroup: PopupGroup;
  savedFittings: SavedFittings;
  presetFittings: PresetFittings;
  fittingImport: FittingImport;
  imageCatalog: ImageCatalog;
  i18n: I18n;
  els: FittingPopupEls;
  panelFor: (side: Side) => SidePanel;
  applyFitting: (text: string) => ImportedFitting | undefined;
  previews: FittingPreviewManager;
}

export class FittingPopupController {
  private readonly side: Side;
  private readonly popupGroup: PopupGroup;
  private readonly savedFittings: SavedFittings;
  private readonly applyFitting: (text: string) => ImportedFitting | undefined;
  private readonly previews: FittingPreviewManager;
  private readonly popupValue: Popup;
  private readonly renderer: FittingPopupRenderer;
  private open = false;

  constructor(deps: FittingPopupControllerDeps) {
    this.side = deps.side;
    this.popupGroup = deps.popupGroup;
    this.savedFittings = deps.savedFittings;
    this.applyFitting = deps.applyFitting;
    this.previews = deps.previews;
    this.renderer = new FittingPopupRenderer({
      side: deps.side,
      savedFittings: deps.savedFittings,
      presetFittings: deps.presetFittings,
      fittingImport: deps.fittingImport,
      i18n: deps.i18n,
      els: deps.els,
      panelFor: deps.panelFor,
      previews: deps.previews,
    });
    this.popupValue = {
      isOpen: () => this.open,
      open: () => this.openPopup(),
      close: () => this.closePopup(),
      focusTrigger: () => deps.els.trigger.focus(),
      contains: (target) => target instanceof Element && target.closest(fittingAreaSelector(this.side)) !== null,
    };
  }

  get popup(): Popup { return this.popupValue; }

  setTriggerEnabled(enabled: boolean): void {
    this.renderer.fittingEls.trigger.disabled = !enabled;
    this.renderer.fittingEls.eye.disabled = !enabled;
  }

  renderIfOpen(): void { if (this.open) this.render(); }
  closeIfOpen(): void { if (this.open) this.closePopup(); }

  private openPopup(): void {
    this.render();
    const els = this.renderer.fittingEls;
    els.popup.hidden = false;
    els.trigger.setAttribute("aria-expanded", "true");
    this.open = true;
    const current = this.renderer.findFittingItem((item) => item.getAttribute("aria-current") === "true");
    const first = current ?? this.renderer.findFittingItem((item) => !item.disabled);
    first?.focus();
  }

  private closePopup(): void {
    const els = this.renderer.fittingEls;
    els.popup.hidden = true;
    els.trigger.setAttribute("aria-expanded", "false");
    this.open = false;
    if (this.previews.openSide() === this.side && this.previews.isMenuPreview()) this.previews.hide(this.side);
  }

  private render(): void {
    this.renderer.render({
      onItemClick: (text) => this.onFittingItemClick(text),
      onDelete: (saved) => this.onDeleteSaved(saved.id),
    });
  }

  private onDeleteSaved(id: string): void {
    this.savedFittings.remove(id);
    this.renderIfOpen();
    const next = this.renderer.findFittingItem((item) => !item.disabled) ?? this.renderer.fittingEls.trigger;
    next.focus();
  }

  private onFittingItemClick(text: string): void {
    const imported = this.applyFitting(text);
    this.popupGroup.close(this.popup);
    this.popup.focusTrigger();
    if (imported && this.previews.openSide() === this.side && !this.previews.isMenuPreview()) this.previews.refresh();
  }
}
