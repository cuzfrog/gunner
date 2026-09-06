import type { TimeoutId, Timer } from "../../timer";
import type { ViewStream } from "../../viewStream";
import type { HintContentProvider } from "./hintContentProvider";
import type { HoverHintController } from "./hoverHintControllerContract";

export interface HoverHintDeps {
  readonly hintEl: HTMLElement;
  readonly timer: Timer;
  readonly viewStream: ViewStream;
  readonly showDelayMs?: number;
  readonly deferredHideMs?: number;
}

const HINT_SELECTOR = "[data-hint], [data-hint-content]";
const CONTENT_ATTR = "data-hint-content";
const STRING_ATTR = "data-hint";
const DEFERRED_HIDE_MS = 50;

export class HoverHintControllerImpl implements HoverHintController {
  private readonly hintEl: HTMLElement;
  private readonly timer: Timer;
  private readonly document: Document;
  private readonly showDelayMs: number;
  private readonly deferredHideMs: number;
  private readonly anchored: boolean;
  private readonly providers: Map<string, HintContentProvider> = new Map();
  private showTimer?: TimeoutId;
  private hideTimer?: TimeoutId;
  private pendingAnchor: HTMLElement | undefined;
  private currentAnchor: HTMLElement | undefined;
  private currentProvider: HintContentProvider | undefined;
  private previousDescribedBy: string | null = null;
  private readonly abortController: AbortController;

  constructor(deps: HoverHintDeps) {
    this.hintEl = deps.hintEl;
    this.timer = deps.timer;
    this.document = globalThis.document;
    this.showDelayMs = deps.showDelayMs ?? 400;
    this.deferredHideMs = deps.deferredHideMs ?? DEFERRED_HIDE_MS;
    this.anchored = anchorPositioningSupported();
    this.hintEl.hidden = true;
    this.abortController = new AbortController();
    deps.viewStream.onViewUpdated(() => this.refresh());
    const signal = this.abortController.signal;
    this.document.addEventListener("pointerover", (event: Event) => this.onPointerOver(event), { signal });
    this.document.addEventListener("pointerout", (event: Event) => this.onPointerOut(event), { signal });
    this.document.addEventListener("focusin", (event: Event) => this.onFocusIn(event), { signal });
    this.document.addEventListener("focusout", (event: Event) => this.onFocusOut(event), { signal });
  }

  registerContentProvider(key: string, provider: HintContentProvider): void {
    this.providers.set(key, provider);
  }

  refresh(): void {
    if (this.currentAnchor === undefined || this.currentProvider === undefined) return;
    if (this.hintEl.hidden) return;
    this.hintEl.textContent = "";
    try {
      this.currentProvider.render(this.currentAnchor, this.hintEl);
      if (!this.anchored) this.placeByRect(this.currentAnchor);
    } catch {
      this.hide();
    }
  }

  dispose(): void {
    this.abortController.abort();
    this.clearShowTimer();
    this.clearHideTimer();
    this.hide();
    this.providers.clear();
  }

  private onPointerOver(event: Event): void {
    this.clearHideTimer();
    const anchor = this.anchorFor(event);
    if (anchor === undefined) this.hide();
    else this.scheduleShow(anchor);
  }

  private onPointerOut(event: Event): void {
    const anchor = this.anchorFor(event);
    if (anchor === undefined) return;
    const related = (event as Event & { readonly relatedTarget: EventTarget | null }).relatedTarget;
    if (related instanceof Element && anchor.contains(related)) return;
    if (related === null && (anchor === this.pendingAnchor || anchor === this.currentAnchor)) {
      this.scheduleDeferredHide();
      return;
    }
    this.hide();
  }

  private onFocusIn(event: Event): void {
    const anchor = this.anchorFor(event);
    if (anchor === undefined) return;
    this.show(anchor);
  }

  private onFocusOut(event: Event): void {
    if (this.anchorFor(event) === undefined) return;
    this.hide();
  }

