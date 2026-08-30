import { html } from "../markup";

export interface SelectableItem {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
  readonly iconUrl?: string;
  readonly selected: boolean;
  readonly quantity?: string;
  readonly disabled?: boolean;
}

export interface SelectableListShape {
  readonly itemClass: string;
  readonly nameClass: string;
  readonly iconClass?: string;
  readonly quantityClass?: string;
  readonly role?: string;
  readonly wrapInListItem?: boolean;
  readonly extraButtonClass?: string;
}

export interface SelectableList {
  createButton(item: SelectableItem): HTMLButtonElement;
  render(container: HTMLElement, items: readonly SelectableItem[]): readonly HTMLButtonElement[];
}

export class SelectableListImpl implements SelectableList {
  constructor(private readonly shape: SelectableListShape) {}

  createButton(item: SelectableItem): HTMLButtonElement {
    const button = buildButton(this.shape, item);
    if (this.shape.role) button.setAttribute("role", this.shape.role);
    if (item.selected) button.setAttribute("aria-current", "true");
    if (item.hint) button.setAttribute("data-hint", item.hint);
    if (item.disabled) button.setAttribute("disabled", "");
    return button;
  }

  render(container: HTMLElement, items: readonly SelectableItem[]): readonly HTMLButtonElement[] {
    container.innerHTML = "";
    const buttons: HTMLButtonElement[] = [];
    for (const item of items) {
      const button = this.createButton(item);
      if (this.shape.wrapInListItem) {
        const li = html`<li role="presentation">${button}</li>` as unknown as HTMLElement;
        container.appendChild(li);
      } else {
        container.appendChild(button);
      }
      buttons.push(button);
    }
    return buttons;
  }
}

function buildButton(shape: SelectableListShape, item: SelectableItem): HTMLButtonElement {
  const classes = [shape.itemClass];
  if (shape.extraButtonClass) classes.push(shape.extraButtonClass);
  const classAttr = classes.filter(Boolean).join(" ");

  if (shape.nameClass === "") {
    const button = html`<button type="button" class=${classAttr} data-value=${item.value}>${item.label}</button>` as unknown as HTMLButtonElement;
    return button;
  }

  const children: (Element | DocumentFragment)[] = [];
  if (item.iconUrl && shape.iconClass) {
    children.push(html`<img class=${shape.iconClass} src=${item.iconUrl} alt="">`);
  }
  const nameClassAttr = `${shape.nameClass} truncate`;
  children.push(html`<span class=${nameClassAttr} data-hint=${item.label}>${item.label}</span>`);
  if (item.quantity && shape.quantityClass) {
    children.push(html`<span class=${shape.quantityClass}>${item.quantity}</span>`);
  }

  return html`<button type="button" class=${classAttr} data-value=${item.value}>${children}</button>` as unknown as HTMLButtonElement;
}
