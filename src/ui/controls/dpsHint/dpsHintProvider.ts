import type { DamageBreakdown, DamageFactor, DamageType, ImportedDrone, ImportedLauncher, ImportedTurret } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { ItemNameCatalog } from "../../../gamedata";
import type { Language } from "../../../appstate";
import type { DamageAssessment, WeaponDamageAssessor, WeaponKind, WeaponSpec } from "../../../sim";
import type { I18n } from "../../i18n";
import type { HintContentProvider } from "../hoverHint";
import { DAMAGE_ICON_URLS, DAMAGE_TYPE_ORDER } from "../damageTypeIcons";
import type { DroneController } from "../drone";
import type { LauncherController } from "../launcher";
import type { Side } from "../side";
import type { TurretController } from "../turret";
import type { DpsHintFactorRow, DpsHintGroup, DpsHintModel, DpsHintRenderer, DpsHintSummary, DpsHintTypeRow } from "./dpsHintRenderer";

export type DpsHintProvider = HintContentProvider;

export interface DpsHintProviderDeps {
  readonly i18n: I18n;
  readonly turretControllers: Record<Side, TurretController>;
  readonly launcherControllers: Record<Side, LauncherController>;
  readonly droneControllers: Record<Side, DroneController>;
  readonly itemNameCatalog: ItemNameCatalog;
  readonly dpsHintRenderer: DpsHintRenderer;
  readonly weaponDamageAssessor: WeaponDamageAssessor;
}

interface DpsHintSource {
  readonly typeId: TypeId;
  readonly weaponKind: WeaponKind;
  readonly count: number;
  readonly cycleTime: number;
  readonly damageBreakdown: DamageBreakdown;
  readonly volley: number;
  readonly dps: number;
}

export class DpsHintProviderImpl implements HintContentProvider {
  private readonly i18n: I18n;
  private readonly turretControllers: Record<Side, TurretController>;
  private readonly launcherControllers: Record<Side, LauncherController>;
  private readonly droneControllers: Record<Side, DroneController>;
  private readonly itemNameCatalog: ItemNameCatalog;
  private readonly renderer: DpsHintRenderer;
  private readonly weaponDamageAssessor: WeaponDamageAssessor;

  constructor(deps: DpsHintProviderDeps) {
    this.i18n = deps.i18n;
    this.turretControllers = deps.turretControllers;
    this.launcherControllers = deps.launcherControllers;
    this.droneControllers = deps.droneControllers;
    this.itemNameCatalog = deps.itemNameCatalog;
    this.renderer = deps.dpsHintRenderer;
    this.weaponDamageAssessor = deps.weaponDamageAssessor;
  }

  render(anchor: HTMLElement, container: HTMLElement): void {
    const side = sideFromAnchor(anchor);
    if (side === undefined) return;
    const model = this.buildModel(side);
    if (model.groups.length === 0) return;
    this.renderer.render(model, container);
  }

  private buildModel(side: Side): DpsHintModel {
    const language = this.i18n.current();
    const groups: DpsHintGroup[] = [];
    const turret = this.turretControllers[side].turret();
    const turretSpec = this.turretControllers[side].currentTurretSpec();
    if (turret && turretSpec) groups.push(buildWeaponGroup(turretHintSource(turret, this.assess(turretSpec)), this.itemNameCatalog, language));
    const launcher = this.launcherControllers[side].launcher();
    const missileSpec = this.launcherControllers[side].currentMissileSpec();
    if (launcher && missileSpec) groups.push(buildWeaponGroup(launcherHintSource(launcher, this.assess(missileSpec)), this.itemNameCatalog, language));
    const drone = this.droneControllers[side].drone();
    const droneSpecs = this.droneControllers[side].currentDroneSpecs();
    if (drone && droneSpecs.length > 0) groups.push(buildWeaponGroup(droneHintSource(drone, this.assess(droneSpecs[0])), this.itemNameCatalog, language));
    return { groups };
  }

  private assess(spec: WeaponSpec): DamageAssessment {
    return this.weaponDamageAssessor.assess(spec, 1, true);
  }
}

function sideFromAnchor(anchor: HTMLElement): Side | undefined {
  const side = anchor.dataset.side;
  if (side === "shipA" || side === "shipB") return side;
  if (side === "a") return "shipA";
  if (side === "b") return "shipB";
  return undefined;
}

