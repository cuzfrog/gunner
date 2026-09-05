import type { SensorBoostLoadout, SensorSpec } from "../../../sim";
import type { Side } from "../side";

export interface TargetingEls {
  readonly shipATargetingField: HTMLElement;
  readonly shipATargetingTrigger: HTMLButtonElement;
  readonly shipATargetingPopup: HTMLElement;
  readonly shipATargetingSection: HTMLElement;
  readonly shipATargetingSummary: HTMLElement;
  readonly shipBTargetingField: HTMLElement;
  readonly shipBTargetingTrigger: HTMLButtonElement;
  readonly shipBTargetingPopup: HTMLElement;
  readonly shipBTargetingSection: HTMLElement;
  readonly shipBTargetingSummary: HTMLElement;
}

export interface TargetingController {
  setSensorData(side: Side, spec: SensorSpec | undefined, boosts: SensorBoostLoadout | undefined): void;
  render(): void;
}
