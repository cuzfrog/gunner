export interface HintContentProvider {
  render(anchor: HTMLElement, container: HTMLElement): void;
  hide?(anchor: HTMLElement, container: HTMLElement): void;
}
