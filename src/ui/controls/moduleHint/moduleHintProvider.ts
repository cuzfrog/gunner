import type { EnergyNeutralizerStats, FittingDb, FittingModuleStats, MissileGuidanceComputerStats, MissileGuidanceEnhancerStats, NosferatuStats, SensorBoosterStats, SensorDampenerStats, SignalAmplifierStats, StasisGrapplerStats, StasisWebStats, TargetPainterStats, TrackingComputerStats, TrackingDisruptorStats, WarpScramblerStats } from "../../../gamedata/fittingDb";
import type { I18n } from "../../i18n";
import type { HintContentProvider } from "../hoverHint";
import { formatDistance, formatNumber } from "../controlsFormat";
import type { StatHintModel, StatHintRenderer, StatHintRow, StatHintSection } from "../statHint";

export type ModuleHintProvider = HintContentProvider;

export interface ModuleHintProviderDeps {
  readonly fittingDb: FittingDb;
  readonly i18n: I18n;
  readonly statHintRenderer: StatHintRenderer;
}

export class ModuleHintProviderImpl implements ModuleHintProvider {
  private readonly fittingDb: FittingDb;
  private readonly i18n: I18n;
  private readonly renderer: StatHintRenderer;

  constructor(deps: ModuleHintProviderDeps) {
    this.fittingDb = deps.fittingDb;
    this.i18n = deps.i18n;
    this.renderer = deps.statHintRenderer;
  }

  render(anchor: HTMLElement, container: HTMLElement): void {
    const id = anchor.getAttribute("data-value");
    if (id === null || id === "") return;
    const model = buildModuleHintModel(id, this.fittingDb, (key) => this.i18n.t(key));
    if (model === undefined) return;
    this.renderer.render(model, container);
  }
}

function buildModuleHintModel(id: string, db: FittingDb, t: (key: string) => string): StatHintModel | undefined {
  const stats = db.modules[id];
  if (stats !== undefined) {
    const model = modelFromModuleStats(stats, t);
    if (model !== undefined) return model;
  }
  const computer = db.trackingComputers[id];
  if (computer !== undefined) return trackingComputerModel(computer, t);
  const guidance = db.missileGuidanceComputers[id];
  if (guidance !== undefined) return guidanceComputerModel(guidance, t);
  const enhancer = db.missileGuidanceEnhancers[id];
  if (enhancer !== undefined) return guidanceEnhancerModel(enhancer, t);
  return undefined;
}

function modelFromModuleStats(stats: FittingModuleStats, t: (key: string) => string): StatHintModel | undefined {
  if (stats.stasisWeb !== undefined) return stasisWebModel(stats.stasisWeb, t);
  if (stats.stasisGrappler !== undefined) return stasisGrapplerModel(stats.stasisGrappler, t);
  if (stats.warpScrambler !== undefined) return warpScramblerModel(stats.warpScrambler, t);
  if (stats.targetPainter !== undefined) return targetPainterModel(stats.targetPainter, t);
  if (stats.trackingDisruptor !== undefined) return trackingDisruptorModel(stats.trackingDisruptor, t);
  if (stats.sensorDampener !== undefined) return sensorDampenerModel(stats.sensorDampener, t);
  if (stats.sensorBooster !== undefined) return sensorBoosterModel(stats.sensorBooster, t);
  if (stats.signalAmplifier !== undefined) return signalAmplifierModel(stats.signalAmplifier, t);
  if (stats.neutralizer !== undefined) return neutralizerModel(stats.neutralizer, t);
  if (stats.nosferatu !== undefined) return nosferatuModel(stats.nosferatu, t);
  return undefined;
}

function stasisWebModel(stats: Omit<StasisWebStats, "id" | "name">, t: (key: string) => string): StatHintModel {
  const rows: StatHintRow[] = [
    { label: t("label.maxVelocity"), value: percentValue(stats.speedFactorPercent) },
    { label: t("label.maxRange"), value: distanceValue(stats.maxRange, t) },
  ];
  return withActivation(rows, stats.cycleTime, stats.capacitorNeed, t);
}

