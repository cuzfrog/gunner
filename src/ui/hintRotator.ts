import type { I18n, Language } from "./i18n";
import type { Hint } from "./hints";
import type { IntervalId, Timer } from "./timer";

export interface IHintRotator {
  showNext(): void;
  refresh(): void;
  stop(): void;
}

export interface HintRotatorConfig {
  readonly element: HTMLElement;
  readonly i18n: I18n;
  readonly candidates: readonly Hint[];
  readonly tipText: Readonly<Record<Language, string>>;
  readonly timer: Timer;
  readonly intervalMs?: number;
}

export class HintRotator implements IHintRotator {
  private readonly element: HTMLElement;
  private readonly i18n: I18n;
  private readonly candidates: readonly Hint[];
  private readonly tipText: Readonly<Record<Language, string>>;
  private readonly timer: Timer;
  private readonly intervalMs: number;
  private currentIndex = 0;
  private intervalId?: IntervalId;
  private isAnimating = false;

  constructor({ element, i18n, candidates, tipText, timer, intervalMs = 20_000 }: HintRotatorConfig) {
    this.element = element;
    this.i18n = i18n;
    this.candidates = candidates;
    this.tipText = tipText;
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
    if (this.isTip(index)) {
      this.element.textContent = this.tipText[this.i18n.current()];
      return;
    }
    const hintIndex = Math.floor(index / 2);
    const hint = this.candidates[hintIndex];
    if (hint === undefined) {
      this.element.textContent = "";
      return;
    }
    const text = hint.text[this.i18n.current()];
    this.element.textContent = `${this.i18n.t("hint.prefix")} ${text}`;
  }

  private isTip(index: number): boolean {
    return index % 2 === 1;
  }

  private totalSlides(): number {
    return this.candidates.length * 2;
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
