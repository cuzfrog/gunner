import type { FittingImport } from "../../../fitting";
import type { ShipProfile } from "../../../ships";
import { fittingAreaSelector, isEventTargetWithClosest } from "../controlsDom";
import type { FittingPreview } from "./fittingPreview";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { Side } from "../side";
import type { FittingPopupHost } from "./fittingPopupHost";
import type { UiEvents } from "../../events";

export interface FittingPreviewManager {
  toggle(side: Side): void;
  showInMenu(side: Side, text: string, anchor: HTMLElement, eye: HTMLButtonElement): void;
  hide(side: Side): void;
  openSide(): Side | undefined;
  isMenuPreview(): boolean;
  refresh(): void;
  handlePointerDown(domTarget: EventTarget): void;
  handleEscape(): void;
}

export class FittingPreviewManagerImpl implements FittingPreviewManager {
  private readonly fittingImport: FittingImport;
  private readonly imageCatalog: ImageCatalog;
  private readonly i18n: I18n;
  private readonly shipASide: FittingPopupHost;
  private readonly shipBSide: FittingPopupHost;
  private readonly previewsBySide: Readonly<Record<Side, FittingPreview>>;
  private readonly shipImageBySide: Readonly<Record<Side, HTMLImageElement>>;
  private readonly eyeBySide: Readonly<Record<Side, HTMLButtonElement>>;
  private openPreviewSide: Side | null = null;
  private currentPreviewAnchor?: HTMLElement;
  private currentPreviewText?: string;
  private currentPreviewEye?: HTMLButtonElement;
  private currentPreviewInMenu = false;

  constructor(deps: {
    fittingImport: FittingImport;
    imageCatalog: ImageCatalog;
    i18n: I18n;
    shipASide: FittingPopupHost;
    shipBSide: FittingPopupHost;
    previewsBySide: Readonly<Record<Side, FittingPreview>>;
    shipImageBySide: Readonly<Record<Side, HTMLImageElement>>;
    eyeBySide: Readonly<Record<Side, HTMLButtonElement>>;
    events: UiEvents;
  }) {
    this.fittingImport = deps.fittingImport;
    this.imageCatalog = deps.imageCatalog;
    this.i18n = deps.i18n;
    this.shipASide = deps.shipASide;
    this.shipBSide = deps.shipBSide;
    this.previewsBySide = deps.previewsBySide;
    this.shipImageBySide = deps.shipImageBySide;
    this.eyeBySide = deps.eyeBySide;
    deps.events.onLanguageChanged(() => this.refresh());
  }

  toggle(side: Side): void {
    const text = this.fittingTextOf(side);
    if (!text) return;
    this.show(side, text, this.shipImageBySide[side], this.eyeBySide[side], false);
  }

  showInMenu(side: Side, text: string, anchor: HTMLElement, eye: HTMLButtonElement): void {
    this.show(side, text, anchor, eye, true);
  }

  hide(side: Side): void {
    this.previewOf(side).hide();
    if (this.openPreviewSide === side) {
      this.openPreviewSide = null;
      this.currentPreviewAnchor = undefined;
      this.currentPreviewText = undefined;
      this.currentPreviewInMenu = false;
    }
    this.currentPreviewEye?.setAttribute("aria-pressed", "false");
    this.currentPreviewEye = undefined;
  }

  openSide(): Side | undefined {
    return this.openPreviewSide ?? undefined;
  }

  isMenuPreview(): boolean {
    return this.currentPreviewInMenu;
  }

  refresh(): void {
    if (!this.openPreviewSide || !this.currentPreviewAnchor) return;
    if (!this.currentPreviewAnchor.isConnected) {
      this.hide(this.openPreviewSide);
      return;
    }
    const side = this.openPreviewSide;
    const text = this.currentPreviewInMenu
      ? this.currentPreviewText
      : (this.fittingTextOf(side) ?? this.currentPreviewText);
    if (!text) {
      this.hide(side);
      return;
    }
    const eye = this.currentPreviewEye ?? this.eyeBySide[side];
    this.renderPreview(side, text, this.currentPreviewAnchor, eye);
  }

  handlePointerDown(domTarget: EventTarget): void {
    const side = this.openPreviewSide;
    if (!side || !isEventTargetWithClosest(domTarget)) return;
    if (domTarget.closest(fittingAreaSelector(side)) === null) this.hide(side);
  }

  handleEscape(): void {
    const side = this.openPreviewSide;
    if (!side) return;
    const eye = this.currentPreviewEye ?? this.eyeBySide[side];
    this.hide(side);
    eye.focus();
  }

  private previewOf(side: Side): FittingPreview {
    return this.previewsBySide[side];
  }

  private hostFor(side: Side): FittingPopupHost {
    return side === "shipA" ? this.shipASide : this.shipBSide;
  }

  private profileOf(side: Side): ShipProfile | undefined {
    return this.hostFor(side).profile;
  }

  private fittingTextOf(side: Side): string | undefined {
    return this.hostFor(side).fittingText;
  }

  private show(side: Side, text: string, anchor: HTMLElement, eye: HTMLButtonElement, inMenu: boolean): void {
    if (this.openPreviewSide === side && this.currentPreviewText === text && this.currentPreviewAnchor === anchor) {
      this.hide(side);
      return;
    }
    this.renderPreview(side, text, anchor, eye);
    this.currentPreviewInMenu = inMenu;
  }

  private renderPreview(side: Side, text: string, anchor: HTMLElement, eye: HTMLButtonElement): void {
    const summary = this.fittingImport.summarize(text);
    if (!summary || summary.sections.length === 0) {
      this.hide(side);
      return;
    }
    const profile = this.profileOf(side);
    const shipImageUrl = profile ? this.imageCatalog.shipImageUrl(profile.name) : undefined;
    this.currentPreviewEye?.setAttribute("aria-pressed", "false");
    this.currentPreviewAnchor = anchor;
    this.currentPreviewText = text;
    this.currentPreviewEye = eye;
    this.openPreviewSide = side;
    eye.setAttribute("aria-pressed", "true");
    this.previewOf(side).show(anchor, summary, shipImageUrl, () => this.hide(side));
  }
}
