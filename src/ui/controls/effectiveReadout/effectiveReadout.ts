import type { I18n } from "../../i18n";
import type { TrackingUnit } from "../../../appstate";
import { formatDistance, formatNumber, formatWithCommas } from "../controlsFormat";
import type { EffectiveReadouts } from "../controlsContract";
import type { SpeedBreakdown, SpeedEffectAttribution, StatEffectAttribution } from "../../../sim";

interface InputLike { readonly value: string; }

interface ReadoutLike {
  textContent: string | null;
  classList: { add(className: string): void; remove(className: string): void; };
  title: string;
}

interface TrackingDisplay {
  readonly unit: TrackingUnit;
  displayFor(rad: number, sigResolution: number): number;
}

export interface EffectiveReadoutEls {
  readonly shipASpeed: InputLike;
  readonly shipBSpeed: InputLike;
  readonly tracking: InputLike;
  readonly optimal: InputLike;
  readonly falloff: InputLike;
  readonly shipASpeedReadout: ReadoutLike;
  readonly shipBSpeedReadout: ReadoutLike;
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
  private readonly trackingInput: TrackingDisplay;
  private readonly sigResolution: () => number;
  private readonly lastByReadout = new Map<ReadoutLike, { text: string; negative: boolean; title: string }>();

  constructor(deps: { els: EffectiveReadoutEls; i18n: I18n; trackingInput: TrackingDisplay; sigResolution: () => number }) {
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
    this.write(this.els.trackingReadout, tracking, isTrackingNegative(values.tracking, values.boostedTracking), (t) =>
      values.trackingBreakdown === undefined
        ? t("readout.effectiveAffected")
        : buildStatTitle(values.trackingBreakdown.tracking, "label.trackingSpeed", t)
    );
    this.write(
      this.els.shipASpeedReadout,
      formatSpeed(values.shipASpeed),
      isSpeedNegative(values.shipASpeed, tryReadNumber(this.els.shipASpeed)),
      (t) => buildSpeedTitle(values.shipASpeedBreakdown, t)
    );
    this.write(
      this.els.shipBSpeedReadout,
      formatSpeed(values.shipBSpeed),
      isSpeedNegative(values.shipBSpeed, tryReadNumber(this.els.shipBSpeed)),
      (t) => buildSpeedTitle(values.shipBSpeedBreakdown, t)
    );
    this.write(this.els.optimalReadout, formatDistance(values.optimal, t), isRangeNegative(values.optimal, values.boostedOptimal), (t) =>
      values.optimalBreakdown === undefined
        ? t("readout.effectiveAffected")
        : buildStatTitle(values.optimalBreakdown.optimal, "label.optimalRange", t)
    );
    this.write(this.els.falloffReadout, formatDistance(values.falloff, t), isRangeNegative(values.falloff, values.boostedFalloff), (t) =>
      values.falloffBreakdown === undefined
        ? t("readout.effectiveAffected")
        : buildStatTitle(values.falloffBreakdown.falloff, "label.falloffRange", t)
    );
  }

  private write(readout: ReadoutLike, text: string, negative: boolean, buildTitle: (t: (key: string) => string) => string): void {
    const title = negative ? buildTitle((key) => this.i18n.t(key)) : "";
    const previous = this.lastByReadout.get(readout);
    if (previous && previous.text === text && previous.negative === negative && previous.title === title) return;
    readout.textContent = text;
    if (negative) {
      readout.classList.add("is-negative");
      readout.title = title;
    } else {
      readout.classList.remove("is-negative");
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

function buildSpeedTitle(breakdown: SpeedBreakdown | undefined, t: (key: string) => string): string {
  if (breakdown === undefined) return t("readout.effectiveAffected");
  const entries: string[] = [];
  for (const effect of breakdown.effects) {
    if (effect.family === "scrambler") {
      if (breakdown.propulsionSuppressed) entries.push(`${effect.moduleName} ${t("readout.stoppedMwd")}`);
      continue;
    }
    entries.push(`${effect.moduleName} -${percentOf(effect.multiplier)}%`);
  }
  return entries.join("; ");
}

function buildStatTitle(entries: readonly StatEffectAttribution[], statKey: string, t: (key: string) => string): string {
  if (entries.length === 0) return "";
  return entries.map((entry) => {
    const prefix = entry.scriptName === undefined ? entry.moduleName : `${entry.moduleName} (${entry.scriptName})`;
    return `${prefix} -${percentOf(entry.multiplier)}% ${t(statKey)}`;
  }).join("; ");
}

function percentOf(multiplier: number): number {
  return Math.round((1 - multiplier) * 100);
}

export { formatSpeed as _formatSpeed, isNegative as _isAffected, tryReadNumber as _readNumber };
