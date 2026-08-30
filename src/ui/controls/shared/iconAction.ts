export interface IconActionShape {
  readonly buttonClass: string;
  readonly iconSvg: string;
  readonly hint: string | (() => string);
  readonly ariaLabel?: string | (() => string);
  readonly ariaPressed?: boolean;
  readonly disabled?: boolean;
  readonly dataIndex?: number | string;
  readonly ariaHaspopup?: string;
  readonly ariaExpanded?: boolean;
  readonly ariaControls?: string;
}

export interface IconAction {
  create(onClick: () => void): HTMLButtonElement;
}

export class IconActionImpl implements IconAction {
  private readonly shape: IconActionShape;

  constructor(shape: IconActionShape) {
    this.shape = shape;
  }

  create(onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.className = this.shape.buttonClass;
    const hint = resolveText(this.shape.hint) ?? "";
    button.setAttribute("data-hint", hint);
    button.setAttribute("aria-label", resolveText(this.shape.ariaLabel) ?? hint);
    button.innerHTML = this.shape.iconSvg;
    if (this.shape.ariaPressed !== undefined) button.setAttribute("aria-pressed", String(this.shape.ariaPressed));
    if (this.shape.disabled) button.setAttribute("disabled", "");
    if (this.shape.dataIndex !== undefined) button.setAttribute("data-index", String(this.shape.dataIndex));
    if (this.shape.ariaHaspopup) button.setAttribute("aria-haspopup", this.shape.ariaHaspopup);
    if (this.shape.ariaExpanded !== undefined) button.setAttribute("aria-expanded", String(this.shape.ariaExpanded));
    if (this.shape.ariaControls) button.setAttribute("aria-controls", this.shape.ariaControls);
    button.addEventListener("click", onClick);
    return button;
  }
}

function resolveText(value: string | (() => string) | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "function" ? value() : value;
}