  private anchorFor(event: Event): HTMLElement | undefined {
    const target = event.target;
    if (!(target instanceof Element)) return undefined;
    const anchor = target.closest(HINT_SELECTOR);
    if (anchor === null) return undefined;
    if (!(anchor instanceof HTMLElement)) return undefined;
    const contentKey = anchor.getAttribute(CONTENT_ATTR);
    if (contentKey !== null) {
      if (contentKey === "") return undefined;
      if (!this.providers.has(contentKey)) return undefined;
      return anchor;
    }
    const content = anchor.getAttribute(STRING_ATTR);
    if (content === null || content === "") return undefined;
    return anchor;
  }

  private scheduleShow(anchor: HTMLElement): void {
    if (this.showTimer !== undefined && this.pendingAnchor === anchor) return;
    this.clearShowTimer();
    this.pendingAnchor = anchor;
    this.showTimer = this.timer.setTimeout(() => { this.pendingAnchor = undefined; this.show(anchor); }, this.showDelayMs);
  }

  private show(anchor: HTMLElement): void {
    this.clearShowTimer();
    this.clearHideTimer();
    const contentKey = anchor.getAttribute(CONTENT_ATTR);
    if (contentKey !== null) {
      const provider = this.providers.get(contentKey);
      if (provider === undefined) return;
      this.activate(anchor, provider);
      this.hintEl.textContent = "";
      try {
        provider.render(anchor, this.hintEl);
        this.hintEl.hidden = false;
        if (!this.anchored) this.placeByRect(anchor);
      } catch (err) {
        this.releaseAnchor();
        this.hintEl.hidden = true;
        throw err;
      }
      return;
    }
    const content = anchor.getAttribute(STRING_ATTR);
    if (content === null || content === "") return;
    this.activate(anchor, undefined);
    this.hintEl.textContent = content;
    this.hintEl.hidden = false;
    if (!this.anchored) this.placeByRect(anchor);
  }

  private activate(anchor: HTMLElement, provider: HintContentProvider | undefined): void {
    this.releaseAnchor();
    this.currentAnchor = anchor;
    this.currentProvider = provider;
    this.previousDescribedBy = anchor.getAttribute("aria-describedby");
    anchor.classList.add("hover-hint-anchor");
    anchor.setAttribute("aria-describedby", this.hintEl.id);
  }

  private hide(): void {
    this.clearShowTimer();
    this.clearHideTimer();
    this.hintEl.hidden = true;
    if (this.currentProvider !== undefined && this.currentAnchor !== undefined) {
      this.currentProvider.hide?.(this.currentAnchor, this.hintEl);
    }
    this.hintEl.textContent = "";
    this.releaseAnchor();
  }

  private releaseAnchor(): void {
    if (this.currentAnchor === undefined) return;
    this.currentAnchor.classList.remove("hover-hint-anchor");
    if (this.previousDescribedBy === null) this.currentAnchor.removeAttribute("aria-describedby");
    else this.currentAnchor.setAttribute("aria-describedby", this.previousDescribedBy);
    this.previousDescribedBy = null;
    this.currentAnchor = undefined;
    this.currentProvider = undefined;
    if (!this.anchored) {
      this.hintEl.style.removeProperty("left");
      this.hintEl.style.removeProperty("top");
    }
  }

  private placeByRect(anchor: HTMLElement): void {
    const rect = anchor.getBoundingClientRect();
    this.hintEl.style.left = `${rect.left + rect.width / 2}px`;
    this.hintEl.style.top = `${rect.bottom + 4}px`;
  }

  private scheduleDeferredHide(): void {
    this.clearHideTimer();
    this.hideTimer = this.timer.setTimeout(() => { this.hideTimer = undefined; this.hide(); }, this.deferredHideMs);
  }

  private clearHideTimer(): void {
    if (this.hideTimer !== undefined) {
      this.timer.clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }
  }

  private clearShowTimer(): void {
    if (this.showTimer !== undefined) {
      this.timer.clearTimeout(this.showTimer);
      this.showTimer = undefined;
    }
    this.pendingAnchor = undefined;
  }
}

function anchorPositioningSupported(): boolean {
  return typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("anchor-name", "--hover-hint-anchor");
}