function stasisGrapplerModel(stats: Omit<StasisGrapplerStats, "id" | "name">, t: (key: string) => string): StatHintModel {
  const rows: StatHintRow[] = [
    { label: t("label.maxVelocity"), value: percentValue(stats.speedFactorPercent) },
    { label: t("label.optimalRange"), value: distanceValue(stats.optimal, t) },
    { label: t("label.falloffRange"), value: distanceValue(stats.falloff, t) },
  ];
  return withActivation(rows, stats.cycleTime, stats.capacitorNeed, t);
}

function warpScramblerModel(stats: Omit<WarpScramblerStats, "id" | "name">, t: (key: string) => string): StatHintModel {
  const rows: StatHintRow[] = [];
  if (stats.propulsionBlock) rows.push({ value: t("ewar.hover.scrambler"), emphasis: true });
  rows.push({ label: t("label.maxRange"), value: distanceValue(stats.maxRange, t) });
  return withActivation(rows, stats.cycleTime, stats.capacitorNeed, t);
}

function targetPainterModel(stats: Omit<TargetPainterStats, "id" | "name">, t: (key: string) => string): StatHintModel {
  const rows: StatHintRow[] = [
    { label: t("label.signatureRadius"), value: percentValue(stats.signatureRadiusBonusPercent) },
    { label: t("label.maxRange"), value: distanceValue(stats.maxRange, t) },
    { label: t("label.falloffRange"), value: distanceValue(stats.falloff, t) },
  ];
  return withActivation(rows, stats.cycleTime, stats.capacitorNeed, t);
}

function trackingDisruptorModel(stats: Omit<TrackingDisruptorStats, "id" | "name">, t: (key: string) => string): StatHintModel {
  const rows: StatHintRow[] = [
    { label: t("moduleHint.disruptionStrength"), value: percentValue(stats.disruptionPercent) },
    { label: t("label.optimalRange"), value: distanceValue(stats.optimal, t) },
    { label: t("label.falloffRange"), value: distanceValue(stats.falloff, t) },
  ];
  return withActivation(rows, stats.cycleTime, stats.capacitorNeed, t);
}

function sensorDampenerModel(stats: Omit<SensorDampenerStats, "id" | "name">, t: (key: string) => string): StatHintModel {
  const rows: StatHintRow[] = [
    { label: t("label.scanResolution"), value: percentValue(stats.scanResolutionBonusPercent) },
    { label: t("label.targetingRange"), value: percentValue(stats.maxTargetRangeBonusPercent) },
    { label: t("label.optimalRange"), value: distanceValue(stats.optimal, t) },
    { label: t("label.falloffRange"), value: distanceValue(stats.falloff, t) },
  ];
  return withActivation(rows, stats.cycleTime, stats.capacitorNeed, t);
}

function sensorBoosterModel(stats: Omit<SensorBoosterStats, "id" | "name">, t: (key: string) => string): StatHintModel {
  const rows: StatHintRow[] = [
    { label: t("label.scanResolution"), value: percentValue(stats.scanResolutionBonusPercent) },
    { label: t("label.targetingRange"), value: percentValue(stats.maxTargetRangeBonusPercent) },
  ];
  return withActivation(rows, stats.cycleTime, stats.capacitorNeed, t);
}

function signalAmplifierModel(stats: Omit<SignalAmplifierStats, "id" | "name">, t: (key: string) => string): StatHintModel {
  const rows: StatHintRow[] = [
    { label: t("label.scanResolution"), value: percentValue(stats.scanResolutionBonusPercent) },
    { label: t("label.targetingRange"), value: percentValue(stats.maxTargetRangeBonusPercent) },
    { label: t("label.maxLockedTargets"), value: `+${formatNumber(stats.maxLockedTargetsBonus)}` },
  ];
  return { sections: [{ heading: t("moduleHint.section.effect"), rows }] };
}

