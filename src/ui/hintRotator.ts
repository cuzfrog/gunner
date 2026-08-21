import type { I18n } from "./i18n";
import type { HintCandidate } from "./hints";
import type { IntervalId, Timer } from "./timer";

export interface IHintRotator {
  showNext(): void;
  refresh(): void;
  stop(): void;
}

export interface HintRotatorConfig {
  readonly element: HTMLElement;
  readonly i18n: I18n;
  readonly candidates: readonly HintCandidate[];
  readonly timer: Timer;
  readonly intervalMs?: number;
}

export class HintRotator implements IHintRotator {
  private readonly element: HTMLElement;
  private readonly i18n: I18n;
  private readonly candidates: readonly HintCandidate[];
  private readonly timer: Timer;
  private readonly intervalMs: number;
  private currentIndex = 0;
  private intervalId?: IntervalId;
  private isAnimating = false;

  constructor({ element, i18n, candidates, timer, intervalMs = 60_000 }: HintRotatorConfig) {
    this.element = element;
    this.i18n = i18n;
    this.candidates = candidates;
    this.timer = timer;
    this.intervalMs = intervalMs;
    this.renderFirstActive();
    this.start();
  }

  showNext(): void {
    if (this.isAnimating) return;
    const active = activeCandidates(this.candidates);
    if (active.length <= 1) return;
    const nextIndex = this.pickNextIndex(active);
    this.currentIndex = nextIndex;
    this.isAnimating = true;
    this.element.classList.toggle("hint-exit", true);
    this.timer.setTimeout(() => {
      this.render(active[nextIndex]);
      this.snapBelow();
      this.element.style.transform = "";
      this.element.style.opacity = "";
      this.isAnimating = false;
    }, 300);
  }

  refresh(): void {
    const active = activeCandidates(this.candidates);
    this.render(active[this.currentIndex]);
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

  private renderFirstActive(): void {
    const active = activeCandidates(this.candidates);
    if (active.length === 0) {
      this.element.textContent = "";
      return;
    }
    this.currentIndex = 0;
    this.render(active[0]);
  }

  private render(candidate: HintCandidate | undefined): void {
    if (candidate === undefined) {
      this.element.textContent = "";
      return;
    }
    const text = candidate.text[this.i18n.current()];
    this.element.textContent = candidate.isHint ? `${this.i18n.t("hint.prefix")} ${text}` : text;
  }

  private pickNextIndex(active: readonly HintCandidate[]): number {
    if (active.length <= 1) return 0;
    let next: number;
    do {
      next = Math.floor(Math.random() * active.length);
    } while (next === this.currentIndex);
    return next;
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

function activeCandidates(candidates: readonly HintCandidate[]): readonly HintCandidate[] {
  return candidates.filter((c) => c.isHint);
}
