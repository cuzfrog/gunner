import type { I18n } from "../i18n";
import type { TrackingInput } from "./trackingInput";
import { formatDistance, formatNumber, formatWithCommas } from "./controlsFormat";
import type { EffectiveReadouts } from "./controlsContract";

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
    this.write(this.els.trackingReadout, tracking, isTrackingAffected(values.tracking, values.boostedTracking), t);
    this.write(this.els.attackerSpeedReadout, formatSpeed(values.attackerSpeed), isSpeedAffected(values.attackerSpeed, readNumber(this.els.attackerSpeed)), t);
    this.write(this.els.targetSpeedReadout, formatSpeed(values.targetSpeed), isSpeedAffected(values.targetSpeed, readNumber(this.els.targetSpeed)), t);
    this.write(this.els.optimalReadout, formatDistance(values.optimal, t), isRangeAffected(values.optimal, values.boostedOptimal), t);
    this.write(this.els.falloffReadout, formatDistance(values.falloff, t), isRangeAffected(values.falloff, values.boostedFalloff), t);
  }

  private write(readout: ReadoutLike, text: string, affected: boolean, t: (key: string) => string): void {
    readout.textContent = text;
    if (affected) {
      readout.classList.add("affected");
      readout.title = t("readout.effectiveAffected");
    } else {
      readout.classList.remove("affected");
      readout.title = "";
    }
  }
}

const SPEED_EPSILON = { absolute: 0.5, relative: 0.005 } as const;
const TRACKING_EPSILON = { absolute: 0.0001, relative: 0.005 } as const;
const RANGE_EPSILON = { absolute: 0.5, relative: 0.005 } as const;

function readNumber(input: InputLike): number {
  const n = Number.parseFloat(input.value);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

function formatSpeed(value: number): string {
  return `${formatWithCommas(value, 0)} m/s`;
}

function isSpeedAffected(effective: number, raw: number): boolean {
  return isAffected(effective, raw, SPEED_EPSILON);
}

function isTrackingAffected(effective: number, raw: number): boolean {
  return isAffected(effective, raw, TRACKING_EPSILON);
}

function isRangeAffected(effective: number, raw: number): boolean {
  return isAffected(effective, raw, RANGE_EPSILON);
}

function isAffected(effective: number, raw: number, epsilon: { readonly absolute: number; readonly relative: number }): boolean {
  const diff = Math.abs(effective - raw);
  const threshold = Math.max(epsilon.absolute, Math.abs(effective) * epsilon.relative);
  return diff > threshold;
}

export { formatSpeed as _formatSpeed, isAffected as _isAffected, readNumber as _readNumber };
