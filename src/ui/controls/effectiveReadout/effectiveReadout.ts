import type { I18n } from "../../i18n";
import type { Language, TrackingUnit } from "../../../appstate";
import type { FittingImport } from "../../../fitting";
import { formatDistance, formatNumber, formatWithCommas } from "../controlsFormat";
import { percentFromMultiplier } from "../../format";
import type { EffectiveReadouts, SideReadoutValues } from "../controlsContract";
import type { SpeedBreakdown, StatEffectAttribution } from "../../../sim";
import type { Side } from "../side";

interface InputLike { readonly value: string; }

interface ReadoutLike {
  textContent: string | null;
  classList: { add(className: string): void; remove(className: string): void; };
  setAttribute(name: string, value: string): void;
}

interface SideReadoutEls {
  readonly speed: InputLike;
  readonly tracking: InputLike;
  readonly optimal: InputLike;
  readonly falloff: InputLike;
  readonly speedReadout: ReadoutLike;
  readonly trackingReadout: ReadoutLike;
  readonly optimalReadout: ReadoutLike;
  readonly falloffReadout: ReadoutLike;
}

interface TrackingDisplay {
  readonly unit: TrackingUnit;
  displayFor(rad: number, sigResolution: number): number;
}

export interface EffectiveReadoutEls {
  readonly shipA: SideReadoutEls;
  readonly shipB: SideReadoutEls;
}

export interface EffectiveReadout {
  update(values: EffectiveReadouts): void;
}

export class EffectiveReadoutImpl implements EffectiveReadout {
  private readonly els: EffectiveReadoutEls;
  private readonly i18n: I18n;
  private readonly trackingDisplays: Readonly<Record<Side, TrackingDisplay>>;
  private readonly fittingImport: FittingImport;
  private readonly lastByReadout = new Map<ReadoutLike, { text: string; negative: boolean; hint: string }>();

  constructor(deps: { els: EffectiveReadoutEls; i18n: I18n; trackingDisplays: Readonly<Record<Side, TrackingDisplay>>; fittingImport: FittingImport }) {
    this.els = deps.els;
    this.i18n = deps.i18n;
    this.trackingDisplays = deps.trackingDisplays;
    this.fittingImport = deps.fittingImport;
  }

  update(values: EffectiveReadouts): void {
    const t = (key: string): string => this.i18n.t(key);
    this.writeSide(values.shipA, this.els.shipA, this.trackingDisplays.shipA, t);
    this.writeSide(values.shipB, this.els.shipB, this.trackingDisplays.shipB, t);
  }

