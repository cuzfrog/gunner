import type { DamageBreakdown, DamageFactor, DamageType, ImportedDrone, ImportedLauncher, ImportedTurret } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { ItemNameCatalog } from "../../../gamedata";
import type { Language } from "../../../appstate";
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
}

interface DpsHintSource {
  readonly moduleId: TypeId;
  readonly count: number;
  readonly cycleTime: number;
  readonly damageBreakdown: DamageBreakdown;
}

export class DpsHintProviderImpl implements HintContentProvider {
  private readonly i18n: I18n;
  private readonly turretControllers: Record<Side, TurretController>;
  private readonly launcherControllers: Record<Side, LauncherController>;
  private readonly droneControllers: Record<Side, DroneController>;
  private readonly itemNameCatalog: ItemNameCatalog;
  private readonly renderer: DpsHintRenderer;

  constructor(deps: DpsHintProviderDeps) {
    this.i18n = deps.i18n;
    this.turretControllers = deps.turretControllers;
    this.launcherControllers = deps.launcherControllers;
    this.droneControllers = deps.droneControllers;
    this.itemNameCatalog = deps.itemNameCatalog;
    this.renderer = deps.dpsHintRenderer;
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
    const turret = this.turretControllers[side].turret();
    const launcher = this.launcherControllers[side].launcher();
    const drone = this.droneControllers[side].drone();
    const groups: DpsHintGroup[] = [];
    if (turret) groups.push(buildWeaponGroup(turretHintSource(turret), this.itemNameCatalog, language));
    if (launcher) groups.push(buildWeaponGroup(launcherHintSource(launcher), this.itemNameCatalog, language));
    if (drone) groups.push(buildWeaponGroup(droneHintSource(drone), this.itemNameCatalog, language));
    return { groups };
  }
}

function sideFromAnchor(anchor: HTMLElement): Side | undefined {
  const side = anchor.dataset.side;
  if (side === "shipA" || side === "shipB") return side;
  if (side === "a") return "shipA";
  if (side === "b") return "shipB";
  return undefined;
}

function turretHintSource(turret: ImportedTurret): DpsHintSource {
  return { moduleId: turret.moduleId, count: turret.turretCount, cycleTime: turret.cycleTime, damageBreakdown: turret.damageBreakdown };
}

function launcherHintSource(launcher: ImportedLauncher): DpsHintSource {
  return { moduleId: launcher.moduleId, count: launcher.count, cycleTime: launcher.cycleTime, damageBreakdown: launcher.damageBreakdown };
}

function droneHintSource(drone: ImportedDrone): DpsHintSource {
  return { moduleId: drone.typeId, count: drone.count, cycleTime: drone.cycleTime, damageBreakdown: drone.damageBreakdown };
}

function buildWeaponGroup(source: DpsHintSource, itemNameCatalog: ItemNameCatalog, language: Language): DpsHintGroup {
  const name = `${itemNameCatalog.nameForId(source.moduleId, language)} x${source.count}`;
  const { types, ammo } = buildTypeRows(source.damageBreakdown.damageByType);
  const factors = buildFactorRows(source.damageBreakdown.factors, itemNameCatalog, language);
  const cumulative = factors.length > 0 ? factors[factors.length - 1].cumulative : 1;
  const volley = ammo * cumulative * source.count;
  const dps = source.cycleTime > 0 ? volley / source.cycleTime : 0;
  const summary: DpsHintSummary = { ammo, multiplier: cumulative, count: source.count, volley, cycleTime: source.cycleTime, dps };
  return { name, types, ammo, factors, summary };
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
