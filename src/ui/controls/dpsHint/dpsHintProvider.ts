import type { DamageFactor, DamageType, ImportedLauncher, ImportedTurret } from "../../../fitting";
import type { ItemNameCatalog } from "../../../gamedata";
import type { Language } from "../../../appstate";
import type { I18n } from "../../i18n";
import type { HintContentProvider } from "../hoverHint";
import type { LauncherController } from "../launcher";
import type { Side } from "../side";
import type { TurretController } from "../turret";
import type { DpsHintFactorRow, DpsHintGroup, DpsHintModel, DpsHintRenderer, DpsHintTypeRow } from "./dpsHintRenderer";

const DAMAGE_TYPE_ORDER: readonly DamageType[] = ["em", "thermal", "kinetic", "explosive"];
const DAMAGE_ICON_URLS: Readonly<Record<DamageType, string>> = {
  em: "images/icons/damage-em.png",
  thermal: "images/icons/damage-thermal.png",
  kinetic: "images/icons/damage-kinetic.png",
  explosive: "images/icons/damage-explosive.png",
};

export type DpsHintProvider = HintContentProvider;

export interface DpsHintProviderDeps {
  readonly i18n: I18n;
  readonly turretControllers: Record<Side, TurretController>;
  readonly launcherControllers: Record<Side, LauncherController>;
  readonly itemNameCatalog: ItemNameCatalog;
  readonly dpsHintRenderer: DpsHintRenderer;
}

export class DpsHintProviderImpl implements HintContentProvider {
  private readonly i18n: I18n;
  private readonly turretControllers: Record<Side, TurretController>;
  private readonly launcherControllers: Record<Side, LauncherController>;
  private readonly itemNameCatalog: ItemNameCatalog;
  private readonly renderer: DpsHintRenderer;

  constructor(deps: DpsHintProviderDeps) {
    this.i18n = deps.i18n;
    this.turretControllers = deps.turretControllers;
    this.launcherControllers = deps.launcherControllers;
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
    const groups: DpsHintGroup[] = [];
    if (turret) groups.push(buildTurretGroup(turret, this.itemNameCatalog, language));
    if (launcher) groups.push(buildLauncherGroup(launcher, this.itemNameCatalog, language));
    return { groups };
  }
}

function sideFromAnchor(anchor: HTMLElement): Side | undefined {
  const side = anchor.dataset.side;
  if (side === "shipA" || side === "shipB") return side;
  return undefined;
}

function buildTurretGroup(turret: ImportedTurret, itemNameCatalog: ItemNameCatalog, language: Language): DpsHintGroup {
  const name = `${itemNameCatalog.nameForId(turret.moduleId, language)} x${turret.turretCount}`;
  const { types, sum } = buildTypeRows(turret.damageBreakdown.damageByType);
  const factors = buildFactorRows(turret.damageBreakdown.factors, itemNameCatalog, language);
  return { name, types, sum, factors };
}

function buildLauncherGroup(launcher: ImportedLauncher, itemNameCatalog: ItemNameCatalog, language: Language): DpsHintGroup {
  const name = `${itemNameCatalog.nameForId(launcher.moduleId, language)} x${launcher.count}`;
  const { types, sum } = buildTypeRows(launcher.damageBreakdown.damageByType);
  const factors = buildFactorRows(launcher.damageBreakdown.factors, itemNameCatalog, language);
  return { name, types, sum, factors };
}

function buildTypeRows(damageByType: Readonly<Partial<Record<DamageType, number>>>): { types: readonly DpsHintTypeRow[]; sum: number } {
  const types: DpsHintTypeRow[] = [];
  let sum = 0;
  for (const dt of DAMAGE_TYPE_ORDER) {
    const value = damageByType[dt];
    if (value === undefined || value === 0) continue;
    sum += value;
  }
  for (const dt of DAMAGE_TYPE_ORDER) {
    const value = damageByType[dt];
    if (value === undefined || value === 0) continue;
    const percent = sum > 0 ? value / sum : 0;
    types.push({ type: dt, iconUrl: DAMAGE_ICON_URLS[dt], damage: value, percent });
  }
  return { types, sum };
}

function buildFactorRows(factors: readonly DamageFactor[], itemNameCatalog: ItemNameCatalog, language: Language): readonly DpsHintFactorRow[] {
  const rows: DpsHintFactorRow[] = [];
  let cumulative = 1;
  for (const factor of factors) {
    cumulative *= factor.multiplier;
    rows.push({ kind: factor.kind, multiplier: factor.multiplier, cumulative, source: factorSource(factor, itemNameCatalog, language) });
  }
  return rows;
}

function factorSource(factor: DamageFactor, itemNameCatalog: ItemNameCatalog, language: Language): string | undefined {
  if (factor.moduleIds !== undefined && factor.moduleIds.length > 0) {
    return factor.moduleIds.map((id) => itemNameCatalog.nameForId(id, language)).join(", ");
  }
  return factor.skillName ?? factor.hullName;
}
