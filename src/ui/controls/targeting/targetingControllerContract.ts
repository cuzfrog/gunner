import type { SensorSpec } from "../../../sim";
import type { Side, Sided } from "../side";
import type { PopupFieldEls } from "../shared";

export interface TargetingFieldEls extends PopupFieldEls {
  readonly section: HTMLElement;
}

export type TargetingEls = Sided<TargetingFieldEls>;

export interface TargetingController {
  setSensorData(side: Side, spec: SensorSpec | undefined): void;
  render(): void;
}