function neutralizerModel(stats: EnergyNeutralizerStats, t: (key: string) => string): StatHintModel {
  const rows: StatHintRow[] = [
    { label: t("ewar.hover.neutralizer"), value: energyValue(stats.amount, t) },
    { label: t("label.maxRange"), value: distanceValue(stats.maxRange, t) },
    { label: t("label.falloffRange"), value: distanceValue(stats.falloff, t) },
  ];
  return withActivation(rows, stats.cycleTime, stats.capacitorNeed, t);
}

function nosferatuModel(stats: NosferatuStats, t: (key: string) => string): StatHintModel {
  const rows: StatHintRow[] = [
    { label: t("ewar.hover.nosferatu"), value: energyValue(stats.amount, t) },
    { label: t("label.maxRange"), value: distanceValue(stats.maxRange, t) },
    { label: t("label.falloffRange"), value: distanceValue(stats.falloff, t) },
  ];
  return withActivation(rows, stats.cycleTime, undefined, t);
}

function trackingComputerModel(stats: TrackingComputerStats, t: (key: string) => string): StatHintModel {
  const rows: StatHintRow[] = [
    percentRow(t("label.trackingSpeed"), stats.trackingBonusPercent),
    percentRow(t("label.optimalRange"), stats.optimalBonusPercent),
    percentRow(t("label.falloffRange"), stats.falloffBonusPercent),
  ].filter((row): row is StatHintRow => row !== undefined);
  return withActivation(rows, stats.cycleTime, stats.capacitorNeed, t);
}

function guidanceComputerModel(stats: MissileGuidanceComputerStats, t: (key: string) => string): StatHintModel {
  const rows: StatHintRow[] = [
    percentRow(t("label.explosionRadius"), stats.explosionRadiusBonusPercent),
    percentRow(t("label.explosionVelocity"), stats.explosionVelocityBonusPercent),
    percentRow(t("label.missileVelocity"), stats.missileVelocityBonusPercent),
    percentRow(t("label.flightTime"), stats.flightTimeBonusPercent),
  ].filter((row): row is StatHintRow => row !== undefined);
  return withActivation(rows, stats.cycleTime, stats.capacitorNeed, t);
}

function guidanceEnhancerModel(stats: MissileGuidanceEnhancerStats, t: (key: string) => string): StatHintModel {
  const rows: StatHintRow[] = [
    percentRow(t("label.explosionRadius"), stats.explosionRadiusBonusPercent),
    percentRow(t("label.explosionVelocity"), stats.explosionVelocityBonusPercent),
    percentRow(t("label.missileVelocity"), stats.missileVelocityBonusPercent),
    percentRow(t("label.flightTime"), stats.flightTimeBonusPercent),
  ].filter((row): row is StatHintRow => row !== undefined);
  return { sections: [{ heading: t("moduleHint.section.effect"), rows }] };
}

function withActivation(rows: StatHintRow[], cycleTime: number | undefined, capacitorNeed: number | undefined, t: (key: string) => string): StatHintModel {
  const activation: StatHintRow[] = [];
  if (cycleTime !== undefined) activation.push({ label: t("label.cycleTime"), value: `${formatNumber(cycleTime)} ${t("unit.second")}` });
  if (capacitorNeed !== undefined) activation.push({ label: t("label.capacitorNeed"), value: `${formatNumber(capacitorNeed)} ${t("unit.gigajoule")}` });
  if (activation.length === 0) return { sections: [{ heading: t("moduleHint.section.effect"), rows }] };
  return { sections: [{ heading: t("moduleHint.section.effect"), rows }, { heading: t("moduleHint.section.activation"), rows: activation }] };
}

function percentRow(label: string, value: number): StatHintRow | undefined {
  if (value === 0) return undefined;
  return { label, value: percentValue(value) };
}

function percentValue(value: number): string {
  return value > 0 ? `+${formatNumber(value)}%` : `${formatNumber(value)}%`;
}

function distanceValue(meters: number, t: (key: string) => string): string {
  return formatDistance(meters, t);
}

function energyValue(gigajoules: number, t: (key: string) => string): string {
  return `${formatNumber(gigajoules)} ${t("unit.gigajoule")}`;
}

export { buildModuleHintModel as _buildModuleHintModel };
