export interface SummaryChip {
  render(text: string, iconUrl: string | undefined): void;
}

export class SummaryChipImpl implements SummaryChip {
  private readonly textEl: HTMLElement;
  private readonly iconEl: HTMLImageElement;

  constructor(textEl: HTMLElement, iconEl: HTMLImageElement) {
    this.textEl = textEl;
    this.iconEl = iconEl;
  }

  render(text: string, iconUrl: string | undefined): void {
    this.textEl.textContent = text;
    if (iconUrl) {
      this.iconEl.src = iconUrl;
      this.iconEl.hidden = false;
    } else {
      this.iconEl.src = "";
      this.iconEl.hidden = true;
    }
  }
}
