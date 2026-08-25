export interface ChoiceGroup {
  set(value: string): void;
}

export class ChoiceGroupImpl implements ChoiceGroup {
  private readonly group: HTMLElement;
  private readonly select: HTMLSelectElement;
  private readonly values: readonly string[];

  constructor(group: HTMLElement, select: HTMLSelectElement, values: readonly string[]) {
    this.group = group;
    this.select = select;
    this.values = values;
    this.bind();
  }

  set(value: string): void {
    for (const button of Array.from(this.group.children)) {
      const active = button.getAttribute("data-value") === value;
      button.setAttribute("aria-pressed", String(active));
    }
  }

  private bind(): void {
    for (const button of Array.from(this.group.children)) {
      button.addEventListener("click", () => this.onButtonClick(button));
    }
  }

  private onButtonClick(button: Element): void {
    const value = button.getAttribute("data-value") ?? "";
    if (!this.values.includes(value)) return;
    this.select.value = value;
    this.set(value);
    this.select.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
