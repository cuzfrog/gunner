export function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (e === null) throw new Error(`Missing DOM element #${id}`);
  return e;
}

export function elOf<T extends HTMLElement>(id: string, guard: (el: Element) => el is T): T {
  const e = el(id);
  if (!guard(e)) throw new Error(`Expected #${id} to be a ${guard.name}`);
  return e;
}

export function isHtmlButtonElement(el: Element): el is HTMLButtonElement {
  return el.tagName === "BUTTON";
}

export function isHtmlImageElement(el: Element): el is HTMLImageElement {
  return el.tagName === "IMG";
}

export function isHtmlInputElement(el: Element): el is HTMLInputElement {
  return el.tagName === "INPUT";
}

export function isHtmlSelectElement(el: Element): el is HTMLSelectElement {
  return el.tagName === "SELECT";
}

export function isHtmlTextAreaElement(el: Element): el is HTMLTextAreaElement {
  return el.tagName === "TEXTAREA";
}

export function isEventTargetWithClosest(target: EventTarget | null): target is Element {
  return target instanceof Element;
}

export function num(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): number {
  const value = input.value;
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

export function setText(el: HTMLElement, text: string): void {
  el.textContent = text;
}

export function fittingAreaSelector(side: "attacker" | "target"): string {
  return [`#${side}-hull`, `#${side}-ship-image`, `#${side}-fitting-trigger`, `#${side}-fitting-eye`, `#${side}-fitting-popup`, `#${side}-fitting-preview`].join(", ");
}