  private writeSide(sideValues: SideReadoutValues, sideEls: SideReadoutEls, trackingDisplay: TrackingDisplay, t: (key: string) => string): void {
    this.write(sideEls.speedReadout, formatSpeed(sideValues.speed), isSpeedNegative(sideValues.speed, tryReadNumber(sideEls.speed)), (t) => buildSpeedHint(sideValues.speedBreakdown, this.fittingImport, t));
    if (sideValues.kind === "turret") {
      const language = this.i18n.current();
      const trackingValue = trackingDisplay.displayFor(sideValues.tracking, sideValues.sigResolution);
      const tracking = trackingDisplay.unit === "score"
        ? `${formatNumber(trackingValue, 2)} ${t("label.trackingScore")}`
        : `${formatNumber(trackingValue, 4)} rad/s`;
      this.write(sideEls.trackingReadout, tracking, isTrackingNegative(sideValues.tracking, sideValues.boostedTracking), (t) =>
        sideValues.trackingBreakdown === undefined
          ? t("readout.effectiveAffected")
          : buildStatHint(sideValues.trackingBreakdown.tracking, this.fittingImport, language, "label.trackingSpeed", t)
      );
      this.write(sideEls.optimalReadout, formatDistance(sideValues.optimal, t), isRangeNegative(sideValues.optimal, sideValues.boostedOptimal), (t) =>
        sideValues.optimalBreakdown === undefined
          ? t("readout.effectiveAffected")
          : buildStatHint(sideValues.optimalBreakdown.optimal, this.fittingImport, language, "label.optimalRange", t)
      );
      this.write(sideEls.falloffReadout, formatDistance(sideValues.falloff, t), isRangeNegative(sideValues.falloff, sideValues.boostedFalloff), (t) =>
        sideValues.falloffBreakdown === undefined
          ? t("readout.effectiveAffected")
          : buildStatHint(sideValues.falloffBreakdown.falloff, this.fittingImport, language, "label.falloffRange", t)
      );
    } else if (sideValues.kind === "missile") {
      this.write(sideEls.trackingReadout, formatDistance(sideValues.explosionRadius, t), false, () => "");
      this.write(sideEls.optimalReadout, `${formatWithCommas(sideValues.explosionVelocity, 0)} m/s`, false, () => "");
      this.write(sideEls.falloffReadout, formatDistance(sideValues.flightRange, t), false, () => "");
    } else if (sideValues.kind === "drone") {
      const trackingValue = trackingDisplay.displayFor(sideValues.tracking, sideValues.sigResolution);
      const tracking = trackingDisplay.unit === "score"
        ? `${formatNumber(trackingValue, 2)} ${t("label.trackingScore")}`
        : `${formatNumber(trackingValue, 4)} rad/s`;
      this.write(sideEls.trackingReadout, tracking, false, () => "");
      this.write(sideEls.optimalReadout, formatDistance(sideValues.optimal, t), false, () => "");
      this.write(sideEls.falloffReadout, formatDistance(sideValues.falloff, t), false, () => "");
    } else {
      this.write(sideEls.trackingReadout, "-", false, () => "");
      this.write(sideEls.optimalReadout, "-", false, () => "");
      this.write(sideEls.falloffReadout, "-", false, () => "");
    }
  }

  private write(readout: ReadoutLike, text: string, negative: boolean, buildHint: (t: (key: string) => string) => string): void {
    const hint = negative ? buildHint((key) => this.i18n.t(key)) : "";
    const previous = this.lastByReadout.get(readout);
    if (previous && previous.text === text && previous.negative === negative && previous.hint === hint) return;
    readout.textContent = text;
    if (negative) {
      readout.classList.add("is-negative");
      readout.setAttribute("data-hint", hint);
    } else {
      readout.classList.remove("is-negative");
      readout.setAttribute("data-hint", "");
    }
    this.lastByReadout.set(readout, { text, negative, hint });
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

function buildSpeedHint(breakdown: SpeedBreakdown | undefined, fittingImport: FittingImport, t: (key: string) => string): string {
  if (breakdown === undefined) return t("readout.effectiveAffected");
  const entries: string[] = [];
  for (const effect of breakdown.effects) {
    const moduleName = fittingImport.itemNameForId(effect.moduleId, "en");
    if (effect.family === "scrambler") {
      if (breakdown.propulsionSuppressed) entries.push(`${moduleName} ${t("readout.stoppedMwd")}`);
      continue;
    }
    entries.push(`${moduleName} -${percentFromMultiplier(effect.multiplier)}%`);
  }
  return entries.join("; ");
}

function buildStatHint(entries: readonly StatEffectAttribution[], fittingImport: FittingImport, language: Language, statKey: string, t: (key: string) => string): string {
  if (entries.length === 0) return "";
  return entries.map((entry) => {
    const moduleName = fittingImport.itemNameForId(entry.moduleId, language);
    const prefix = entry.scriptId === undefined ? moduleName : `${moduleName} (${fittingImport.itemNameForId(entry.scriptId, language)})`;
    return `${prefix} -${percentFromMultiplier(entry.multiplier)}% ${t(statKey)}`;
  }).join("; ");
}

export { formatSpeed as _formatSpeed, isNegative as _isAffected, tryReadNumber as _readNumber };
