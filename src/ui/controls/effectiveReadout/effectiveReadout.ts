import type { I18n } from "../../i18n";
import type { TrackingInput } from "../trackingInput";
import { formatDistance, formatNumber, formatWithCommas } from "../controlsFormat";
import type { EffectiveReadouts } from "../controlsContract";

interface InputLike { readonly value: string; }

interface ReadoutLike {
  textContent: string | null;
  classList: { add(className: string): void; remove(className: string): void; };
  title: string;
}

export interface EffectiveReadoutEls {
  readonly attackerSpeed: InputLike;
  readonly targetSpeed: InputLike;
  readonly tracking: InputLike;
  readonly optimal: InputLike;
  readonly falloff: InputLike;
  readonly attackerSpeedReadout: ReadoutLike;
  readonly targetSpeedReadout: ReadoutLike;
  readonly trackingReadout: ReadoutLike;
  readonly optimalReadout: ReadoutLike;
  readonly falloffReadout: ReadoutLike;
}

export interface EffectiveReadout {
  update(values: EffectiveReadouts): void;
}

export class EffectiveReadoutImpl implements EffectiveReadout {
  private readonly els: EffectiveReadoutEls;
  private readonly i18n: I18n;
  private readonly trackingInput: TrackingInput;
  private readonly sigResolution: () => number;
  private readonly lastByReadout = new Map<ReadoutLike, { text: string; negative: boolean; title: string }>();

  constructor(deps: { els: EffectiveReadoutEls; i18n: I18n; trackingInput: TrackingInput; sigResolution: () => number }) {
    this.els = deps.els;
    this.i18n = deps.i18n;
    this.trackingInput = deps.trackingInput;
    this.sigResolution = deps.sigResolution;
  }

  update(values: EffectiveReadouts): void {
    const t = (key: string): string => this.i18n.t(key);
    const sigResolution = this.sigResolution();
    const trackingDisplay = this.trackingInput.displayFor(values.tracking, sigResolution);
    const tracking = this.trackingInput.unit === "score"
      ? `${formatNumber(trackingDisplay, 2)} ${t("label.trackingScore")}`
      : `${formatNumber(trackingDisplay, 4)} rad/s`;
    this.write(this.els.trackingReadout, tracking, isTrackingNegative(values.tracking, values.boostedTracking), t);
    this.write(this.els.attackerSpeedReadout, formatSpeed(values.attackerSpeed), isSpeedNegative(values.attackerSpeed, tryReadNumber(this.els.attackerSpeed)), t);
    this.write(this.els.targetSpeedReadout, formatSpeed(values.targetSpeed), isSpeedNegative(values.targetSpeed, tryReadNumber(this.els.targetSpeed)), t);
    this.write(this.els.optimalReadout, formatDistance(values.optimal, t), isRangeNegative(values.optimal, values.boostedOptimal), t);
    this.write(this.els.falloffReadout, formatDistance(values.falloff, t), isRangeNegative(values.falloff, values.boostedFalloff), t);
  }

  private write(readout: ReadoutLike, text: string, negative: boolean, t: (key: string) => string): void {
    const title = negative ? t("readout.effectiveAffected") : "";
    const previous = this.lastByReadout.get(readout);
    if (previous && previous.text === text && previous.negative === negative && previous.title === title) return;
    readout.textContent = text;
    if (negative) {
      readout.classList.add("negative");
      readout.title = title;
    } else {
      readout.classList.remove("negative");
      readout.title = "";
    }
    this.lastByReadout.set(readout, { text, negative, title });
  }
}

const SPEED_EPSILON = { absolute: 0.5, relative: 0.005 } as const;
const TRACKING_EPSILON = { absolute: 0.0001, relative: 0.005 } as const;
const RANGE_EPSILON = { absolute: 0.5, relative: 0.005 } as const;

function tryReadNumber(input: InputLike): number | undefined {
  const n = Number.parseFloat(input.value);
  if (Number.isNaN(n)) return undefined;
  if (n < 0) return undefined;
  return n;
}

function formatSpeed(value: number): string {
  return `${formatWithCommas(value, 0)} m/s`;
}

function isSpeedNegative(effective: number, raw: number | undefined): boolean {
  if (raw === undefined) return false;
  return isNegative(effective, raw, SPEED_EPSILON);
}

function isTrackingNegative(effective: number, raw: number): boolean {
  return isNegative(effective, raw, TRACKING_EPSILON);
}

function isRangeNegative(effective: number, raw: number): boolean {
  return isNegative(effective, raw, RANGE_EPSILON);
}

function isNegative(effective: number, baseline: number, epsilon: { readonly absolute: number; readonly relative: number }): boolean {
  const threshold = Math.max(epsilon.absolute, Math.abs(effective) * epsilon.relative);
  return effective < baseline - threshold;
}

export { formatSpeed as _formatSpeed, isNegative as _isAffected, tryReadNumber as _readNumber };
