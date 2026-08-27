import type { WeaponRangeVisibility } from "../../../appstate";
import type { RangeOverlay, RangeOverlayKind } from "../../renderer";

export interface RangeOverlayEls {
  readonly legend: HTMLElement;
}

export interface RangeOverlayController {
  descriptors(): readonly RangeOverlayKind[];
  overlays(): readonly RangeOverlay[];
  toggle(kind: RangeOverlayKind): void;
  visibilityFor(kind: RangeOverlayKind): WeaponRangeVisibility;
  describe(kind: RangeOverlayKind): string;
  overlayVisibility(): Record<string, WeaponRangeVisibility>;
  restoreVisibility(entries?: Record<string, WeaponRangeVisibility>): void;
  render(): void;
  update(): void;
}
