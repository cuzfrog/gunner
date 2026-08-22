import type { I18n } from "../i18n";
import type { SlideText } from "./hints";
import type { IntervalId, Timer } from "../timer";

export interface HintRotatorConfig {
  readonly element: HTMLElement;
  readonly i18n: I18n;
  readonly candidates: readonly SlideText[];
  readonly tipText: SlideText;
  readonly lores: readonly SlideText[];
  readonly timer: Timer;
  readonly intervalMs?: number;
}

export interface HintRotator {
  showNext(): void;
  refresh(): void;
  stop(): void;
}

export class HintRotatorImpl implements HintRotator {
  private readonly element: HTMLElement;
  private readonly i18n: I18n;
  private readonly candidates: readonly SlideText[];
  private readonly tipText: SlideText;
  private readonly lores: readonly SlideText[];
  private readonly timer: Timer;
  private readonly intervalMs: number;
  private currentIndex = 0;
  private intervalId?: IntervalId;
  private isAnimating = false;

  constructor({ element, i18n, candidates, tipText, lores, timer, intervalMs = 20_000 }: HintRotatorConfig) {
    this.element = element;
    this.i18n = i18n;
    this.candidates = candidates;
    this.tipText = tipText;
    this.lores = lores;
    this.timer = timer;
    this.intervalMs = intervalMs;
    this.renderFirst();
    this.start();
  }

  showNext(): void {
    if (this.isAnimating) return;
    const total = this.totalSlides();
    if (total < 2) return;
    const nextIndex = (this.currentIndex + 1) % total;
    this.currentIndex = nextIndex;
    this.isAnimating = true;
    this.element.classList.toggle("hint-exit", true);
    this.timer.setTimeout(() => {
      this.renderSlide(nextIndex);
      this.snapBelow();
      this.element.style.transform = "";
      this.element.style.opacity = "";
      this.isAnimating = false;
    }, 300);
  }

  refresh(): void {
    this.renderSlide(this.currentIndex);
  }

  stop(): void {
    if (this.intervalId !== undefined) {
      this.timer.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private start(): void {
    this.intervalId = this.timer.setInterval(() => this.showNext(), this.intervalMs);
  }

  private renderFirst(): void {
    const total = this.totalSlides();
    if (total === 0) {
      this.element.textContent = "";
      return;
    }
    this.currentIndex = 0;
    this.renderSlide(0);
  }

  private renderSlide(index: number): void {
    const category = this.categoryAt(index);
    this.setCategory(category);
    this.element.textContent = this.slideText(index);
  }

  private categoryAt(index: number): "hint" | "tip" | "lore" {
    switch (index % 4) {
      case 0:
        return "hint";
      case 1:
        return "tip";
      default:
        return "lore";
    }
  }

  private setCategory(category: "hint" | "tip" | "lore"): void {
    this.element.classList.remove("hint", "tip", "lore");
    this.element.classList.add(category);
  }

  private slideText(index: number): string {
    const category = this.categoryAt(index);
    const lang = this.i18n.current();
    switch (category) {
      case "tip":
        return this.tipText.text[lang];
      case "hint": {
        const hint = this.candidates[this.hintIndex(index)];
        return hint ? `${this.i18n.t("hint.prefix")} ${hint.text[lang]}` : "";
      }
      case "lore": {
        const lore = this.lores[this.loreIndex(index)];
        return lore ? lore.text[lang] : "";
      }
    }
  }

  private hintIndex(index: number): number {
    return Math.floor(index / 4) % Math.max(1, this.candidates.length);
  }

  private loreIndex(index: number): number {
    const group = Math.floor(index / 4);
    const offset = index % 4 === 2 ? 0 : 1;
    return (group * 2 + offset) % Math.max(1, this.lores.length);
  }

  private totalSlides(): number {
    if (this.candidates.length === 0 && this.lores.length === 0) return 0;
    const groups = Math.max(this.candidates.length, Math.ceil(this.lores.length / 2));
    return groups * 4;
  }

  private snapBelow(): void {
    this.element.style.transition = "none";
    this.element.classList.toggle("hint-exit", false);
    this.element.style.transform = "translateY(100%)";
    this.element.style.opacity = "0";
    void this.element.offsetHeight;
    this.element.style.transition = "";
  }
}