function turretHintSource(turret: ImportedTurret, assessment: DamageAssessment): DpsHintSource {
  return { typeId: turret.moduleId, weaponKind: "turret", count: turret.turretCount, cycleTime: turret.cycleTime, damageBreakdown: turret.damageBreakdown, volley: assessment.volley, dps: assessment.nominalDps };
}

function launcherHintSource(launcher: ImportedLauncher, assessment: DamageAssessment): DpsHintSource {
  return { typeId: launcher.moduleId, weaponKind: "missile", count: launcher.count, cycleTime: launcher.cycleTime, damageBreakdown: launcher.damageBreakdown, volley: assessment.volley, dps: assessment.nominalDps };
}

function droneHintSource(drone: ImportedDrone, assessment: DamageAssessment): DpsHintSource {
  return { typeId: drone.typeId, weaponKind: "drone", count: drone.count, cycleTime: drone.cycleTime, damageBreakdown: drone.damageBreakdown, volley: assessment.volley, dps: assessment.nominalDps };
}

function buildWeaponGroup(source: DpsHintSource, itemNameCatalog: ItemNameCatalog, language: Language): DpsHintGroup {
  const name = `${itemNameCatalog.nameForId(source.typeId, language)} x${source.count}`;
  const { types, ammo } = buildTypeRows(source.damageBreakdown.damageByType);
  const factors = buildFactorRows(source.damageBreakdown.factors, itemNameCatalog, language);
  const cumulative = factors.length > 0 ? factors[factors.length - 1].cumulative : 1;
  const summary: DpsHintSummary = { ammo, multiplier: cumulative, count: source.count, volley: source.volley, cycleTime: source.cycleTime, dps: source.dps };
  return { name, weaponKind: source.weaponKind, types, ammo, factors, summary };
}

function buildTypeRows(damageByType: Readonly<Partial<Record<DamageType, number>>>): { types: readonly DpsHintTypeRow[]; ammo: number } {
  const types: DpsHintTypeRow[] = [];
  let ammo = 0;
  for (const dt of DAMAGE_TYPE_ORDER) {
    const value = damageByType[dt];
    if (value === undefined || value === 0) continue;
    ammo += value;
  }
  for (const dt of DAMAGE_TYPE_ORDER) {
    const value = damageByType[dt];
    if (value === undefined || value === 0) continue;
    const percent = ammo > 0 ? value / ammo : 0;
    types.push({ type: dt, iconUrl: DAMAGE_ICON_URLS[dt], damage: value, percent });
  }
  return { types, ammo };
}

function buildFactorRows(factors: readonly DamageFactor[], itemNameCatalog: ItemNameCatalog, language: Language): readonly DpsHintFactorRow[] {
  const rows: DpsHintFactorRow[] = [];
  let cumulative = 1;
  for (const factor of factors) {
    cumulative *= factor.multiplier;
    rows.push({ kind: factor.kind, multiplier: factor.multiplier, cumulative, sources: factorSources(factor, itemNameCatalog, language) });
  }
  return rows;
}

function factorSources(factor: DamageFactor, itemNameCatalog: ItemNameCatalog, language: Language): readonly string[] {
  if (factor.moduleIds !== undefined && factor.moduleIds.length > 0) {
    return deduplicatedModuleNames(factor.moduleIds, itemNameCatalog, language);
  }
  if (factor.skillIds !== undefined && factor.skillIds.length > 0) {
    return factor.skillIds.map((id) => itemNameCatalog.nameForId(id, language));
  }
  if (factor.hullName !== undefined) return [factor.hullName];
  return [];
}

function deduplicatedModuleNames(moduleIds: readonly TypeId[], itemNameCatalog: ItemNameCatalog, language: Language): readonly string[] {
  const counts = new Map<string, { id: TypeId; count: number }>();
  for (const id of moduleIds) {
    const existing = counts.get(id);
    if (existing) existing.count++;
    else counts.set(id, { id, count: 1 });
  }
  const result: string[] = [];
  for (const { id, count } of counts.values()) {
    const name = itemNameCatalog.nameForId(id, language);
    result.push(count > 1 ? `${name} x${count}` : name);
  }
  return result;
}
