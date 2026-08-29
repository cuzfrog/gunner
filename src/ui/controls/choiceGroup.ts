import { html } from "./markup";

export interface ChoiceGroupOption {
  readonly value: string;
  readonly label: string;
  readonly title?: string;
  readonly iconUrl?: string;
  readonly valueText?: string;
  readonly disabled?: boolean;
}

export interface ChoiceGroupShape {
  readonly buttonClass: string;
  readonly iconClass?: string;
  readonly labelClass?: string;
  readonly valueClass?: string;
  readonly truncateButton?: boolean;
  readonly toggleNoneValue?: string;
}

export interface ChoiceGroupConfig {
  readonly group: HTMLElement;
  readonly shape?: ChoiceGroupShape;
  readonly select?: HTMLSelectElement;
  readonly staticValues?: readonly string[];
}

export interface ChoiceGroup {
  set(value: string): void;
  render(options: readonly ChoiceGroupOption[], selected: string): void;
}

export class ChoiceGroupImpl implements ChoiceGroup {
  private readonly group: HTMLElement;
  private readonly select: HTMLSelectElement | undefined;
  private readonly shape: ChoiceGroupShape | undefined;
  private readonly staticValues: readonly string[];

  constructor(config: ChoiceGroupConfig) {
    this.group = config.group;
    this.select = config.select;
    this.shape = config.shape;
    this.staticValues = config.staticValues ?? [];
    if (config.staticValues) this.bindStatic();
  }

  set(value: string): void {
    for (const button of Array.from(this.group.children)) {
      const active = button.getAttribute("data-value") === value;
      button.setAttribute("aria-pressed", String(active));
    }
  }

  render(options: readonly ChoiceGroupOption[], selected: string): void {
    if (!this.shape) throw new Error("ChoiceGroup.render requires a shape config");
    this.group.innerHTML = "";
    if (this.select) this.select.innerHTML = "";
    for (const option of options) {
      if (this.select) {
        const opt = html`<option value=${option.value}>${option.label}</option>` as unknown as HTMLElement;
        this.select.appendChild(opt);
      }
      const button = buildChoiceButton(this.shape, option);
      button.addEventListener("click", () => this.onButtonClick(button));
      this.group.appendChild(button);
    }
    if (this.select) this.select.value = selected;
    this.set(selected);
  }

  private bindStatic(): void {
    for (const button of Array.from(this.group.children)) {
      button.addEventListener("click", () => this.onButtonClick(button));
    }
  }

  private onButtonClick(button: Element): void {
    const value = button.getAttribute("data-value") ?? "";
    if (this.staticValues.length > 0 && !this.staticValues.includes(value)) return;
    const toggleNone = this.shape?.toggleNoneValue;
    const currentValue = this.select ? this.select.value : this.findActiveValue();
    const nextValue = toggleNone !== undefined && currentValue === value ? toggleNone : value;
    if (this.select) {
      this.select.value = nextValue;
      this.set(nextValue);
      this.select.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      this.set(nextValue);
      this.group.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  private findActiveValue(): string {
    for (const button of Array.from(this.group.children)) {
      if (button.getAttribute("aria-pressed") === "true") return button.getAttribute("data-value") ?? "";
    }
    return "";
  }
}

function buildChoiceButton(shape: ChoiceGroupShape, option: ChoiceGroupOption): HTMLButtonElement {
  const classes = [shape.buttonClass];
  if (shape.truncateButton) classes.push("truncate");
  const classAttr = classes.filter(Boolean).join(" ");

  if (shape.labelClass !== undefined) {
    const children: (Element | DocumentFragment)[] = [];
    if (option.iconUrl && shape.iconClass) {
      children.push(html`<img class=${shape.iconClass} src=${option.iconUrl} alt="">`);
    }
    const labelSpan = shape.labelClass
      ? html`<span class=${shape.labelClass}>${option.label}</span>`
      : html`<span>${option.label}</span>`;
    children.push(labelSpan);
    if (option.valueText !== undefined && shape.valueClass) {
      children.push(html`<span class=${shape.valueClass}>${option.valueText}</span>`);
    }
    const button = html`<button type="button" class=${classAttr} data-value=${option.value}>${children}</button>` as unknown as HTMLButtonElement;
    if (option.title) button.setAttribute("title", option.title);
    if (option.disabled) button.setAttribute("disabled", "");
    return button;
  }

  if (option.iconUrl && shape.iconClass) {
    const icon = html`<img class=${shape.iconClass} src=${option.iconUrl} alt="">`;
    const label = html`<span>${option.label}</span>`;
    const button = html`<button type="button" class=${classAttr} data-value=${option.value}>${icon}${label}</button>` as unknown as HTMLButtonElement;
    if (option.title) button.setAttribute("title", option.title);
    if (option.disabled) button.setAttribute("disabled", "");
    return button;
  }

  const button = html`<button type="button" class=${classAttr} data-value=${option.value}>${option.label}</button>` as unknown as HTMLButtonElement;
  if (option.title) button.setAttribute("title", option.title);
  if (option.disabled) button.setAttribute("disabled", "");
  return button;
}
