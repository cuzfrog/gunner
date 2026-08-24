import type { EwarProjection } from "../../../sim";
import type { RangeOverlay, RangeOverlayKind } from "../../renderer";

export interface RangeOverlayEls {
  readonly legend: HTMLElement;
}

export interface RangeOverlayHost {
  currentDistance(): number;
  projection(side: "attacker" | "target"): EwarProjection | undefined;
  onDisplayChange(): void;
}

export interface RangeOverlayController {
  setHost(host: RangeOverlayHost): void;
  descriptors(): readonly RangeOverlayKind[];
  overlays(): readonly RangeOverlay[];
  toggle(kind: RangeOverlayKind): void;
  isVisible(kind: RangeOverlayKind): boolean;
  describe(kind: RangeOverlayKind): string;
  hiddenKinds(): readonly RangeOverlayKind[];
  restoreHidden(kinds?: readonly string[]): void;
  render(): void;
  update(): void;
}
